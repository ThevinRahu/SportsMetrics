/**
 * ELO Rating System for Rugby
 * 
 * Theory: Derived from chess (Arpad Elo, 1960s), adapted for team sports.
 * The system models team strength as a single number and predicts match outcomes
 * based on rating differences. After each match, ratings are adjusted based on
 * whether the result was expected or surprising.
 * 
 * Rugby Adaptations:
 * - Home advantage factor (+40 points equivalent)
 * - Margin of victory multiplier (larger wins = bigger rating change)
 * - K-factor varies by competition level (Test = 3, Club = 2)
 * - Draw handling (rugby rarely draws, but we account for it)
 * 
 * Formula: Expected = 1 / (1 + 10^((Rb - Ra + HFA) / 400))
 * where HFA = Home Field Advantage (40 rating points)
 */

const DEFAULT_K = 32;
const HOME_ADVANTAGE = 40;

/**
 * Calculate expected win probability between two teams
 * @param {number} ratingA - Team A's Elo rating
 * @param {number} ratingB - Team B's Elo rating  
 * @param {boolean} homeA - Whether Team A is at home
 * @returns {number} Probability (0-1) that Team A wins
 */
export function expectedOutcome(ratingA, ratingB, homeA = false) {
  const adjustment = homeA ? HOME_ADVANTAGE : 0;
  return 1 / (1 + Math.pow(10, -(ratingA - ratingB + adjustment) / 400));
}

/**
 * Calculate margin of victory multiplier
 * Rugby-specific: accounts for the fact that larger margins indicate
 * greater team superiority and should result in larger rating changes
 */
export function marginMultiplier(pointsDiff) {
  if (pointsDiff <= 0) return 1;
  return Math.log(Math.abs(pointsDiff) + 1) * (2.2 / (2.2 + 0.001 * pointsDiff));
}

/**
 * Update Elo ratings after a match
 * @param {number} ratingA - Team A current rating
 * @param {number} ratingB - Team B current rating
 * @param {number} scoreA - Team A score
 * @param {number} scoreB - Team B score
 * @param {number} K - K-factor (sensitivity)
 * @param {boolean} homeA - Team A home advantage
 * @returns {{ newRatingA: number, newRatingB: number }}
 */
export function updateRatings(ratingA, ratingB, scoreA, scoreB, K = DEFAULT_K, homeA = false) {
  const expected = expectedOutcome(ratingA, ratingB, homeA);
  const actual = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5;
  const margin = marginMultiplier(Math.abs(scoreA - scoreB));
  
  const change = K * margin * (actual - expected);
  
  return {
    newRatingA: Math.round(ratingA + change),
    newRatingB: Math.round(ratingB - change),
    change: Math.round(change)
  };
}

/**
 * Calculate win probability percentage for display
 */
export function winProbability(ratingA, ratingB, homeA = false) {
  return Math.round(expectedOutcome(ratingA, ratingB, homeA) * 100);
}

/**
 * Season-boundary Elo regression
 * Pulls rating toward competition mean at start of new season.
 * This captures squad turnover / coaching changes better than a game-count window.
 * 
 * Called once per team when first match of new season is detected.
 */
export function applySeasonRegression(currentRating, mean = 1500, factor = 0.30) {
  return Math.round(currentRating + (mean - currentRating) * factor);
}

export default {
  expectedOutcome,
  marginMultiplier,
  updateRatings,
  winProbability,
  applySeasonRegression,
  HOME_ADVANTAGE,
  DEFAULT_K
};
