import { apiRequest } from "../lib/api";
import { useEffect, useRef, useState } from "react";

type TimerMode = "work" | "break";
const DURATIONS: Record<TimerMode, number> = {
  work: 5, // 25 minutes, stored in seconds
  break: 5 * 60, // 5 minutes
};
// Save a completed focus session for a logged-in user.
async function recordFocusSession() {
  // Guests can use the timer without creating an API request.
  if (!localStorage.getItem("focusage-token")) return;

  try {
    await apiRequest<{ message: string }>("/api/focus-sessions", {
      method: "POST",
      body: JSON.stringify({
        durationMinutes: 25,
      }),
    });

    console.log("Focus session saved successfully!");
  } catch (error) {
    // Don't let an API failure crash the timer.
    console.error("Failed to save focus session:", error);
  }
}
function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  // Tracks whether this focus session has already been recorded.
  const sessionRecordedRef = useRef(false);

  // Run one interval while the timer is active.
  useEffect(() => {
    // Don't create an interval when paused.
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((previous) => {
        // Stop at zero; never allow negative time.
        return previous <= 1 ? 0 : previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isRunning]);
  // Handle the timer reaching zero separately from the countdown.
  // Stop the timer when it reaches zero.
  useEffect(() => {
    // Only handle the moment the timer reaches zero.
    if (secondsLeft !== 0 || !isRunning) return;

    // Stop the countdown.
    setIsRunning(false);

    // Record completed focus sessions, never break sessions.
    if (mode === "work" && !sessionRecordedRef.current) {
      // Set the guard BEFORE making the API request.
      sessionRecordedRef.current = true;

      void recordFocusSession();
    }
  }, [secondsLeft, isRunning, mode]);

  // Convert seconds into MM:SS for display.
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const formattedTime =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  function switchMode(nextMode: TimerMode) {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(DURATIONS[nextMode]);
    sessionRecordedRef.current = false;
  }

  function resetTimer() {
    setIsRunning(false);
    setSecondsLeft(DURATIONS[mode]);
    sessionRecordedRef.current = false;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-violet-600">FOCUS TIMER</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => switchMode("work")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === "work"
            ? "bg-violet-100 text-violet-700"
            : "text-slate-500 hover:bg-slate-100"
            }`}
        >
          Focus · 25 min
        </button>

        <button
          type="button"
          onClick={() => switchMode("break")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === "break"
            ? "bg-emerald-100 text-emerald-700"
            : "text-slate-500 hover:bg-slate-100"
            }`}
        >
          Break · 5 min
        </button>
      </div>

      <p
        className="mt-6 text-center text-6xl font-bold tabular-nums text-slate-900"
        role="timer"
        aria-label={`Time remaining: ${minutes} minutes, ${seconds} seconds`}
      >
        {formattedTime}
      </p>

      <p className="mt-3 text-center text-sm text-slate-500">
        {secondsLeft === 0
          ? "Session complete! Nice work."
          : isRunning
            ? mode === "work" ? "Stay with your task." : "Take a breather."
            : "Ready when you are."}
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsRunning((running) => !running)}
          disabled={secondsLeft === 0}
          className="rounded-xl bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Pause" : "Start"}
        </button>

        <button
          type="button"
          onClick={resetTimer}
          className="rounded-xl border border-slate-200 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default PomodoroTimer;