import React from "react";

// Цветовая индикация: зелёный = норма, жёлтый = предупреждение, красный = нарушение
const TARGETS = {
  scc: { max: 200, warn: 150 },
  bact_count_lab: { max: 50, warn: 30 },
  coliforms: { max: 100, warn: 50 },
  fat_pct: { min: 3.6 },
  protein_pct: { min: 3.2 },
  clostridium_spores: { max: 1000, warn: 700 },
};

export function getIndicatorStatus(key, value) {
  const t = TARGETS[key];
  if (!t || value == null) return "neutral";
  if (t.max !== undefined && value > t.max) return "danger";
  if (t.warn !== undefined && value > t.warn) return "warning";
  if (t.min !== undefined && value < t.min) return "danger";
  return "ok";
}

const colors = {
  ok: { bg: "#e8f5e9", color: "#2e7d32" },
  warning: { bg: "#fff8e1", color: "#f57f17" },
  danger: { bg: "#ffebee", color: "#c62828" },
  neutral: { bg: "#f5f5f5", color: "#757575" },
};

export default function QualityBadge({ value, indicator, unit, label }) {
  const status = getIndicatorStatus(indicator, value);
  const style = colors[status];
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column",
      background: style.bg, color: style.color,
      borderRadius: 8, padding: "6px 12px", minWidth: 90,
      fontSize: 12,
    }}>
      <span style={{ fontWeight: 700, fontSize: 16 }}>
        {value != null ? value.toFixed(value < 10 ? 2 : 0) : "—"}
        {unit && <span style={{ fontSize: 11, marginLeft: 3 }}>{unit}</span>}
      </span>
      {label && <span style={{ opacity: 0.75, marginTop: 2 }}>{label}</span>}
    </div>
  );
}
