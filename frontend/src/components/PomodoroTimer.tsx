import { useTimer, DURATIONS, type TimerMode } from "../context/TimerContext";

//svg ring constants
const RING_RADIUS = 120;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SVG_SIZE = 344;
const CENTER = SVG_SIZE / 2;

function PomodoroTimer() {
  const {
    mode,
    secondsLeft,
    isRunning,
    toggleTimer,
    resetTimer,
    switchMode,
    setIsExpanded,
    activeTaskTitle,
  } = useTimer();

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalSeconds = DURATIONS[mode];
  const progress = secondsLeft / totalSeconds;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const isWork = mode === "work";
  const isComplete = secondsLeft === 0;

  const ringColor = isWork ? "var(--accent)" : "#5a9478";
  const ringTrack = isWork ? "var(--accent-light)" : "#daeee5";
  const modeLabel = isWork ? "Focus" : "Break";

  const statusText = isComplete
    ? "Session complete — nice work."
    : isRunning
      ? isWork ? (activeTaskTitle ? `Focusing: ${activeTaskTitle}` : "Stay focused!!") : "Take a breather :)"
      : "Ready when you are.";

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        position: "relative",
      }}
    >
      {/* top row: mode selector + expand button */}
      <div
        className="pomodoro-mode-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: 30,
        }}
      >
        {/* Mode selector pills */}
        <div
          style={{
            display: "inline-flex",
            gap: 3,
            backgroundColor: "var(--bg-inset)",
            borderRadius: 7,
            padding: 1,
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
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  padding: "8px 15px",
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

        {/* Expand to Immersive Mode button */}
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          title="Expand to Immersive Focus Mode"
          aria-label="Expand to Immersive Focus Mode"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-raised)",
            color: "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.12s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--accent-light)";
            e.currentTarget.style.color = "var(--accent)";
            e.currentTarget.style.borderColor = "var(--accent-ring)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--surface-raised)";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          <span>Expand</span>
        </button>
      </div>

      {/* SVG Ring */}
      <div className="pomodoro-ring" style={{ position: "relative", width: SVG_SIZE, height: SVG_SIZE }}>
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          style={{ transform: "rotate(-90deg)" }}
          aria-hidden="true"
        >
          {/* Outer subtle decorative ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS + 15}
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
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Progress ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
          />

          {/* End cap dot at leading edge */}
          {progress > 0.01 && progress < 0.99 && (
            (() => {
              const angle = (1 - progress) * 2 * Math.PI;
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

        {/* Centered time + label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            role="timer"
            aria-label={`Time remaining: ${minutes} minutes, ${seconds} seconds`}
            style={{
              fontSize: 68,
              fontWeight: 350,
              letterSpacing: "-0.045em",
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
              fontSize: 12,
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
        className="pomodoro-status"
        style={{
          marginTop: 22,
          fontSize: 15,
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
        className="pomodoro-controls"
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Start / Pause */}
        <button
          type="button"
          onClick={toggleTimer}
          disabled={isComplete}
          style={{
            backgroundColor: isRunning ? "var(--text-primary)" : "var(--accent)",
            color: "#ffffff",
            border: "none",
            borderRadius: 7,
            padding: "13px 38px",
            fontSize: 15,
            fontWeight: 600,
            cursor: isComplete ? "not-allowed" : "pointer",
            opacity: isComplete ? 0.38 : 1,
            letterSpacing: "0.02em",
            transition: "background-color 0.15s, opacity 0.15s",
            minWidth: 12,
          }}
          onMouseEnter={(e) => {
            if (!isComplete) e.currentTarget.style.opacity = "0.88";
          }}
          onMouseLeave={(e) => {
            if (!isComplete) e.currentTarget.style.opacity = "1";
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
            padding: "13px 24px",
            fontSize: 15,
            fontWeight: 500,
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
