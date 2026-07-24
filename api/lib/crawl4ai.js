/**
 * Centralized Crawl4AI extraction module.
 * 
 * Used by:
 *   - api/cron/check-matches.js (automatic match detection + stats extraction)
 * 
 * Two-step pipeline:
 *   1. discoverMatchUrls(fixturesUrl, round) → [{ match, url }]
 *   2. extractMatchStats(statsUrl, homeTeam, awayTeam) → { isFinal, homeScore, awayScore, stats }
 * 
 * Uses Crawl4AI /extract endpoint which renders JS SPAs and applies
 * an LLM instruction to return structured JSON directly.
 */

import { validateExtraction } from './validateStats.js';

// ============================================================
// CORE: Crawl4AI /extract call
// ============================================================

/**
 * Call Crawl4AI /extract endpoint.
 * @param {string} url - Page to render and extract from
 * @param {string} instruction - LLM instruction for extraction
 * @returns {any|null} Parsed response or null on failure
 */
export async function crawl4aiExtract(url, instruction) {
  const key = process.env.CRAWL4AI_KEY;
  if (!key) {
    console.warn('CRAWL4AI_KEY not set - extraction unavailable');
    return null;
  }

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
  
  // Normalize: Crawl4AI returns { ok, data: [...] } wrapper or direct content
  let parsed;
  if (result && result.data && Array.isArray(result.data)) {
    // Standard Crawl4AI /extract response: { ok, data: [...], provider, ... }
    parsed = result.data.length === 1 ? result.data[0] : result.data;
  } else if (Array.isArray(result)) {
    parsed = result;
  } else {
    parsed = result;
  }
  
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  return parsed;
}

// ============================================================
// STEP 1: Discover match URLs from a fixtures page
// ============================================================

/**
 * Discover match URLs for a specific round from a tournament fixtures page.
 * 
 * @param {string} fixturesUrl - Tournament fixtures page (e.g. rugbypass.com/.../fixtures-results/)
 * @param {number} round - Round number to look for
 * @returns {Array<{match: string, url: string}>} Discovered match links
 */
export async function discoverMatchUrls(fixturesUrl, round) {
  if (!fixturesUrl || !round) return [];

  const instruction = `Give me round ${round} match links as a JSON array. Each item should have "match" (team names like "Ireland vs New Zealand") and "url" (the full rugbypass live match URL including the ?g= parameter). Return ONLY a valid JSON array, no explanation.`;

  const result = await crawl4aiExtract(fixturesUrl, instruction);
  if (!result) return [];

  // Normalize to array (crawl4aiExtract already unwraps .data)
  const links = Array.isArray(result) ? result : (result.matches || result.links || [result]);
  
  console.log(`Discovered ${links.length} match URLs from ${fixturesUrl} R${round}`);
  return links.filter(l => l && l.url);
}

// ============================================================
// STEP 2: Extract stats from a match stats page
// ============================================================

/**
 * Extract scores and full stats from a match stats page.
 * 
 * Uses built-in retry: if first attempt returns played:false, retries once.
 * 
 * @param {string} statsUrl - Stats page URL (with /stats/ path and ?g= param)
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @returns {{ isFinal: boolean, homeScore?: number, awayScore?: number, stats?: object, source?: string }}
 */
export async function extractMatchStats(statsUrl, homeTeam, awayTeam) {
  const instruction = `Extract the final score and match stats for ${homeTeam} vs ${awayTeam}. If match is complete return this JSON: {"played": true, "homeTeam": "${homeTeam}", "awayTeam": "${awayTeam}", "homeScore": <number>, "awayScore": <number>, "stats": {"home": {"tackles": null, "missed": null, "tackleRate": null, "carries": null, "lineBreaks": null, "penalties": null, "scrums": null, "scrumWin": null, "lineouts": null, "lineoutWin": null, "tries": null, "conversions": null, "penaltyGoals": null, "territory": null, "possession": null, "turnoversWon": null, "turnoversLost": null, "postContactMetres": null, "passes": null, "kicks": null, "gainline": null, "ruckSpeed": null, "dominantTackles": null, "offloads": null}, "away": {same fields}}}. If not played return {"played": false}. Return ONLY JSON, use null for missing stats.`;

  // Attempt extraction with one retry on failure
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await crawl4aiExtract(statsUrl, instruction);
    const parsed = normalizeExtractResult(result);

    if (parsed && parsed.played && parsed.homeScore != null && parsed.awayScore != null) {
      // Validate and sanitize the extraction
      const { valid, data, quality } = validateExtraction(parsed);
      
      if (!valid) {
        // Brief pause before retry
        if (attempt === 0) await new Promise(r => setTimeout(r, 500));
        continue;
      }

      console.log(`Crawl4AI stats: ${homeTeam} ${data.homeScore}-${data.awayScore} ${awayTeam} (attempt ${attempt + 1}, quality ${quality}%)`);

      return {
        isFinal: true,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        stats: data.stats,
        source: 'crawl4ai-extract',
      };
    }

    // Brief pause before retry
    if (attempt === 0) await new Promise(r => setTimeout(r, 500));
  }

  return { isFinal: false };
}

/**
 * Normalize Crawl4AI extract result into a usable object.
 */
function normalizeExtractResult(result) {
  if (!result) return null;
  let parsed = Array.isArray(result) ? result[0] : result;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  return parsed;
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Convert a live match URL to a stats URL.
 * Input:  https://www.rugbypass.com/live/argentina-vs-england/?g=949581
 * Output: https://www.rugbypass.com/live/argentina-vs-england/stats/?g=949581
 */
export function toStatsUrl(matchUrl) {
  try {
    const url = new URL(matchUrl);
    let path = url.pathname;
    if (!path.includes('/stats')) {
      path = path.replace(/\/?$/, '/stats/');
    }
    return `${url.origin}${path}${url.search}`;
  } catch {
    const [base, query] = matchUrl.split('?');
    const cleanBase = base.replace(/\/?$/, '/stats/');
    return query ? `${cleanBase}?${query}` : cleanBase;
  }
}

/**
 * Match DB team names to a discovered URL by comparing slugified names.
 * 
 * @param {string} homeTeam - DB home team name (e.g. "New Zealand")
 * @param {string} awayTeam - DB away team name (e.g. "Ireland")
 * @param {Array<{match: string, url: string}>} discoveredLinks
 * @returns {string|null} Matched URL or null
 */
export function matchTeamToUrl(homeTeam, awayTeam, discoveredLinks) {
  const slugify = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const homeSlug = slugify(homeTeam);
  const awaySlug = slugify(awayTeam);

  for (const link of discoveredLinks) {
    const matchText = slugify(link.match || '');
    const urlText = (link.url || '').toLowerCase();
    if ((matchText.includes(homeSlug) || urlText.includes(homeTeam.toLowerCase().replace(/\s+/g, '-'))) &&
        (matchText.includes(awaySlug) || urlText.includes(awayTeam.toLowerCase().replace(/\s+/g, '-')))) {
      return link.url;
    }
  }
  return null;
}

/**
 * Build a fallback stats URL from team names (when URL discovery fails).
 */
export function buildFallbackStatsUrl(homeTeam, awayTeam) {
  const homeSlug = homeTeam.toLowerCase().replace(/\s+/g, '-');
  const awaySlug = awayTeam.toLowerCase().replace(/\s+/g, '-');
  return `https://www.rugbypass.com/live/${homeSlug}-vs-${awaySlug}/stats/`;
}

export default {
  crawl4aiExtract,
  discoverMatchUrls,
  extractMatchStats,
  toStatsUrl,
  matchTeamToUrl,
  buildFallbackStatsUrl,
};
