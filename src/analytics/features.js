/**
 * Shared Feature Extraction Module
 * 
 * SINGLE SOURCE OF TRUTH for the 16-feature vector used by:
 * - mlEngine.js (ONNX inference + JS fallback)
 * - bayesian.js (Poisson score prediction)
 * - gamePlan.js (win probability + sensitivity analysis)
 * 
 * The Python training script (ml/fetch_and_train.py) uses an equivalent
 * extract_features() with the same formula. Any change here MUST be
 * mirrored there, or model predictions will be misaligned.
 * 
 * Feature vector (16 values, venue appended separately by caller):
 *   0:  (elo_A - elo_B) / 400
 *   1:  (gl_A - gl_B) / 50          gainline success %
 *   2:  (tr_A - tr_B) / 20          tackle rate %
 *   3:  (so_A - so_B) / 20          scrum success %
 *   4:  (lo_A - lo_B) / 20          lineout success %
 *   5:  (goal_A - goal_B) / 30      goal kick %
 *   6:  (form_A - form_B) / 50      form rating 0-100
 *   7:  (idx_A - idx_B) / 50        discipline index 0-100
 *   8:  (pts_pg_A - pts_pg_B) / 30  points per game
 *   9:  (to_A - to_B) / 10          turnovers won/game
 *  10:  (lb_A - lb_B) / 10          line breaks/game
 *  11:  (missed_B - missed_A) / 30  missed tackles/game (inverted)
 *  12:  (maul_A - maul_B) / 30      maul success %
 *  13:  (km_A - km_B) / 400         kick metres/game
 *  14:  (rs_A - rs_B) / 2           ruck speed (seconds)
 *  15:  (ps_A - ps_B) / 4           scrum penalties/game
 */

/**
 * Feature names for display and importance analysis (first 12 are primary)
 */
export const FEATURE_NAMES = [
  "Elo Rating Gap",
  "Gainline Advantage",
  "Tackle Efficiency",
  "Scrum Dominance",
  "Lineout Control",
  "Kicking Accuracy",
  "Form & Momentum",
  "Discipline Edge",
  "Scoring Rate",
  "Turnover Threat",
  "Line Break Power",
  "Defensive Pressure",
];

/**
 * Full 16 feature names (for model interpretation)
 */
export const FEATURE_NAMES_FULL = [
  ...FEATURE_NAMES,
  "Maul Dominance",
  "Kick Metres Edge",
  "Ruck Speed",
  "Scrum Pressure",
];

/**
 * Extract 16-dimensional feature vector from two team stat objects.
 * 
 * Team stat objects use the shape from teamFactory.js:
 *   { elo, attack: { gl, pts_pg, lb, rs }, defense: { tr, to, missed },
 *     setpiece: { so, lo, maul, ps }, kicking: { goal, km },
 *     form: { rating }, discipline: { idx } }
 * 
 * @param {Object} teamA - Home/selected team stats
 * @param {Object} teamB - Opposition team stats
 * @returns {number[]} 16-element feature vector (caller appends venue if needed)
 */
export function extractFeatures(teamA, teamB) {
  return [
    ((teamA.elo || 1400) - (teamB.elo || 1400)) / 400,
    ((teamA.attack?.gl || 50) - (teamB.attack?.gl || 50)) / 50,
    ((teamA.defense?.tr || 80) - (teamB.defense?.tr || 80)) / 20,
    ((teamA.setpiece?.so || 80) - (teamB.setpiece?.so || 80)) / 20,
    ((teamA.setpiece?.lo || 75) - (teamB.setpiece?.lo || 75)) / 20,
    ((teamA.kicking?.goal || 70) - (teamB.kicking?.goal || 70)) / 30,
    ((teamA.form?.rating || 50) - (teamB.form?.rating || 50)) / 50,
    ((teamA.discipline?.idx || 50) - (teamB.discipline?.idx || 50)) / 50,
    ((teamA.attack?.pts_pg || 20) - (teamB.attack?.pts_pg || 20)) / 30,
    ((teamA.defense?.to || 10) - (teamB.defense?.to || 10)) / 10,
    ((teamA.attack?.lb || 5) - (teamB.attack?.lb || 5)) / 10,
    ((teamB.defense?.missed || 25) - (teamA.defense?.missed || 25)) / 30,
    ((teamA.setpiece?.maul || 65) - (teamB.setpiece?.maul || 65)) / 30,
    ((teamA.kicking?.km || 500) - (teamB.kicking?.km || 500)) / 400,
    ((teamA.attack?.rs || 3.0) - (teamB.attack?.rs || 3.0)) / 2,
    ((teamA.setpiece?.ps || 2.0) - (teamB.setpiece?.ps || 2.0)) / 4,
  ];
}

/**
 * Model feature importance weights (from trained ONNX GBT)
 * Used as fallback when ONNX perturbation isn't available
 */
export const MODEL_IMPORTANCES = [
  0.212, 0.020, 0.044, 0.037, 0.049, 0.051,
  0.197, 0.067, 0.084, 0.055, 0.064, 0.068,
  0.053, 0.030, 0.020, 0.020,
];

/**
 * Feature weights aligned with ONNX model importance (for linear approximations)
 */
export const FEATURE_WEIGHTS = [
  0.22, 0.03, 0.03, 0.04, 0.05, 0.05,
  0.17, 0.06, 0.09, 0.05, 0.06, 0.05,
  0.03, 0.03, 0.02, 0.02,
];
