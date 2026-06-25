import React from 'react';
import { theme } from '../styles/theme';

const TrophyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

export default function Sidebar({ 
  tournaments, activeTournament, activeView,
  domesticTournaments, activeDomesticId,
  onSelectTournament, onSelectDomestic, onCreateDomestic, onSelectTheory, onOpenSettings 
}) {
  const tournamentList = Object.entries(tournaments);

  return (
    <aside style={{
      width: 260,
      minHeight: "100vh",
      background: theme.surface,
      borderRight: `1px solid ${theme.border}`,
      display: "flex",
      flexDirection: "column",
      padding: "16px 0",
      position: "sticky",
      top: 0,
      overflow: "auto"
    }}>
      {/* Logo */}
      <div style={{ padding: "8px 20px 24px", borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: theme.gradientPrimary,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800
          }}>S</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>SportsMetrics</div>
            <div style={{ fontSize: 10, color: theme.textDim }}>Multi-Sport Analytics Engine</div>
          </div>
        </div>
      </div>

      {/* Professional Tournaments */}
      <div style={{ padding: "16px 12px 8px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, letterSpacing: 1.5, padding: "0 8px", marginBottom: 8, textTransform: "uppercase" }}>
          Professional Tournaments
        </div>
        {tournamentList.map(([id, t]) => (
          <button
            key={id}
            onClick={() => onSelectTournament(id)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px", marginBottom: 2,
              background: activeTournament === id && activeView === "tournament" ? theme.card : "transparent",
              border: activeTournament === id && activeView === "tournament" ? `1px solid ${theme.border}` : "1px solid transparent",
              borderRadius: 8, cursor: "pointer", textAlign: "left",
              color: activeTournament === id && activeView === "tournament" ? theme.textPrimary : theme.textSecondary,
              transition: "all 0.15s"
            }}
          >
            <TrophyIcon />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 9, color: theme.textDim }}>
                {t.status === "completed" ? "✓ Completed" : t.status === "pre-tournament" ? "⏳ Starting Soon" : `R${t.round}/${t.totalRounds}`}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Domestic Tournaments */}
      <div style={{ padding: "12px 12px 8px", borderTop: `1px solid ${theme.border}`, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Domestic / Custom
          </div>
          <button
            onClick={onCreateDomestic}
            style={{
              background: theme.green, border: "none", borderRadius: 4,
              width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#000"
            }}
          >
            <PlusIcon />
          </button>
        </div>
        {domesticTournaments.map(t => (
          <button
            key={t.id}
            onClick={() => onSelectDomestic(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px", marginBottom: 2,
              background: activeDomesticId === t.id && activeView === "domestic" ? theme.card : "transparent",
              border: activeDomesticId === t.id && activeView === "domestic" ? `1px solid ${theme.border}` : "1px solid transparent",
              borderRadius: 8, cursor: "pointer", textAlign: "left",
              color: theme.textSecondary, transition: "all 0.15s"
            }}
          >
            <HomeIcon />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 9, color: theme.textDim }}>{Object.keys(t.teams || {}).length} teams</div>
            </div>
          </button>
        ))}
        {domesticTournaments.length === 0 && (
          <div style={{ padding: "8px 12px", fontSize: 10, color: theme.textDim, fontStyle: "italic" }}>
            No custom tournaments yet. Click + to create one.
          </div>
        )}
      </div>

      {/* Theory & Methodology */}
      <div style={{ marginTop: "auto", padding: "12px", borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={onSelectTheory}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "10px 12px", marginBottom: 4,
            background: activeView === "theory" ? theme.card : "transparent",
            border: activeView === "theory" ? `1px solid ${theme.border}` : "1px solid transparent",
            borderRadius: 8, cursor: "pointer", textAlign: "left",
            color: activeView === "theory" ? theme.textPrimary : theme.textSecondary
          }}
        >
          <BookIcon />
          <div style={{ fontSize: 12, fontWeight: 600 }}>Analytics Theory</div>
        </button>
        <button
          onClick={onOpenSettings}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "10px 12px",
            background: "transparent",
            border: "1px solid transparent",
            borderRadius: 8, cursor: "pointer", textAlign: "left",
            color: theme.textSecondary
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600 }}>AI Settings</div>
        </button>
      </div>
    </aside>
  );
}
