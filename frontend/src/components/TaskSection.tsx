import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { toTask } from "../types/task";
import type { ApiTask } from "../types/task";
import { useTimer } from "../context/TimerContext";
import { useToast } from "../context/ToastContext";

type Priority = "low" | "medium" | "high";
type TaskFilter = "all" | "pending" | "completed";
type TaskSort = "deadline" | "priority" | "recent";

type Task = {
  id: string;
  title: string;
  deadline: string;
  priority: Priority;
  completed: boolean;
};

function toLocalDateTimeValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

const PRIORITY_DOT: Record<Priority, { color: string; label: string }> = {
  high: { color: "#c0392b", label: "High" },
  medium: { color: "#c07d2b", label: "Med" },
  low: { color: "#3a8a62", label: "Low" },
};

function TaskSection() {
  const { activeTaskId, setActiveTask } = useTimer();
  const toast = useToast();
  //restore guest tasks from the browser when app opens
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const savedTasks = localStorage.getItem("focusage-tasks");
      return savedTasks ? (JSON.parse(savedTasks) as Task[]) : [];
    } catch {
      return [];
    }
  });
  const tasksRef = useRef(tasks);
  const taskUpdatesInFlightRef = useRef(new Set<string>());

  function commitTasks(nextTasks: Task[], announceChange = false) {
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    if (!localStorage.getItem("focusage-token")) {
      localStorage.setItem("focusage-tasks", JSON.stringify(nextTasks));
    }
    if (announceChange) window.dispatchEvent(new Event("focusage-tasks-change"));
  }

  useEffect(() => {
    let cancelled = false;
    let loadVersion = 0;
    async function handleAuthChange() {
      const currentVersion = ++loadVersion;
      const currentToken = localStorage.getItem("focusage-token");
      if (!currentToken) {
        const savedTasks = localStorage.getItem("focusage-tasks");
        try { commitTasks(savedTasks ? JSON.parse(savedTasks) : []); }
        catch { commitTasks([]); }
        return;
      }
      try {
        const result = await apiRequest<{ tasks: ApiTask[] }>("/api/tasks");
        if (!cancelled && currentVersion === loadVersion && localStorage.getItem("focusage-token") === currentToken) {
          commitTasks(result.tasks.map(toTask));
        }
      } catch (error) {
        if (!cancelled && currentVersion === loadVersion) console.error("Failed to load account tasks:", error);
      }
    }
    void handleAuthChange();
    window.addEventListener("focusage-auth-change", handleAuthChange);
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== "focusage-tasks" || localStorage.getItem("focusage-token")) return;
      try { commitTasks(event.newValue ? JSON.parse(event.newValue) : []); }
      catch { commitTasks([]); }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      cancelled = true;
      window.removeEventListener("focusage-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [sortBy, setSortBy] = useState<TaskSort>("recent");
  const [formExpanded, setFormExpanded] = useState(false);

  const visibleTasks = [...tasks]
    .filter((task) => {
      if (filter === "pending") return !task.completed;
      if (filter === "completed") return task.completed;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return tasks.indexOf(b) - tasks.indexOf(a);
      if (sortBy === "priority") {
        const rank = { high: 3, medium: 2, low: 1 };
        return rank[b.priority] - rank[a.priority];
      }
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const deadlineDate = deadline ? new Date(deadline) : null;
    if (deadlineDate && (!Number.isFinite(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now())) {
      toast({ message: "Choose a deadline later than the current time.", variant: "error" });
      return;
    }

    const currentToken = localStorage.getItem("focusage-token");

    if (!currentToken) {
      commitTasks([
        ...tasksRef.current,
        { id: crypto.randomUUID(), title: title.trim(), deadline, priority, completed: false },
      ], true);
    } else {
      try {
        if (!deadline) { toast({ message: "Please choose a deadline for account tasks.", variant: "error" }); return; }
        const result = await apiRequest<{ task: ApiTask }>("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ title: title.trim(), deadline: deadlineDate!.toISOString(), priority }),
        });
        commitTasks([...tasksRef.current, toTask(result.task)], true);
      } catch (error) {
        console.error("Failed to create task:", error);
        toast({ message: error instanceof Error ? error.message : "Could not create task. Please try again.", variant: "error" });
        return;
      }
    }

    setTitle("");
    setDeadline("");
    setPriority("medium");
    setFormExpanded(false);
  }

  async function toggleTask(taskId: string) {
    if (taskUpdatesInFlightRef.current.has(taskId)) return;
    const task = tasksRef.current.find((item) => item.id === taskId);
    if (!task) return;
    const nextCompleted = !task.completed;
    const currentToken = localStorage.getItem("focusage-token");
    if (!currentToken) {
      commitTasks(tasksRef.current.map((item) => item.id === taskId ? { ...item, completed: nextCompleted } : item), true);
      return;
    }
    taskUpdatesInFlightRef.current.add(taskId);
    try {
      const result = await apiRequest<{ task: ApiTask }>(
        `/api/tasks/${taskId}`,
        { method: "PATCH", body: JSON.stringify({ completed: nextCompleted }) }
      );
      commitTasks(tasksRef.current.map((item) => item.id === taskId ? toTask(result.task) : item), true);
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({ message: error instanceof Error ? error.message : "Could not update task. Please try again.", variant: "error" });
    } finally {
      taskUpdatesInFlightRef.current.delete(taskId);
    }
  }

  async function deleteTask(taskId: string) {
    const currentToken = localStorage.getItem("focusage-token");
    if (!currentToken) {
      commitTasks(tasksRef.current.filter((task) => task.id !== taskId), true);
      return;
    }
    try {
      await apiRequest<{ message: string; task: ApiTask }>(`/api/tasks/${taskId}`, { method: "DELETE" });
      commitTasks(tasksRef.current.filter((task) => task.id !== taskId), true);
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ message: error instanceof Error ? error.message : "Could not delete task. Please try again.", variant: "error" });
    }
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header with progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Tasks
          </h2>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* progress bar */}
        <div
          style={{
            height: 2,
            backgroundColor: "var(--border-soft)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              backgroundColor: "var(--accent)",
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* add task area */}
      <form onSubmit={addTask} style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: formExpanded ? 7 : 0,
          }}
        >
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value && !formExpanded) setFormExpanded(true);
            }}
            onFocus={() => setFormExpanded(true)}
            placeholder="Add a task…"
            aria-label="Task title"
            style={{
              flex: 1,
              fontSize: 13,
              padding: "7px 10px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              backgroundColor: "var(--bg)",
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 0.12s",
            }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--accent-ring)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            type="submit"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Add
          </button>
        </div>

        {/* deadline + priority: appear when input focused */}
        {formExpanded && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="datetime-local"
              value={deadline}
              min={toLocalDateTimeValue(new Date())}
              onChange={(e) => setDeadline(e.target.value)}
              aria-label="Deadline"
              style={{
                fontSize: 11,
                padding: "5px 8px",
                border: "1px solid var(--border)",
                borderRadius: 5,
                backgroundColor: "var(--bg)",
                color: "var(--text-secondary)",
                outline: "none",
                width: "100%",
              }}
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              aria-label="Priority"
              style={{
                fontSize: 11,
                padding: "5px 8px",
                border: "1px solid var(--border)",
                borderRadius: 5,
                backgroundColor: "var(--bg)",
                color: "var(--text-secondary)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
          </div>
        )}
      </form>

      {/* filter + sort row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div style={{ display: "flex", gap: 2 }}>
          {(["all", "pending", "completed"] as TaskFilter[]).map((option) => {
            const active = filter === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: active ? 500 : 400,
                  backgroundColor: active ? "var(--accent-light)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  textTransform: "capitalize",
                  transition: "all 0.1s",
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as TaskSort)}
          aria-label="Sort tasks"
          style={{
            fontSize: 11,
            padding: "2px 5px",
            border: "1px solid var(--border-soft)",
            borderRadius: 4,
            backgroundColor: "transparent",
            color: "var(--text-muted)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="recent">Recent</option>
          <option value="deadline">Deadline</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {/* task list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          paddingRight: 2,
        }}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 32,
              gap: 6,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1.5px dashed var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              No tasks yet. Add your first one above.
            </p>
          </div>
        ) : visibleTasks.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", paddingTop: 24 }}>
            No tasks match this filter.
          </p>
        ) : (
          visibleTasks.map((task) => {
            const dot = PRIORITY_DOT[task.priority];
            return (
              <div
                key={task.id}
                className="row-hover"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "7px 8px",
                  borderRadius: 6,
                  opacity: task.completed ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {/* checkbox */}
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  aria-label={`Mark ${task.title} as ${task.completed ? "pending" : "completed"}`}
                  style={{
                    marginTop: 3,
                    accentColor: "var(--accent)",
                    cursor: "pointer",
                    flexShrink: 0,
                    width: 13,
                    height: 13,
                  }}
                />

                {/* content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: task.completed ? "var(--text-muted)" : "var(--text-primary)",
                      textDecoration: task.completed ? "line-through" : "none",
                      wordBreak: "break-word",
                      lineHeight: 1.35,
                    }}
                  >
                    {task.title}
                  </p>

                  {/* priority + deadline meta row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    {/* priority dot */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 10,
                        color: "var(--text-muted)",
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          backgroundColor: dot.color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      {dot.label}
                    </span>

                    {task.deadline && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {task.deadline.replace("T", " ").slice(0, 16)}
                      </span>
                    )}
                  </div>
                </div>

                {/* focus target button */}
                {!task.completed && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTaskId === task.id) {
                        setActiveTask(null, null);
                      } else {
                        setActiveTask(task.id, task.title);
                      }
                    }}
                    title={activeTaskId === task.id ? "Unlink from Timer" : "Focus on this task"}
                    style={{
                      background: activeTaskId === task.id ? "var(--accent-light)" : "transparent",
                      color: activeTaskId === task.id ? "var(--accent)" : "var(--text-placeholder)",
                      border: activeTaskId === task.id ? "1px solid var(--accent-ring)" : "1px solid transparent",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: 10,
                      fontWeight: 500,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (activeTaskId !== task.id) {
                        e.currentTarget.style.color = "var(--accent)";
                        e.currentTarget.style.backgroundColor = "var(--bg-inset)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTaskId !== task.id) {
                        e.currentTarget.style.color = "var(--text-placeholder)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {activeTaskId === task.id ? "Active" : "Focus"}
                  </button>
                )}

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  aria-label={`Delete ${task.title}`}
                  style={{
                    fontSize: 14,
                    lineHeight: 1,
                    color: "var(--text-placeholder)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "1px 3px",
                    flexShrink: 0,
                    marginTop: 1,
                    transition: "color 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-placeholder)")}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default TaskSection;
