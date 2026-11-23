import React, { useEffect } from "react";
import { useTimer, DURATIONS, type TimerMode } from "../../context/TimerContext";
import { AMBIENCES } from "./ambiences";
import { VisualEffects } from "./VisualEffects";
import { AmbienceSelector } from "./AmbienceSelector";
import { AudioMixer } from "./AudioMixer";

export const FocusModeExpanded: React.FC = () => {
  const {
    mode,
    secondsLeft,
    isRunning,
    isExpanded,
    selectedAmbience,
    activeTaskTitle,
    toggleTimer,
    resetTimer,
    switchMode,
    setIsExpanded,
    setSelectedAmbience,
  } = useTimer();

  const ambience = AMBIENCES[selectedAmbience] || AMBIENCES["rainy-night"];
  const { theme } = ambience;

  // Escape key exits focus mode, Space key toggles timer
  useEffect(() => {
    if (!isExpanded) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsExpanded(false);
      } else if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggleTimer();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, setIsExpanded, toggleTimer]);

  if (!isExpanded) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalSeconds = DURATIONS[mode];
  const progress = secondsLeft / totalSeconds;
  const ringRadius = 140;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference * (1 - progress);

  const isWork = mode === "work";
  const isComplete = secondsLeft === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Expanded Focus Mode"
      className="focus-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: theme.bgGradient,
        color: theme.textPrimary,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 32px",
        overflow: "hidden",
        transition: "background 0.8s ease",
      }}
    >
      {/* Background visual effects (Rain, Stars, Fireflies, Dust, Steam, Golden Light) */}
      <VisualEffects effect={ambience.visualEffect} accentColor={theme.accent} />

      {/* Top Bar: Brand, Ambience Selector, and Collapse Action */}
      <header
        style={{
          position: "relative",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: theme.textPrimary,
            }}
          >
            Focusage
          </span>
          <span
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 12,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              color: theme.textSecondary,
              letterSpacing: "0.02em",
            }}
          >
            {ambience.name}
          </span>
        </div>

        {/* Ambience selector pill list */}
        <AmbienceSelector currentId={selectedAmbience} onSelect={setSelectedAmbience} />

        {/* Right action buttons: Sound Deck & Exit Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AudioMixer />

          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label="Exit immersive focus mode (Esc)"
            title="Exit Focus Mode (Esc)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 24,
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.35)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
            </svg>
            <span>Exit Focus</span>
          </button>
        </div>
      </header>

      {/* Main Focus Stage */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          margin: "auto 0",
        }}
      >
        {/* Active Task Tag (if any) */}
        {activeTaskTitle && (
          <div
            style={{
              marginBottom: 16,
              padding: "6px 16px",
              borderRadius: 20,
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              backdropFilter: "blur(10px)",
              fontSize: 13,
              color: theme.accent,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 4px 20px ${theme.accentGlow}`,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: theme.accent }} />
            <span>Focusing on: {activeTaskTitle}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(10px)",
            borderRadius: 24,
            padding: 4,
            marginBottom: 36,
            border: `1px solid ${theme.border}`,
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
                  fontWeight: active ? 600 : 400,
                  padding: "6px 20px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  backgroundColor: active ? theme.surface : "transparent",
                  color: active ? theme.textPrimary : theme.textSecondary,
                  boxShadow: active ? `0 2px 10px ${theme.accentGlow}` : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {m === "work" ? "Deep Focus · 25m" : "Short Break · 5m"}
              </button>
            );
          })}
        </div>

        {/* Large SVG Timer Ring */}
        <div className="focus-ring-large" style={{ position: "relative", width: 340, height: 340 }}>
          <svg
            width={340}
            height={340}
            viewBox="0 0 340 340"
            style={{ transform: "rotate(-90deg)" }}
            aria-hidden="true"
          >
            {/* Outer subtle halo ring */}
            <circle
              cx={170}
              cy={170}
              r={ringRadius + 18}
              fill="none"
              stroke={theme.border}
              strokeWidth="1"
              opacity="0.4"
            />

            {/* Background track */}
            <circle
              cx={170}
              cy={170}
              r={ringRadius}
              fill="none"
              stroke={theme.ringTrack}
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Glowing progress ring */}
            <circle
              cx={170}
              cy={170}
              r={ringRadius}
              fill="none"
              stroke={theme.accent}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease",
                filter: `drop-shadow(0 0 8px ${theme.accent})`,
              }}
            />
          </svg>

          {/* Centered Time & Label */}
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
                fontWeight: 300,
                letterSpacing: "-0.04em",
                color: isComplete ? theme.accent : theme.textPrimary,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                textShadow: `0 2px 20px ${theme.accentGlow}`,
              }}
            >
              {formattedTime}
            </p>
            <p
              style={{
                fontSize: 12,
                color: theme.accent,
                marginTop: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {isWork ? "Focus Session" : "Rest & Reset"}
            </p>
          </div>
        </div>

        {/* Status Line */}
        <p
          style={{
            marginTop: 24,
            fontSize: 13,
            color: isComplete ? "#5a9478" : theme.textSecondary,
            letterSpacing: "0.02em",
            textAlign: "center",
            fontStyle: isRunning ? "italic" : "normal",
          }}
        >
          {isComplete
            ? "Session complete. Take a well-deserved breath."
            : isRunning
              ? isWork ? "Immerse yourself. You're making progress." : "Rest your eyes and unwind."
              : "Set your intention and begin."}
        </p>

        {/* Control Buttons */}
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={toggleTimer}
            disabled={isComplete}
            style={{
              backgroundColor: isRunning ? "rgba(255, 255, 255, 0.9)" : theme.accent,
              color: isRunning ? "#111" : "#ffffff",
              border: "none",
              borderRadius: 30,
              padding: "14px 44px",
              fontSize: 14,
              fontWeight: 600,
              cursor: isComplete ? "not-allowed" : "pointer",
              opacity: isComplete ? 0.4 : 1,
              letterSpacing: "0.02em",
              boxShadow: `0 4px 20px ${theme.accentGlow}`,
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              minWidth: 140,
            }}
            onMouseEnter={(e) => {
              if (!isComplete) e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              if (!isComplete) e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {isRunning ? "Pause" : "Start"}
          </button>

          <button
            type="button"
            onClick={resetTimer}
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: 30,
              padding: "14px 28px",
              fontSize: 14,
              fontWeight: 400,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.textPrimary;
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.textSecondary;
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            Reset
          </button>
        </div>
      </main>

      {/* Footer hint */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: theme.textSecondary,
          opacity: 0.7,
        }}
      >
        <span>Press <kbd style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.1)" }}>Space</kbd> to toggle, <kbd style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.1)" }}>Esc</kbd> to exit</span>
        <span>Focusage Immersive Focus Environment</span>
      </footer>
    </div>
  );
};
