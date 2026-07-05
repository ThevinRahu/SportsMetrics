import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { theme, ratingColor, injuryColor, winColor } from '../styles/theme';
import { advancedWinProbability, generateGamePlan, improvementImpact } from '../analytics/gamePlan';
import { momentumScore, injuryRiskEstimate } from '../analytics/bayesian';
import { mlKeysToWin, retrainModel } from '../analytics/mlEngine';
import RadarChart from '../components/RadarChart';
import StandingsTable from '../components/StandingsTable';
import MatchAnalysis from '../components/MatchAnalysis';
import SeasonSimulator from '../components/SeasonSimulator';
import TeamSelector from '../components/TeamSelector';

export default function TournamentDashboard({ tournament, onRefresh, refreshing, initialTab }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [myTeam, setMyTeam] = useState("");
  const [opponent, setOpponent] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab || "standings");
  const [venue, setVenue] = useState("neutral");

  // Sync tab with URL when initialTab changes (e.g. direct navigation)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "standings") {
      navigate(`/tournament/${id}`, { replace: true });
    } else {
      navigate(`/tournament/${id}/${tabId}`, { replace: true });
    }
  };

  const teams = tournament.teams;
  const teamKeys = Object.keys(teams);

  // Auto-select first two teams
  const effectiveMyTeam = myTeam || teamKeys[0] || "";
  const effectiveOpponent = opponent || teamKeys[1] || "";

  const tabs = [
    { id: "standings", label: "Standings" },
    { id: "overview", label: "Overview" },
    { id: "analysis", label: "Match Analysis" },
    { id: "setpiece", label: "Set Piece" },
    { id: "gameplan", label: "Game Plan" },
    { id: "simulator", label: "Season Simulator" },
    { id: "players", label: "Players" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
            {tournament.name} {tournament.season}
          </h1>
          <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>
            {tournament.format} • {tournament.status === "completed" ? "Season Complete" : `Round ${tournament.round}/${tournament.totalRounds}`}
            {tournament.source && ` • Source: ${tournament.source}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 9, color: theme.textDim, textAlign: "right" }}>
            Last refresh<br/>
            <span style={{ color: theme.textSecondary }}>
              {tournament.lastRefresh ? new Date(tournament.lastRefresh).toLocaleString() : "Never"}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              padding: "8px 16px", fontSize: 11, fontWeight: 600,
              background: refreshing ? theme.card : theme.green,
              color: refreshing ? theme.textDim : "#000",
              border: "none", borderRadius: 8, cursor: refreshing ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            {refreshing ? "↻ Refreshing..." : "↻ Refresh Data"}
          </button>
          <button
            onClick={() => { 
              const result = retrainModel(teams); 
              alert(`ML retrained: ${result.accuracy}% accuracy on ${result.samples} samples`);
            }}
            style={{
              padding: "8px 12px", fontSize: 10, fontWeight: 600,
              background: theme.card, color: theme.purple,
              border: `1px solid ${theme.purple}`, borderRadius: 8, cursor: "pointer",
            }}
          >
            🤖 Retrain ML
          </button>
        </div>
      </div>

      {/* Highlights banner */}
      {tournament.highlights && (
        <div style={{
          background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10,
          padding: "10px 16px", marginBottom: 20, fontSize: 11, color: theme.textSecondary
        }}>
          <span style={{ color: theme.amber, fontWeight: 700, marginRight: 8 }}>⚡</span>
          {tournament.highlights}
        </div>
      )}

      {/* Team Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, marginBottom: 24, alignItems: "end" }}>
        <TeamSelector
          label="Your Team"
          teams={teams}
          value={effectiveMyTeam}
          onChange={setMyTeam}
          excludeKey={effectiveOpponent}
        />
        <div style={{ 
          fontSize: 13, fontWeight: 700, padding: "10px 16px",
          background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8,
          color: winColor(advancedWinProbability(effectiveMyTeam, effectiveOpponent, teams, venue)),
          textAlign: "center", minWidth: 80
        }}>
          {advancedWinProbability(effectiveMyTeam, effectiveOpponent, teams, venue)}%
          <div style={{ fontSize: 9, color: theme.textDim, fontWeight: 400 }}>Win Prob</div>
        </div>
        <TeamSelector
          label="Opponent"
          teams={teams}
          value={effectiveOpponent}
          onChange={setOpponent}
          excludeKey={effectiveMyTeam}
        />
      </div>

      {/* Venue Toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, justifyContent: "center" }}>
        {["home", "neutral", "away"].map(v => (
          <button key={v} onClick={() => setVenue(v)} style={{
            padding: "6px 14px", fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: "pointer",
            background: venue === v ? (v === "home" ? theme.greenDark : v === "away" ? theme.redDark : theme.card) : theme.surface,
            color: venue === v ? (v === "home" ? theme.greenText : v === "away" ? theme.redText : theme.textPrimary) : theme.textDim,
            border: `1px solid ${venue === v ? (v === "home" ? theme.green : v === "away" ? theme.red : theme.border) : theme.border}`,
          }}>
            {v === "home" ? "🏠 Home" : v === "away" ? "✈️ Away" : "⚖️ Neutral"}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: "10px 18px", fontSize: 12, fontWeight: 600,
              background: "transparent",
              color: activeTab === tab.id ? theme.green : theme.textDim,
              border: "none", borderBottom: activeTab === tab.id ? `2px solid ${theme.green}` : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s", marginBottom: -1
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "standings" && (
        <StandingsTable teams={teams} tournament={tournament} />
      )}

      {activeTab === "overview" && (
        <OverviewTab myKey={effectiveMyTeam} oppKey={effectiveOpponent} teams={teams} venue={venue} />
      )}
      
      {activeTab === "analysis" && (
        <MatchAnalysis 
          myKey={effectiveMyTeam} 
          oppKey={effectiveOpponent} 
          teams={teams}
          tournamentName={tournament.name}
          venue={venue}
        />
      )}

      {activeTab === "setpiece" && (
        <SetPieceTab myKey={effectiveMyTeam} oppKey={effectiveOpponent} teams={teams} />
      )}
      
      {activeTab === "gameplan" && (
        <GamePlanView myKey={effectiveMyTeam} oppKey={effectiveOpponent} teams={teams} venue={venue} />
      )}
      
      {activeTab === "simulator" && (
        <SeasonSimulator teams={teams} tournament={tournament} />
      )}
      
      {activeTab === "players" && (
        <PlayersView teams={teams} myKey={effectiveMyTeam} oppKey={effectiveOpponent} />
      )}
    </div>
  );
}

// Game Plan View
function GamePlanView({ myKey, oppKey, teams, venue }) {
  const plan = useMemo(() => generateGamePlan(myKey, oppKey, teams), [myKey, oppKey, teams]);
  const impacts = useMemo(() => improvementImpact(myKey, oppKey, teams), [myKey, oppKey, teams]);
  const mlKeys = useMemo(() => mlKeysToWin(myKey, oppKey, teams), [myKey, oppKey, teams]);
  const winProb = advancedWinProbability(myKey, oppKey, teams, venue);

  const priorityColors = { high: theme.red, medium: theme.amber, low: theme.green };
  const priorityBg = { high: theme.redDark, medium: theme.amberDark, low: theme.greenDark };

  return (
    <div>
      {/* Win Probability Header */}
      <div style={{ 
        background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
        padding: 20, marginBottom: 20, textAlign: "center"
      }}>
        <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 6 }}>
          MATCH WIN PROBABILITY: {myKey} vs {oppKey}
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, color: winColor(winProb) }}>{winProb}%</div>
        <div style={{ 
          height: 8, background: theme.surface, borderRadius: 4, marginTop: 12, overflow: "hidden",
          display: "flex"
        }}>
          <div style={{ width: `${winProb}%`, background: teams[myKey]?.color || theme.green, borderRadius: "4px 0 0 4px" }} />
          <div style={{ flex: 1, background: teams[oppKey]?.color || theme.blue }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: theme.textDim }}>
          <span>{myKey} {winProb}%</span>
          <span>{oppKey} {100 - winProb}%</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Areas to Improve */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            Areas to Improve
          </div>
          {plan.areas.map((a, i) => (
            <div key={i} style={{ 
              background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8,
              padding: 12, marginBottom: 8
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ 
                  fontSize: 9, padding: "2px 8px", borderRadius: 12,
                  background: priorityBg[a.priority], color: priorityColors[a.priority], fontWeight: 600
                }}>{a.priority}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{a.area}</span>
              </div>
              <div style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 1.5 }}>{a.detail}</div>
              {a.improvement && (
                <div style={{ fontSize: 10, color: theme.amber, marginTop: 6 }}>Target: {a.improvement}</div>
              )}
              {a.drills && (
                <div style={{ marginTop: 6 }}>
                  {a.drills.map((d, di) => (
                    <div key={di} style={{ fontSize: 9, color: theme.textDim, paddingLeft: 8, borderLeft: `2px solid ${theme.border}`, marginTop: 3 }}>
                      • {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Exploitable Weaknesses */}
        <div>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
              Exploit {oppKey}'s Weaknesses
            </div>
            {plan.exploits.map((e, i) => (
              <div key={i} style={{ 
                background: theme.surface, borderRadius: 8, padding: 12, marginBottom: 8,
                borderLeft: `3px solid ${theme.green}`
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.greenText, marginBottom: 4 }}>{e.area}</div>
                <div style={{ fontSize: 11, color: theme.textSecondary }}>{e.detail}</div>
                <div style={{ fontSize: 10, color: theme.green, marginTop: 6 }}>→ {e.tactic}</div>
              </div>
            ))}
          </div>

          {/* Improvement Impact */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
              Improvement Impact on Win %
            </div>
            {impacts.slice(0, 5).map((imp, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: 11 }}>{imp.metric} ({imp.boost})</div>
                <div style={{ 
                  fontSize: 12, fontWeight: 700,
                  color: imp.delta > 0 ? theme.green : theme.textDim
                }}>
                  +{imp.delta}%
                </div>
                <div style={{ width: 60, height: 4, background: theme.surface, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, imp.delta * 10)}%`, height: "100%", background: theme.green, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ML Keys to Win */}
      {mlKeys.keysToWin.length > 0 && (
        <div style={{ background: theme.card, border: `1px solid ${theme.green}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>🤖</span>
            <div style={{ fontSize: 11, fontWeight: 700 }}>ML Keys to Win</div>
            <span style={{ fontSize: 9, color: theme.textDim, marginLeft: "auto" }}>Based on trained model sensitivity analysis</span>
          </div>
          {mlKeys.keysToWin.map((k, i) => (
            <div key={i} style={{ background: theme.surface, borderRadius: 8, padding: 12, marginBottom: 6, borderLeft: `3px solid ${k.status === "strength" ? theme.green : k.status === "weakness" ? theme.amber : theme.blue}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{k.area}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.green }}>{k.winBoost} win prob</span>
              </div>
              <div style={{ fontSize: 11, color: theme.textSecondary }}>{k.recommendation}</div>
            </div>
          ))}
        </div>
      )}

      {/* ML Vulnerabilities to Exploit */}
      {mlKeys.vulnerabilities.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>
              🎯 Your Advantages to Press
            </div>
            {mlKeys.vulnerabilities.map((v, i) => (
              <div key={i} style={{ fontSize: 11, color: theme.textSecondary, padding: "8px 0", borderBottom: i < mlKeys.vulnerabilities.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                <div style={{ fontWeight: 600, color: theme.greenText, marginBottom: 2 }}>{v.area} <span style={{ fontSize: 9, color: theme.textDim }}>({v.advantage} advantage)</span></div>
                <div>{v.recommendation}</div>
              </div>
            ))}
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>
              📈 Biggest Improvement Opportunities
            </div>
            {mlKeys.winBoosts.length > 0 ? mlKeys.winBoosts.map((w, i) => (
              <div key={i} style={{ fontSize: 11, color: theme.textSecondary, padding: "8px 0", borderBottom: i < mlKeys.winBoosts.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                <div style={{ fontWeight: 600, color: theme.amber, marginBottom: 2 }}>{w.area} <span style={{ fontSize: 9, color: theme.textDim }}>({w.deficit} deficit)</span></div>
                <div>{w.recommendation}</div>
                <div style={{ fontSize: 9, color: theme.green, marginTop: 2 }}>{w.potentialGain}</div>
              </div>
            )) : <div style={{ fontSize: 11, color: theme.textDim }}>No significant deficits detected - you lead in all areas.</div>}
          </div>
        </div>
      )}

      {/* Strategic Recommendations & Risks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>
            Strategic Recommendations
          </div>
          {plan.strategies.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: theme.textSecondary, padding: "6px 0", borderBottom: i < plan.strategies.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <span style={{ color: theme.green, marginRight: 6 }}>▸</span>{s}
            </div>
          ))}
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>
            Risk Factors
          </div>
          {plan.risks.length > 0 ? plan.risks.map((r, i) => (
            <div key={i} style={{ fontSize: 11, color: theme.textSecondary, padding: "6px 0", borderBottom: i < plan.risks.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <span style={{ color: theme.red, marginRight: 6 }}>⚠</span>{r}
            </div>
          )) : (
            <div style={{ fontSize: 11, color: theme.textDim }}>No significant risk factors identified.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Players View
function PlayersView({ teams, myKey, oppKey }) {
  const myTeam = teams[myKey];
  const oppTeam = teams[oppKey];

  function PlayerCard({ player, teamColor }) {
    const risk = injuryRiskEstimate(player);
    return (
      <div style={{ 
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: 12, borderLeft: `3px solid ${teamColor}`
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{player.name}</div>
            <div style={{ fontSize: 10, color: theme.textDim }}>{player.pos} • #{player.num}</div>
          </div>
          <div style={{ 
            fontSize: 14, fontWeight: 800,
            color: ratingColor(player.rating)
          }}>{player.rating}</div>
        </div>
        <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 6 }}>{player.note}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <span style={{ 
            fontSize: 9, padding: "2px 6px", borderRadius: 10,
            background: injuryColor(player.injury) === theme.green ? theme.greenDark : injuryColor(player.injury) === theme.amber ? theme.amberDark : theme.redDark,
            color: injuryColor(player.injury), fontWeight: 600
          }}>
            {player.injury} risk
          </span>
          <span style={{ fontSize: 9, color: theme.textDim }}>
            Injury prob: {risk}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: myTeam?.color }}>
          {myKey} - Key Players
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(myTeam?.players || []).map((p, i) => <PlayerCard key={i} player={p} teamColor={myTeam?.color || theme.green} />)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: oppTeam?.color }}>
          {oppKey} - Key Players
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(oppTeam?.players || []).map((p, i) => <PlayerCard key={i} player={p} teamColor={oppTeam?.color || theme.blue} />)}
        </div>
      </div>
    </div>
  );
}

// Overview Tab - Team summary, form, key numbers
function OverviewTab({ myKey, oppKey, teams, venue = "neutral" }) {
  const my = teams[myKey];
  const opp = teams[oppKey];
  if (!my || !opp) return null;

  const winProb = advancedWinProbability(myKey, oppKey, teams, venue);
  const myMomentum = momentumScore(my);
  const oppMomentum = momentumScore(opp);

  function TeamOverviewCard({ teamKey, team, isOpponent }) {
    return (
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
        {/* Team header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: team.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>
            {team.abbr?.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{teamKey}</div>
            <div style={{ fontSize: 11, color: theme.textDim }}>
              {team.season?.won}W-{team.season?.lost}L • ELO {team.elo}
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Form</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {(team.form?.last5 || []).map((r, i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: 4,
                background: r === "W" ? theme.greenDark : theme.redDark,
                border: `1px solid ${r === "W" ? theme.green : theme.red}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: r === "W" ? theme.greenText : theme.redText
              }}>{r}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: theme.textSecondary }}>
            Streak: <span style={{ fontWeight: 700 }}>{team.form?.streak}</span> • 
            Rating: <span style={{ fontWeight: 700, color: ratingColor(team.form?.rating || 50) }}>{team.form?.rating}</span>
          </div>
        </div>

        {/* Key Numbers Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <MiniStat label="Pts/Gm" value={team.attack?.pts_pg} color={ratingColor(team.attack?.pts_pg > 28 ? 80 : team.attack?.pts_pg > 22 ? 65 : 40)} />
          <MiniStat label="Tries/Gm" value={team.attack?.tries_pg} color={ratingColor(team.attack?.tries_pg > 4 ? 80 : team.attack?.tries_pg > 3 ? 65 : 40)} />
          <MiniStat label="Gainline" value={`${team.attack?.gl}%`} color={ratingColor(team.attack?.gl || 50)} />
          <MiniStat label="Tackle %" value={`${team.defense?.tr}%`} color={ratingColor(team.defense?.tr || 80)} />
          <MiniStat label="Scrum" value={`${team.setpiece?.so}%`} color={ratingColor(team.setpiece?.so || 80)} />
          <MiniStat label="Lineout" value={`${team.setpiece?.lo}%`} color={ratingColor(team.setpiece?.lo || 75)} />
          <MiniStat label="Goal %" value={`${team.kicking?.goal}%`} color={ratingColor(team.kicking?.goal || 70)} />
          <MiniStat label="Penalties" value={team.discipline?.pen} color={ratingColor(team.discipline?.pen < 70 ? 80 : team.discipline?.pen < 90 ? 65 : 40)} />
          <MiniStat label="Momentum" value={isOpponent ? oppMomentum : myMomentum} color={ratingColor(isOpponent ? oppMomentum : myMomentum)} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Win probability banner */}
      <div style={{ 
        background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
        padding: 20, marginBottom: 20, textAlign: "center"
      }}>
        <div style={{ fontSize: 9, color: theme.textDim, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>
          Match Win Probability
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: my.color }}>{myKey}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: winColor(winProb) }}>{winProb}%</div>
          </div>
          <div style={{ fontSize: 20, color: theme.textDim }}>vs</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: opp.color }}>{oppKey}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: winColor(100 - winProb) }}>{100 - winProb}%</div>
          </div>
        </div>
        <div style={{ height: 8, background: theme.surface, borderRadius: 4, marginTop: 14, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${winProb}%`, background: my.color || theme.green, transition: "width 0.3s" }} />
          <div style={{ flex: 1, background: opp.color || theme.blue }} />
        </div>
      </div>

      {/* Radar */}
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <RadarChart myKey={myKey} oppKey={oppKey} teams={teams} width={400} height={280} />
      </div>

      {/* Two team cards side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <TeamOverviewCard teamKey={myKey} team={my} isOpponent={false} />
        <TeamOverviewCard teamKey={oppKey} team={opp} isOpponent={true} />
      </div>
    </div>
  );
}

// Set Piece Tab - Detailed set piece analysis
function SetPieceTab({ myKey, oppKey, teams }) {
  const my = teams[myKey];
  const opp = teams[oppKey];
  if (!my || !opp) return null;

  function SetPieceCard({ title, icon, metrics }) {
    return (
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, color: theme.textDim, textAlign: "left", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>Metric</th>
              <th style={{ fontSize: 9, color: my.color, textAlign: "center", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>{my.abbr}</th>
              <th style={{ fontSize: 9, color: opp.color, textAlign: "center", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>{opp.abbr}</th>
              <th style={{ fontSize: 9, color: theme.textDim, textAlign: "center", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>Edge</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const myVal = parseFloat(m.my) || 0;
              const oppVal = parseFloat(m.opp) || 0;
              const myWins = m.higherBetter !== false ? myVal >= oppVal : myVal <= oppVal;
              const diff = m.higherBetter !== false ? myVal - oppVal : oppVal - myVal;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ fontSize: 11, color: theme.textSecondary, padding: "8px 0" }}>{m.label}</td>
                  <td style={{ fontSize: 12, fontWeight: 700, textAlign: "center", padding: "8px 0", color: myWins ? theme.green : theme.textSecondary }}>{m.my}</td>
                  <td style={{ fontSize: 12, fontWeight: 700, textAlign: "center", padding: "8px 0", color: !myWins ? theme.green : theme.textSecondary }}>{m.opp}</td>
                  <td style={{ fontSize: 11, fontWeight: 600, textAlign: "center", padding: "8px 0", color: diff > 0 ? theme.green : diff < 0 ? theme.red : theme.textDim }}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Intelligence insights for set piece
  const spInsights = [];
  if ((opp.setpiece?.ls || 30) > 38) spInsights.push(`Their lineout steal ${opp.setpiece.ls}% - vary timing and use dummy jumpers`);
  if ((my.setpiece?.so || 80) > (opp.setpiece?.so || 80) + 5) spInsights.push(`Scrum dominance +${my.setpiece.so - opp.setpiece.so}% - target penalties at scrum time`);
  if ((opp.setpiece?.so || 80) > (my.setpiece?.so || 80) + 5) spInsights.push(`They dominate scrum +${opp.setpiece.so - my.setpiece.so}% - protect ball, quick feeds`);
  if ((my.setpiece?.maul || 65) > (opp.setpiece?.maul || 65) + 10) spInsights.push(`Maul dominance ${my.setpiece.maul}% vs ${opp.setpiece.maul}% - lineout drives near try line`);
  if ((opp.setpiece?.maul || 65) > (my.setpiece?.maul || 65) + 10) spInsights.push(`Their maul ${opp.setpiece.maul}% vs yours ${my.setpiece.maul}% - disrupt early, compete in air`);
  if ((my.setpiece?.ps || 1.5) > (opp.setpiece?.ps || 1.5) + 1) spInsights.push(`You earn ${my.setpiece.ps} scrum pens/gm vs ${opp.setpiece.ps} - use dominance for territory`);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <SetPieceCard title="Scrum" icon="⚡" metrics={[
          { label: "Own Win %", my: my.setpiece?.so, opp: opp.setpiece?.so },
          { label: "Steal %", my: my.setpiece?.ss, opp: opp.setpiece?.ss },
          { label: "Pens Won/Gm", my: my.setpiece?.ps, opp: opp.setpiece?.ps },
        ]} />
        <SetPieceCard title="Lineout" icon="🏉" metrics={[
          { label: "Own Win %", my: my.setpiece?.lo, opp: opp.setpiece?.lo },
          { label: "Steal %", my: my.setpiece?.ls, opp: opp.setpiece?.ls },
          { label: "Maul Success %", my: my.setpiece?.maul, opp: opp.setpiece?.maul },
        ]} />
        <SetPieceCard title="Kicking" icon="🦶" metrics={[
          { label: "Goal %", my: my.kicking?.goal, opp: opp.kicking?.goal },
          { label: "Kick Metres", my: my.kicking?.km, opp: opp.kicking?.km },
          { label: "Discipline Index", my: my.discipline?.idx, opp: opp.discipline?.idx },
        ]} />
      </div>

      {/* Set Piece Intelligence */}
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
          Set Piece Intelligence
        </div>
        {spInsights.length > 0 ? spInsights.map((ins, i) => (
          <div key={i} style={{ 
            fontSize: 11, color: theme.textSecondary, padding: "8px 12px", marginBottom: 4,
            background: theme.surface, borderRadius: 6, borderLeft: `3px solid ${theme.amber}`
          }}>
            💡 {ins}
          </div>
        )) : (
          <div style={{ fontSize: 11, color: theme.textDim }}>Set piece metrics are evenly matched. Focus on execution consistency.</div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: theme.surface, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: color || theme.textPrimary }}>{value}</div>
      <div style={{ fontSize: 8, color: theme.textDim, marginTop: 2 }}>{label}</div>
    </div>
  );
}


