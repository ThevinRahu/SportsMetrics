import React, { useMemo, useState, useEffect } from 'react';
import { theme, ratingColor, winColor } from '../styles/theme';
import { getTeamMatches, getH2H } from '../data/matchHistory';

/**
 * Momentum Chart - Shows form trajectory over recent matches
 */
export function MomentumChart({ teamKey, teams }) {
  const team = teams[teamKey];
  if (!team) return null;

  const matches = getTeamMatches(teamKey);
  
  // Calculate running form score after each match
  const formData = useMemo(() => {
    let score = 50;
    return matches.slice(-10).map((m, i) => {
      const isHome = m[0] === teamKey;
      const won = isHome ? m[2] > m[3] : m[3] > m[2];
      const margin = isHome ? m[2] - m[3] : m[3] - m[2];
      score = score * 0.7 + (won ? 80 + Math.min(20, margin) : 20 - Math.min(20, -margin)) * 0.3;
      const opponent = isHome ? m[1] : m[0];
      const myScore = isHome ? m[2] : m[3];
      const oppScore = isHome ? m[3] : m[2];
      return { match: i + 1, score: Math.round(score), won, opponent, myScore, oppScore, margin };
    });
  }, [matches, teamKey]);

  if (formData.length === 0) return null;

  const maxY = 100;
  const width = 100;
  const height = 60;

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>
        {teamKey} Momentum (Last {formData.length} Matches)
      </div>
      
      {/* SVG Line Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 80 }}>
        {/* Grid lines */}
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
        
        {/* Momentum line */}
        <polyline
          fill="none"
          stroke={team.color || theme.green}
          strokeWidth="1.5"
          points={formData.map((d, i) => `${(i / Math.max(1, formData.length - 1)) * width},${height - (d.score / maxY) * height}`).join(" ")}
        />
        
        {/* Data points */}
        {formData.map((d, i) => (
          <circle
            key={i}
            cx={(i / Math.max(1, formData.length - 1)) * width}
            cy={height - (d.score / maxY) * height}
            r="2"
            fill={d.won ? theme.green : theme.red}
          />
        ))}
      </svg>

      {/* Match labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {formData.map((d, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3, margin: "0 auto 2px",
              background: d.won ? theme.greenDark : theme.redDark,
              border: `1px solid ${d.won ? theme.green : theme.red}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 7, fontWeight: 700, color: d.won ? theme.greenText : theme.redText
            }}>{d.won ? "W" : "L"}</div>
            <div style={{ fontSize: 7, color: theme.textDim }}>{d.myScore}-{d.oppScore}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Head-to-Head History between two teams
 */
export function H2HHistory({ myKey, oppKey, teams }) {
  const staticH2H = getH2H(myKey, oppKey);
  const [serverH2H, setServerH2H] = useState([]);
  
  // Fetch H2H from server (Postgres - includes cron-detected matches)
  useEffect(() => {
    fetch(`/api/matches?h2h=${encodeURIComponent(myKey)},${encodeURIComponent(oppKey)}`)
      .then(r => r.ok ? r.json() : [])
      .then(matches => {
        // Convert server format to static format [home, away, homeScore, awayScore, year, comp]
        const converted = matches.map(m => [
          m.home_team, m.away_team, m.home_score, m.away_score,
          m.match_date ? m.match_date.slice(0, 4) : '2026', 'NC'
        ]);
        setServerH2H(converted);
      })
      .catch(() => {});
  }, [myKey, oppKey]);

  // Merge: server data takes priority for duplicates, then add static data not in server
  const h2h = useMemo(() => {
    const all = [...serverH2H];
    for (const s of staticH2H) {
      const isDup = all.some(a => a[0] === s[0] && a[1] === s[1] && a[2] === s[2] && a[3] === s[3]);
      if (!isDup) all.push(s);
    }
    return all;
  }, [staticH2H, serverH2H]);
  
  const my = teams[myKey];
  const opp = teams[oppKey];

  if (h2h.length === 0) {
    return (
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
          Head-to-Head History
        </div>
        <div style={{ fontSize: 11, color: theme.textDim, fontStyle: "italic" }}>No previous meetings in database</div>
      </div>
    );
  }

  // Calculate H2H stats
  let myWins = 0, oppWins = 0, totalMyPts = 0, totalOppPts = 0;
  const results = h2h.map(m => {
    const myIsHome = m[0] === myKey;
    const myScore = myIsHome ? m[2] : m[3];
    const oppScore = myIsHome ? m[3] : m[2];
    const won = myScore > oppScore;
    if (won) myWins++; else oppWins++;
    totalMyPts += myScore;
    totalOppPts += oppScore;
    return { myScore, oppScore, won, home: myIsHome ? myKey : oppKey };
  });

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>
        Head-to-Head History ({h2h.length} meetings)
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 14, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: myWins > oppWins ? theme.green : theme.textSecondary }}>{myWins}</div>
          <div style={{ fontSize: 9, color: theme.textDim }}>{myKey} wins</div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.textDim }}>vs</div>
          <div style={{ fontSize: 9, color: theme.textDim }}>Avg: {Math.round(totalMyPts / h2h.length)}-{Math.round(totalOppPts / h2h.length)}</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: oppWins > myWins ? theme.green : theme.textSecondary }}>{oppWins}</div>
          <div style={{ fontSize: 9, color: theme.textDim }}>{oppKey} wins</div>
        </div>
      </div>

      {/* Win bar */}
      <div style={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex", marginBottom: 12 }}>
        <div style={{ width: `${(myWins / h2h.length) * 100}%`, background: my?.color || theme.green }} />
        <div style={{ flex: 1, background: opp?.color || theme.blue }} />
      </div>

      {/* Individual results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {results.slice(-5).reverse().map((r, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 10px", borderRadius: 6,
            background: r.won ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)",
            border: `1px solid ${r.won ? theme.greenDark : theme.redDark}`
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: r.won ? theme.green : theme.red }}>
              {r.won ? "W" : "L"}
            </span>
            <span style={{ fontSize: 11, color: theme.textSecondary }}>
              {myKey} {r.myScore} - {r.oppScore} {oppKey}
            </span>
            <span style={{ fontSize: 9, color: theme.textDim }}>
              {r.home === myKey ? "H" : "A"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default { MomentumChart, H2HHistory };
