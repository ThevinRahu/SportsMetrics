/**
 * Manual Refresh Trigger
 * 
 * POST /api/refresh
 * Body: { tournamentId } (optional - if omitted, checks all pending matches)
 * 
 * This is the client-facing endpoint for the "Refresh Data" button.
 * It runs the same Crawl4AI extraction pipeline as the cron job
 * but is triggered manually by the user.
 * 
 * No secret required (user-initiated action from the app itself).
 * Rate-limited by Vercel's function concurrency.
 */

export const config = { maxDuration: 60 };

import { getLiveOrScheduledMatches, upsertMatch, getTournament, upsertTournament, publishEvent, logRefresh } from './lib/db.js';
import { discoverMatchUrls, extractMatchStats, toStatsUrl, matchTeamToUrl, buildFallbackStatsUrl } from './lib/crawl4ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { tournamentId } = req.body || {};
  const startTime = Date.now();
  let checked = 0;
  let completed = 0;

  try {
    let matches = await getLiveOrScheduledMatches();
    
    // If tournamentId specified, filter to just that tournament
    if (tournamentId) {
      matches = matches.filter(m => m.tournament_id === tournamentId);
    }

    if (matches.length === 0) {
      return res.status(200).json({ checked: 0, completed: 0, message: 'No pending matches' });
    }

    // Group by tournament + round
    const groups = {};
    for (const m of matches) {
      const key = `${m.tournament_id}:${m.round}`;
      if (!groups[key]) groups[key] = { tournamentId: m.tournament_id, round: m.round, matches: [] };
      groups[key].matches.push(m);
    }

    for (const group of Object.values(groups)) {
      if (checked >= 6) break;

      // Get fixtures URL from tournament DB record
      const tournament = await getTournament(group.tournamentId);
      const fixturesUrl = tournament?.data_url || null;

      // Step 1: Discover match URLs
      const discoveredLinks = fixturesUrl
        ? await discoverMatchUrls(fixturesUrl, group.round)
        : [];

      // Step 2: Extract stats for each match
      for (const match of group.matches) {
        if (checked >= 6) break;
        checked++;

        let status = { isFinal: false };
        const matchUrl = matchTeamToUrl(match.home_team, match.away_team, discoveredLinks);

        if (matchUrl) {
          const statsUrl = toStatsUrl(matchUrl);
          status = await extractMatchStats(statsUrl, match.home_team, match.away_team);
          if (!status.isFinal) {
            status = await extractMatchStats(matchUrl, match.home_team, match.away_team);
          }
        } else {
          const fallbackUrl = buildFallbackStatsUrl(match.home_team, match.away_team);
          status = await extractMatchStats(fallbackUrl, match.home_team, match.away_team);
        }

        if (status.isFinal && match.status !== 'final') {
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

          // Recompute standings (same logic as cron)
          if (tournament && tournament.teams) {
            const homeTeam = tournament.teams[match.home_team];
            const awayTeam = tournament.teams[match.away_team];

            if (homeTeam && awayTeam) {
              const hs = status.homeScore;
              const as = status.awayScore;
              const homeWon = hs > as;
              const awayWon = as > hs;
              const margin = Math.abs(hs - as);

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

              // Elo update
              const K = 32, HOME_ADV = 40;
              const expected = 1 / (1 + Math.pow(10, -((homeTeam.elo || 1400) - (awayTeam.elo || 1400) + HOME_ADV) / 400));
              const actual = homeWon ? 1 : awayWon ? 0 : 0.5;
              const marginMult = Math.log(Math.abs(hs - as) + 1) * (2.2 / (2.2 + 0.001 * Math.abs(hs - as)));
              const change = Math.round(K * marginMult * (actual - expected));
              homeTeam.elo = (homeTeam.elo || 1400) + change;
              awayTeam.elo = (awayTeam.elo || 1400) - change;

              // Form
              const homeResult = homeWon ? 'W' : 'L';
              const awayResult = awayWon ? 'W' : 'L';
              homeTeam.form = homeTeam.form || { last5: [], last12: [], streak: '', rating: 50 };
              awayTeam.form = awayTeam.form || { last5: [], last12: [], streak: '', rating: 50 };
              homeTeam.form.last5 = [...(homeTeam.form.last5 || []), homeResult].slice(-5);
              homeTeam.form.last12 = [...(homeTeam.form.last12 || []), homeResult].slice(-12);
              awayTeam.form.last5 = [...(awayTeam.form.last5 || []), awayResult].slice(-5);
              awayTeam.form.last12 = [...(awayTeam.form.last12 || []), awayResult].slice(-12);

              // EMA rating
              function ema(results, alpha = 0.30) {
                let v = 50;
                for (const r of results) { v = alpha * (r === 'W' ? 100 : 0) + (1 - alpha) * v; }
                return Math.round(v);
              }
              homeTeam.form.rating = ema(homeTeam.form.last12.length >= 5 ? homeTeam.form.last12 : homeTeam.form.last5);
              awayTeam.form.rating = ema(awayTeam.form.last12.length >= 5 ? awayTeam.form.last12 : awayTeam.form.last5);

              // Pts/game
              if (homeTeam.season.played > 0) {
                homeTeam.attack = homeTeam.attack || {};
                homeTeam.attack.pts_pg = parseFloat((homeTeam.season.pf / homeTeam.season.played).toFixed(1));
              }
              if (awayTeam.season.played > 0) {
                awayTeam.attack = awayTeam.attack || {};
                awayTeam.attack.pts_pg = parseFloat((awayTeam.season.pf / awayTeam.season.played).toFixed(1));
              }

              tournament.round = Math.max(tournament.round || 1, (match.round || 0) + 1);
              await upsertTournament(tournament);
            }
          }

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
      tournamentId: tournamentId || 'manual',
      source: 'api/refresh (manual)',
      success: true,
      matchesFound: completed,
      durationMs: Date.now() - startTime,
    });

    res.status(200).json({ checked, completed, durationMs: Date.now() - startTime });
  } catch (e) {
    await logRefresh({
      tournamentId: tournamentId || 'manual',
      source: 'api/refresh (manual)',
      success: false,
      error: e.message,
      durationMs: Date.now() - startTime,
    }).catch(() => {});

    res.status(500).json({ error: e.message });
  }
}
