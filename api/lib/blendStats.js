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
 * Parse a stat value that might be a string with units (e.g. "91%", "432m", "3.2s")
 * into a plain number. Returns null if unparseable.
 */
function parseStatValue(val) {
  if (val == null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/[^0-9.\-]/g, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

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
    const tr = parseStatValue(stats.tackleRate);
    if (tr != null && tr >= 50 && tr <= 100) {
      // tackleRate must be a percentage (50-100%), reject raw counts
      team.defense.tr = Math.round(((team.defense.tr || 80) + tr) / 2);
    }
    const missed = parseStatValue(stats.missed);
    if (missed != null && missed < 100) {
      team.defense.missed = parseFloat((((team.defense.missed || 25) + missed) / 2).toFixed(1));
    }
    const to = parseStatValue(stats.turnoversWon);
    if (to != null && to < 30) {
      team.defense.to = parseFloat((((team.defense.to || 8) + to) / 2).toFixed(1));
    }
    const dom = parseStatValue(stats.dominantTackles);
    if (dom != null) {
      team.defense.dom = Math.round(((team.defense.dom || 10) + dom) / 2);
    }
  }

  // --- Attack ---
  if (team.attack) {
    const lb = parseStatValue(stats.lineBreaks);
    if (lb != null && lb < 30) {
      team.attack.lb = parseFloat((((team.attack.lb || 5) + lb) / 2).toFixed(1));
    }
    const gl = parseStatValue(stats.gainline);
    if (gl != null && gl >= 20 && gl <= 100) {
      // gainline must be a percentage (20-100%)
      team.attack.gl = Math.round(((team.attack.gl || 50) + gl) / 2);
    }
    const rs = parseStatValue(stats.ruckSpeed);
    if (rs != null && rs < 10) {
      // ruck speed in seconds (typically 2-5)
      team.attack.rs = parseFloat((((team.attack.rs || 3.0) + rs) / 2).toFixed(1));
    }
    const off = parseStatValue(stats.offloads);
    if (off != null && off < 30) {
      team.attack.off = parseFloat((((team.attack.off || 8) + off) / 2).toFixed(1));
    }
  }

  // --- Set Piece ---
  if (team.setpiece) {
    const so = parseStatValue(stats.scrumWin);
    if (so != null && so >= 50 && so <= 100) {
      // scrum win must be a percentage (50-100%)
      team.setpiece.so = Math.round(((team.setpiece.so || 80) + so) / 2);
    }
    const lo = parseStatValue(stats.lineoutWin);
    if (lo != null && lo >= 50 && lo <= 100) {
      // lineout win must be a percentage (50-100%)
      team.setpiece.lo = Math.round(((team.setpiece.lo || 75) + lo) / 2);
    }
    const pcm = parseStatValue(stats.postContactMetres);
    if (pcm != null && pcm > 10) {
      const maulProxy = Math.min(95, Math.max(40, pcm / 4));
      team.setpiece.maul = Math.round(((team.setpiece.maul || 60) + maulProxy) / 2);
    }
  }

  // --- Kicking ---
  if (team.kicking) {
    const kicks = parseStatValue(stats.kicks);
    if (kicks != null) {
      const kmEst = kicks * 40;
      team.kicking.km = Math.round(((team.kicking.km || 500) + kmEst) / 2);
    }
    const tries = parseStatValue(stats.tries);
    const convs = parseStatValue(stats.conversions);
    if (tries != null && convs != null && tries > 0) {
      const convRate = Math.round((convs / tries) * 100);
      team.kicking.goal = Math.round(((team.kicking.goal || 70) + convRate) / 2);
    }
  }

  // --- Discipline (idx: 0-100, higher = more disciplined) ---
  const pens = parseStatValue(stats.penalties);
  if (team.discipline && pens != null) {
    const matchIdx = Math.max(20, Math.min(100, 100 - (pens * 5)));
    team.discipline.idx = Math.round(((team.discipline.idx || 50) + matchIdx) / 2);
  }
}

export default blendStats;
