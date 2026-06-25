/**
 * Bayesian Inference Engine for Rugby Analytics
 * 
 * Theory: Bayesian statistics (Thomas Bayes, 1763) updates beliefs about
 * uncertain quantities as new evidence arrives. In rugby:
 * - Prior: What we believe about team strength before the tournament
 * - Likelihood: How likely observed results are given true strength
 * - Posterior: Updated belief after seeing match results
 * 
 * Applications:
 * 1. Score prediction using Poisson-Bayesian model
 * 2. Player performance rating with uncertainty
 * 3. Form trend detection with exponential smoothing
 * 4. Injury probability estimation
 * 
 * The Poisson model assumes try-scoring follows a Poisson distribution
 * where lambda (expected tries) depends on attack vs defense metrics.
 */

/**
 * Poisson probability mass function
 * P(X = k) = (lambda^k * e^-lambda) / k!
 */
function poissonPMF(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logProb = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logProb -= Math.log(i);
  return Math.exp(logProb);
}

/**
 * Predict score distribution for a match using Poisson model
 * 
 * lambda_A = avg_tries_A * (opp_tries_conceded / league_avg_conceded)
 * 
 * @returns {{ teamA: { expectedTries, expectedPts, distribution }, teamB: same }}
 */
export function predictScore(teamAKey, teamBKey, teams) {
  const a = teams[teamAKey];
  const b = teams[teamBKey];
  if (!a || !b) return null;

  // League average calculation
  const allTeams = Object.values(teams);
  const leagueAvgTries = allTeams.reduce((s, t) => s + (t.attack?.tries_pg || 3), 0) / allTeams.length;
  const leagueAvgConceded = allTeams.reduce((s, t) => s + (t.season?.tries_against || 30) / Math.max(1, t.season?.played || 1), 0) / allTeams.length;

  // Expected tries using attack strength vs defense weakness
  const lambdaA = (a.attack?.tries_pg || 3) * 
    ((b.season?.tries_against || 30) / Math.max(1, b.season?.played || 1)) / 
    Math.max(0.5, leagueAvgConceded);
  
  const lambdaB = (b.attack?.tries_pg || 3) * 
    ((a.season?.tries_against || 30) / Math.max(1, a.season?.played || 1)) / 
    Math.max(0.5, leagueAvgConceded);

  // Generate score distributions (0-12 tries)
  const distA = [];
  const distB = [];
  for (let k = 0; k <= 12; k++) {
    distA.push({ tries: k, prob: poissonPMF(k, lambdaA) });
    distB.push({ tries: k, prob: poissonPMF(k, lambdaB) });
  }

  // Expected points (tries * 7 avg conversion value + penalties)
  const penA = Math.max(0, (b.discipline?.pen || 80) / 10 - 3) * 3;
  const penB = Math.max(0, (a.discipline?.pen || 80) / 10 - 3) * 3;
  
  const expectedPtsA = Math.round(lambdaA * 6.5 + penA + (a.kicking?.goal || 70) * 0.04);
  const expectedPtsB = Math.round(lambdaB * 6.5 + penB + (b.kicking?.goal || 70) * 0.04);

  return {
    teamA: {
      name: teamAKey,
      expectedTries: lambdaA.toFixed(1),
      expectedPts: expectedPtsA,
      distribution: distA
    },
    teamB: {
      name: teamBKey,
      expectedTries: lambdaB.toFixed(1),
      expectedPts: expectedPtsB,
      distribution: distB
    },
    margin: expectedPtsA - expectedPtsB,
    confidence: Math.min(95, Math.max(40, 
      60 + Math.abs(expectedPtsA - expectedPtsB) * 1.5
    ))
  };
}

/**
 * Exponential Moving Average for form detection
 * More recent matches weighted exponentially higher
 * 
 * @param {Array} results - Array of match results ["W", "L", "W", ...]
 * @param {number} alpha - Smoothing factor (0.3 = moderate, 0.5 = responsive)
 */
export function formEMA(results, alpha = 0.35) {
  if (!results || results.length === 0) return 50;
  
  let ema = 50; // Start neutral
  results.forEach(r => {
    const value = r === "W" ? 100 : r === "D" ? 50 : 0;
    ema = alpha * value + (1 - alpha) * ema;
  });
  
  return Math.round(ema);
}

/**
 * Calculate momentum score
 * Accounts for:
 * - Win streak length
 * - Quality of opposition beaten
 * - Recent vs older results weighting
 */
export function momentumScore(team) {
  if (!team) return 50;
  
  const last5 = team.form?.last5;
  const streak = team.form?.streak || "";
  
  // Guard: ensure last5 is actually an array with W/L values
  if (!Array.isArray(last5) || last5.length === 0) {
    // Fallback: use form.rating if available
    return team.form?.rating || 50;
  }
  
  // Base from EMA
  let score = formEMA(last5);
  
  // Streak bonus
  const streakMatch = streak.match(/([WL])(\d+)/);
  if (streakMatch) {
    const [, type, count] = streakMatch;
    const n = parseInt(count);
    if (type === "W") score += Math.min(15, n * 4);
    else score -= Math.min(15, n * 4);
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Player fatigue/injury risk Bayesian model
 * Prior: base injury risk from position and age
 * Evidence: matches played, minutes, current status
 */
export function injuryRiskEstimate(player) {
  if (!player) return 0.1;
  
  // Position-based prior
  const positionRisk = {
    LP: 0.25, HK: 0.22, THP: 0.25, LK: 0.20, FL: 0.22,
    "No.8": 0.22, SH: 0.15, FH: 0.12, C: 0.18, W: 0.14, FB: 0.12
  };
  
  let prior = positionRisk[player.pos] || 0.15;
  
  // Current status evidence
  if (player.injury === "High") prior = Math.min(0.8, prior * 3);
  else if (player.injury === "Medium") prior = Math.min(0.5, prior * 1.8);
  
  // Rating proxy for durability (higher rated = likely managed better)
  if ((player.rating || 75) > 85) prior *= 0.85;
  
  return Math.round(prior * 100);
}

export default { predictScore, formEMA, momentumScore, injuryRiskEstimate };
