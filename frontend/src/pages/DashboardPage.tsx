import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiRequest } from "../lib/api";
import type { ApiTask } from "../types/task";

type FocusSession = {
  _id: string;
  durationMinutes: number;
  completedAt: string;
};

// Returns the Monday of the week containing `date`.
function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns the ISO date string "YYYY-MM-DD" for a Date.
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Day labels for the weekly chart.
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function DashboardPage() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem("focusage-token"));

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        const [sessionsData, tasksData] = await Promise.all([
          apiRequest<{ sessions: FocusSession[] }>("/api/focus-sessions"),
          apiRequest<{ tasks: ApiTask[] }>("/api/tasks"),
        ]);

        if (!cancelled) {
          setSessions(sessionsData.sessions);
          setTasks(tasksData.tasks);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, navigate]);

  // Derived statistics — only from real data.
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalSessions = sessions.length;
  const completedTasks = tasks.filter((t) => t.completed).length;

  // Weekly focus time (Mon–Sun of the current week).
  const today = new Date();
  const ws = weekStart(today);

  // Build a map of day-index (0=Mon…6=Sun) → minutes.
  const weekMinutes: number[] = new Array(7).fill(0);
  sessions.forEach((s) => {
    const d = new Date(s.completedAt);
    const diff = Math.floor(
      (d.getTime() - ws.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff <= 6) {
      weekMinutes[diff] += s.durationMinutes;
    }
  });

  const maxWeekMinutes = Math.max(...weekMinutes, 1); // avoid div-by-zero

  // Current streak: consecutive days with at least one session, ending today.
  function computeStreak(): number {
    if (sessions.length === 0) return 0;

    // Collect unique days with sessions.
    const daysWithSession = new Set(
      sessions.map((s) => isoDate(new Date(s.completedAt)))
    );

    let streak = 0;
    const cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);

    // If today has no session yet, don't count it but still check yesterday.
    while (true) {
      const key = isoDate(cursor);
      if (daysWithSession.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  const streak = computeStreak();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Navbar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 120,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Navbar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 120,
            fontSize: 13,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: 1100,
          width: "100%",
          margin: "0 auto",
          padding: "40px 24px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Heading */}
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 6,
            }}
          >
            Overview
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Your progress
          </h1>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <StatCard
            label="Total focus time"
            value={
              totalMinutes >= 60
                ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
                : `${totalMinutes} min`
            }
          />
          <StatCard
            label="Sessions completed"
            value={String(totalSessions)}
          />
          <StatCard
            label="Tasks completed"
            value={String(completedTasks)}
          />
          <StatCard
            label="Current streak"
            value={streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "—"}
            note={streak === 0 ? "No sessions today yet" : undefined}
          />
        </div>

        {/* Weekly activity chart */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "24px 24px 20px",
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
              letterSpacing: "-0.01em",
            }}
          >
            This week
          </h2>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 20,
            }}
          >
            Focus minutes per day (Mon–Sun)
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 8,
              alignItems: "flex-end",
              height: 120,
            }}
          >
            {weekMinutes.map((mins, i) => {
              const barHeight = Math.round((mins / maxWeekMinutes) * 100);
              const isToday =
                isoDate(new Date(ws.getTime() + i * 86400000)) ===
                isoDate(today);

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    gap: 6,
                  }}
                >
                  {/* Bar */}
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(barHeight, 2)}%`,
                      backgroundColor:
                        mins > 0
                          ? isToday
                            ? "var(--accent)"
                            : "var(--accent-light)"
                          : "var(--border-soft)",
                      borderRadius: 4,
                      transition: "height 0.3s",
                      position: "relative",
                    }}
                    title={`${DAY_LABELS[i]}: ${mins} min`}
                  />

                  {/* Minutes label */}
                  {mins > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        position: "absolute",
                        // The span flow naturally below the bar via gap.
                      }}
                    />
                  )}

                  {/* Day label */}
                  <span
                    style={{
                      fontSize: 11,
                      color: isToday ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: isToday ? 600 : 400,
                    }}
                  >
                    {DAY_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: "var(--accent)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Today
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: "var(--accent-light)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Other days
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: "var(--border-soft)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                No sessions
              </span>
            </div>
          </div>
        </div>

        {/* Recent sessions list */}
        {sessions.length > 0 && (
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "20px 24px",
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 14,
                letterSpacing: "-0.01em",
              }}
            >
              Recent sessions
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sessions.slice(0, 8).map((s) => {
                const d = new Date(s.completedAt);
                const dateStr = d.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const timeStr = d.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={s._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border-soft)",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {s.durationMinutes} min focus session
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {dateStr} at {timeStr}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--accent)",
                        backgroundColor: "var(--accent-light)",
                        padding: "2px 8px",
                        borderRadius: 3,
                      }}
                    >
                      {s.durationMinutes}m
                    </span>
                  </div>
                );
              })}
            </div>

            {sessions.length > 8 && (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 10,
                }}
              >
                Showing 8 of {sessions.length} sessions
              </p>
            )}
          </div>
        )}

        {sessions.length === 0 && (
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              No focus sessions recorded yet. Complete a Pomodoro on the home
              page to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "16px 18px",
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          letterSpacing: "0.03em",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {note && (
        <p
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          {note}
        </p>
      )}
    </div>
  );
}

export default DashboardPage;
