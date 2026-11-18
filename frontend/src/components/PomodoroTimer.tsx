import { apiRequest } from "../lib/api";
import { useEffect, useRef, useState } from "react";

type TimerMode = "work" | "break";
const DURATIONS: Record<TimerMode, number> = {
  work: 25 * 60,       // 25 minutes in seconds (keep original value)
  break: 5 * 60, // 5 minutes
};

// Save a completed focus session for a logged-in user.
async function recordFocusSession() {
  // Guests can use the timer without creating an API request.
  if (!localStorage.getItem("focusage-token")) return;

  try {
    await apiRequest<{ message: string }>("/api/focus-sessions", {
      method: "POST",
      body: JSON.stringify({ durationMinutes: 25 }),
    });
    console.log("Focus session saved successfully!");
  } catch (error) {
    // Don't let an API failure crash the timer.
    console.error("Failed to save focus session:", error);
  }
}

// SVG ring constants.
const RING_RADIUS = 100;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SVG_SIZE = 240;
const CENTER = SVG_SIZE / 2;

function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  // Tracks whether this focus session has already been recorded.
  const sessionRecordedRef = useRef(false);

  // Run one interval while the timer is active.
  useEffect(() => {
    if (!isRunning) return;
    const intervalId = window.setInterval(() => {
      setSecondsLeft((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  // Handle the timer reaching zero separately from the countdown.
  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return;
    setIsRunning(false);
    if (mode === "work" && !sessionRecordedRef.current) {
      sessionRecordedRef.current = true;
      void recordFocusSession();
    }
  }, [secondsLeft, isRunning, mode]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress ring.
  const totalSeconds = DURATIONS[mode];
  const progress = secondsLeft / totalSeconds;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const isWork = mode === "work";
  const isComplete = secondsLeft === 0;

  // Colour tokens.
  const ringColor = isWork ? "var(--accent)" : "#5a9478";
  const ringTrack = isWork ? "var(--accent-light)" : "#daeee5";
  const modeLabel = isWork ? "Focus" : "Break";

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

  const statusText = isComplete
    ? "Session complete — nice work."
    : isRunning
      ? isWork ? "Stay focused." : "Take a breather."
      : "Ready when you are.";

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      {/* Mode selector */}
      <div
        style={{
          display: "inline-flex",
          gap: 2,
          backgroundColor: "var(--bg-inset)",
          borderRadius: 7,
          padding: 3,
          marginBottom: 28,
          border: "1px solid var(--border-soft)",
        }}
      >
        {(["work", "break"] as TimerMode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                padding: "5px 16px",
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.01em",
                backgroundColor: active ? "var(--surface-raised)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.07)" : "none",
                transition: "all 0.15s",
              }}
            >
              {m === "work" ? "Focus · 25 min" : "Break · 5 min"}
            </button>
          );
        })}
      </div>

      {/* SVG Ring */}
      <div style={{ position: "relative", width: SVG_SIZE, height: SVG_SIZE }}>
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          style={{ transform: "rotate(-90deg)" }}
          aria-hidden="true"
        >
          {/* Outer decorative circle (very subtle) */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS + 14}
            fill="none"
            stroke="var(--border-soft)"
            strokeWidth="1"
            opacity="0.7"
          />

          {/* Track ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke={ringTrack}
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Progress ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
          />

          {/* End cap dot at the leading edge */}
          {progress > 0.01 && progress < 0.99 && (
            (() => {
              const angle = (1 - progress) * 2 * Math.PI; // 0 at top after rotation
              const dotX = CENTER + RING_RADIUS * Math.sin(angle);
              const dotY = CENTER - RING_RADIUS * Math.cos(angle);
              return (
                <circle
                  cx={dotX}
                  cy={dotY}
                  r={5}
                  fill={ringColor}
                  style={{ transition: "all 0.9s linear" }}
                />
              );
            })()
          )}
        </svg>

        {/* Centred time + label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
          }}
        >
          <p
            role="timer"
            aria-label={`Time remaining: ${minutes} minutes, ${seconds} seconds`}
            style={{
              fontSize: 46,
              fontWeight: 300,
              letterSpacing: "-0.03em",
              color: isComplete ? "var(--accent)" : "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              transition: "color 0.3s",
            }}
          >
            {formattedTime}
          </p>
          <p
            style={{
              fontSize: 10,
              color: isWork ? "var(--accent-muted)" : "#7aaa94",
              marginTop: 8,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {modeLabel}
          </p>
        </div>
      </div>

      {/* Status line */}
      <p
        style={{
          marginTop: 18,
          fontSize: 12,
          color: isComplete ? "var(--success)" : "var(--text-muted)",
          letterSpacing: "0.01em",
          textAlign: "center",
          transition: "color 0.3s",
          fontStyle: isRunning ? "italic" : "normal",
        }}
      >
        {statusText}
      </p>

      {/* Controls */}
      <div
        style={{
          marginTop: 22,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Start / Pause */}
        <button
          type="button"
          onClick={() => setIsRunning((r) => !r)}
          disabled={isComplete}
          style={{
            backgroundColor: isRunning ? "var(--text-primary)" : "var(--accent)",
            color: "#ffffff",
            border: "none",
            borderRadius: 7,
            padding: "10px 32px",
            fontSize: 13,
            fontWeight: 500,
            cursor: isComplete ? "not-allowed" : "pointer",
            opacity: isComplete ? 0.38 : 1,
            letterSpacing: "0.02em",
            transition: "background-color 0.15s, opacity 0.15s",
            minWidth: 100,
          }}
          onMouseEnter={(e) => {
            if (!isComplete)
              e.currentTarget.style.opacity = "0.88";
          }}
          onMouseLeave={(e) => {
            if (!isComplete)
              e.currentTarget.style.opacity = "1";
          }}
        >
          {isRunning ? "Pause" : "Start"}
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={resetTimer}
          style={{
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 400,
            cursor: "pointer",
            transition: "border-color 0.12s, color 0.12s",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default PomodoroTimer;
