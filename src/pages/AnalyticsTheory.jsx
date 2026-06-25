import React from 'react';
import { theme } from '../styles/theme';

export default function AnalyticsTheory() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Analytics Theory & Methodology</h1>
      <p style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 32 }}>
        The algorithms, models, and data science behind SportsMetrics. Each module is grounded in established
        sports analytics research and adapted specifically for rugby union.
      </p>

      <Section title="1. Elo Rating System" color={theme.green}>
        <Theory
          origin="Arpad Elo (1960s)- Originally developed for chess"
          concept="Assigns each team a single numerical rating representing their relative strength. The difference between two ratings predicts the expected outcome of a match."
          formula="Expected Win = 1 / (1 + 10^((Rating_B - Rating_A + HFA) / 400))"
          rugbyAdaptation={[
            "Home Field Advantage (HFA) = +40 rating points (equivalent to ~60% win probability)",
            "Margin of Victory multiplier: log(pointsDiff + 1) × correction factor",
            "K-factor = 32 (standard), adjustable by competition level",
            "Draw handling: 0.5 actual score (rare in rugby but accounted for)"
          ]}
          dataUsed="Team Elo ratings derived from historical match results, updated after each round"
          limitations="Doesn't capture tactical nuance- a team could have high Elo but be vulnerable to specific play styles"
        />
      </Section>

      <Section title="2. Monte Carlo Season Simulation" color={theme.purple}>
        <Theory
          origin="Stanislaw Ulam (1940s)- Nuclear physics, now used across finance, engineering, and sport"
          concept="Simulates the entire remaining season thousands of times (5,000 iterations) using probabilistic match outcomes. Aggregates results to project playoff odds, championship chances, and expected final positions."
          formula="For each simulation: simulate all remaining matches → calculate final table → determine playoffs → crown champion. Repeat N times."
          rugbyAdaptation={[
            "Bonus point system: Try bonus ~35% probability (higher for favorites), losing bonus ~20-30%",
            "Form momentum factor: exponentially weighted recent results influence match probability",
            "Tiebreakers use point differential (as per tournament rules)",
            "Playoff simulation: 1v4 and 2v3 semifinals, then final"
          ]}
          dataUsed="Current standings, Elo ratings, form ratings, remaining fixture schedule"
          limitations="Assumes independence between matches (doesn't model fatigue or cascading injuries across a season)"
        />
      </Section>

      <Section title="3. Bayesian / Poisson Score Prediction" color={theme.amber}>
        <Theory
          origin="Thomas Bayes (1763) + Siméon Denis Poisson (1837)"
          concept="Models try-scoring as a Poisson process where the expected number of tries (lambda) depends on a team's attacking strength relative to their opponent's defensive weakness. Bayesian updating adjusts predictions as new evidence arrives."
          formula="λ_A = AttackRate_A × (DefenseWeakness_B / LeagueAvg); P(k tries) = (λ^k × e^-λ) / k!"
          rugbyAdaptation={[
            "Lambda calculated from tries per game × opponent's concession rate / league average",
            "Points predicted from expected tries × 6.5 (avg try value inc. conversions) + penalty likelihood",
            "Penalty scoring derived from opponent's discipline rating",
            "Confidence intervals based on Poisson variance"
          ]}
          dataUsed="Tries per game, tries conceded per game, penalty counts, goal kicking %, league averages"
          limitations="Poisson assumes independent scoring events- in reality, momentum effects exist within matches"
        />
      </Section>

      <Section title="4. Game Plan Engine (Multi-Criteria Decision Analysis)" color={theme.red}>
        <Theory
          origin="MCDA framework (1960s-70s) adapted from operations research"
          concept="Identifies performance gaps between teams across weighted dimensions and generates actionable coaching recommendations. Combines gap analysis with threat-opportunity categorization."
          formula="WinProb = Elo_base × 0.7 + Σ(weight_i × normalized_gap_i) × 0.3"
          rugbyAdaptation={[
            "6 key dimensions: Attack (20%), Defense (18%), Form (15%), Set Piece (22%), Discipline (10%), Kicking (15%)",
            "Gap analysis: identifies where opponent has >5% advantage in key metrics",
            "Exploitation engine: finds opponent weaknesses below threshold (e.g., tackle rate < 78%)",
            "Improvement impact: measures sensitivity of win probability to each metric improvement",
            "Drill recommendations based on identified gaps"
          ]}
          dataUsed="All 25+ performance metrics per team, player ratings, injury status, form trends"
          limitations="Cannot account for weather conditions, referee tendencies, or match-day psychology"
        />
      </Section>

      <Section title="5. Form & Momentum Detection (Exponential Moving Average)" color={theme.cyan}>
        <Theory
          origin="Financial time series analysis- adapted for sports streaks"
          concept="Uses exponential smoothing to weight recent results more heavily than older ones, detecting whether a team is trending up or down. A team winning their last 5 would have a much higher EMA than one with mixed results."
          formula="EMA_t = α × Result_t + (1 - α) × EMA_(t-1), where α = 0.35"
          rugbyAdaptation={[
            "α = 0.35 balances responsiveness with stability (higher = more reactive to recent form)",
            "Streak bonus: consecutive wins/losses add cumulative momentum adjustment",
            "Quality-of-opposition weighting planned for future (beating top-4 team worth more)",
            "Used in match prediction as +/-2% win probability adjustment"
          ]}
          dataUsed="Last 5 match results (W/L), current streak type and length"
          limitations="5-game window may miss longer-term cycles; doesn't weight opponent quality"
        />
      </Section>

      <Section title="6. Player Injury Risk (Bayesian Prior Model)" color="#f472b6">
        <Theory
          origin="Bayesian risk estimation with informative priors"
          concept="Estimates player injury probability using position-based priors (forwards more injury-prone than backs) updated with current injury status evidence."
          formula="P(injury) = Prior(position) × Likelihood(current_status) × Management_factor"
          rugbyAdaptation={[
            "Position priors: Props/Locks/Flankers ~20-25%, Backs ~12-15%",
            "Status multipliers: High = ×3, Medium = ×1.8, Low = ×1",
            "High-rated players (>85) assumed to receive better management (×0.85)",
            "Used to flag matchday risk and recommend squad rotation"
          ]}
          dataUsed="Player position, current injury flag (Low/Medium/High), player rating as management proxy"
          limitations="No access to actual medical data- uses heuristic priors only"
        />
      </Section>

      <Section title="7. Win Probability (Multi-Factor Model)" color={theme.blue}>
        <Theory
          origin="Composite of Elo + logistic regression feature weighting"
          concept="Combines base Elo prediction with performance metrics to produce a more nuanced win probability. Each metric contributes based on its historical importance to match outcomes in rugby."
          formula="P(win) = Elo_prob + Σ(weight_i × (metric_A_i - metric_B_i) / scale_i) × dampener"
          rugbyAdaptation={[
            "Factor weights derived from rugby analytics research:",
            "  • Gainline success: 20% (strongest predictor of winning in rugby)",
            "  • Defensive efficiency: 18% (tackle completion correlates with try prevention)",
            "  • Form/momentum: 15% (teams on streaks outperform base predictions)",
            "  • Scrum dominance: 12% (platform for territory and penalty advantage)",
            "  • Lineout control: 10% (set piece possession critical in Test rugby)",
            "  • Discipline: 10% (penalty differential often decides close matches)",
            "  • Kicking accuracy: 8% (3-point conversion of pressure into scoreboard)",
            "  • Red zone conversion: 7% (finishing ability separates top teams)"
          ]}
          dataUsed="Elo ratings + all 8 weighted performance metrics per team"
          limitations="Static weights- ideally these would be dynamically calibrated per tournament context"
        />
      </Section>

      <Section title="Data Sources & Refresh Process" color={theme.textSecondary}>
        <div style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: theme.textPrimary }}>Professional tournaments</strong> pull data from verified sources:
          </div>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li><strong>Super Rugby Pacific:</strong> super.rugby/superrugby/competition-stats/ + all.rugby cross-verification</li>
            <li><strong>Nations Championship:</strong> nationschampionshiprugby.com/en + World Rugby rankings</li>
            <li><strong>Rugby Championship:</strong> rugbychampionship.rugby + baseline from previous year</li>
          </ul>
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: theme.textPrimary }}>Refresh cycle:</strong> Click "Refresh Data" to pull latest statistics from the tournament's data source.
            For pre-tournament competitions, data uses previous year as baseline until live matches begin.
          </div>
          <div>
            <strong style={{ color: theme.textPrimary }}>Domestic tournaments:</strong> Entirely user-managed data entry. All analytics features
            (Game Plan, Season Simulator, Win Probability, Score Prediction) work identically- the algorithms
            are data-agnostic and perform the same calculations regardless of data source.
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ 
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
      padding: 20, marginBottom: 16, borderLeft: `4px solid ${color}`
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Theory({ origin, concept, formula, rugbyAdaptation, dataUsed, limitations }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.7 }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Origin: </span>
        <span style={{ color: theme.textSecondary }}>{origin}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Concept: </span>
        <span style={{ color: theme.textSecondary }}>{concept}</span>
      </div>
      <div style={{ 
        background: theme.surface, borderRadius: 8, padding: "8px 12px", marginBottom: 10,
        fontFamily: "monospace", fontSize: 11, color: theme.amber, overflowX: "auto"
      }}>
        {formula}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Rugby-Specific Adaptations:</div>
        {rugbyAdaptation.map((r, i) => (
          <div key={i} style={{ color: theme.textSecondary, paddingLeft: 12, borderLeft: `2px solid ${theme.border}`, marginBottom: 3, fontSize: 11 }}>
            {r}
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Data Used: </span>
        <span style={{ color: theme.textSecondary, fontSize: 11 }}>{dataUsed}</span>
      </div>
      <div>
        <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Limitations: </span>
        <span style={{ color: theme.textSecondary, fontSize: 11, fontStyle: "italic" }}>{limitations}</span>
      </div>
    </div>
  );
}
