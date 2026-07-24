/**
 * Server-side stats validation for Crawl4AI extraction output.
 * 
 * Validates extracted match data BEFORE it's blended into team profiles.
 * Catches hallucinated/garbled values and replaces them with null
 * so blendStats skips them safely.
 * 
 * Used by both api/cron/check-matches.js and api/refresh.js
 * (imported via blendStats.js which calls it automatically).
 */

/**
 * Parse a value that might be a string with units into a number.
 * Returns null if unparseable.
 */
function parseNum(val) {
  if (val == null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/[^0-9.\-]/g, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Validate and sanitize a single team's extracted stats object.
 * Returns a clean object with only valid, in-range values.
 * Invalid/out-of-range values are set to null (blendStats will skip them).
 * 
 * @param {Object} raw - Raw stats object from Crawl4AI extraction
 * @returns {Object} Sanitized stats with null for invalid fields
 */
export function sanitizeTeamStats(raw) {
  if (!raw || typeof raw !== 'object') return {};

  return {
    // Counts (must be non-negative integers, reasonable rugby ranges)
    tackles: inRange(parseNum(raw.tackles), 0, 300),
    missed: inRange(parseNum(raw.missed), 0, 80),
    carries: inRange(parseNum(raw.carries), 0, 250),
    lineBreaks: inRange(parseNum(raw.lineBreaks), 0, 30),
    penalties: inRange(parseNum(raw.penalties), 0, 25),
    scrums: inRange(parseNum(raw.scrums), 0, 30),
    lineouts: inRange(parseNum(raw.lineouts), 0, 40),
    tries: inRange(parseNum(raw.tries), 0, 15),
    conversions: inRange(parseNum(raw.conversions), 0, 15),
    penaltyGoals: inRange(parseNum(raw.penaltyGoals), 0, 10),
    passes: inRange(parseNum(raw.passes), 0, 400),
    kicks: inRange(parseNum(raw.kicks), 0, 60),
    turnoversWon: inRange(parseNum(raw.turnoversWon), 0, 25),
    turnoversLost: inRange(parseNum(raw.turnoversLost), 0, 25),
    dominantTackles: inRange(parseNum(raw.dominantTackles), 0, 50),
    offloads: inRange(parseNum(raw.offloads), 0, 30),

    // Percentages (must be 0-100)
    tackleRate: inRange(parseNum(raw.tackleRate), 50, 100),
    scrumWin: inRange(parseNum(raw.scrumWin), 0, 100),
    lineoutWin: inRange(parseNum(raw.lineoutWin), 0, 100),
    territory: inRange(parseNum(raw.territory), 0, 100),
    possession: inRange(parseNum(raw.possession), 0, 100),
    gainline: inRange(parseNum(raw.gainline), 0, 100),
    ruckSpeed: inRange(parseNum(raw.ruckSpeed), 0, 100),

    // Metres (must be positive, reasonable range)
    postContactMetres: inRange(parseNum(raw.postContactMetres), 0, 800),
  };
}

/**
 * Validate full match extraction result.
 * Returns sanitized data or null if fundamentally invalid.
 * 
 * @param {Object} extracted - Full extraction result { played, homeScore, awayScore, stats }
 * @returns {{ valid: boolean, data: Object|null, quality: number }}
 */
export function validateExtraction(extracted) {
  if (!extracted || !extracted.played) {
    return { valid: false, data: null, quality: 0 };
  }

  const homeScore = parseNum(extracted.homeScore);
  const awayScore = parseNum(extracted.awayScore);

  // Scores must be valid rugby scores (0-100)
  if (homeScore == null || awayScore == null || homeScore < 0 || homeScore > 100 || awayScore < 0 || awayScore > 100) {
    return { valid: false, data: null, quality: 0 };
  }

  // Sanitize stats
  const stats = {
    home: sanitizeTeamStats(extracted.stats?.home),
    away: sanitizeTeamStats(extracted.stats?.away),
  };

  // Quality score: how many key fields are non-null?
  const quality = computeQuality(stats);

  return {
    valid: true,
    data: {
      played: true,
      homeTeam: extracted.homeTeam || null,
      awayTeam: extracted.awayTeam || null,
      homeScore,
      awayScore,
      stats,
    },
    quality,
  };
}

/**
 * Compute extraction quality score (0-100).
 * Higher = more stats successfully extracted.
 */
function computeQuality(stats) {
  const CRITICAL = ['tackles', 'missed', 'carries', 'lineBreaks', 'penalties',
    'scrumWin', 'lineoutWin', 'tries', 'tackleRate'];
  
  let found = 0;
  const total = CRITICAL.length * 2; // home + away
  for (const field of CRITICAL) {
    if (stats.home[field] != null) found++;
    if (stats.away[field] != null) found++;
  }
  return Math.round((found / total) * 100);
}

/**
 * Range check helper. Returns value if within [min, max], null otherwise.
 */
function inRange(val, min, max) {
  if (val == null) return null;
  return (val >= min && val <= max) ? val : null;
}

export default { sanitizeTeamStats, validateExtraction };
