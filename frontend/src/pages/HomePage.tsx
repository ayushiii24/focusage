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

  //real users
  const [todayMinutes, setTodayMinutes] = useState<number | null>(null);
  const [todaySessions, setTodaySessions] = useState<number | null>(null);
  const [todayTasksDone, setTodayTasksDone] = useState<number | null>(null);

  //guest states from localStorage.
  const [guestTasksDone, setGuestTasksDone] = useState<number>(0);
  const [guestTasksTotal, setGuestTasksTotal] = useState<number>(0);

  useEffect(() => {
    function handleAuthChange() {
      const loggedIn = Boolean(localStorage.getItem("focusage-token"));
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        //reset sv stats when logged out
        setTodayMinutes(null);
        setTodaySessions(null);
        setTodayTasksDone(null);
      }
    }
    window.addEventListener("focusage-auth-change", handleAuthChange);
    return () => window.removeEventListener("focusage-auth-change", handleAuthChange);
  }, []);

  //todays stats
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

        //todays session filter
        const todaySess = sessionsData.sessions.filter((s) => {
          const d = new Date(s.completedAt);
          return d >= start && d <= end;
        });

        setTodaySessions(todaySess.length);
        setTodayMinutes(
          todaySess.reduce((sum, s) => sum + s.durationMinutes, 0)
        );

        //todays completed task count
        const done = tasksData.tasks.filter((t) => t.completed).length;
        setTodayTasksDone(done);
      } catch {

      }
    }

    void loadStats();

    const handleSessionComplete = () => { //refresh stats when a focus session completes
      void loadStats();
    };
    const handleTasksChange = () => { void loadStats(); };
    window.addEventListener("focusage-session-complete", handleSessionComplete);
    window.addEventListener("focusage-tasks-change", handleTasksChange);
    const interval = window.setInterval(() => void loadStats(), 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focusage-session-complete", handleSessionComplete);
      window.removeEventListener("focusage-tasks-change", handleTasksChange);
      window.clearInterval(interval);
    };
  }, [isLoggedIn]);

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
    window.addEventListener("focusage-tasks-change", readGuestTasks);
    window.addEventListener("storage", readGuestTasks);
    window.addEventListener("focusage-auth-change", readGuestTasks);
    return () => {
      window.removeEventListener("focusage-tasks-change", readGuestTasks);
      window.removeEventListener("storage", readGuestTasks);
      window.removeEventListener("focusage-auth-change", readGuestTasks);
    };
  }, [isLoggedIn]);

  return (
    <div className="page-shell"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />

      <main className="page-content home-page-content">
        <header className="home-page-heading">
          <h1>Make today count.</h1>
        </header>

        <div className="home-dashboard-grid">
          <section className="home-dashboard-progress" aria-labelledby="today-progress-heading">
            <h2 id="today-progress-heading">Today’s progress</h2>
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
          </section>

          <section className="home-dashboard-timer" aria-label="Pomodoro timer">
            <PomodoroTimer />
          </section>

          <section className="home-dashboard-tasks" aria-label="Task checklist">
            <TaskSection />
          </section>
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
    <div className="home-summary-item">
      <p
        style={{
          fontSize: 14,
          color: "var(--text-muted)",
          letterSpacing: "0.03em",
          marginBottom: 0,
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
            fontSize: 13,
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
