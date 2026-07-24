/**
 * Cron Job: Check Live Match Status
 * 
 * Runs on a schedule (configured in vercel.json).
 * Checks if any scheduled/live matches have completed.
 * When a match finishes:
 *   1. Fetches full box-score stats from rugbypass
 *   2. Updates match record in Postgres
 *   3. Recomputes standings, Elo, form
 *   4. Publishes "match_completed" event for SSE consumers
 * 
 * Protected by CRON_SECRET header (Vercel injects this automatically for cron).
 */

export const config = { maxDuration: 60 };

import { getLiveOrScheduledMatches, upsertMatch, getTournament, upsertTournament, publishEvent, logRefresh } from '../lib/db.js';

// Season regression - canonical implementation in src/analytics/elo.js
// Duplicated here because Vercel serverless can't import from src/ client modules
const REGRESSION_FACTOR = 0.30;
const COMPETITION_MEAN = 1500;
function applySeasonRegression(currentRating) {
  return Math.round(currentRating + (COMPETITION_MEAN - currentRating) * REGRESSION_FACTOR);
}

// Check rugbypass for match status (Full Time indicator)
async function checkMatchStatus(match) {
  // Build rugbypass stats URL from team names
  const homeSlug = match.home_team.toLowerCase().replace(/\s+/g, '-');
  const awaySlug = match.away_team.toLowerCase().replace(/\s+/g, '-');
  const statsUrl = `https://www.rugbypass.com/live/${homeSlug}-vs-${awaySlug}/stats/`;

  // PRIMARY: Use Crawl4AI /extract to get structured stats directly
  const crawl4aiResult = await extractWithCrawl4AI(statsUrl, match);
  if (crawl4aiResult.isFinal) return crawl4aiResult;

  // FALLBACK: Try the match page without /stats/ suffix
  const matchUrl = `https://www.rugbypass.com/live/${homeSlug}-vs-${awaySlug}/`;
  const fallbackResult = await extractWithCrawl4AI(matchUrl, match);
  if (fallbackResult.isFinal) return fallbackResult;

  return { isFinal: false };
}

/**
 * Crawl4AI /extract - uses LLM instruction to return structured JSON directly.
 * No regex needed. Renders the JS SPA and extracts scores + stats in one call.
 */
async function extractWithCrawl4AI(url, match) {
  const crawl4aiKey = process.env.CRAWL4AI_KEY;
  if (!crawl4aiKey) return { isFinal: false };

  const instruction = `What was the final score and match stats for ${match.home_team} vs ${match.away_team} played on ${match.match_date}? CRITICAL RULES: - Only answer if you are CERTAIN this match has been played and you know the real result - If you are not sure or the match hasn't happened yet, return {"played": false} - Do NOT guess or make up scores. Only provide verified, real data. - This data will be used for professional coaching decisions. If the match HAS been played, return this JSON: {"played": true, "homeTeam": "${match.home_team}", "awayTeam": "${match.away_team}", "homeScore": <number>, "awayScore": <number>, "stats": {"home": {"tackles": null, "missed": null, "tackleRate": null, "carries": null, "lineBreaks": null, "penalties": null, "scrums": null, "scrumWin": null, "lineouts": null, "lineoutWin": null, "tries": null, "conversions": null, "penaltyGoals": null, "territory": null, "possession": null, "turnoversWon": null, "turnoversLost": null, "postContactMetres": null, "passes": null, "kicks": null, "gainline": null, "ruckSpeed": null, "dominantTackles": null, "offloads": null}, "away": { same fields }}} STAT DEFINITIONS: tackles: total tackles made - missed: tackles missed - tackleRate: tackle completion percentage (0-100) - carries: ball carries - lineBreaks: line breaks made - penalties: penalties conceded - scrums: number of scrums - scrumWin: scrum win percentage (0-100) - lineouts: number of lineouts - lineoutWin: lineout win percentage (0-100) - tries: tries scored - conversions: conversions kicked - penaltyGoals: penalty goals kicked - territory: territory percentage (0-100) - possession: possession percentage (0-100) - turnoversWon: turnovers won - turnoversLost: turnovers conceded - postContactMetres: post-contact metres gained - passes: total passes - kicks: total kicks from hand - gainline: gainline success percentage (0-100) - ruckSpeed: ruck speed - percentage of rucks where ball is recycled in 0-3 seconds - dominantTackles: dominant tackles made (drove ball carrier backwards) - offloads: offloads in contact. Return ONLY JSON. Use null for any stat you're not certain about.`;

  try {
    const res = await fetch('https://gate.crawl4ai.com/extract', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${crawl4aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, instruction }),
    });

    if (!res.ok) {
      console.warn(`Crawl4AI /extract returned ${res.status} for ${url}`);
      return { isFinal: false };
    }

    const result = await res.json();
    
    // Response can be an array or object - normalize
    let parsed = Array.isArray(result) ? result[0] : result;
    
    // If the response is a string (raw JSON), parse it
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return { isFinal: false }; }
    }

    if (!parsed || !parsed.played || parsed.homeScore == null || parsed.awayScore == null) {
      return { isFinal: false };
    }

    // Validate scores are reasonable (rugby scores: 0-100 range)
    if (parsed.homeScore < 0 || parsed.homeScore > 100 || parsed.awayScore < 0 || parsed.awayScore > 100) {
      return { isFinal: false };
    }

    console.log(`Crawl4AI /extract: ${match.home_team} ${parsed.homeScore}-${parsed.awayScore} ${match.away_team}`);

    // Normalize stats format
    const stats = parsed.stats || { home: {}, away: {} };

    return {
      isFinal: true,
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      stats,
      source: 'crawl4ai-extract',
    };
  } catch (e) {
    console.error(`Crawl4AI /extract failed for ${match.home_team} vs ${match.away_team}:`, e.message);
    return { isFinal: false };
  }
}

/**
 * Blend extracted match stats into a team's profile (running average)
 */
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

export default async function handler(req, res) {
  // Verify caller is Vercel cron or authorized via secret
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
    // Limit to 6 matches per run (one full round) to stay within 60s timeout
    const toCheck = matches.slice(0, 6);
    checked = toCheck.length;

    for (const match of toCheck) {
      const status = await checkMatchStatus(match);
      
      if (status.isFinal && match.status !== 'final') {
        // Match just completed - update match record
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
          source: status.source || 'crawl4ai',
        });

        // === FULL RECOMPUTE: Update tournament standings, Elo, form, team profiles ===
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

            // 1. Update season standings
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
              // Losing bonus (within 7 points)
              if (margin <= 7) awayTeam.season.pts = (awayTeam.season.pts || 0) + 1;
            } else if (awayWon) {
              awayTeam.season.won = (awayTeam.season.won || 0) + 1;
              homeTeam.season.lost = (homeTeam.season.lost || 0) + 1;
              awayTeam.season.pts = (awayTeam.season.pts || 0) + 4;
              if (margin <= 7) homeTeam.season.pts = (homeTeam.season.pts || 0) + 1;
            }

            // Try bonus (4+ tries)
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

            // 2. Recalculate Elo
            const K = 32;
            const HOME_ADV = 40;
            const expected = 1 / (1 + Math.pow(10, -((homeTeam.elo || 1400) - (awayTeam.elo || 1400) + HOME_ADV) / 400));
            const actual = homeWon ? 1 : awayWon ? 0 : 0.5;
            const marginMult = Math.log(Math.abs(hs - as) + 1) * (2.2 / (2.2 + 0.001 * Math.abs(hs - as)));
            const change = Math.round(K * marginMult * (actual - expected));
            homeTeam.elo = (homeTeam.elo || 1400) + change;
            awayTeam.elo = (awayTeam.elo || 1400) - change;

            // 3. Update form (last5, last12, streak, rating)
            const homeResult = homeWon ? 'W' : 'L';
            const awayResult = awayWon ? 'W' : 'L';
            
            homeTeam.form = homeTeam.form || { last5: [], last12: [], streak: '', rating: 50 };
            awayTeam.form = awayTeam.form || { last5: [], last12: [], streak: '', rating: 50 };
            
            homeTeam.form.last5 = [...(homeTeam.form.last5 || []), homeResult].slice(-5);
            homeTeam.form.last12 = [...(homeTeam.form.last12 || []), homeResult].slice(-12);
            awayTeam.form.last5 = [...(awayTeam.form.last5 || []), awayResult].slice(-5);
            awayTeam.form.last12 = [...(awayTeam.form.last12 || []), awayResult].slice(-12);

            // Streak
            const homeStreak = homeTeam.form.last5;
            const lastH = homeStreak[homeStreak.length - 1];
            let hCount = 0;
            for (let i = homeStreak.length - 1; i >= 0 && homeStreak[i] === lastH; i--) hCount++;
            homeTeam.form.streak = `${lastH}${hCount}`;

            const awayStreak = awayTeam.form.last5;
            const lastA = awayStreak[awayStreak.length - 1];
            let aCount = 0;
            for (let i = awayStreak.length - 1; i >= 0 && awayStreak[i] === lastA; i--) aCount++;
            awayTeam.form.streak = `${lastA}${aCount}`;

            // Form rating (EMA)
            function ema(results, alpha = 0.30) {
              let v = 50;
              for (const r of results) { v = alpha * (r === 'W' ? 100 : 0) + (1 - alpha) * v; }
              return Math.round(v);
            }
            homeTeam.form.rating = ema(homeTeam.form.last12.length >= 5 ? homeTeam.form.last12 : homeTeam.form.last5);
            awayTeam.form.rating = ema(awayTeam.form.last12.length >= 5 ? awayTeam.form.last12 : awayTeam.form.last5);

            // 4. Blend match stats into team profiles
            if (status.stats) {
              blendStats(homeTeam, status.stats.home);
              blendStats(awayTeam, status.stats.away);
            }

            // 5. Update pts/game
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

            // 6. Update round counter
            tournament.round = Math.max(tournament.round || 1, (match.round || 0) + 1);

            // 7. Save to Postgres
            await upsertTournament(tournament);
          }
        }

        // Apply season regression if this is Round 1 of a new season
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

        // Publish event for SSE consumers
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
