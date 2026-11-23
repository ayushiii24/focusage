import React from "react";
import { AMBIENCES, type AmbienceId } from "./ambiences";

interface AmbienceSelectorProps {
  currentId: AmbienceId;
  onSelect: (id: AmbienceId) => void;
}

export const AmbienceSelector: React.FC<AmbienceSelectorProps> = ({ currentId, onSelect }) => {
  const ambienceList = Object.values(AMBIENCES);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 6px",
        backgroundColor: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 30,
        border: "1px solid rgba(255, 255, 255, 0.12)",
        maxWidth: "100%",
        overflowX: "auto",
      }}
    >
      {ambienceList.map((amb) => {
        const isSelected = amb.id === currentId;
        return (
          <button
            key={amb.id}
            type="button"
            onClick={() => onSelect(amb.id)}
            title={amb.tagline}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: isSelected ? 500 : 400,
              backgroundColor: isSelected ? "rgba(255, 255, 255, 0.15)" : "transparent",
              color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.65)",
              boxShadow: isSelected ? `0 0 12px ${amb.theme.accentGlow}` : "none",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              whiteSpace: "nowrap",
            }}
          >
            {/* Color indicator dot */}
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: amb.theme.accent,
                boxShadow: isSelected ? `0 0 6px ${amb.theme.accent}` : "none",
              }}
            />
            {amb.name}
          </button>
        );
      })}
    </div>
  );
};
