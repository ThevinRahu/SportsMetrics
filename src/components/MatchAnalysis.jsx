import React, { useMemo } from 'react';
import { theme, ratingColor, winColor } from '../styles/theme';
import { advancedWinProbability } from '../analytics/gamePlan';
import { predictScore, momentumScore } from '../analytics/bayesian';
import { simulateHeadToHead } from '../analytics/monteCarlo';
import RadarChart from './RadarChart';

function ComparisonBar({ label, myVal, oppVal, myColor, oppColor, higherBetter = true }) {
  const myNum = parseFloat(myVal) || 0;
  const oppNum = parseFloat(oppVal) || 0;
  const total = myNum + oppNum || 1;
  const myWidth = Math.round((myNum / total) * 100);
  const myWins = higherBetter ? myNum >= oppNum : myNum <= oppNum;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: myWins ? theme.green : theme.textSecondary }}>{myVal}</span>
        <span style={{ fontSize: 9, color: theme.textDim }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: !myWins ? theme.green : theme.textSecondary }}>{oppVal}</span>
      </div>
      <div style={{ height: 5, background: theme.surface, borderRadius: 3, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${myWidth}%`, background: myColor, borderRadius: "3px 0 0 3px" }} />
        <div style={{ flex: 1, background: oppColor }} />
      </div>
    </div>
  );
}

// Threat level calculation
function threatLevel(value, thresholds) {
  // thresholds = [low, medium] - above medium = Danger
  if (value >= thresholds[1]) return { label: "Danger", color: theme.red, bg: theme.redDark };
  if (value >= thresholds[0]) return { label: "Moderate", color: theme.amber, bg: theme.amberDark };
  return { label: "Low", color: theme.green, bg: theme.greenDark };
}

// Intelligence insights generator
function generateIntelligence(myKey, oppKey, teams) {
  const my = teams[myKey];
  const opp = teams[oppKey];
  if (!my || !opp) return [];

  const insights = [];

  // Lineout steal vulnerability
  if ((opp.setpiece?.ls || 30) > 35) {
    insights.push({ icon: "🎯", text: `Their lineout steal ${opp.setpiece.ls}% - vary timing and use dummy jumpers` });
  } else if ((my.setpiece?.ls || 30) > 35) {
    insights.push({ icon: "⚠️", text: `Your lineout steal rate ${my.setpiece.ls}% is high - they may shorten lineout` });
  }

  // Scrum pressure
  if ((my.setpiece?.so || 80) > (opp.setpiece?.so || 80) + 5) {
    insights.push({ icon: "💪", text: `Scrum dominance +${my.setpiece.so - opp.setpiece.so}% - target penalties and 8-man drives` });
  } else if ((opp.setpiece?.so || 80) > (my.setpiece?.so || 80) + 5) {
    insights.push({ icon: "⚠️", text: `They dominate scrum +${opp.setpiece.so - my.setpiece.so}% - protect ball, quick feeds` });
  }

  // Kick meters disparity
  if ((my.kicking?.km || 400) > (opp.kicking?.km || 400) + 80) {
    insights.push({ icon: "🦶", text: `Territorial kicking advantage +${my.kicking.km - opp.kicking.km}m - contest aerially` });
  } else if ((opp.kicking?.km || 400) > (my.kicking?.km || 400) + 80) {
    insights.push({ icon: "⚠️", text: `They kick ${opp.kicking.km - my.kicking.km}m more - prepare counter-attack exits` });
  }

  // Discipline gap
  if ((opp.discipline?.pen || 80) > 95) {
    insights.push({ icon: "🎯", text: `Penalty-prone (${opp.discipline.pen}/season) - target breakdown to earn territory` });
  }
  if ((my.discipline?.pen || 80) > 95) {
    insights.push({ icon: "⚠️", text: `Your penalty count ${my.discipline.pen} is high risk - clean up breakdown entries` });
  }

  // Offload vulnerability
  if ((opp.attack?.off || 6) > 9) {
    insights.push({ icon: "🎯", text: `High offload team (${opp.attack.off}/gm) - aggressive 2-man tackles to deny ball` });
  }

  // Missed tackles
  if ((opp.defense?.missed || 20) > 30) {
    insights.push({ icon: "🎯", text: `${opp.defense.missed} missed tackles/gm - wide attack will isolate outside backs` });
  }

  // Ruck speed advantage
  if ((my.attack?.rs || 4) < (opp.attack?.rs || 4) - 0.4) {
    insights.push({ icon: "⚡", text: `Faster ruck ball ${my.attack.rs}s vs ${opp.attack.rs}s - use tempo to stretch defense` });
  }

  // Form/momentum
  const myMom = momentumScore(my);
  const oppMom = momentumScore(opp);
  if (myMom > oppMom + 20) {
    insights.push({ icon: "📈", text: `Momentum advantage (${myMom} vs ${oppMom}) - confidence and rhythm in your favour` });
  } else if (oppMom > myMom + 20) {
    insights.push({ icon: "⚠️", text: `They have momentum (${oppMom} vs ${myMom}) - early physicality to disrupt rhythm` });
  }

  // Maul
  if ((my.setpiece?.maul || 65) > (opp.setpiece?.maul || 65) + 12) {
    insights.push({ icon: "💪", text: `Maul dominance ${my.setpiece.maul}% vs ${opp.setpiece.maul}% - use lineout drives near line` });
  }

  // Goal kicking edge
  if ((my.kicking?.goal || 70) > (opp.kicking?.goal || 70) + 10) {
    insights.push({ icon: "🎯", text: `Goal kicking edge +${my.kicking.goal - opp.kicking.goal}% - take shots from penalties` });
  }

  return insights.slice(0, 8); // Cap at 8 most relevant
}

export default function MatchAnalysis({ myKey, oppKey, teams, tournamentName }) {
  const my = teams[myKey];
  const opp = teams[oppKey];
  
  const prediction = useMemo(() => predictScore(myKey, oppKey, teams), [myKey, oppKey, teams]);
  const h2h = useMemo(() => simulateHeadToHead(myKey, oppKey, teams), [myKey, oppKey, teams]);
  const winProb = advancedWinProbability(myKey, oppKey, teams);
  const intelligence = useMemo(() => generateIntelligence(myKey, oppKey, teams), [myKey, oppKey, teams]);

  if (!my || !opp) return <div style={{ color: theme.textDim }}>Select two teams to compare</div>;

  const myColor = my.color || theme.green;
  const oppColor = opp.color || theme.blue;

  // Threat assessment for opponent
  const threats = [
    { label: "Attack", value: opp.attack?.gl || 50, rating: opp.attack?.gl || 50, thresholds: [55, 62] },
    { label: "Defense", value: opp.defense?.tr || 80, rating: opp.defense?.tr || 80, thresholds: [83, 86] },
    { label: "Set Piece", value: Math.round(((opp.setpiece?.so || 80) + (opp.setpiece?.lo || 75)) / 2), rating: Math.round(((opp.setpiece?.so || 80) + (opp.setpiece?.lo || 75)) / 2), thresholds: [82, 87] },
    { label: "Kicking", value: opp.kicking?.goal || 70, rating: opp.kicking?.goal || 70, thresholds: [75, 82] },
  ];

  return (
    <div>
      {/* Score Prediction Header */}
      <div style={{ 
        display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20,
        background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
        padding: 24, marginBottom: 20, alignItems: "center"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: myColor, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
            {my.abbr?.slice(0, 2)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{myKey}</div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>{my.season?.won}W-{my.season?.lost}L</div>
          <div style={{ fontSize: 9, color: theme.textDim }}>ELO {my.elo}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: winColor(winProb) }}>
            {prediction?.teamA?.expectedPts || 0}
          </div>
          <div style={{ fontSize: 9, color: theme.textDim }}>Predicted Score</div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
            ~{prediction?.teamA?.expectedTries || 0} tries
          </div>
          {/* Form row */}
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 8 }}>
            {(my.form?.last5 || []).map((r, i) => (
              <div key={i} style={{
                width: 18, height: 18, borderRadius: 3,
                background: r === "W" ? theme.greenDark : theme.redDark,
                border: `1px solid ${r === "W" ? theme.green : theme.red}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: r === "W" ? theme.greenText : theme.redText
              }}>{r}</div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: theme.textDim, marginBottom: 4 }}>PREDICTED RESULT</div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
            Margin: {Math.abs(prediction?.margin || 0)} pts
          </div>
          <div style={{ 
            fontSize: 36, fontWeight: 800,
            color: winColor(winProb)
          }}>{winProb}%</div>
          <div style={{ fontSize: 9, color: theme.textDim }}>Win Probability</div>
          <div style={{ marginTop: 10, fontSize: 10, color: theme.textSecondary }}>
            Monte Carlo: {h2h.aWins}% - {h2h.bWins}%
          </div>
          <div style={{ fontSize: 9, color: theme.textDim, marginTop: 2 }}>
            (1000 simulations)
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: oppColor, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>
            {opp.abbr?.slice(0, 2)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{oppKey}</div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>{opp.season?.won}W-{opp.season?.lost}L</div>
          <div style={{ fontSize: 9, color: theme.textDim }}>ELO {opp.elo}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: winColor(100 - winProb) }}>
            {prediction?.teamB?.expectedPts || 0}
          </div>
          <div style={{ fontSize: 9, color: theme.textDim }}>Predicted Score</div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
            ~{prediction?.teamB?.expectedTries || 0} tries
          </div>
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 8 }}>
            {(opp.form?.last5 || []).map((r, i) => (
              <div key={i} style={{
                width: 18, height: 18, borderRadius: 3,
                background: r === "W" ? theme.greenDark : theme.redDark,
                border: `1px solid ${r === "W" ? theme.green : theme.red}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: r === "W" ? theme.greenText : theme.redText
              }}>{r}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Head-to-Head Comparison Bars + Radar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Radar Chart */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            Performance Radar
          </div>
          <RadarChart myKey={myKey} oppKey={oppKey} teams={teams} />
        </div>

        {/* Head-to-Head Key Metrics */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            Head-to-Head Metrics
          </div>
          <ComparisonBar label="Gainline %" myVal={my.attack?.gl} oppVal={opp.attack?.gl} myColor={myColor} oppColor={oppColor} />
          <ComparisonBar label="Tackle %" myVal={my.defense?.tr} oppVal={opp.defense?.tr} myColor={myColor} oppColor={oppColor} />
          <ComparisonBar label="Line Breaks" myVal={my.attack?.lb} oppVal={opp.attack?.lb} myColor={myColor} oppColor={oppColor} />
          <ComparisonBar label="Turnovers" myVal={my.defense?.to} oppVal={opp.defense?.to} myColor={myColor} oppColor={oppColor} />
          <ComparisonBar label="Dominant Tackles" myVal={my.defense?.dom} oppVal={opp.defense?.dom} myColor={myColor} oppColor={oppColor} />
          <ComparisonBar label="Penalties (lo)" myVal={my.discipline?.pen} oppVal={opp.discipline?.pen} myColor={myColor} oppColor={oppColor} higherBetter={false} />
          <ComparisonBar label="22m Conv %" myVal={my.attack?.c22} oppVal={opp.attack?.c22} myColor={myColor} oppColor={oppColor} />
          <ComparisonBar label="Goal Kick %" myVal={my.kicking?.goal} oppVal={opp.kicking?.goal} myColor={myColor} oppColor={oppColor} />
        </div>
      </div>

      {/* Set Piece Detail + Kicking + Threats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Scrum */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            Scrum
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: ratingColor(my.setpiece?.so || 80), marginBottom: 4 }}>
            {my.setpiece?.so || 80}
          </div>
          <div style={{ fontSize: 9, color: theme.textDim, marginBottom: 12 }}>Own Win %</div>
          
          <SetPieceRow label="Own Win %" myVal={my.setpiece?.so} oppVal={opp.setpiece?.so} />
          <SetPieceRow label="Steal %" myVal={my.setpiece?.ss} oppVal={opp.setpiece?.ss} />
          <SetPieceRow label="Pens/Gm" myVal={my.setpiece?.ps} oppVal={opp.setpiece?.ps} />
        </div>

        {/* Lineout */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            Lineout
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: ratingColor(my.setpiece?.lo || 75), marginBottom: 4 }}>
            {my.setpiece?.lo || 75}
          </div>
          <div style={{ fontSize: 9, color: theme.textDim, marginBottom: 12 }}>Own Win %</div>
          
          <SetPieceRow label="Own Win %" myVal={my.setpiece?.lo} oppVal={opp.setpiece?.lo} />
          <SetPieceRow label="Steal %" myVal={my.setpiece?.ls} oppVal={opp.setpiece?.ls} />
          <SetPieceRow label="Maul %" myVal={my.setpiece?.maul} oppVal={opp.setpiece?.maul} />
        </div>

        {/* Kicking */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            Kicking
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: ratingColor(my.kicking?.goal || 70), marginBottom: 4 }}>
            {my.kicking?.goal || 70}
          </div>
          <div style={{ fontSize: 9, color: theme.textDim, marginBottom: 12 }}>Goal %</div>
          
          <SetPieceRow label="Goal %" myVal={my.kicking?.goal} oppVal={opp.kicking?.goal} />
          <SetPieceRow label="Kick Meters" myVal={my.kicking?.km} oppVal={opp.kicking?.km} />
          <SetPieceRow label="Disc Index" myVal={my.discipline?.idx} oppVal={opp.discipline?.idx} />
        </div>
      </div>

      {/* Threat Assessment + Intelligence */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Opponent Threats */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            {oppKey} Threats
          </div>
          {threats.map((t, i) => {
            const level = threatLevel(t.value, t.thresholds);
            return (
              <div key={i} style={{ 
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", marginBottom: 6,
                background: theme.surface, borderRadius: 8,
                borderLeft: `3px solid ${level.color}`
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: theme.textDim }}>{t.value}</div>
                </div>
                <span style={{ 
                  fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                  background: level.bg, color: level.color
                }}>
                  {level.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Intelligence */}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>
            Intelligence
          </div>
          {intelligence.length > 0 ? intelligence.map((ins, i) => (
            <div key={i} style={{ 
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "8px 0", borderBottom: i < intelligence.length - 1 ? `1px solid ${theme.border}` : "none"
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{ins.icon}</span>
              <span style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 1.5 }}>{ins.text}</span>
            </div>
          )) : (
            <div style={{ fontSize: 11, color: theme.textDim, fontStyle: "italic" }}>
              No significant tactical intelligence gaps detected. Even matchup.
            </div>
          )}
        </div>
      </div>

      {/* Key Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="Elo Difference" value={my.elo - opp.elo} suffix=" pts" positive={my.elo > opp.elo} />
        <StatCard label="Form Rating Gap" value={((my.form?.rating || 50) - (opp.form?.rating || 50))} suffix="" positive={(my.form?.rating || 50) > (opp.form?.rating || 50)} />
        <StatCard label="Points/Game Diff" value={((my.attack?.pts_pg || 0) - (opp.attack?.pts_pg || 0)).toFixed(1)} suffix="" positive={(my.attack?.pts_pg || 0) > (opp.attack?.pts_pg || 0)} />
        <StatCard label="Prediction Confidence" value={prediction?.confidence || 50} suffix="%" positive={true} />
      </div>
    </div>
  );
}

// Set Piece comparison row - compact format showing both teams
function SetPieceRow({ label, myVal, oppVal }) {
  const mv = parseFloat(myVal) || 0;
  const ov = parseFloat(oppVal) || 0;
  const myWins = mv >= ov;
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: myWins ? theme.green : theme.textSecondary, minWidth: 36 }}>
        {myVal}
      </span>
      <span style={{ fontSize: 9, color: theme.textDim, flex: 1, textAlign: "center" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: !myWins ? theme.green : theme.textSecondary, minWidth: 36, textAlign: "right" }}>
        {oppVal}
      </span>
    </div>
  );
}

function StatCard({ label, value, suffix = "", positive }) {
  const numVal = parseFloat(value);
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
      <div style={{ fontSize: 9, color: theme.textDim, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: numVal > 0 && positive ? theme.green : numVal < 0 ? theme.red : theme.textSecondary }}>
        {numVal > 0 ? "+" : ""}{value}{suffix}
      </div>
    </div>
  );
}
