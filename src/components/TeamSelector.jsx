import React from 'react';
import { theme } from '../styles/theme';

export default function TeamSelector({ label, teams, value, onChange, excludeKey }) {
  const teamKeys = Object.keys(teams).filter(k => k !== excludeKey);
  const selected = teams[value];

  return (
    <div>
      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, display: "block" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", fontSize: 13, fontWeight: 600,
            background: theme.card, color: theme.textPrimary,
            border: `1px solid ${theme.border}`, borderRadius: 8,
            cursor: "pointer", appearance: "none",
            borderLeft: selected ? `4px solid ${selected.color}` : `4px solid ${theme.border}`
          }}
        >
          {teamKeys.map(k => (
            <option key={k} value={k}>{teams[k].name} ({teams[k].abbr})</option>
          ))}
        </select>
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: theme.textDim, pointerEvents: "none" }}>▾</div>
      </div>
    </div>
  );
}
