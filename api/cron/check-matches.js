/**
 * Cron Job: Check Live Match Status
 * 
 * Two-step Crawl4AI /extract pipeline (centralized in api/lib/crawl4ai.js):
 *   1. Hit tournament fixtures page → get match URLs for the current round
 *   2. Append /stats/ to each URL → extract structured scores + stats as JSON
 * 
 * Tournament fixtures URL and round come from the DB (tournaments table).
 * 
 * Protected by CRON_SECRET header (Vercel injects this automatically for cron).
 */

export const config = { maxDuration: 60 };

import { getLiveOrScheduledMatches, upsertMatch, getTournament, upsertTournament, publishEvent, logRefresh } from '../lib/db.js';
import { discoverMatchUrls, extractMatchStats, toStatsUrl, matchTeamToUrl, buildFallbackStatsUrl } from '../lib/crawl4ai.js';

// ============================================================
// STANDINGS / ELO / FORM RECOMPUTE
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
      if (checked >= 6) break;

      // Get tournament from DB to retrieve fixtures URL and current round
      const tournament = await getTournament(group.tournamentId);
      const fixturesUrl = tournament?.data_url || null;

      // STEP 1: Discover match URLs from the tournament's fixtures page
      const discoveredLinks = fixturesUrl
        ? await discoverMatchUrls(fixturesUrl, group.round)
        : [];

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
          const fallbackUrl = buildFallbackStatsUrl(match.home_team, match.away_team);
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
