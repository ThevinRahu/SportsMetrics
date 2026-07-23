/**
 * SportsMetrics Analytics Engine - Index
 * 
 * Combines all analytical models into a unified interface.
 * 
 * Models implemented:
 * 1. Elo Rating System - Team strength quantification
 * 2. Monte Carlo Simulation - Season/tournament outcome projection  
 * 3. Bayesian/Poisson Model - Score prediction with uncertainty
 * 4. Game Plan Engine - Strategic coaching recommendations
 * 5. Bradley-Terry Model - Pairwise comparison rankings
 * 
 * Designed to be sport-agnostic at the interface level,
 * with rugby-specific implementations that can be extended.
 */

export { expectedOutcome, winProbability, updateRatings } from './elo';
export { simulateSeason, simulateHeadToHead } from './monteCarlo';
export { predictScore, formEMA, momentumScore, injuryRiskEstimate } from './bayesian';
export { advancedWinProbability, generateGamePlan, improvementImpact } from './gamePlan';
export { extractFeatures, FEATURE_NAMES, FEATURE_NAMES_FULL, FEATURE_WEIGHTS, MODEL_IMPORTANCES } from './features';
