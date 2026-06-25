/**
 * Monte Carlo Season Simulator
 * 
 * Theory: Monte Carlo methods (Stanislaw Ulam, 1940s) use repeated random sampling
 * to compute numerical results. For rugby, we simulate remaining matches thousands
 * of times using each team's probability distribution to project:
 * - Final standings
 * - Playoff qualification chances
 * - Championship probability
 * 
 * How it works:
 * 1. For each simulation (N=5000):
 *    a. Simulate all remaining matches using win probability
 *    b. Calculate final points tables
 *    c. Determine playoff qualifiers and champion
 * 2. Aggregate results across all simulations
 * 3. Report percentage chances for each outcome
 * 
 * Rugby-specific adjustments:
 * - Bonus point probability (try bonus ~35%, losing bonus ~25%)
 * - Score distribution based on historical averages
 * - Form momentum factor (recent results weighted more)
 */

import { expectedOutcome } from './elo';

const SIMULATIONS = 5000;

/**
 * Simulate a single match and return result with bonus points
 */
function simulateMatch(teamA, teamB, teams) {
  const a = teams[teamA];
  const b = teams[teamB];
  if (!a || !b) return { winner: teamA, loser: teamB, bonusW: 0, bonusL: 0 };

  const prob = expectedOutcome(a.elo, b.elo);
  
  // Add form factor
  const formAdj = ((a.form?.rating || 50) - (b.form?.rating || 50)) * 0.002;
  const adjustedProb = Math.max(0.05, Math.min(0.95, prob + formAdj));
  
  const aWins = Math.random() < adjustedProb;
  const winner = aWins ? teamA : teamB;
  const loser = aWins ? teamB : teamA;
  
  // Try bonus probability (scoring 3+ more tries than opponent)
  const tryBonusProb = aWins 
    ? 0.3 + (adjustedProb - 0.5) * 0.4  // stronger favorites more likely
    : 0.3 + (0.5 - adjustedProb) * 0.4;
  const bonusW = Math.random() < tryBonusProb ? 1 : 0;
  
  // Losing bonus (within 7 points)
  const closeness = 1 - Math.abs(adjustedProb - 0.5) * 2;
  const bonusL = Math.random() < (0.2 + closeness * 0.2) ? 1 : 0;
  
  return { winner, loser, bonusW, bonusL };
}

/**
 * Run full season simulation
 * @param {Object} teams - All teams in tournament
 * @param {number} playoffSpots - Number of playoff spots (default 4 for Super Rugby)
 * @param {number} remainingRounds - Rounds left to play
 * @returns {Object} Simulation results per team
 */
export function simulateSeason(teams, playoffSpots = 4, remainingRounds = 2) {
  const teamKeys = Object.keys(teams);
  const results = {};
  
  teamKeys.forEach(k => {
    results[k] = { 
      semifinal: 0, 
      final: 0, 
      champion: 0, 
      avgPoints: 0,
      avgPosition: 0,
      top4: 0,
      top8: 0
    };
  });

  for (let sim = 0; sim < SIMULATIONS; sim++) {
    // Start with current points
    const pts = {};
    teamKeys.forEach(k => {
      pts[k] = teams[k].season?.pts || 0;
    });

    // Simulate remaining rounds
    for (let r = 0; r < remainingRounds; r++) {
      const shuffled = [...teamKeys].sort(() => Math.random() - 0.5);
      for (let m = 0; m < Math.floor(shuffled.length / 2); m++) {
        const a = shuffled[m * 2];
        const b = shuffled[m * 2 + 1];
        const result = simulateMatch(a, b, teams);
        
        pts[result.winner] += 4 + result.bonusW;
        pts[result.loser] += result.bonusL;
      }
    }

    // Sort by points
    const sorted = [...teamKeys].sort((a, b) => {
      if (pts[b] !== pts[a]) return pts[b] - pts[a];
      // Tiebreaker: point differential
      const pdA = (teams[a].season?.pf || 0) - (teams[a].season?.pa || 0);
      const pdB = (teams[b].season?.pf || 0) - (teams[b].season?.pa || 0);
      return pdB - pdA;
    });

    // Record positions
    sorted.forEach((k, i) => {
      results[k].avgPoints += pts[k];
      results[k].avgPosition += i + 1;
      if (i < playoffSpots) results[k].top4++;
      if (i < 8) results[k].top8++;
    });

    // Simulate playoffs
    if (sorted.length >= playoffSpots && playoffSpots >= 2) {
      const sf = sorted.slice(0, playoffSpots);
      sf.forEach(k => results[k].semifinal++);

      if (playoffSpots >= 4) {
        // Semi-finals: 1v4, 2v3
        const sf1Winner = Math.random() < expectedOutcome(
          teams[sf[0]].elo, teams[sf[3]].elo
        ) ? sf[0] : sf[3];
        const sf2Winner = Math.random() < expectedOutcome(
          teams[sf[1]].elo, teams[sf[2]].elo
        ) ? sf[1] : sf[2];

        results[sf1Winner].final++;
        results[sf2Winner].final++;

        // Final
        const champion = Math.random() < expectedOutcome(
          teams[sf1Winner].elo, teams[sf2Winner].elo
        ) ? sf1Winner : sf2Winner;
        results[champion].champion++;
      } else if (playoffSpots === 2) {
        // Direct final: 1st vs 2nd
        results[sf[0]].final++;
        results[sf[1]].final++;

        const champion = Math.random() < expectedOutcome(
          teams[sf[0]].elo, teams[sf[1]].elo
        ) ? sf[0] : sf[1];
        results[champion].champion++;
      } else if (playoffSpots === 1) {
        // No playoff- top of table wins
        results[sf[0]].final++;
        results[sf[0]].champion++;
      }
    }
  }

  // Normalize
  teamKeys.forEach(k => {
    results[k].semifinal = Math.round((results[k].semifinal / SIMULATIONS) * 100);
    results[k].final = Math.round((results[k].final / SIMULATIONS) * 100);
    results[k].champion = Math.round((results[k].champion / SIMULATIONS) * 100);
    results[k].top4 = Math.round((results[k].top4 / SIMULATIONS) * 100);
    results[k].top8 = Math.round((results[k].top8 / SIMULATIONS) * 100);
    results[k].avgPoints = Math.round(results[k].avgPoints / SIMULATIONS);
    results[k].avgPosition = (results[k].avgPosition / SIMULATIONS).toFixed(1);
  });

  return results;
}

/**
 * Quick head-to-head simulation (1000 iterations)
 */
export function simulateHeadToHead(teamAKey, teamBKey, teams, iterations = 1000) {
  const a = teams[teamAKey];
  const b = teams[teamBKey];
  if (!a || !b) return { aWins: 50, bWins: 50, draws: 0 };

  let aWins = 0, bWins = 0;
  
  for (let i = 0; i < iterations; i++) {
    const result = simulateMatch(teamAKey, teamBKey, teams);
    if (result.winner === teamAKey) aWins++;
    else bWins++;
  }

  return {
    aWins: Math.round((aWins / iterations) * 100),
    bWins: Math.round((bWins / iterations) * 100),
    draws: 0
  };
}

export default { simulateSeason, simulateHeadToHead };
