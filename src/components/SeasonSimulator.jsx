import React, { useState, useMemo } from 'react';
import { theme, ratingColor } from '../styles/theme';
import { simulateSeason } from '../analytics/monteCarlo';

export default function SeasonSimulator({ teams, tournament }) {
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);

  const runSimulation = () => {
    setSimulating(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const remainingRounds = Math.max(0, (tournament?.totalRounds || 6) - (tournament?.round || 0));
      const simResults = simulateSeason(teams, tournament?.playoffSpots || 4, Math.max(1, remainingRounds));
      setResults(simResults);
      setSimulating(false);
    }, 100);
  };

  const sortedResults = useMemo(() => {
    if (!results) return [];
    return Object.entries(results)
      .sort((a, b) => b[1].champion - a[1].champion);
  }, [results]);

  return (
    <div>
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
        padding: 20, marginBottom: 20
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Monte Carlo Season Simulator</div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
            5,000 simulations • Projects final standings, playoff odds, and championship probability
          </div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>
            Based on current Elo ratings, form, and performance metrics
          </div>
        </div>
        <button
          onClick={runSimulation}
          disabled={simulating}
          style={{
            padding: "12px 24px", fontSize: 12, fontWeight: 700,
            background: simulating ? theme.surface : theme.gradientPrimary,
            color: simulating ? theme.textDim : "#000",
            border: "none", borderRadius: 8, cursor: simulating ? "not-allowed" : "pointer"
          }}
        >
          {simulating ? "⏳ Simulating..." : "▶ Run Simulation"}
        </button>
      </div>

      {results && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: theme.surface }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Team</th>
                <th style={thStyle}>Avg Pos</th>
                <th style={thStyle}>Avg Pts</th>
                <th style={thStyle}>Top 4 %</th>
                <th style={thStyle}>Semi %</th>
                <th style={thStyle}>Final %</th>
                <th style={{ ...thStyle, color: theme.amber }}>Champion %</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map(([key, data], index) => (
                <tr key={key} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: theme.textDim }}>{index + 1}</td>
                  <td style={{ ...tdStyle, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 4, height: 22, borderRadius: 2, background: teams[key]?.color || theme.green }} />
                      <span style={{ fontWeight: 600 }}>{key}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{data.avgPosition}</td>
                  <td style={tdStyle}>{data.avgPoints}</td>
                  <td style={tdStyle}>
                    <ProbBar value={data.top4} />
                  </td>
                  <td style={tdStyle}>
                    <ProbBar value={data.semifinal} />
                  </td>
                  <td style={tdStyle}>
                    <ProbBar value={data.final} />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                      <div style={{ width: 40, height: 6, background: theme.surface, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${data.champion}%`, height: "100%", background: theme.amber, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: data.champion > 20 ? theme.amber : theme.textSecondary, minWidth: 28 }}>
                        {data.champion}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 16px", fontSize: 9, color: theme.textDim, borderTop: `1px solid ${theme.border}` }}>
            Results from 5,000 Monte Carlo simulations. Probabilities reflect current form, Elo ratings, and remaining schedule.
          </div>
        </div>
      )}

      {!results && (
        <div style={{ 
          background: theme.card, border: `1px dashed ${theme.border}`, borderRadius: 12,
          padding: 40, textAlign: "center"
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎲</div>
          <div style={{ fontSize: 13, color: theme.textSecondary }}>
            Click "Run Simulation" to project season outcomes
          </div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 6 }}>
            Uses Monte Carlo method with 5,000 iterations to model uncertainty
          </div>
        </div>
      )}
    </div>
  );
}

function ProbBar({ value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
      <div style={{ width: 32, height: 4, background: theme.surface, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: ratingColor(value), borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, minWidth: 24, color: ratingColor(value) }}>{value}%</span>
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
