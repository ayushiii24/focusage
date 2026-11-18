import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PomodoroTimer from "../components/PomodoroTimer";
import TaskSection from "../components/TaskSection";
import { apiRequest } from "../lib/api";
import type { ApiTask } from "../types/task";

type FocusSession = {
  _id: string;
  durationMinutes: number;
  completedAt: string;
};

function todayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("focusage-token"))
  );

  // Real stats state — only populated from API for logged-in users.
  const [todayMinutes, setTodayMinutes] = useState<number | null>(null);
  const [todaySessions, setTodaySessions] = useState<number | null>(null);
  const [todayTasksDone, setTodayTasksDone] = useState<number | null>(null);

  // Guest stats derived from localStorage.
  const [guestTasksDone, setGuestTasksDone] = useState<number>(0);
  const [guestTasksTotal, setGuestTasksTotal] = useState<number>(0);

  useEffect(() => {
    function handleAuthChange() {
      const loggedIn = Boolean(localStorage.getItem("focusage-token"));
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        // Reset server stats when logging out.
        setTodayMinutes(null);
        setTodaySessions(null);
        setTodayTasksDone(null);
      }
    }
    window.addEventListener("focusage-auth-change", handleAuthChange);
    return () => window.removeEventListener("focusage-auth-change", handleAuthChange);
  }, []);

  // Fetch today's real stats for logged-in users.
  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    async function loadStats() {
      try {
        const { start, end } = todayRange();

        const [sessionsData, tasksData] = await Promise.all([
          apiRequest<{ sessions: FocusSession[] }>("/api/focus-sessions"),
          apiRequest<{ tasks: ApiTask[] }>("/api/tasks"),
        ]);

        if (cancelled) return;

        // Filter sessions for today.
        const todaySess = sessionsData.sessions.filter((s) => {
          const d = new Date(s.completedAt);
          return d >= start && d <= end;
        });

        setTodaySessions(todaySess.length);
        setTodayMinutes(
          todaySess.reduce((sum, s) => sum + s.durationMinutes, 0)
        );

        // Count tasks completed today.
        const done = tasksData.tasks.filter((t) => t.completed).length;
        setTodayTasksDone(done);
      } catch {
        // Don't surface errors — stats are non-critical.
      }
    }

    void loadStats();

    // Refresh stats whenever a focus session finishes (auth-change also fires on session complete events indirectly via page interaction).
    const interval = window.setInterval(() => void loadStats(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isLoggedIn]);

  // Guest: read task counts from localStorage.
  useEffect(() => {
    if (isLoggedIn) return;

    function readGuestTasks() {
      try {
        const raw = localStorage.getItem("focusage-tasks");
        const tasks: { completed: boolean }[] = raw ? JSON.parse(raw) : [];
        setGuestTasksTotal(tasks.length);
        setGuestTasksDone(tasks.filter((t) => t.completed).length);
      } catch {
        setGuestTasksTotal(0);
        setGuestTasksDone(0);
      }
    }

    readGuestTasks();
    window.addEventListener("storage", readGuestTasks);
    window.addEventListener("focusage-auth-change", readGuestTasks);
    return () => {
      window.removeEventListener("storage", readGuestTasks);
      window.removeEventListener("focusage-auth-change", readGuestTasks);
    };
  }, [isLoggedIn]);

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
          padding: "40px 24px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {/* Page heading */}
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
            Your workspace
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Make today count.
          </h1>
        </div>

        {/* Two-column workspace */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left column: Pomodoro timer */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "36px 32px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <PomodoroTimer />
          </div>

          {/* Right column: Task panel */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "24px 20px",
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <TaskSection />
          </div>
        </div>

        {/* Summary strip — real data only */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <SummaryCard
            label="Focus time today"
            value={
              isLoggedIn
                ? todayMinutes === null
                  ? "—"
                  : `${todayMinutes} min`
                : "Log in to track"
            }
            note={isLoggedIn ? "from completed sessions" : undefined}
            accent={isLoggedIn && todayMinutes !== null && todayMinutes > 0}
          />
          <SummaryCard
            label="Sessions completed"
            value={
              isLoggedIn
                ? todaySessions === null
                  ? "—"
                  : String(todaySessions)
                : "Log in to track"
            }
            note={isLoggedIn ? "today" : undefined}
            accent={isLoggedIn && todaySessions !== null && todaySessions > 0}
          />
          <SummaryCard
            label="Tasks completed"
            value={
              isLoggedIn
                ? todayTasksDone === null
                  ? "—"
                  : String(todayTasksDone)
                : `${guestTasksDone} of ${guestTasksTotal}`
            }
            note={isLoggedIn ? "in your account" : "saved locally"}
            accent={
              isLoggedIn
                ? todayTasksDone !== null && todayTasksDone > 0
                : guestTasksDone > 0
            }
          />
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
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
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: accent ? "var(--accent)" : "var(--text-primary)",
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

export default HomePage;
