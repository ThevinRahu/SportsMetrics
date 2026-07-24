/**
 * Cron Job: Check Live Match Status
 * 
 * Two-step Crawl4AI /extract pipeline:
 *   1. Hit tournament fixtures page → get match URLs for the current round
 *   2. Append /stats/ to each URL → extract structured scores + stats as JSON
 * 
 * When a match finishes:
 *   - Updates match record in Postgres
 *   - Recomputes standings, Elo, form
 *   - Blends stats into team profiles
 *   - Publishes "match_completed" event for SSE consumers
 * 
 * Protected by CRON_SECRET header (Vercel injects this automatically for cron).
 */

export const config = { maxDuration: 60 };

import { getLiveOrScheduledMatches, upsertMatch, getTournament, upsertTournament, publishEvent, logRefresh } from '../lib/db.js';

// Crawl4AI /extract helper
async function crawl4aiExtract(url, instruction) {
  const key = process.env.CRAWL4AI_KEY;
  if (!key) return null;

  const res = await fetch('https://gate.crawl4ai.com/extract', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, instruction }),
  });

  if (!res.ok) {
    console.warn(`Crawl4AI /extract ${res.status} for ${url}`);
    return null;
  }

  const result = await res.json();
  // Normalize: response can be array, object, or string
  let parsed = Array.isArray(result) ? result : result;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  return parsed;
}

// ============================================================
// STEP 1: Discover match URLs from fixtures page
// ============================================================

// Map tournament IDs to their rugbypass fixtures page
const FIXTURES_URLS = {
  'nc2026': 'https://www.rugbypass.com/nations-championship/fixtures-results/',
  'srp2026': 'https://www.rugbypass.com/super-rugby-pacific/fixtures-results/',
  'rc2026': 'https://www.rugbypass.com/rugby-championship/fixtures-results/',
  '6n2026': 'https://www.rugbypass.com/six-nations/fixtures-results/',
};

/**
 * Discover match stats URLs from the tournament fixtures page.
 * Returns array of { match, url } where url points to the live match page.
 */
async function discoverMatchUrls(tournamentId, round) {
  const fixturesUrl = FIXTURES_URLS[tournamentId];
  if (!fixturesUrl) return [];

  const instruction = `Give me round ${round} match links as a JSON array. Each item should have "match" (team names like "Ireland vs New Zealand") and "url" (the full rugbypass live match URL). Return ONLY valid JSON array, no explanation.`;

  const result = await crawl4aiExtract(fixturesUrl, instruction);
  if (!result) return [];

  // Normalize to array
  const links = Array.isArray(result) ? result : (result.matches || result.links || []);
  
  console.log(`Discovered ${links.length} match URLs for ${tournamentId} R${round}`);
  return links.filter(l => l && l.url);
}

/**
 * Convert a live match URL to a stats URL.
 * Input:  https://www.rugbypass.com/live/argentina-vs-england/?g=949581
 * Output: https://www.rugbypass.com/live/argentina-vs-england/stats/?g=949581
 */
function toStatsUrl(matchUrl) {
  try {
    const url = new URL(matchUrl);
    // Insert /stats/ before the query string
    let path = url.pathname;
    if (!path.includes('/stats')) {
      // Remove trailing slash, add /stats/
      path = path.replace(/\/?$/, '/stats/');
    }
    return `${url.origin}${path}${url.search}`;
  } catch {
    // Fallback: simple string manipulation
    const [base, query] = matchUrl.split('?');
    const cleanBase = base.replace(/\/?$/, '/stats/');
    return query ? `${cleanBase}?${query}` : cleanBase;
  }
}

// ============================================================
// STEP 2: Extract stats from individual match stats page
// ============================================================

const STATS_INSTRUCTION = `What was the final score and match stats for ${'{'}home_team{'}'} vs ${'{'}away_team{'}'}? CRITICAL RULES: Only answer if you are CERTAIN this match has been played and you know the real result. If you are not sure or the match hasn't happened yet, return {"played": false}. Do NOT guess. If the match HAS been played, return this JSON: {"played": true, "homeTeam": "<home>", "awayTeam": "<away>", "homeScore": <number>, "awayScore": <number>, "stats": {"home": {"tackles": null, "missed": null, "tackleRate": null, "carries": null, "lineBreaks": null, "penalties": null, "scrums": null, "scrumWin": null, "lineouts": null, "lineoutWin": null, "tries": null, "conversions": null, "penaltyGoals": null, "territory": null, "possession": null, "turnoversWon": null, "turnoversLost": null, "postContactMetres": null, "passes": null, "kicks": null, "gainline": null, "ruckSpeed": null, "dominantTackles": null, "offloads": null}, "away": {"tackles": null, "missed": null, "tackleRate": null, "carries": null, "lineBreaks": null, "penalties": null, "scrums": null, "scrumWin": null, "lineouts": null, "lineoutWin": null, "tries": null, "conversions": null, "penaltyGoals": null, "territory": null, "possession": null, "turnoversWon": null, "turnoversLost": null, "postContactMetres": null, "passes": null, "kicks": null, "gainline": null, "ruckSpeed": null, "dominantTackles": null, "offloads": null}}}. Return ONLY JSON. Use null for any stat you're not certain about.`;

/**
 * Extract stats from a match stats URL.
 * Returns { isFinal, homeScore, awayScore, stats } or { isFinal: false }
 */
async function extractMatchStats(statsUrl, homeTeam, awayTeam) {
  const instruction = STATS_INSTRUCTION
    .replace('{home_team}', homeTeam)
    .replace('{away_team}', awayTeam);

  const result = await crawl4aiExtract(statsUrl, instruction);
  if (!result) return { isFinal: false };

  // Normalize - could be array with single item
  let parsed = Array.isArray(result) ? result[0] : result;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return { isFinal: false }; }
  }

  if (!parsed || !parsed.played || parsed.homeScore == null || parsed.awayScore == null) {
    return { isFinal: false };
  }

  // Validate scores (rugby: 0-100)
  if (parsed.homeScore < 0 || parsed.homeScore > 100 || parsed.awayScore < 0 || parsed.awayScore > 100) {
    return { isFinal: false };
  }

  console.log(`Crawl4AI stats: ${homeTeam} ${parsed.homeScore}-${parsed.awayScore} ${awayTeam}`);

  return {
    isFinal: true,
    homeScore: parsed.homeScore,
    awayScore: parsed.awayScore,
    stats: parsed.stats || { home: {}, away: {} },
    source: 'crawl4ai-extract',
  };
}

// ============================================================
// MATCH TEAM NAME FUZZY MATCHING
// ============================================================

/**
 * Match a DB team name to a discovered URL by comparing slugified names.
 * DB: "New Zealand", URL match field: "Ireland vs New Zealand"
 */
function matchTeamToUrl(homeTeam, awayTeam, discoveredLinks) {
  const slugify = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const homeSlug = slugify(homeTeam);
  const awaySlug = slugify(awayTeam);

  for (const link of discoveredLinks) {
    const matchText = slugify(link.match || '');
    // Check if both team names appear in the match text or URL
    if ((matchText.includes(homeSlug) || link.url.includes(homeTeam.toLowerCase().replace(/\s+/g, '-'))) &&
        (matchText.includes(awaySlug) || link.url.includes(awayTeam.toLowerCase().replace(/\s+/g, '-')))) {
      return link.url;
    }
  }
  return null;
}

// ============================================================
// STANDINGS / ELO / FORM RECOMPUTE (unchanged)
// ============================================================

const REGRESSION_FACTOR = 0.30;
const COMPETITION_MEAN = 1500;
function applySeasonRegression(currentRating) {
  return Math.round(currentRating + (COMPETITION_MEAN - currentRating) * REGRESSION_FACTOR);
}

function blendStats(team, stats) {
  if (!team || !stats) return;
  if (stats.tackleRate != null && team.defense) team.defense.tr = Math.round((team.defense.tr + stats.tackleRate) / 2);
  if (stats.missed != null && team.defense) team.defense.missed = parseFloat(((team.defense.missed + stats.missed) / 2).toFixed(1));
  if (stats.lineBreaks != null && team.attack) team.attack.lb = parseFloat(((team.attack.lb + stats.lineBreaks) / 2).toFixed(1));
  if (stats.scrumWin != null && team.setpiece) team.setpiece.so = Math.round((team.setpiece.so + stats.scrumWin) / 2);
  if (stats.lineoutWin != null && team.setpiece) team.setpiece.lo = Math.round((team.setpiece.lo + stats.lineoutWin) / 2);
  if (stats.penalties != null && team.discipline) team.discipline.pen = Math.round((team.discipline.pen + stats.penalties) / 2);
  if (stats.turnoversWon != null && team.defense) team.defense.to = parseFloat(((team.defense.to + stats.turnoversWon) / 2).toFixed(1));
  if (stats.gainline != null && team.attack) team.attack.gl = Math.round((team.attack.gl + stats.gainline) / 2);
  if (stats.ruckSpeed != null && team.attack) team.attack.rs = parseFloat(((team.attack.rs + stats.ruckSpeed) / 2).toFixed(1));
  if (stats.carries != null && team.kicking) {
    const kmEst = (stats.kicks || 20) * 40;
    team.kicking.km = Math.round((team.kicking.km + kmEst) / 2);
  }
  if (stats.tries != null && stats.conversions != null && stats.tries > 0 && team.kicking) {
    const convRate = Math.round((stats.conversions / stats.tries) * 100);
    team.kicking.goal = Math.round((team.kicking.goal + convRate) / 2);
  }
  if (stats.postContactMetres != null && team.setpiece) {
    const maulProxy = Math.min(95, Math.max(40, stats.postContactMetres / 4));
    team.setpiece.maul = Math.round((team.setpiece.maul + maulProxy) / 2);
  }
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  const auth = req.headers['authorization']?.replace('Bearer ', '');
  const vercelCron = req.headers['x-vercel-cron'];
  
  if (!vercelCron && auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  let checked = 0;
  let completed = 0;

  try {
    const matches = await getLiveOrScheduledMatches();
    if (matches.length === 0) {
      return res.status(200).json({ checked: 0, completed: 0, message: 'No pending matches' });
    }

    // Group matches by tournament + round for efficient URL discovery
    const groups = {};
    for (const m of matches) {
      const key = `${m.tournament_id}:${m.round}`;
      if (!groups[key]) groups[key] = { tournamentId: m.tournament_id, round: m.round, matches: [] };
      groups[key].matches.push(m);
    }

    // Process each tournament-round group
    for (const group of Object.values(groups)) {
      // Limit to one round (6 matches max) per run to stay within 60s
      if (checked >= 6) break;

      // STEP 1: Discover match URLs from fixtures page
      const discoveredLinks = await discoverMatchUrls(group.tournamentId, group.round);

      // STEP 2: For each pending match, find its URL and extract stats
      for (const match of group.matches) {
        if (checked >= 6) break;
        checked++;

        let status = { isFinal: false };

        // Try to find the real URL from discovered links
        const matchUrl = matchTeamToUrl(match.home_team, match.away_team, discoveredLinks);

        if (matchUrl) {
          // Convert to stats URL and extract
          const statsUrl = toStatsUrl(matchUrl);
          status = await extractMatchStats(statsUrl, match.home_team, match.away_team);

          // If stats page failed, try the base match URL
          if (!status.isFinal) {
            status = await extractMatchStats(matchUrl, match.home_team, match.away_team);
          }
        } else {
          // No discovered URL - fall back to slug-based construction
          const homeSlug = match.home_team.toLowerCase().replace(/\s+/g, '-');
          const awaySlug = match.away_team.toLowerCase().replace(/\s+/g, '-');
          const fallbackUrl = `https://www.rugbypass.com/live/${homeSlug}-vs-${awaySlug}/stats/`;
          status = await extractMatchStats(fallbackUrl, match.home_team, match.away_team);
        }

        if (status.isFinal && match.status !== 'final') {
          // Match completed - persist and recompute
          await upsertMatch({
            tournamentId: match.tournament_id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeScore: status.homeScore,
            awayScore: status.awayScore,
            status: 'final',
            round: match.round,
            date: match.match_date,
            stats: status.stats,
            source: status.source,
          });

          // === FULL RECOMPUTE ===
          const tournament = await getTournament(match.tournament_id);
          if (tournament && tournament.teams) {
            const homeTeam = tournament.teams[match.home_team];
            const awayTeam = tournament.teams[match.away_team];

            if (homeTeam && awayTeam) {
              const hs = status.homeScore;
              const as = status.awayScore;
              const homeWon = hs > as;
              const awayWon = as > hs;
              const margin = Math.abs(hs - as);

              // 1. Season standings
              homeTeam.season.played = (homeTeam.season.played || 0) + 1;
              awayTeam.season.played = (awayTeam.season.played || 0) + 1;
              homeTeam.season.pf = (homeTeam.season.pf || 0) + hs;
              homeTeam.season.pa = (homeTeam.season.pa || 0) + as;
              awayTeam.season.pf = (awayTeam.season.pf || 0) + as;
              awayTeam.season.pa = (awayTeam.season.pa || 0) + hs;
              homeTeam.season.pd = homeTeam.season.pf - homeTeam.season.pa;
              awayTeam.season.pd = awayTeam.season.pf - awayTeam.season.pa;

              if (homeWon) {
                homeTeam.season.won = (homeTeam.season.won || 0) + 1;
                awayTeam.season.lost = (awayTeam.season.lost || 0) + 1;
                homeTeam.season.pts = (homeTeam.season.pts || 0) + 4;
                if (margin <= 7) awayTeam.season.pts = (awayTeam.season.pts || 0) + 1;
              } else if (awayWon) {
                awayTeam.season.won = (awayTeam.season.won || 0) + 1;
                homeTeam.season.lost = (homeTeam.season.lost || 0) + 1;
                awayTeam.season.pts = (awayTeam.season.pts || 0) + 4;
                if (margin <= 7) homeTeam.season.pts = (homeTeam.season.pts || 0) + 1;
              }

              const homeTries = status.stats?.home?.tries || 0;
              const awayTries = status.stats?.away?.tries || 0;
              if (homeTries >= 4) {
                homeTeam.season.pts = (homeTeam.season.pts || 0) + 1;
                homeTeam.season.try_bonus = (homeTeam.season.try_bonus || 0) + 1;
              }
              if (awayTries >= 4) {
                awayTeam.season.pts = (awayTeam.season.pts || 0) + 1;
                awayTeam.season.try_bonus = (awayTeam.season.try_bonus || 0) + 1;
              }
              homeTeam.season.tries_for = (homeTeam.season.tries_for || 0) + homeTries;
              homeTeam.season.tries_against = (homeTeam.season.tries_against || 0) + awayTries;
              awayTeam.season.tries_for = (awayTeam.season.tries_for || 0) + awayTries;
              awayTeam.season.tries_against = (awayTeam.season.tries_against || 0) + homeTries;

              // 2. Elo
              const K = 32;
              const HOME_ADV = 40;
              const expected = 1 / (1 + Math.pow(10, -((homeTeam.elo || 1400) - (awayTeam.elo || 1400) + HOME_ADV) / 400));
              const actual = homeWon ? 1 : awayWon ? 0 : 0.5;
              const marginMult = Math.log(Math.abs(hs - as) + 1) * (2.2 / (2.2 + 0.001 * Math.abs(hs - as)));
              const change = Math.round(K * marginMult * (actual - expected));
              homeTeam.elo = (homeTeam.elo || 1400) + change;
              awayTeam.elo = (awayTeam.elo || 1400) - change;

              // 3. Form
              const homeResult = homeWon ? 'W' : 'L';
              const awayResult = awayWon ? 'W' : 'L';
              homeTeam.form = homeTeam.form || { last5: [], last12: [], streak: '', rating: 50 };
              awayTeam.form = awayTeam.form || { last5: [], last12: [], streak: '', rating: 50 };
              homeTeam.form.last5 = [...(homeTeam.form.last5 || []), homeResult].slice(-5);
              homeTeam.form.last12 = [...(homeTeam.form.last12 || []), homeResult].slice(-12);
              awayTeam.form.last5 = [...(awayTeam.form.last5 || []), awayResult].slice(-5);
              awayTeam.form.last12 = [...(awayTeam.form.last12 || []), awayResult].slice(-12);

              // Streak
              const hStreak = homeTeam.form.last5;
              const lastH = hStreak[hStreak.length - 1];
              let hCount = 0;
              for (let i = hStreak.length - 1; i >= 0 && hStreak[i] === lastH; i--) hCount++;
              homeTeam.form.streak = `${lastH}${hCount}`;
              const aStreak = awayTeam.form.last5;
              const lastA = aStreak[aStreak.length - 1];
              let aCount = 0;
              for (let i = aStreak.length - 1; i >= 0 && aStreak[i] === lastA; i--) aCount++;
              awayTeam.form.streak = `${lastA}${aCount}`;

              // EMA rating
              function ema(results, alpha = 0.30) {
                let v = 50;
                for (const r of results) { v = alpha * (r === 'W' ? 100 : 0) + (1 - alpha) * v; }
                return Math.round(v);
              }
              homeTeam.form.rating = ema(homeTeam.form.last12.length >= 5 ? homeTeam.form.last12 : homeTeam.form.last5);
              awayTeam.form.rating = ema(awayTeam.form.last12.length >= 5 ? awayTeam.form.last12 : awayTeam.form.last5);

              // 4. Blend stats
              if (status.stats) {
                blendStats(homeTeam, status.stats.home);
                blendStats(awayTeam, status.stats.away);
              }

              // 5. Pts/game
              if (homeTeam.season.played > 0) {
                homeTeam.attack = homeTeam.attack || {};
                homeTeam.attack.pts_pg = parseFloat((homeTeam.season.pf / homeTeam.season.played).toFixed(1));
                homeTeam.attack.tries_pg = parseFloat((homeTeam.season.tries_for / homeTeam.season.played).toFixed(1));
              }
              if (awayTeam.season.played > 0) {
                awayTeam.attack = awayTeam.attack || {};
                awayTeam.attack.pts_pg = parseFloat((awayTeam.season.pf / awayTeam.season.played).toFixed(1));
                awayTeam.attack.tries_pg = parseFloat((awayTeam.season.tries_for / awayTeam.season.played).toFixed(1));
              }

              // 6. Round counter
              tournament.round = Math.max(tournament.round || 1, (match.round || 0) + 1);

              // 7. Save
              await upsertTournament(tournament);
            }
          }

          // Season regression on R1
          if (match.round === 1) {
            const t = await getTournament(match.tournament_id);
            if (t && t.teams) {
              const ht = t.teams[match.home_team];
              const at = t.teams[match.away_team];
              if (ht) ht.elo = applySeasonRegression(ht.elo);
              if (at) at.elo = applySeasonRegression(at.elo);
              await upsertTournament(t);
            }
          }

          // Publish SSE event
          await publishEvent('match_completed', {
            tournamentId: match.tournament_id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeScore: status.homeScore,
            awayScore: status.awayScore,
            round: match.round,
          });

          completed++;
        }
      }
    }

    await logRefresh({
      tournamentId: 'cron',
      source: 'cron/check-matches',
      success: true,
      matchesFound: completed,
      durationMs: Date.now() - startTime,
    });

    res.status(200).json({ checked, completed, durationMs: Date.now() - startTime });
  } catch (e) {
    await logRefresh({
      tournamentId: 'cron',
      source: 'cron/check-matches',
      success: false,
      error: e.message,
      durationMs: Date.now() - startTime,
    }).catch(() => {});

    res.status(500).json({ error: e.message });
  }
}
