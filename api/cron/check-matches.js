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

export const config = { maxDuration: 30 };

import { getLiveOrScheduledMatches, upsertMatch, getTournament, upsertTournament, publishEvent, logRefresh } from '../lib/db.js';

// Check rugbypass for match status (Full Time indicator)
async function checkMatchStatus(match) {
  // Build rugbypass URL from team names
  const homeSlug = match.home_team.toLowerCase().replace(/\s+/g, '-');
  const awaySlug = match.away_team.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.rugbypass.com/live/${homeSlug}-vs-${awaySlug}/stats/`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return { isFinal: false };

    const html = await res.text();
    
    // Check for "Full Time" or "FT" indicator
    const isFinal = /Full\s*Time|FT/i.test(html);
    
    if (!isFinal) return { isFinal: false };

    // Extract score
    const scoreMatch = html.match(/(\d+)\s*-\s*(\d+)\s*(?:Full\s*Time|FT)/i);
    if (!scoreMatch) return { isFinal: false };

    // Extract basic stats using same regex patterns as client
    const stats = extractBasicStats(html);

    return {
      isFinal: true,
      homeScore: parseInt(scoreMatch[1]),
      awayScore: parseInt(scoreMatch[2]),
      stats,
    };
  } catch (e) {
    console.error(`Status check failed for ${match.home_team} vs ${match.away_team}:`, e.message);
    return { isFinal: false };
  }
}

function extractBasicStats(html) {
  function extractStat(content, label) {
    const re = new RegExp(`(\\d+\\.?\\d*)\\s*${label}\\s*(\\d+\\.?\\d*)`, 'i');
    const m = content.match(re);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    return null;
  }

  function extractPct(content, label) {
    const re = new RegExp(`(\\d+)%\\s*${label}\\s*(\\d+)%`, 'i');
    const m = content.match(re);
    if (m) return [parseInt(m[1]), parseInt(m[2])];
    return null;
  }

  const tackles = extractStat(html, 'Tackles Made');
  const missed = extractStat(html, 'Tackles Missed');
  const carries = extractStat(html, 'Ball Carries') || extractStat(html, 'Carries');
  const lineBreaks = extractStat(html, 'Line Breaks');
  const penalties = extractStat(html, 'Penalties Conceded');
  const scrumWin = extractPct(html, 'Scrum Win');
  const lineoutWin = extractPct(html, 'Lineout Win');
  const tries = extractStat(html, 'Tries');

  return {
    home: { tackles: tackles?.[0], missed: missed?.[0], carries: carries?.[0], lineBreaks: lineBreaks?.[0], penalties: penalties?.[0], scrumWin: scrumWin?.[0], lineoutWin: lineoutWin?.[0], tries: tries?.[0] },
    away: { tackles: tackles?.[1], missed: missed?.[1], carries: carries?.[1], lineBreaks: lineBreaks?.[1], penalties: penalties?.[1], scrumWin: scrumWin?.[1], lineoutWin: lineoutWin?.[1], tries: tries?.[1] },
  };
}

export default async function handler(req, res) {
  // Verify caller is Vercel cron or authorized
  const auth = req.headers['authorization']?.replace('Bearer ', '');
  const vercelCron = req.headers['x-vercel-cron']; // Vercel injects this for cron invocations
  
  if (!vercelCron && auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  let checked = 0;
  let completed = 0;

  try {
    const matches = await getLiveOrScheduledMatches();
    checked = matches.length;

    for (const match of matches) {
      const status = await checkMatchStatus(match);
      
      if (status.isFinal && match.status !== 'final') {
        // Match just completed - update DB
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
          source: 'rugbypass-cron',
        });

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
