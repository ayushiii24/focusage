import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { toTask } from "../types/task";
import type { ApiTask } from "../types/task";

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

function TaskSection() {

    // Restore guest tasks from the browser when Focusage opens.
    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const savedTasks = localStorage.getItem("focusage-tasks");

            // No saved tasks yet? Start with an empty list.
            return savedTasks ? (JSON.parse(savedTasks) as Task[]) : [];
        } catch {
            // Handle missing or invalid saved data safely.
            return [];
        }
    });
    // Keep browser storage in sync whenever tasks are added,
    // completed, or deleted.
    // Check whether this browser has a saved login token.
const token = localStorage.getItem("focusage-token");

// Load account tasks from MongoDB after login.
// Guests continue to use localStorage.
useEffect(() => {
  if (!token) return;

  let cancelled = false;

  async function loadTasks() {
    try {
      // Backend returns { tasks: [...] }.
      const result = await apiRequest<{ tasks: ApiTask[] }>(
        "/api/tasks"
      );
      
      if (!cancelled) {
        // Convert backend documents into the UI's task format.
        setTasks(result.tasks.map(toTask));
      }
    } catch (error) {
      console.error("Failed to load account tasks:", error);
    }
  }
  void loadTasks();
  
  return () => {
    // Prevent a stale request from updating an unmounted component.
    cancelled = true;
  };
  }, [token]);
useEffect(() => {
  let cancelled = false;

  async function handleAuthChange() {
    // Read the latest token whenever the event fires.
    const currentToken = localStorage.getItem("focusage-token");

    if (!currentToken) {
      // Guest mode: restore guest tasks, not account tasks.
      const savedTasks = localStorage.getItem("focusage-tasks");

      try {
        setTasks(savedTasks ? JSON.parse(savedTasks) : []);
      } catch {
        // Recover safely if guest storage contains invalid JSON.
        setTasks([]);
      }

      return;
    }

    // Account mode: fetch tasks belonging to the authenticated user.
    try {
      const result = await apiRequest<{ tasks: ApiTask[] }>(
        "/api/tasks"
      );

      // Ignore outdated requests after an auth change or unmount.
      if (!cancelled) {
        setTasks(result.tasks.map(toTask));
      }
    } catch (error) {
      if (!cancelled) {
        console.error("Failed to load account tasks:", error);
      }
    }
  }

  // Load the correct tasks when the component first mounts.
  void handleAuthChange();

  // Also reload tasks whenever login/logout is announced.
  window.addEventListener("focusage-auth-change", handleAuthChange);

  return () => {
    // Stop this effect from updating state after cleanup.
    cancelled = true;
    window.removeEventListener("focusage-auth-change", handleAuthChange);
  };
}, []);


// Persist only guest tasks.
// Never overwrite the guest list with account tasks.
useEffect(() => {
  if (!token) {
    localStorage.setItem("focusage-tasks", JSON.stringify(tasks));
  }
}, [tasks, token]);
    const [title, setTitle] = useState("");
    const [deadline, setDeadline] = useState("");
    const [priority, setPriority] = useState<Priority>("medium");
    // Track which tasks the user wants to see.
const [filter, setFilter] = useState<TaskFilter>("all");
// Track how the visible tasks should be ordered.
const [sortBy, setSortBy] = useState<TaskSort>("recent");

// Derive the displayed list without modifying the original tasks.
const visibleTasks = [...tasks]
  .filter((task) => {
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  })
  .sort((a, b) => {
    if (sortBy === "recent") {
      // New tasks are appended to the array, so reverse their order.
      return tasks.indexOf(b) - tasks.indexOf(a);
    }

    if (sortBy === "priority") {
      // Higher-priority tasks appear first.
      const rank = { high: 3, medium: 2, low: 1 };
      return rank[b.priority] - rank[a.priority];
    }

    // Tasks without deadlines appear after tasks with deadlines.
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
    async function addTask(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  // Ignore blank titles.
  if (!title.trim()) return;

  const token = localStorage.getItem("focusage-token");

  // GUEST MODE: keep using browser storage.
  if (!token) {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      deadline,
      priority,
      completed: false,
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);
  } else {
    // ACCOUNT MODE: create the task in MongoDB via Express.
    try {
      // The backend currently requires a valid deadline.
      if (!deadline) {
        alert("Please choose a deadline for account tasks.");
        return;
      }

      const result = await apiRequest<{ task: ApiTask }>(
        "/api/tasks",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            deadline,
            priority,
          }),
        }
      );

      // Use the task returned by the backend, including its real ID.
      setTasks((currentTasks) => [
        ...currentTasks,
        toTask(result.task),
      ]);
    } catch (error) {
      console.error("Failed to create task:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not create task. Please try again."
      );
      return;
    }
  }

  // Clear the form only after successful creation.
  setTitle("");
  setDeadline("");
  setPriority("medium");
}

    async function toggleTask(taskId: string) {
  // Find the current task so we know its next completion state.
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  const nextCompleted = !task.completed;
  const token = localStorage.getItem("focusage-token");

  // GUEST MODE: update local state; the existing effect saves it.
  if (!token) {
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === taskId
          ? { ...item, completed: nextCompleted }
          : item
      )
    );
    return;
  }

  // ACCOUNT MODE: save the change to the backend first.
  try {
    const result = await apiRequest<{ task: ApiTask }>(
      `/api/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ completed: nextCompleted }),
      }
    );

    // Use the saved task returned by the server.
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === taskId ? toTask(result.task) : item
      )
    );
  } catch (error) {
    console.error("Failed to update task:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Could not update task. Please try again."
    );
  }
}

    async function deleteTask(taskId: string) {
  const token = localStorage.getItem("focusage-token");

  // Guest mode: remove the task from local state.
  // The existing useEffect will save the change to localStorage.
  if (!token) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId)
    );
    return;
  }

  // Account mode: delete from the backend first.
  try {
    await apiRequest<{ message: string; task: ApiTask }>(
      `/api/tasks/${taskId}`,
      { method: "DELETE" }
    );

    // Update the UI only after the server confirms deletion.
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId)
    );
  } catch (error) {
    console.error("Failed to delete task:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Could not delete task. Please try again."
    );
  }
}

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Today's tasks</h2>
            <p className="mt-1 text-sm text-slate-500">
                Small steps still move you forward.
            </p>
            {/* Filter buttons */}
<div className="mt-5 flex flex-wrap gap-2">
  {(["all", "pending", "completed"] as TaskFilter[]).map((option) => (
    <button
      key={option}
      type="button"
      onClick={() => setFilter(option)}
      className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
        filter === option
          ? "bg-violet-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {option}
    </button>
  ))}
</div>

{/* Sorting dropdown */}
<div className="mt-4">
  <label
    htmlFor="task-sort"
    className="mr-3 text-sm text-slate-600"
  >
    Sort by
  </label>

  <select
    id="task-sort"
    value={sortBy}
    onChange={(event) => setSortBy(event.target.value as TaskSort)}
    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="recent">Recently added</option>
    <option value="deadline">Earliest deadline</option>
    <option value="priority">Highest priority</option>
  </select>
</div>

            {/* Form for creating a task */}
            <form onSubmit={addTask} className="mt-6 space-y-3">
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What do you need to do?"
                    aria-label="Task title"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor="task-deadline" className="mb-1 block text-sm text-slate-600">
                            Deadline (optional)
                        </label>
                        <input
                            id="task-deadline"
                            type="datetime-local"
                            value={deadline}
                            onChange={(event) => setDeadline(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label htmlFor="task-priority" className="mb-1 block text-sm text-slate-600">
                            Priority
                        </label>
                        <select
                            id="task-priority"
                            value={priority}
                            onChange={(event) => setPriority(event.target.value as Priority)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                            <option value="low">Low priority</option>
                            <option value="medium">Medium priority</option>
                            <option value="high">High priority</option>
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    className="rounded-lg bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700"
                >
                    + Add task
                </button>
            </form>

            {/* Task list */}
            <div className="mt-6 space-y-3">
                {tasks.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                        No tasks yet. Add your first one above!
                    </p>
                ) : (
                        visibleTasks.map((task) => (
                        <div
                            key={task.id}
                            className="flex items-start gap-3 rounded-xl border border-slate-100 p-4"
                        >
                            <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleTask(task.id)}
                                aria-label={`Mark ${task.title} as ${task.completed ? "pending" : "completed"
                                    }`}
                                className="mt-1 h-4 w-4 accent-violet-600"
                            />

                            <div className="min-w-0 flex-1">
                                <p
                                    className={`break-words font-medium ${task.completed
                                        ? "text-slate-400 line-through"
                                        : "text-slate-800"
                                        }`}
                                >
                                    {task.title}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <span
                                        className={`rounded-full px-2 py-1 font-medium ${task.priority === "high"
                                            ? "bg-red-50 text-red-700"
                                            : task.priority === "medium"
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-emerald-50 text-emerald-700"
                                            }`}
                                    >
                                        {task.priority} priority
                                    </span>

                                    {task.deadline && (
                                        <span className="text-slate-500">
                                            Due: {task.deadline.replace("T", " ")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => deleteTask(task.id)}
                                aria-label={`Delete ${task.title}`}
                                className="text-sm text-slate-400 hover:text-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>

            <p className="mt-4 text-sm text-slate-500">
                {tasks.filter((task) => task.completed).length} of {tasks.length} completed
            </p>
        </section>
    );
}

export default TaskSection;