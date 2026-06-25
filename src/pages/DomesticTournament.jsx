import React, { useState } from 'react';
import { theme } from '../styles/theme';
import { createBlankTeam } from '../data/teamFactory';
import StandingsTable from '../components/StandingsTable';
import SeasonSimulator from '../components/SeasonSimulator';
import TeamSelector from '../components/TeamSelector';
import MatchAnalysis from '../components/MatchAnalysis';
import { advancedWinProbability, generateGamePlan, improvementImpact } from '../analytics/gamePlan';

export default function DomesticTournament({ tournaments, activeId, onCreate, onUpdate, onSelect, isCreating }) {
  const [creating, setCreating] = useState(isCreating);
  const [newTournament, setNewTournament] = useState({ name: "", format: "League", teams: {} });
  const [addingTeam, setAddingTeam] = useState(false);
  const [activeTab, setActiveTab] = useState("standings");
  const [myTeam, setMyTeam] = useState("");
  const [opponent, setOpponent] = useState("");

  const activeTournament = tournaments.find(t => t.id === activeId);

  // Tournament creation form
  if (isCreating || creating) {
    return (
      <DomesticCreator 
        onSave={(t) => { onCreate(t); setCreating(false); }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  if (!activeTournament) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Domestic Tournaments</div>
        <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
          For tournaments without publicly available data, add your own teams and statistics manually. 
          Perfect for local leagues, school competitions, or any tournament you want to analyze.
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{
            padding: "12px 24px", fontSize: 13, fontWeight: 700,
            background: theme.green, color: "#000", border: "none",
            borderRadius: 8, cursor: "pointer"
          }}
        >
          + Create Tournament
        </button>
      </div>
    );
  }

  const teams = activeTournament.teams || {};
  const teamKeys = Object.keys(teams);
  const effectiveMyTeam = myTeam || teamKeys[0] || "";
  const effectiveOpponent = opponent || teamKeys[1] || "";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{activeTournament.name}</h1>
          <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>
            Domestic Tournament • {teamKeys.length} teams • Manual data entry
          </div>
        </div>
        <button
          onClick={() => setAddingTeam(true)}
          style={{
            padding: "8px 16px", fontSize: 11, fontWeight: 600,
            background: theme.green, color: "#000", border: "none",
            borderRadius: 8, cursor: "pointer"
          }}
        >
          + Add Team
        </button>
      </div>

      {teamKeys.length >= 2 && (
        <>
          {/* Team Selectors */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, marginBottom: 24, alignItems: "end" }}>
            <TeamSelector label="Your Team" teams={teams} value={effectiveMyTeam} onChange={setMyTeam} excludeKey={effectiveOpponent} />
            <div style={{ fontSize: 13, fontWeight: 700, padding: "10px 16px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, textAlign: "center" }}>
              {advancedWinProbability(effectiveMyTeam, effectiveOpponent, teams)}%
            </div>
            <TeamSelector label="Opponent" teams={teams} value={effectiveOpponent} onChange={setOpponent} excludeKey={effectiveMyTeam} />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${theme.border}` }}>
            {["standings", "analysis", "gameplan", "simulator"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "10px 18px", fontSize: 12, fontWeight: 600,
                background: "transparent", color: activeTab === tab ? theme.green : theme.textDim,
                border: "none", borderBottom: activeTab === tab ? `2px solid ${theme.green}` : "2px solid transparent",
                cursor: "pointer", marginBottom: -1, textTransform: "capitalize"
              }}>{tab}</button>
            ))}
          </div>

          {activeTab === "standings" && <StandingsTable teams={teams} tournament={activeTournament} />}
          {activeTab === "analysis" && <MatchAnalysis myKey={effectiveMyTeam} oppKey={effectiveOpponent} teams={teams} tournamentName={activeTournament.name} />}
          {activeTab === "gameplan" && <DomesticGamePlan myKey={effectiveMyTeam} oppKey={effectiveOpponent} teams={teams} />}
          {activeTab === "simulator" && <SeasonSimulator teams={teams} tournament={activeTournament} />}
        </>
      )}

      {teamKeys.length < 2 && (
        <div style={{ background: theme.card, border: `1px dashed ${theme.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: theme.textSecondary }}>Add at least 2 teams to start analyzing</div>
        </div>
      )}

      {/* Add Team Modal */}
      {addingTeam && (
        <TeamBuilder
          onSave={(team) => {
            const updatedTeams = { ...teams, [team.name]: team };
            onUpdate(activeId, { teams: updatedTeams });
            setAddingTeam(false);
          }}
          onClose={() => setAddingTeam(false)}
        />
      )}
    </div>
  );
}

// Domestic Game Plan (same features as international)
function DomesticGamePlan({ myKey, oppKey, teams }) {
  const plan = generateGamePlan(myKey, oppKey, teams);
  const impacts = improvementImpact(myKey, oppKey, teams);
  const winProb = advancedWinProbability(myKey, oppKey, teams);

  return (
    <div>
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: winProb > 60 ? theme.green : winProb > 45 ? theme.amber : theme.red }}>{winProb}%</div>
        <div style={{ fontSize: 11, color: theme.textDim }}>Win Probability</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, marginBottom: 10, textTransform: "uppercase" }}>Areas to Work On</div>
          {plan.areas.map((a, i) => (
            <div key={i} style={{ background: theme.surface, borderRadius: 8, padding: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{a.area}</div>
              <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>{a.detail}</div>
            </div>
          ))}
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, marginBottom: 10, textTransform: "uppercase" }}>Exploit Weaknesses</div>
          {plan.exploits.map((e, i) => (
            <div key={i} style={{ background: theme.surface, borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: `3px solid ${theme.green}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.greenText }}>{e.area}</div>
              <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>{e.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tournament Creator
function DomesticCreator({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("Rugby");

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "40px 0" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Create Domestic Tournament</h2>
      <p style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 24 }}>
        For tournaments without publicly available data. You'll add teams and their statistics manually.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Tournament Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Provincial Championship 2026" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Sport</label>
        <select value={sport} onChange={e => setSport(e.target.value)} style={inputStyle}>
          <option>Rugby</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "12px", fontSize: 12, background: theme.surface, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: "pointer" }}>Cancel</button>
        <button
          onClick={() => name && onSave({ name, sport, teams: {}, totalRounds: 10, round: 0, playoffSpots: 4, status: "active", format: "Custom League" })}
          disabled={!name}
          style={{ flex: 2, padding: "12px", fontSize: 12, fontWeight: 700, background: name ? theme.green : theme.surface, color: name ? "#000" : theme.textDim, border: "none", borderRadius: 8, cursor: name ? "pointer" : "not-allowed" }}
        >
          Create Tournament
        </button>
      </div>
    </div>
  );
}

// Team Builder Modal
function TeamBuilder({ onSave, onClose }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(createBlankTeam("", "#10b981"));

  const update = (section, key, value) => {
    setData(prev => {
      if (section === "root") return { ...prev, [key]: value };
      return { ...prev, [section]: { ...prev[section], [key]: isNaN(parseFloat(value)) ? value : parseFloat(value) } };
    });
  };

  const steps = ["Identity", "Season", "Attack & Defense", "Set Piece & Kicking", "Players"];
  
  const IS = { width: "100%", fontSize: 12, background: theme.surface, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "8px 10px", boxSizing: "border-box" };
  const LS = { fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 };

  function Field(label, section, key, type = "number") {
    const val = section === "root" ? data[key] : data[section]?.[key];
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={LS}>{label}</label>
        <input type={type} value={val || ""} onChange={e => update(section, key, e.target.value)} style={IS} />
      </div>
    );
  }

  let content;
  if (step === 0) {
    content = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1/-1" }}>{Field("Team Name", "root", "name", "text")}</div>
        {Field("Abbreviation", "root", "abbr", "text")}
        {Field("Elo Rating", "root", "elo")}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={LS}>Team Colour</label>
          <input type="color" value={data.color} onChange={e => setData(prev => ({ ...prev, color: e.target.value }))} style={{ ...IS, height: 36, padding: 3, cursor: "pointer" }} />
        </div>
      </div>
    );
  } else if (step === 1) {
    content = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Field("Played", "season", "played")}
        {Field("Won", "season", "won")}
        {Field("Lost", "season", "lost")}
        {Field("Points", "season", "pts")}
        {Field("Points For", "season", "pf")}
        {Field("Points Against", "season", "pa")}
        {Field("Tries For", "season", "tries_for")}
        {Field("Tries Against", "season", "tries_against")}
      </div>
    );
  } else if (step === 2) {
    content = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Field("Gainline %", "attack", "gl")}
        {Field("Tackle Rate %", "defense", "tr")}
        {Field("Ruck Speed (s)", "attack", "rs")}
        {Field("22m Conversion %", "attack", "c22")}
        {Field("Missed Tackles/gm", "defense", "missed")}
        {Field("Turnovers Won", "defense", "to")}
        {Field("Penalties", "discipline", "pen")}
        {Field("Discipline Index", "discipline", "idx")}
      </div>
    );
  } else if (step === 3) {
    content = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Field("Scrum Win %", "setpiece", "so")}
        {Field("Lineout Win %", "setpiece", "lo")}
        {Field("Maul Success %", "setpiece", "maul")}
        {Field("Goal Kicking %", "kicking", "goal")}
        {Field("Kick Meters", "kicking", "km")}
      </div>
    );
  } else if (step === 4) {
    content = (
      <div>
        <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 10 }}>Add up to 5 key players (optional)</div>
        {[0, 1, 2, 3, 4].map(idx => {
          const p = data.players?.[idx] || {};
          const updatePlayer = (k, v) => {
            setData(prev => {
              const players = [...(prev.players || [])];
              players[idx] = { ...players[idx], [k]: v };
              return { ...prev, players };
            });
          };
          return (
            <div key={idx} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                <div><label style={LS}>Name</label><input type="text" value={p.name || ""} onChange={e => updatePlayer("name", e.target.value)} style={IS} /></div>
                <div><label style={LS}>Position</label>
                  <select value={p.pos || "FL"} onChange={e => updatePlayer("pos", e.target.value)} style={IS}>
                    {["FH", "SH", "LP", "HK", "THP", "LK", "FL", "No.8", "C", "W", "FB"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div><label style={LS}>Rating</label><input type="number" value={p.rating || 70} onChange={e => updatePlayer("rating", parseInt(e.target.value) || 70)} style={IS} /></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, width: "min(520px, 95vw)", maxHeight: "85vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Add Team</div>
            <div style={{ fontSize: 10, color: theme.textDim }}>Step {step + 1}/{steps.length} - {steps[step]}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: theme.textDim }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
          {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? theme.green : theme.border }} />)}
        </div>

        <div style={{ marginBottom: 20, maxHeight: "55vh", overflowY: "auto" }}>{content}</div>

        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: 10, fontSize: 12, background: theme.surface, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: "pointer" }}>Back</button>}
          {step < steps.length - 1
            ? <button onClick={() => setStep(s => s + 1)} style={{ flex: 2, padding: 10, fontSize: 12, fontWeight: 700, background: theme.green, color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}>Continue</button>
            : <button onClick={() => { if (data.name) onSave(data); }} style={{ flex: 2, padding: 10, fontSize: 12, fontWeight: 700, background: theme.green, color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}>Save Team</button>
          }
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 10, color: theme.textDim, display: "block", marginBottom: 4 };
const inputStyle = {
  width: "100%", fontSize: 13, padding: "10px 12px",
  background: theme.surface, color: theme.textPrimary,
  border: `1px solid ${theme.border}`, borderRadius: 8, boxSizing: "border-box"
};
