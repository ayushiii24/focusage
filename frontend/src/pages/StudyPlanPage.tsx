import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiRequest } from "../lib/api";
import { useTimer } from "../context/TimerContext";
import type { ApiTask } from "../types/task";
import { useToast } from "../context/ToastContext";

interface StudyPlanItem {
  _id: string;
  task?: { _id: string; title: string; priority: string; deadline: string } | string;
  title: string;
  priority: "low" | "medium" | "high";
  plannedMinutes: number;
  actualMinutes: number;
  order: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  notes?: string;
}

interface StudyPlan {
  _id: string;
  date: string;
  availableMinutes: number;
  items: StudyPlanItem[];
  summary: string;
  aiRecommendation: string;
  adaptationHistory: Array<{
    createdAt: string;
    reason: string;
    adjustmentSummary: string;
    accepted: boolean;
  }>;
}

interface BreakdownSubTask {
  title: string;
  estimatedMinutes: number;
  priority: "low" | "medium" | "high";
}

interface InsightsData {
  totalMinutes: number;
  totalSessions: number;
  completedTasks: number;
  totalTasks: number;
  peakWindow: string;
  insights: Array<{ title: string; observation: string; type: "positive" | "neutral" | "tip" }>;
}

export default function StudyPlanPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const token = localStorage.getItem("focusage-token");
  const { setActiveTask, setIsExpanded } = useTimer();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [error, setError] = useState("");

  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [generatedSubtasks, setGeneratedSubtasks] = useState<BreakdownSubTask[]>([]);
  const [breakdownSuccessMsg, setBreakdownSuccessMsg] = useState("");

  //adaptive adjustment dialog state
  const [adaptModalOpen, setAdaptModalOpen] = useState(false);
  const [adaptReason, setAdaptReason] = useState("");
  const [adapting, setAdapting] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  //loading initial plan, tasks and insights
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        const [planData, tasksData, insightsData] = await Promise.all([
          apiRequest<{ plan: StudyPlan | null }>("/api/study-plans/today"),
          apiRequest<{ tasks: ApiTask[] }>("/api/tasks"),
          apiRequest<InsightsData>("/api/study-plans/insights"),
        ]);

        if (!cancelled) {
          setPlan(planData.plan);
          if (planData.plan?.availableMinutes) {
            setAvailableMinutes(planData.plan.availableMinutes);
          }
          setTasks(tasksData.tasks);
          setInsights(insightsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load study plan data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  //generate daily plan
  async function handleGeneratePlan(targetMinutes?: number) {
    try {
      setGenerating(true);
      setError("");
      const minutesToSet = targetMinutes || availableMinutes;
      const res = await apiRequest<{ plan: StudyPlan }>("/api/study-plans/generate", {
        method: "POST",
        body: JSON.stringify({ availableMinutes: minutesToSet }),
      });
      setPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate study plan.");
    } finally {
      setGenerating(false);
    }
  }

  //update item status
  async function handleUpdateItemStatus(itemId: string, nextStatus: StudyPlanItem["status"]) {
    if (!plan) return;
    try {
      const res = await apiRequest<{ plan: StudyPlan }>(`/api/study-plans/${plan._id}/item/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setPlan(res.plan);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not update item status.", variant: "error" });
    }
  }

  //handle plan adaptation
  async function handleAdaptPlan() {
    if (!plan) return;
    try {
      setAdapting(true);
      const res = await apiRequest<{ plan: StudyPlan; adjustmentSummary: string }>(
        `/api/study-plans/${plan._id}/adapt`,
        {
          method: "POST",
          body: JSON.stringify({ reason: adaptReason || "User requested schedule adjustment" }),
        }
      );
      setPlan(res.plan);
      setAdaptModalOpen(false);
      setAdaptReason("");
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not adapt study plan.", variant: "error" });
    } finally {
      setAdapting(false);
    }
  }

  //trigger task breakdown
  async function handleBreakdownTask() {
    if (!selectedTaskId) return;
    try {
      setBreakdownLoading(true);
      setBreakdownSuccessMsg("");
      const res = await apiRequest<{ breakdown: { subtasks: BreakdownSubTask[] } }>(
        "/api/study-plans/breakdown",
        {
          method: "POST",
          body: JSON.stringify({ taskId: selectedTaskId }),
        }
      );
      setGeneratedSubtasks(res.breakdown.subtasks);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Failed to generate breakdown.", variant: "error" });
    } finally {
      setBreakdownLoading(false);
    }
  }

  //import breakdown subtasks into actual tasks
  async function handleImportSubtasks() {
    if (!selectedTaskId) return;
    try {
      setBreakdownLoading(true);
      await apiRequest<{ message: string }>("/api/study-plans/breakdown", {
        method: "POST",
        body: JSON.stringify({ taskId: selectedTaskId, importAsTasks: true }),
      });
      setBreakdownSuccessMsg("Actionable sub-tasks added to your Tasks list!");
      const tasksData = await apiRequest<{ tasks: ApiTask[] }>("/api/tasks");  //refresh tasks
      setTasks(tasksData.tasks);
      setTimeout(() => {
        setBreakdownModalOpen(false);
        setGeneratedSubtasks([]);
        setBreakdownSuccessMsg("");
      }, 1400);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Failed to import subtasks.", variant: "error" });
    } finally {
      setBreakdownLoading(false);
    }
  }

  function startFocusBlock(item: StudyPlanItem) {
    const taskId = typeof item.task === "object" && item.task !== null ? item.task._id : typeof item.task === "string" ? item.task : null;
    setActiveTask(taskId, item.title);
    setIsExpanded(true);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 100, color: "var(--text-muted)", fontSize: 13 }}>
          Loading your study plan…
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Navbar />

      <main className="page-content" style={{ flex: 1, maxWidth: 1000, width: "100%", margin: "0 auto", padding: "40px 24px 64px", display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Adaptive Study Planner
            </h1>
        
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setBreakdownModalOpen(true);
                if (tasks.length > 0 && !selectedTaskId) {
                  const pending = tasks.find((t) => !t.completed);
                  if (pending) setSelectedTaskId(pending._id);
                }
              }}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-raised)",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-inset)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface-raised)";
              }}
            >
              🧩 Smart Task Breakdown
            </button>

            {plan && (
              <button
                type="button"
                onClick={() => setAdaptModalOpen(true)}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--accent-ring)",
                  backgroundColor: "var(--accent-light)",
                  color: "var(--accent)",
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                ⚖️ Adapt Schedule
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 8, backgroundColor: "var(--danger-bg)", color: "var(--danger)", fontSize: 13, border: "1px solid #f2c0c0" }}>
            {error}
          </div>
        )}

        {/* Pacing & Target Time Controls */}
        <section
          style={{
            backgroundColor: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Available Study Time Today:</span>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[60, 90, 120, 180, 240].map((mins) => {
                const active = availableMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setAvailableMinutes(mins);
                      void handleGeneratePlan(mins);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: active ? 600 : 400,
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                      backgroundColor: active ? "var(--accent-light)" : "var(--bg)",
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {mins / 60}h ({mins}m)
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGeneratePlan()}
            disabled={generating}
            style={{
              padding: "9px 20px",
              borderRadius: 6,
              backgroundColor: "var(--accent)",
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: generating ? "not-allowed" : "pointer",
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? "Generating Plan…" : plan ? "Regenerate Plan" : "Generate Today's Plan"}
          </button>
        </section>

        {/* AI Recommendation Alert */}
        {plan && plan.aiRecommendation && (
          <div
            style={{
              backgroundColor: "var(--accent-light)",
              border: "1px solid var(--accent-ring)",
              borderRadius: 8,
              padding: "14px 18px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 2 }}>
                Pacing & Focus Strategy
              </p>
              <p style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.45 }}>
                {plan.aiRecommendation}
              </p>
            </div>
          </div>
        )}

        {/* Plan Timeline Blocks */}
        {plan && plan.items.length > 0 ? (
          <section
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Today's Scheduled Focus Blocks ({plan.items.length} sessions)
              </h2>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Allocated: {plan.items.reduce((s, it) => s + it.plannedMinutes, 0)} of {plan.availableMinutes} mins
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {plan.items.map((item, idx) => {
                const isComplete = item.status === "completed";
                const isSkipped = item.status === "skipped";
                return (
                  <div
                    key={item._id}
                    style={{
                      padding: "16px 20px",
                      borderBottom: idx === plan.items.length - 1 ? "none" : "1px solid var(--border-soft)",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                      backgroundColor: isComplete ? "rgba(63, 122, 90, 0.04)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 0 }}>
                      {/* Order indicator */}
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          backgroundColor: isComplete ? "var(--success)" : "var(--bg-inset)",
                          color: isComplete ? "#fff" : "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {isComplete ? "✓" : item.order}
                      </span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <h3
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: isComplete ? "var(--text-muted)" : "var(--text-primary)",
                              textDecoration: isComplete ? "line-through" : "none",
                              margin: 0,
                            }}
                          >
                            {item.title}
                          </h3>

                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              textTransform: "uppercase",
                              backgroundColor:
                                item.priority === "high"
                                  ? "#fdf0f0"
                                  : item.priority === "medium"
                                  ? "#fdf5e6"
                                  : "#ebf5ef",
                              color:
                                item.priority === "high"
                                  ? "#c0392b"
                                  : item.priority === "medium"
                                  ? "#c07d2b"
                                  : "#3a8a62",
                            }}
                          >
                            {item.priority}
                          </span>
                        </div>

                        {item.notes && (
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions and Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--text-muted)",
                          padding: "4px 8px",
                          borderRadius: 4,
                          backgroundColor: "var(--bg-inset)",
                        }}
                      >
                        ⏱️ {item.plannedMinutes} min
                      </span>

                      {/* Status Selector */}
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateItemStatus(item._id, e.target.value as StudyPlanItem["status"])}
                        aria-label="Item Status"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--surface-raised)",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="skipped">Skip</option>
                      </select>

                      {/* Focus Now Button */}
                      {!isComplete && !isSkipped && (
                        <button
                          type="button"
                          onClick={() => startFocusBlock(item)}
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "5px 12px",
                            borderRadius: 6,
                            backgroundColor: "var(--accent)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Focus Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
              No study plan generated yet for today.
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, marginBottom: 16 }}>
              Focusage will analyze your pending tasks, deadlines, and focus patterns to create a structured day.
            </p>
            <button
              type="button"
              onClick={() => handleGeneratePlan()}
              style={{
                padding: "10px 24px",
                borderRadius: 6,
                backgroundColor: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Generate Daily Plan
            </button>
          </div>
        )}

        {/* Productivity Insights Grid */}
        {insights && (
          <section>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
              Verified Productivity Insights
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {insights.insights.map((ins, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "16px 18px",
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    {ins.title}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                    {ins.observation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Task Breakdown Modal */}
      {breakdownModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              maxWidth: 520,
              width: "100%",
              padding: "24px 24px 20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Smart Task Breakdown
              </h3>
              <button
                type="button"
                onClick={() => setBreakdownModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              Break down a large or overwhelming task into sequential, manageable study steps.
            </p>

            <div>
              <label htmlFor="breakdown-task-select" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Select Task to Break Down:
              </label>
              <select
                id="breakdown-task-select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                {tasks
                  .filter((t) => !t.completed)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title} ({t.priority} priority)
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleBreakdownTask}
              disabled={breakdownLoading || !selectedTaskId}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                backgroundColor: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: 12,
                fontWeight: 500,
                cursor: breakdownLoading ? "not-allowed" : "pointer",
              }}
            >
              {breakdownLoading ? "Analyzing with AI…" : "Generate Actionable Steps"}
            </button>

            {/* Generated Subtasks list */}
            {generatedSubtasks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  Suggested Actionable Steps:
                </span>
                {generatedSubtasks.map((st, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border-soft)",
                      backgroundColor: "var(--bg)",
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{st.title}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                      ~{st.estimatedMinutes}m
                    </span>
                  </div>
                ))}

                {breakdownSuccessMsg ? (
                  <p style={{ fontSize: 12, color: "var(--success)", fontWeight: 500, marginTop: 6 }}>
                    ✓ {breakdownSuccessMsg}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleImportSubtasks}
                    disabled={breakdownLoading}
                    style={{
                      marginTop: 8,
                      padding: "9px 16px",
                      borderRadius: 6,
                      backgroundColor: "var(--text-primary)",
                      color: "#fff",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Add These Subtasks to My Tasks
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adaptive Schedule Modal */}
      {adaptModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              maxWidth: 480,
              width: "100%",
              padding: "24px 24px 20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Adapt Schedule to Progress
              </h3>
              <button
                type="button"
                onClick={() => setAdaptModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              Did a task take longer than expected, or do you have less remaining time? Focusage will adapt later blocks non-destructively.
            </p>

            <div>
              <label htmlFor="deviation-reason-input" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                What changed? (optional)
              </label>
              <input
                id="deviation-reason-input"
                value={adaptReason}
                onChange={(e) => setAdaptReason(e.target.value)}
                placeholder="e.g. Prior session took 20 minutes longer"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg)",
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setAdaptModalOpen(false)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdaptPlan}
                disabled={adapting}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: adapting ? "not-allowed" : "pointer",
                }}
              >
                {adapting ? "Calculating…" : "Apply Adaptive Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
