import React, { useState } from "react";
import { useTimer } from "../../context/TimerContext";

export const AudioMixer: React.FC = () => {
  const { soundVolumes, updateSoundVolume, isMuted, toggleMute } = useTimer();
  const [isOpen, setIsOpen] = useState(false);

  const channels: { key: "lofi" | "rain" | "wind" | "fire" | "cafe"; label: string; icon: string; desc: string }[] = [
    { key: "lofi", label: "Lo-Fi Melodies", icon: "🎵", desc: "Soothing chord progressions" },
    { key: "rain", label: "Gentle Rain", icon: "🌧️", desc: "Soft rainfall cadence" },
    { key: "wind", label: "Night Wind", icon: "🍃", desc: "Calming breeze modulation" },
    { key: "fire", label: "Fireplace", icon: "🔥", desc: "Warm ambient hearth crackle" },
    { key: "cafe", label: "Café Murmur", icon: "☕", desc: "Muffled coffeehouse warmth" },
  ];

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Ambience & Music Deck"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          backgroundColor: isOpen ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          borderRadius: 24,
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.01em",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: 14 }}>{isMuted ? "🔇" : "🎧"}</span>
        <span>Sound Deck</span>
      </button>

      {/* Popover slider deck */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Sound Deck Mixer"
          style={{
            position: "absolute",
            top: "calc(100% + 12px)",
            right: 0,
            width: 320,
            maxHeight: "80vh",
            overflowY: "auto",
            backgroundColor: "#161b24",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.75)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.12)", paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎧</span>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", margin: 0, letterSpacing: "-0.01em" }}>
                  Ambience & Music Deck
                </h3>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                  Adjust audio layers independently
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              style={{
                backgroundColor: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(130, 170, 255, 0.18)",
                color: isMuted ? "#fca5a5" : "#93c5fd",
                border: isMuted ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(130, 170, 255, 0.4)",
                borderRadius: 16,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              {isMuted ? "Unmute All" : "Mute All"}
            </button>
          </div>

          {/* Sound Channels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {channels.map((ch) => {
              const val = soundVolumes[ch.key];
              const isChannelActive = val > 0.01 && !isMuted;
              return (
                <div
                  key={ch.key}
                  style={{
                    backgroundColor: isChannelActive ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.02)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{ch.icon}</span>
                        {ch.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af", display: "block", marginTop: 1 }}>
                        {ch.desc}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isChannelActive ? "#93c5fd" : "#6b7280",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {Math.round(val * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={val}
                    onChange={(e) => updateSoundVolume(ch.key, parseFloat(e.target.value))}
                    aria-label={ch.label}
                    style={{
                      width: "100%",
                      accentColor: "#82aaff",
                      height: 6,
                      borderRadius: 3,
                      cursor: "pointer",
                      display: "block",
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Master volume slider */}
          <div
            style={{
              paddingTop: 12,
              borderTop: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#ffffff", fontWeight: 600 }}>Master Volume</span>
              <span style={{ fontSize: 12, color: "#93c5fd", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(soundVolumes.master * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={soundVolumes.master}
              onChange={(e) => updateSoundVolume("master", parseFloat(e.target.value))}
              aria-label="Master Volume"
              style={{
                width: "100%",
                accentColor: "#a898e0",
                height: 6,
                borderRadius: 3,
                cursor: "pointer",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
