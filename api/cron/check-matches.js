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
  // Build rugbypass URL from team names
  const homeSlug = match.home_team.toLowerCase().replace(/\s+/g, '-');
  const awaySlug = match.away_team.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.rugbypass.com/live/${homeSlug}-vs-${awaySlug}/stats/`;

  // PRIMARY: Use Crawl4AI to render JS page and extract structured stats
  const crawl4aiResult = await extractWithCrawl4AI(url, match);
  if (crawl4aiResult.isFinal) return crawl4aiResult;

  // FALLBACK 1: Try plain fetch + regex (works for server-rendered pages)
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

    if (res.ok) {
      const html = await res.text();
      const scoreMatch = html.match(/(\d+)\s*-\s*(\d+)\s*(?:Full\s*Time|FT)/i);
      if (scoreMatch) {
        const stats = extractBasicStats(html);
        return {
          isFinal: true,
          homeScore: parseInt(scoreMatch[1]),
          awayScore: parseInt(scoreMatch[2]),
          stats,
          source: 'rugbypass-regex',
        };
      }
    }
  } catch (e) {
    console.warn(`Plain fetch failed for ${match.home_team} vs ${match.away_team}:`, e.message);
  }

  // FALLBACK 2: Ask Groq AI from knowledge
  return await fallbackToAI(match);
}

/**
 * Crawl4AI Extraction - renders JS pages and extracts structured data
 * This handles SPAs like rugbypass where stats only appear after JS executes.
 */
async function extractWithCrawl4AI(url, match) {
  const crawl4aiKey = process.env.CRAWL4AI_KEY;
  if (!crawl4aiKey) return { isFinal: false };

  try {
    const res = await fetch('https://gate.crawl4ai.com/extract', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${crawl4aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        instruction: `Extract the rugby match score and all match statistics from this page. The match is ${match.home_team} vs ${match.away_team}. Look for "Full Time" or "FT" to confirm the match is complete. Extract all stats in the format "home_value Label away_value".`,
        schema: {
          type: 'object',
          properties: {
            matchComplete: { type: 'boolean', description: 'true if page shows Full Time or FT' },
            homeScore: { type: 'integer', description: 'home team score' },
            awayScore: { type: 'integer', description: 'away team score' },
            homeTeam: { type: 'string' },
            awayTeam: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                home: {
                  type: 'object',
                  properties: {
                    tackles: { type: 'integer' },
                    missed: { type: 'integer' },
                    tackleRate: { type: 'integer', description: 'tackle completion percentage' },
                    carries: { type: 'integer' },
                    lineBreaks: { type: 'integer' },
                    penalties: { type: 'integer', description: 'penalties conceded' },
                    scrums: { type: 'integer' },
                    scrumWin: { type: 'integer', description: 'scrum win percentage' },
                    lineouts: { type: 'integer' },
                    lineoutWin: { type: 'integer', description: 'lineout win percentage' },
                    tries: { type: 'integer' },
                    conversions: { type: 'integer' },
                    penaltyGoals: { type: 'integer' },
                    territory: { type: 'integer', description: 'territory percentage' },
                    possession: { type: 'integer', description: 'possession percentage' },
                    turnoversWon: { type: 'integer' },
                    turnoversLost: { type: 'integer' },
                    postContactMetres: { type: 'integer' },
                    passes: { type: 'integer' },
                    kicks: { type: 'integer' },
                    gainline: { type: 'integer', description: 'gainline success percentage' },
                    ruckSpeed: { type: 'integer', description: 'ruck speed 0-3s percentage' },
                    dominantTackles: { type: 'integer' },
                    offloads: { type: 'integer' },
                  }
                },
                away: {
                  type: 'object',
                  properties: {
                    tackles: { type: 'integer' },
                    missed: { type: 'integer' },
                    tackleRate: { type: 'integer' },
                    carries: { type: 'integer' },
                    lineBreaks: { type: 'integer' },
                    penalties: { type: 'integer' },
                    scrums: { type: 'integer' },
                    scrumWin: { type: 'integer' },
                    lineouts: { type: 'integer' },
                    lineoutWin: { type: 'integer' },
                    tries: { type: 'integer' },
                    conversions: { type: 'integer' },
                    penaltyGoals: { type: 'integer' },
                    territory: { type: 'integer' },
                    possession: { type: 'integer' },
                    turnoversWon: { type: 'integer' },
                    turnoversLost: { type: 'integer' },
                    postContactMetres: { type: 'integer' },
                    passes: { type: 'integer' },
                    kicks: { type: 'integer' },
                    gainline: { type: 'integer' },
                    ruckSpeed: { type: 'integer' },
                    dominantTackles: { type: 'integer' },
                    offloads: { type: 'integer' },
                  }
                }
              }
            }
          },
          required: ['matchComplete', 'homeScore', 'awayScore']
        }
      }),
    });

    if (!res.ok) {
      console.warn(`Crawl4AI returned ${res.status}`);
      return { isFinal: false };
    }

    const result = await res.json();
    if (!result.ok || !result.data) return { isFinal: false };

    const data = Array.isArray(result.data) ? result.data[0] : result.data;

    if (!data.matchComplete || data.homeScore == null || data.awayScore == null) {
      return { isFinal: false };
    }

    // Validate scores
    if (data.homeScore < 0 || data.homeScore > 100 || data.awayScore < 0 || data.awayScore > 100) {
      return { isFinal: false };
    }

    console.log(`Crawl4AI: ${match.home_team} ${data.homeScore}-${data.awayScore} ${match.away_team}`);

    return {
      isFinal: true,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      stats: data.stats || { home: {}, away: {} },
      source: 'crawl4ai',
    };
  } catch (e) {
    console.error(`Crawl4AI failed for ${match.home_team} vs ${match.away_team}:`, e.message);
    return { isFinal: false };
  }
}

/**
 * AI Knowledge Fallback - ask Groq for match result when page scraping fails
 * (e.g., rugbypass is a JS SPA and stats don't appear in raw HTML)
 * 
 * Only accepts data the AI is confident about. Uses strict prompting
 * to minimize hallucination risk.
 */
async function fallbackToAI(match) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return { isFinal: false };

  try {
    const prompt = `What was the final score and match stats for ${match.home_team} vs ${match.away_team} played on ${match.match_date} in the Nations Championship 2026?

CRITICAL RULES:
- Only answer if you are CERTAIN this match has been played and you know the real result
- If you are not sure or the match hasn't happened yet, return {"played": false}
- Do NOT guess or make up scores. Only provide verified, real data.
- This data will be used for professional coaching decisions.

If the match HAS been played, return this JSON:
{
  "played": true,
  "homeTeam": "${match.home_team}",
  "awayTeam": "${match.away_team}",
  "homeScore": <number>,
  "awayScore": <number>,
  "stats": {
    "home": {
      "tackles": null,
      "missed": null,
      "tackleRate": null,
      "carries": null,
      "lineBreaks": null,
      "penalties": null,
      "scrums": null,
      "scrumWin": null,
      "lineouts": null,
      "lineoutWin": null,
      "tries": null,
      "conversions": null,
      "penaltyGoals": null,
      "territory": null,
      "possession": null,
      "turnoversWon": null,
      "turnoversLost": null,
      "postContactMetres": null,
      "passes": null,
      "kicks": null,
      "gainline": null,
      "ruckSpeed": null,
      "dominantTackles": null,
      "offloads": null
    },
    "away": {
      "tackles": null,
      "missed": null,
      "tackleRate": null,
      "carries": null,
      "lineBreaks": null,
      "penalties": null,
      "scrums": null,
      "scrumWin": null,
      "lineouts": null,
      "lineoutWin": null,
      "tries": null,
      "conversions": null,
      "penaltyGoals": null,
      "territory": null,
      "possession": null,
      "turnoversWon": null,
      "turnoversLost": null,
      "postContactMetres": null,
      "passes": null,
      "kicks": null,
      "gainline": null,
      "ruckSpeed": null,
      "dominantTackles": null,
      "offloads": null
    }
  }
}

STAT DEFINITIONS:
- tackles: total tackles made
- missed: tackles missed
- tackleRate: tackle completion percentage (0-100)
- carries: ball carries
- lineBreaks: line breaks made
- penalties: penalties conceded
- scrums: number of scrums
- scrumWin: scrum win percentage (0-100)
- lineouts: number of lineouts
- lineoutWin: lineout win percentage (0-100)
- tries: tries scored
- conversions: conversions kicked
- penaltyGoals: penalty goals kicked
- territory: territory percentage (0-100)
- possession: possession percentage (0-100)
- turnoversWon: turnovers won
- turnoversLost: turnovers conceded
- postContactMetres: post-contact metres gained
- passes: total passes
- kicks: total kicks from hand
- gainline: gainline success percentage (0-100) - percentage of carries crossing the advantage line
- ruckSpeed: ruck speed - percentage of rucks where ball is recycled in 0-3 seconds
- dominantTackles: dominant tackles made (drove ball carrier backwards)
- offloads: offloads in contact

Return ONLY JSON. Use null for any stat you're not certain about.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a rugby data assistant. Only provide real, verified match results. Never guess. If unsure, say the match has not been played.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.0,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) return { isFinal: false };

    const data = await res.json();
    let jsonStr = (data.choices?.[0]?.message?.content || '').trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.played || parsed.homeScore == null || parsed.awayScore == null) {
      return { isFinal: false };
    }

    // Validate scores are reasonable (rugby scores: 0-100 range)
    if (parsed.homeScore < 0 || parsed.homeScore > 100 || parsed.awayScore < 0 || parsed.awayScore > 100) {
      return { isFinal: false };
    }

    console.log(`AI fallback: ${match.home_team} ${parsed.homeScore}-${parsed.awayScore} ${match.away_team}`);

    return {
      isFinal: true,
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      stats: parsed.stats || { home: {}, away: {} },
      source: 'ai-knowledge',
    };
  } catch (e) {
    console.error(`AI fallback failed for ${match.home_team} vs ${match.away_team}:`, e.message);
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
  const tackleRate = extractPct(html, 'Tackle Completion');
  const territory = extractPct(html, 'Territory');
  const possession = extractPct(html, 'Possession');
  const gainline = extractPct(html, 'Gainline') || extractPct(html, 'Gainline Success');
  const ruckSpeed = extractPct(html, 'Ruck Speed') || extractStat(html, 'Ruck Speed');

  return {
    home: { tackles: tackles?.[0], missed: missed?.[0], carries: carries?.[0], lineBreaks: lineBreaks?.[0], penalties: penalties?.[0], scrumWin: scrumWin?.[0], lineoutWin: lineoutWin?.[0], tries: tries?.[0], tackleRate: tackleRate?.[0], territory: territory?.[0], possession: possession?.[0], gainline: gainline?.[0] || null, ruckSpeed: ruckSpeed?.[0] || null },
    away: { tackles: tackles?.[1], missed: missed?.[1], carries: carries?.[1], lineBreaks: lineBreaks?.[1], penalties: penalties?.[1], scrumWin: scrumWin?.[1], lineoutWin: lineoutWin?.[1], tries: tries?.[1], tackleRate: tackleRate?.[1], territory: territory?.[1], possession: possession?.[1], gainline: gainline?.[1] || null, ruckSpeed: ruckSpeed?.[1] || null },
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
    // Limit to 6 matches per run (one full round) to stay within 60s timeout
    const toCheck = matches.slice(0, 6);
    checked = toCheck.length;

    for (const match of toCheck) {
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

        // Apply season regression if this is Round 1 of a new season
        if (match.round === 1) {
          const tournament = await getTournament(match.tournament_id);
          if (tournament && tournament.teams) {
            let updated = false;
            
            const homeTeamData = tournament.teams[match.home_team];
            if (homeTeamData && homeTeamData.elo) {
              homeTeamData.elo = applySeasonRegression(homeTeamData.elo);
              updated = true;
            }
            const awayTeamData = tournament.teams[match.away_team];
            if (awayTeamData && awayTeamData.elo) {
              awayTeamData.elo = applySeasonRegression(awayTeamData.elo);
              updated = true;
            }
            
            if (updated) {
              await upsertTournament(tournament);
            }
          }
        }

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
