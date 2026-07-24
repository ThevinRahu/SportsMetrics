/**
 * Shared blendStats function - single source of truth for blending
 * per-match extracted stats into a team's rolling profile.
 * 
 * Imported by:
 *   - api/cron/check-matches.js
 *   - api/refresh.js
 * 
 * Uses running average (new = (existing + extracted) / 2) to smooth
 * noise from single-match extraction. Each field is guarded so missing
 * extraction data doesn't corrupt existing values.
 * 
 * IMPORTANT: Discipline uses idx (0-100, higher = more disciplined),
 * NOT raw penalty count. This aligns with what the ML model, bayesian.js,
 * and gamePlan.js all read via extractFeatures().
 */

/**
 * Blend extracted match stats into a team's profile (running average).
 * Mutates the team object in place.
 * 
 * @param {Object} team - Team profile object (attack, defense, setpiece, kicking, discipline)
 * @param {Object} stats - Extracted per-match stats from Crawl4AI
 */
export function blendStats(team, stats) {
  if (!team || !stats) return;

  // --- Defense ---
  if (team.defense) {
    if (stats.tackleRate != null && !isNaN(stats.tackleRate)) {
      team.defense.tr = Math.round(((team.defense.tr || 80) + stats.tackleRate) / 2);
    }
    if (stats.missed != null && !isNaN(stats.missed)) {
      team.defense.missed = parseFloat((((team.defense.missed || 25) + stats.missed) / 2).toFixed(1));
    }
    if (stats.turnoversWon != null && !isNaN(stats.turnoversWon)) {
      team.defense.to = parseFloat((((team.defense.to || 8) + stats.turnoversWon) / 2).toFixed(1));
    }
    if (stats.dominantTackles != null && !isNaN(stats.dominantTackles)) {
      team.defense.dom = Math.round(((team.defense.dom || 10) + stats.dominantTackles) / 2);
    }
  }

  // --- Attack ---
  if (team.attack) {
    if (stats.lineBreaks != null && !isNaN(stats.lineBreaks)) {
      team.attack.lb = parseFloat((((team.attack.lb || 5) + stats.lineBreaks) / 2).toFixed(1));
    }
    if (stats.gainline != null && !isNaN(stats.gainline)) {
      team.attack.gl = Math.round(((team.attack.gl || 50) + stats.gainline) / 2);
    }
    if (stats.ruckSpeed != null && !isNaN(stats.ruckSpeed)) {
      team.attack.rs = parseFloat((((team.attack.rs || 3.0) + stats.ruckSpeed) / 2).toFixed(1));
    }
    if (stats.offloads != null && !isNaN(stats.offloads)) {
      team.attack.off = parseFloat((((team.attack.off || 8) + stats.offloads) / 2).toFixed(1));
    }
  }

  // --- Set Piece ---
  if (team.setpiece) {
    if (stats.scrumWin != null && !isNaN(stats.scrumWin)) {
      team.setpiece.so = Math.round(((team.setpiece.so || 80) + stats.scrumWin) / 2);
    }
    if (stats.lineoutWin != null && !isNaN(stats.lineoutWin)) {
      team.setpiece.lo = Math.round(((team.setpiece.lo || 75) + stats.lineoutWin) / 2);
    }
    if (stats.postContactMetres != null && !isNaN(stats.postContactMetres)) {
      const maulProxy = Math.min(95, Math.max(40, stats.postContactMetres / 4));
      team.setpiece.maul = Math.round(((team.setpiece.maul || 60) + maulProxy) / 2);
    }
  }

  // --- Kicking ---
  if (team.kicking) {
    if (stats.kicks != null && !isNaN(stats.kicks)) {
      const kmEst = stats.kicks * 40;
      team.kicking.km = Math.round(((team.kicking.km || 500) + kmEst) / 2);
    }
    if (stats.tries != null && stats.conversions != null && stats.tries > 0) {
      const convRate = Math.round((stats.conversions / stats.tries) * 100);
      team.kicking.goal = Math.round(((team.kicking.goal || 70) + convRate) / 2);
    }
  }

  // --- Discipline (idx: 0-100, higher = more disciplined) ---
  if (team.discipline && stats.penalties != null && !isNaN(stats.penalties)) {
    const matchIdx = Math.max(20, Math.min(100, 100 - (stats.penalties * 5)));
    team.discipline.idx = Math.round(((team.discipline.idx || 50) + matchIdx) / 2);
  }
}

export default blendStats;
