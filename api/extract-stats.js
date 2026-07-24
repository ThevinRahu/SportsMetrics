/**
 * Server-side Stats Extraction
 * 
 * POST /api/extract-stats
 * Body: { url, teamNames, tournamentName, mode, homeTeam, awayTeam, fixturesUrl, round }
 * 
 * PRIMARY: Crawl4AI /extract (renders JS SPAs, returns structured JSON)
 * FALLBACK: Groq AI on raw HTML (for non-JS pages)
 * 
 * Shared extraction logic lives in api/lib/crawl4ai.js
 */

export const config = { maxDuration: 60 };

import { crawl4aiExtract, discoverMatchUrls, extractMatchStats, toStatsUrl, matchTeamToUrl, buildFallbackStatsUrl } from './lib/crawl4ai.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const ALLOWED_DOMAINS = [
  'super.rugby', 'all.rugby', 'sixnationsrugby.com', 'rugbypass.com',
  'sofascore.com', 'world.rugby', 'rugbychampionship.com', 'nationschampionshiprugby.com',
];

// Same field hints as client (src/services/extractionPrompts.js)
const FIELD_HINTS = {
  gl: 'Look for "Gainline %" or "Gainline Success" - a percentage (0-100).',
  lb: 'Look for "Line Breaks" - a count, home value then away value.',
  rs: 'Look for "Ruck Speed" - percentage rows "0-3 secs / X%".',
  carries: 'Look for "Ball Carries" or "Carries" - a count per team.',
  tr: 'Look for "Tackle Completion %" - shown as "XX% Tackle Completion % YY%".',
  missed: 'Look for "Tackles Missed" - a count per team.',
  to: 'Look for "Turnovers Won" - a count per team.',
  so: 'Look for "Scrum Win %" - shown as "XX% Scrum Win % YY%".',
  lo: 'Look for "Lineout Win %" - shown as "XX% Lineout Win % YY%".',
  pen: 'Look for "Penalties Conceded" - a count per team.',
  territory: 'Look for "Territory" - shown as "XX% Territory YY%".',
  possession: 'Look for "Possession" - shown as "XX% Possession YY%".',
};

// Non-destructive cleaning (same as client contentChunker.js)
function cleanContent(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/<(header|aside)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMatchStatsPrompt(homeTeam, awayTeam, content) {
  const fieldGuide = Object.entries(FIELD_HINTS)
    .map(([key, hint]) => `  ${key}: ${hint}`)
    .join('\n');

  return `You are extracting rugby match statistics from a stats page.
Match: ${homeTeam} vs ${awayTeam}

FIELD EXTRACTION GUIDE:
${fieldGuide}

Format: "HOME_VALUE Label AWAY_VALUE" (e.g. "153 Tackles Made 173")
Or: "XX% Label YY%" (e.g. "89% Tackle Completion % 87%")

Return ONLY valid JSON:
{
  "homeTeam": "${homeTeam}",
  "awayTeam": "${awayTeam}",
  "homeScore": null,
  "awayScore": null,
  "stats": {
    "home": {
      "tries": null, "carries": null, "line_breaks": null, "offloads": null,
      "tackles_made": null, "tackles_missed": null, "tackle_rate": null,
      "turnovers_won": null, "turnovers_lost": null,
      "scrums": null, "scrum_win_pct": null,
      "lineouts": null, "lineout_win_pct": null,
      "penalties": null, "territory_pct": null, "possession_pct": null,
      "post_contact_metres": null, "yellow_cards": null, "red_cards": null
    },
    "away": { same fields }
  }
}

Use NULL for anything not found. Stats are between "Match Summary" and "Comments".

CONTENT:
${content}`;
}

function buildStandingsPrompt(tournamentName, teamNames, content) {
  return `Extract standings AND match results for "${tournamentName}".
Teams: ${teamNames.join(', ')}

Return ONLY valid JSON:
{
  "teams": {
    "Team Name": {
      "season": { "played": null, "won": null, "lost": null, "drawn": null, "pts": null, "pf": null, "pa": null, "tries_for": null, "tries_against": null, "try_bonus": null, "loss_bonus": null },
      "form": { "last5": null, "last12": null, "streak": null, "rating": null }
    }
  },
  "matches": [
    { "home": "Team A", "away": "Team B", "homeScore": 35, "awayScore": 21, "date": "2026-07-04", "round": 1 }
  ],
  "meta": { "round": null, "source": "url" }
}

IMPORTANT: Extract ALL match results. Use NULL for unknowns. Team names must EXACTLY match.

CONTENT:
${content}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { url, teamNames, tournamentName, mode, homeTeam, awayTeam, fixturesUrl, round } = req.body || {};

  if (!url || !teamNames || !Array.isArray(teamNames)) {
    return res.status(400).json({ error: 'Required: url, teamNames (array)' });
  }

  try {
    const targetUrl = new URL(url);
    const isAllowed = ALLOWED_DOMAINS.some(d => targetUrl.hostname.includes(d));
    if (!isAllowed) {
      return res.status(403).json({ error: `Domain not allowed: ${targetUrl.hostname}` });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const startTime = Date.now();
  const isMatchStats = mode === 'matchStats' || url.includes('/live/') || url.includes('/stats');

  // ─── PRIMARY: Crawl4AI /extract (handles JS SPAs like rugbypass) ───

  // Mode 1: Discover match URLs from fixtures page + extract stats
  if (fixturesUrl && round) {
    try {
      const links = await discoverMatchUrls(fixturesUrl, round);
      const results = [];

      for (const link of links) {
        const statsUrl = toStatsUrl(link.url);
        // Parse team names from link.match (e.g. "Ireland vs New Zealand")
        const parts = (link.match || '').split(/\s+vs\s+/i);
        const home = parts[0]?.trim() || teamNames[0];
        const away = parts[1]?.trim() || teamNames[1];
        
        const extracted = await extractMatchStats(statsUrl, home, away);
        if (extracted.isFinal) {
          results.push({ ...extracted, match: link.match, url: statsUrl });
        }
      }

      return res.status(200).json({
        success: true,
        data: results,
        meta: { durationMs: Date.now() - startTime, source: fixturesUrl, mode: 'batch-extract', count: results.length },
      });
    } catch (e) {
      console.warn('Batch Crawl4AI extraction failed, falling through to single-page:', e.message);
    }
  }

  // Mode 2: Single match stats extraction via Crawl4AI
  if (isMatchStats && process.env.CRAWL4AI_KEY) {
    try {
      const home = homeTeam || teamNames[0];
      const away = awayTeam || teamNames[1];
      const extracted = await extractMatchStats(url, home, away);
      
      if (extracted.isFinal) {
        return res.status(200).json({
          success: true,
          data: {
            homeTeam: home,
            awayTeam: away,
            homeScore: extracted.homeScore,
            awayScore: extracted.awayScore,
            stats: extracted.stats,
          },
          meta: { durationMs: Date.now() - startTime, source: url, mode: 'crawl4ai-extract' },
        });
      }
      // If Crawl4AI didn't get a result, fall through to Groq
    } catch (e) {
      console.warn('Crawl4AI single extraction failed, falling through to Groq:', e.message);
    }
  }

  // ─── FALLBACK: Groq AI on raw HTML (for non-JS pages or when Crawl4AI unavailable) ───

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({ error: 'No extraction backend available (CRAWL4AI_KEY and GROQ_API_KEY both missing)' });
  }

  try {
    // 1. Fetch page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    
    const pageRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!pageRes.ok) {
      return res.status(502).json({ error: `Upstream returned ${pageRes.status}` });
    }

    const html = await pageRes.text();
    const content = cleanContent(html);

    if (content.length < 100) {
      return res.status(422).json({ error: 'Page content too short' });
    }

    // 2. Build prompt based on mode
    const prompt = isMatchStats
      ? buildMatchStatsPrompt(homeTeam || teamNames[0], awayTeam || teamNames[1], content.slice(0, 8000))
      : buildStandingsPrompt(tournamentName || 'Tournament', teamNames, content.slice(0, 8000));

    // 3. Call Groq
    const aiRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Extract data from HTML into JSON. Return ONLY valid JSON. Use null for unknowns.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.0,
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return res.status(502).json({ error: `Groq error (${aiRes.status}): ${err.slice(0, 200)}` });
    }

    const aiData = await aiRes.json();
    let jsonStr = (aiData.choices?.[0]?.message?.content || '').trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else return res.status(422).json({ error: 'AI returned invalid JSON', raw: jsonStr.slice(0, 300) });
    }

    res.status(200).json({
      success: true,
      data: parsed,
      meta: { durationMs: Date.now() - startTime, source: url, mode: isMatchStats ? 'matchStats' : 'standings' },
    });
  } catch (e) {
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    res.status(500).json({ error: e.message });
  }
}
