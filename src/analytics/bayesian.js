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
export function predictScore(teamAKey, teamBKey, teams, venue = "neutral") {
  const a = teams[teamAKey];
  const b = teams[teamBKey];
  if (!a || !b) return null;

  // Use ML model as source of truth for margin
  // Import would create circular dep, so we calculate the same way mlEngine does
  const features = [
    ((a.elo || 1400) - (b.elo || 1400)) / 400,
    ((a.attack?.gl || 50) - (b.attack?.gl || 50)) / 50,
    ((a.defense?.tr || 80) - (b.defense?.tr || 80)) / 20,
    ((a.setpiece?.so || 80) - (b.setpiece?.so || 80)) / 20,
    ((a.setpiece?.lo || 75) - (b.setpiece?.lo || 75)) / 20,
    ((a.kicking?.goal || 70) - (b.kicking?.goal || 70)) / 30,
    ((a.form?.rating || 50) - (b.form?.rating || 50)) / 50,
    ((b.discipline?.pen || 80) - (a.discipline?.pen || 80)) / 100,
    ((a.attack?.pts_pg || 20) - (b.attack?.pts_pg || 20)) / 30,
    ((a.defense?.to || 10) - (b.defense?.to || 10)) / 10,
    ((a.attack?.lb || 5) - (b.attack?.lb || 5)) / 10,
    ((b.defense?.missed || 25) - (a.defense?.missed || 25)) / 30,
    ((a.setpiece?.maul || 65) - (b.setpiece?.maul || 65)) / 30,
    ((a.kicking?.km || 500) - (b.kicking?.km || 500)) / 400,
    ((a.attack?.rs || 3.0) - (b.attack?.rs || 3.0)) / 2,
    ((a.setpiece?.ps || 2.0) - (b.setpiece?.ps || 2.0)) / 4,
  ];

  // Weighted sum (same relative importance as ONNX model feature importance)
  const weights = [0.22, 0.03, 0.03, 0.04, 0.05, 0.05, 0.17, 0.06, 0.09, 0.05, 0.06, 0.05, 0.03, 0.03, 0.02, 0.02];
  let rawScore = features.reduce((sum, f, i) => sum + f * weights[i], 0);
  
  // Home advantage adjustment
  if (venue === "home") rawScore += 0.15;
  else if (venue === "away") rawScore -= 0.15;
  
  // Convert to win probability via sigmoid
  const winProb = 1 / (1 + Math.exp(-rawScore * 4));
  
  // Derive margin from win probability (consistent)
  const margin = Math.round((winProb - 0.5) * 40); // Maps 50%→0, 75%→+10, 100%→+20
  
  // Derive individual scores from margin + average scoring rates
  const avgA = a.attack?.pts_pg || 22;
  const avgB = b.attack?.pts_pg || 22;
  const midpoint = (avgA + avgB) / 2;
  
  const expectedPtsA = Math.round(Math.max(10, Math.min(50, midpoint + margin / 2)));
  const expectedPtsB = Math.round(Math.max(10, Math.min(50, midpoint - margin / 2)));
  
  // Derive tries from points (avg 6.5 pts per try in rugby)
  const triesA = Math.max(1, Math.min(8, expectedPtsA / 6.5));
  const triesB = Math.max(1, Math.min(8, expectedPtsB / 6.5));

  // Poisson distributions for display
  const distA = [];
  const distB = [];
  for (let k = 0; k <= 10; k++) {
    distA.push({ tries: k, prob: poissonPMF(k, triesA) });
    distB.push({ tries: k, prob: poissonPMF(k, triesB) });
  }

  return {
    teamA: {
      name: teamAKey,
      expectedTries: triesA.toFixed(1),
      expectedPts: expectedPtsA,
      distribution: distA
    },
    teamB: {
      name: teamBKey,
      expectedTries: triesB.toFixed(1),
      expectedPts: expectedPtsB,
      distribution: distB
    },
    margin: expectedPtsA - expectedPtsB,
    confidence: Math.min(90, Math.max(45, 
      50 + Math.abs(margin) * 2
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
  
  // Use last12 with extended EMA if available (smoother, recency-weighted)
  const last12 = team.form?.last12;
  const last5 = team.form?.last5;
  const streak = team.form?.streak || "";
  
  // Guard: ensure we have an array with W/L values
  const formArray = (Array.isArray(last12) && last12.length >= 5) ? last12 
    : (Array.isArray(last5) && last5.length > 0) ? last5 
    : null;
  
  if (!formArray) {
    return team.form?.rating || 50;
  }
  
  // Use extended EMA (alpha 0.30) for last12, original EMA for last5
  const numericResults = resultsToNumeric(formArray);
  let score = formArray.length >= 8 
    ? formEMAExtended(numericResults, 0.30) 
    : formEMA(formArray);
  
  // Streak bonus
  const streakMatch = streak.match(/([WL])(\d+)/);
  if (streakMatch) {
    const [, type, count] = streakMatch;
    const n = parseInt(count);
    if (type === "W") score += Math.min(15, n * 4);
    else score -= Math.min(15, n * 4);
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
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

/**
 * Extended Form EMA - uses last 10-12 results for smoother signal
 * The exponential decay naturally handles recency (recent games weight more)
 * without needing a hard cutoff.
 */
export function formEMAExtended(results, alpha = 0.30) {
  if (!results || results.length === 0) return 50;
  let ema = 50; // neutral baseline
  for (const value of results) {
    ema = alpha * value + (1 - alpha) * ema;
  }
  return Math.round(ema * 10) / 10;
}

/**
 * Convert W/L/D array to numeric values for EMA computation
 */
export function resultsToNumeric(wldArray) {
  return (wldArray || []).map(r => {
    if (r === 'W') return 100;
    if (r === 'D') return 50;
    return 0; // L
  });
}

export default { predictScore, formEMA, formEMAExtended, resultsToNumeric, momentumScore, injuryRiskEstimate };

