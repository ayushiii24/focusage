import React, { useMemo } from "react";
import type { AmbienceConfig } from "./ambiences";

interface VisualEffectsProps {
  effect: AmbienceConfig["visualEffect"];
  accentColor: string;
}

export const VisualEffects: React.FC<VisualEffectsProps> = ({ effect, accentColor }) => {
  // Generate random static particle positions once
  const particles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 6 + Math.random() * 10,
      delay: Math.random() * 5,
      opacity: 0.2 + Math.random() * 0.6,
    }));
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 3,
    }));
  }, []);

  const raindrops = useMemo(() => {
    return Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 0.6 + Math.random() * 0.5,
      delay: Math.random() * 1.5,
      length: 18 + Math.random() * 26,
      opacity: 0.2 + Math.random() * 0.45,
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {/* 1. Rain Effect */}
      {effect === "rain" && (
        <div style={{ position: "absolute", inset: 0 }}>
          {raindrops.map((r) => (
            <div
              key={r.id}
              style={{
                position: "absolute",
                left: `${r.left}%`,
                top: "-10%",
                width: 1.5,
                height: r.length,
                background: `linear-gradient(to bottom, rgba(255,255,255,0), ${accentColor})`,
                opacity: r.opacity,
                animation: `focusage-rain ${r.duration}s linear infinite`,
                animationDelay: `${r.delay}s`,
              }}
            />
          ))}
          {/* Subtle mist overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 180,
              background: "linear-gradient(to top, rgba(14, 19, 27, 0.4), transparent)",
            }}
          />
        </div>
      )}

      {/* 2. Stars Effect */}
      {effect === "stars" && (
        <div style={{ position: "absolute", inset: 0 }}>
          {stars.map((s) => (
            <div
              key={s.id}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: `0 0 ${s.size * 2}px ${accentColor}`,
                animation: `focusage-twinkle ${s.duration}s ease-in-out infinite`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 3. Fireflies / Bioluminescence Effect */}
      {effect === "fireflies" && (
        <div style={{ position: "absolute", inset: 0 }}>
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size * 1.5,
                height: p.size * 1.5,
                borderRadius: "50%",
                backgroundColor: accentColor,
                boxShadow: `0 0 12px ${accentColor}`,
                opacity: p.opacity,
                animation: `focusage-float ${p.duration}s ease-in-out infinite alternate, focusage-pulse ${p.duration * 0.7}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 4. Midnight Library / Warm Dust Drift */}
      {effect === "dust" && (
        <div style={{ position: "absolute", inset: 0 }}>
          {particles.slice(0, 20).map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size * 0.8,
                height: p.size * 0.8,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 245, 230, 0.5)",
                boxShadow: `0 0 6px rgba(255, 230, 200, 0.4)`,
                opacity: p.opacity * 0.7,
                animation: `focusage-drift ${p.duration * 1.4}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 5. Café Steam & Warmth */}
      {effect === "cafe_steam" && (
        <div style={{ position: "absolute", inset: 0 }}>
          {particles.slice(0, 16).map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${20 + (p.x * 0.6)}%`,
                top: `${40 + (p.y * 0.5)}%`,
                width: p.size * 2,
                height: p.size * 2,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                opacity: p.opacity * 0.35,
                filter: "blur(4px)",
                animation: `focusage-rise ${p.duration * 0.8}s ease-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 6. Golden Hour Warm Rays */}
      {effect === "golden_light" && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {/* Diagonal sunbeam */}
          <div
            style={{
              position: "absolute",
              top: "-20%",
              right: "-10%",
              width: "60%",
              height: "140%",
              transform: "rotate(-25deg)",
              background: "linear-gradient(to right, transparent, rgba(244, 178, 102, 0.08) 50%, transparent)",
              pointerEvents: "none",
            }}
          />
          {particles.slice(0, 18).map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                backgroundColor: accentColor,
                boxShadow: `0 0 8px ${accentColor}`,
                opacity: p.opacity * 0.6,
                animation: `focusage-float ${p.duration}s ease-in-out infinite alternate`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
