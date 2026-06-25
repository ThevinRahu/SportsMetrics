import React from 'react';
import { theme, ratingColor } from '../styles/theme';
import { momentumScore } from '../analytics/bayesian';

export default function StandingsTable({ teams, tournament }) {
  const sorted = Object.entries(teams).sort((a, b) => {
    // Sort by points, then point differential
    const ptsA = a[1].season?.pts || 0;
    const ptsB = b[1].season?.pts || 0;
    if (ptsB !== ptsA) return ptsB - ptsA;
    return (b[1].season?.pd || 0) - (a[1].season?.pd || 0);
  });

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: theme.surface }}>
            <th style={thStyle}>#</th>
            <th style={{ ...thStyle, textAlign: "left" }}>Team</th>
            <th style={thStyle}>P</th>
            <th style={thStyle}>W</th>
            <th style={thStyle}>L</th>
            <th style={thStyle}>PF</th>
            <th style={thStyle}>PA</th>
            <th style={thStyle}>PD</th>
            <th style={thStyle}>TF</th>
            <th style={thStyle}>TB</th>
            <th style={thStyle}>LB</th>
            <th style={{ ...thStyle, fontWeight: 700 }}>Pts</th>
            <th style={thStyle}>Elo</th>
            <th style={thStyle}>Form</th>
            <th style={thStyle}>Momentum</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([key, team], index) => {
            const momentum = momentumScore(team);
            const isPlayoff = index < (tournament?.playoffSpots || 4);
            const s = team.season || {};
            return (
              <tr key={key} style={{ 
                borderBottom: `1px solid ${theme.border}`,
                background: isPlayoff ? "rgba(16, 185, 129, 0.03)" : "transparent"
              }}>
                <td style={{ ...tdStyle, fontWeight: 700, color: isPlayoff ? theme.green : theme.textDim }}>
                  {index + 1}
                </td>
                <td style={{ ...tdStyle, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 22, borderRadius: 2, background: team.color }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{team.name}</div>
                      <div style={{ fontSize: 9, color: theme.textDim }}>{team.country}</div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>{s.played || 0}</td>
                <td style={{ ...tdStyle, color: theme.green }}>{s.won || 0}</td>
                <td style={{ ...tdStyle, color: (s.lost || 0) > 0 ? theme.red : theme.textDim }}>{s.lost || 0}</td>
                <td style={tdStyle}>{s.pf || 0}</td>
                <td style={tdStyle}>{s.pa || 0}</td>
                <td style={{ ...tdStyle, color: (s.pd || 0) >= 0 ? theme.green : theme.red, fontWeight: 600 }}>
                  {(s.pd || 0) >= 0 ? "+" : ""}{s.pd || 0}
                </td>
                <td style={tdStyle}>{s.tries_for || 0}</td>
                <td style={tdStyle}>{s.try_bonus || 0}</td>
                <td style={tdStyle}>{s.loss_bonus || 0}</td>
                <td style={{ ...tdStyle, fontWeight: 700, fontSize: 13 }}>{s.pts || 0}</td>
                <td style={{ ...tdStyle, color: theme.textSecondary }}>{team.elo}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    {(team.form?.last5 || []).map((r, i) => (
                      <div key={i} style={{
                        width: 16, height: 16, borderRadius: 3,
                        background: r === "W" ? theme.greenDark : theme.redDark,
                        color: r === "W" ? theme.greenText : theme.redText,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 700
                      }}>{r}</div>
                    ))}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                    <div style={{ 
                      width: 32, height: 4, background: theme.surface, borderRadius: 2, overflow: "hidden"
                    }}>
                      <div style={{ width: `${momentum}%`, height: "100%", background: ratingColor(momentum), borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: ratingColor(momentum) }}>{momentum}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tournament?.playoffSpots && (
        <div style={{ padding: "8px 16px", fontSize: 9, color: theme.textDim, borderTop: `1px solid ${theme.border}` }}>
          <span style={{ color: theme.green }}>■</span> Top {tournament.playoffSpots} qualify for playoffs
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 600,
  color: theme.textDim, letterSpacing: 0.5, textTransform: "uppercase"
};
const tdStyle = {
  padding: "10px 8px", textAlign: "center", color: theme.textSecondary
};
