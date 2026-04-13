import React from "react";

interface AzioneBadgeProps {
  azione: "Inserisci" | "Escludi" | "Verifica";
  onClick?: () => void;
}

const BADGE_STYLES: Record<
  AzioneBadgeProps["azione"],
  React.CSSProperties
> = {
  Inserisci: {
    background: "#d1fae5",
    color: "#059669",
  },
  Escludi: {
    background: "#fee2e2",
    color: "#dc2626",
  },
  Verifica: {
    background: "#fef3c7",
    color: "#d97706",
  },
};

export function AzioneBadge({ azione, onClick }: AzioneBadgeProps) {
  return (
    <span
      onClick={onClick}
      style={{
        ...BADGE_STYLES[azione],
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.3px",
        padding: "3px 8px",
        borderRadius: 4,
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {azione}
    </span>
  );
}
