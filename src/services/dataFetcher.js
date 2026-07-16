/**
 * Data Fetcher Service - v2 (Extraction Pipeline Architecture)
 * 
 * 5-stage pipeline:
 * 1. Source Router → correct URL for the data needed
 * 2. Content Acquire → fetch + clean without destructive truncation
 * 3. Extraction (LLM) → AI with field-specific hints
 * 4. Schema Validate → zod validation, fail loudly
 * 5. Merge & Persist → write to server/IndexedDB with provenance
 * 
 * Key fix: tournament refresh now fetches BOTH standings page AND
 * individual match stats pages (where gainline/scrums/tackles live).
 */

import { resolveMatchStatsUrl, resolveStandingsUrl } from './sourceRouter';
import { cleanContent, chunkContent, findStatsChunk } from './contentChunker';
import { buildMatchStatsPrompt, buildStandingsPrompt } from './extractionPrompts';
import { validateMatchStats, validateTeamProfile, extractionQualityScore } from './statsValidator';

// ===== CORS PROXIES =====
const CORS_PROXIES = [
  (url) => `/api/proxy?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

// ===== AI PROVIDERS =====
const AI_PROVIDERS = {
  groq: {
    name: "Groq (Llama 3.3 70B)",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    getHeaders: (key) => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    }),
  },
  groq_specdec: {
    name: "Groq (Llama 3.3 70B SpecDec - Fastest)",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-specdec",
    getHeaders: (key) => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    }),
  },
  openrouter: {
    name: "OpenRouter (Llama 3.1 8B Free)",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    getHeaders: (key) => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    }),
  },
};

export function getAIConfig() {
  return {
    provider: localStorage.getItem("sm_ai_provider") || "groq",
    apiKey: localStorage.getItem("sm_ai_key") || "",
  };
}

export function setAIConfig(provider, apiKey) {
  localStorage.setItem("sm_ai_provider", provider);
  localStorage.setItem("sm_ai_key", apiKey);
}

// ===== STAGE 2: CONTENT ACQUISITION =====

async function fetchWithProxy(url) {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetch(proxyUrl, {
        headers: { 'Accept': 'text/html,application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (response.ok) {
        const text = await response.text();
        // Use new non-destructive cleaning (preserves div-based stats)
        return cleanContent(text);
      }
    } catch (e) {
      console.warn(`Proxy failed for ${url}:`, e.message);
      continue;
    }
  }
  throw new Error(`All proxies failed for ${url}`);
}

// ===== STAGE 3: LLM EXTRACTION =====

async function callAI(prompt, retries = 1) {
  const { provider, apiKey } = getAIConfig();
  
  if (!apiKey) {
    throw new Error("No AI API key configured. Go to Settings to add your Groq or OpenRouter key.");
  }
  
  const config = AI_PROVIDERS[provider];
  if (!config) throw new Error(`Unknown AI provider: ${provider}`);

  const response = await fetch(config.url, {
    method: "POST",
    headers: config.getHeaders(apiKey),
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: "You extract data from HTML into JSON. Return ONLY valid JSON. Use null for unknown values. No markdown, no explanation." },
        { role: "user", content: prompt }
      ],
      temperature: 0.0,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429 && retries > 0) {
      await new Promise(r => setTimeout(r, 20000));
      return callAI(prompt, retries - 1);
    }
    const err = await response.text();
    throw new Error(`AI API error (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("AI returned invalid JSON. Response: " + jsonStr.slice(0, 300));
  }
}

// ===== SERVER-SIDE EXTRACTION (preferred path) =====

async function callServerExtraction(url, teamNames, tournamentName) {
  try {
    const res = await fetch('/api/extract-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ url, teamNames, tournamentName }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success) return result.data;
    }
  } catch (e) {
    console.warn("Server-side extraction failed, falling back to client:", e.message);
  }
  return null;
}

// ===== STAGE 5: MERGE =====

function mergeTeamData(existing, extracted) {
  const merged = JSON.parse(JSON.stringify(existing));
  
  function mergeSection(target, source) {
    if (!source) return;
    for (const [k, v] of Object.entries(source)) {
      if (v !== null && v !== undefined) {
        target[k] = v;
      }
    }
  }
  
  mergeSection(merged.season, extracted.season);
  if (merged.season) {
    merged.season.pd = (merged.season.pf || 0) - (merged.season.pa || 0);
  }
  
  mergeSection(merged.attack, extracted.attack);
  mergeSection(merged.defense, extracted.defense);
  mergeSection(merged.setpiece, extracted.setpiece);
  mergeSection(merged.kicking, extracted.kicking);
  mergeSection(merged.discipline, extracted.discipline);
  
  // Recalculate derived attack stats
  if (merged.season?.played > 0 && merged.season?.pf > 0) {
    merged.attack.pts_pg = parseFloat((merged.season.pf / merged.season.played).toFixed(1));
  }
  if (merged.season?.played > 0 && merged.season?.tries_for > 0) {
    merged.attack.tries_pg = parseFloat((merged.season.tries_for / merged.season.played).toFixed(1));
  }
  
  // Form: update with validation
  if (extracted.form) {
    if (Array.isArray(extracted.form.last5) && extracted.form.last5.length >= 3 &&
        extracted.form.last5.every(r => r === "W" || r === "L" || r === "D")) {
      merged.form.last5 = extracted.form.last5;
    }
    if (Array.isArray(extracted.form.last12) && extracted.form.last12.length >= 5 &&
        extracted.form.last12.every(r => r === "W" || r === "L" || r === "D")) {
      merged.form.last12 = extracted.form.last12;
    }
    if (extracted.form.streak && typeof extracted.form.streak === "string" && extracted.form.streak.match(/^[WLD]\d+$/)) {
      merged.form.streak = extracted.form.streak;
    }
    if (typeof extracted.form.rating === "number" && extracted.form.rating > 0 && extracted.form.rating <= 100) {
      merged.form.rating = extracted.form.rating;
    }
  }
  
  // Elo
  if (typeof extracted.elo === "number" && extracted.elo > 1000 && extracted.elo < 2200) {
    merged.elo = extracted.elo;
  }

  return merged;
}

// ===== MAIN REFRESH FUNCTION (v2 pipeline) =====

export async function refreshTournamentData(tournamentId, existingData) {
  const results = { success: false, data: null, error: null, source: "", matchStats: [] };
  const { apiKey } = getAIConfig();
  
  if (!apiKey) {
    results.error = "Configure an AI API key (Groq is free) in Settings to enable live data refresh.";
    results.data = { ...existingData, lastRefresh: new Date().toISOString() };
    return results;
  }

  const teamNames = Object.keys(existingData.teams || {});
  
  // ===== STEP 1: Fetch standings (season aggregates) =====
  const standingsUrl = resolveStandingsUrl(tournamentId) || existingData.dataUrl;
  let standingsResult = null;

  if (standingsUrl) {
    try {
      // Try server-side first (uses GROQ_API_KEY env var, more reliable)
      standingsResult = await callServerExtraction(standingsUrl, teamNames, existingData.name);
      results.source = standingsUrl + " (server)";
    } catch { /* fall through */ }

    if (!standingsResult) {
      try {
        const content = await fetchWithProxy(standingsUrl);
        if (content && content.length >= 100) {
          const chunks = chunkContent(content);
          const bestChunk = findStatsChunk(chunks) || chunks[0];
          const prompt = buildStandingsPrompt(existingData.name || tournamentId, teamNames, bestChunk);
          standingsResult = await callAI(prompt);
          results.source = standingsUrl + " (client)";
        }
      } catch (e) {
        console.warn("Standings fetch failed:", e.message);
      }
    }
  }

  // ===== STEP 2: Fetch per-match stats (where gainline/scrums/tackles live) =====
  // Only fetch recent/new matches not already in our data
  const matchStatsResults = [];
  
  if (existingData.results && Array.isArray(existingData.results)) {
    for (const round of existingData.results) {
      if (!round.matches) continue;
      for (const match of round.matches) {
        if (!match.home || !match.away) continue;
        // Only fetch matches we have scores for (completed)
        if (match.score && match.score[0] != null) {
          const matchUrl = resolveMatchStatsUrl(match.home, match.away);
          try {
            const content = await fetchWithProxy(matchUrl);
            if (content && content.length >= 200) {
              const chunks = chunkContent(content);
              const statsChunk = findStatsChunk(chunks);
              if (statsChunk) {
                // Use regex parser first (fast, reliable for rugbypass format)
                const parsed = parseRugbypassStats(statsChunk);
                if (parsed) {
                  const validation = validateMatchStats(parsed);
                  const quality = extractionQualityScore(parsed.stats);
                  matchStatsResults.push({ ...parsed, quality, validation });
                }
              }
            }
          } catch (e) {
            console.warn(`Match stats fetch failed for ${match.home} vs ${match.away}:`, e.message);
          }
        }
      }
    }
  }

  results.matchStats = matchStatsResults;

  // ===== STEP 3: Merge standings into team data =====
  const updatedTeams = JSON.parse(JSON.stringify(existingData.teams));
  let teamsUpdated = 0;

  if (standingsResult?.teams) {
    for (const [teamName, extractedData] of Object.entries(standingsResult.teams)) {
      const matchKey = teamNames.find(k => 
        k === teamName || k.toLowerCase() === teamName.toLowerCase() ||
        k.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(k.toLowerCase())
      );
      
      if (matchKey) {
        // Validate before merging
        const validation = validateTeamProfile(extractedData);
        if (validation.errors.length > 0) {
          console.warn(`Validation warnings for ${matchKey}:`, validation.errors);
        }
        
        const before = JSON.stringify(updatedTeams[matchKey]);
        updatedTeams[matchKey] = mergeTeamData(updatedTeams[matchKey], extractedData);
        if (JSON.stringify(updatedTeams[matchKey]) !== before) {
          teamsUpdated++;
        }
      }
    }
  }

  // ===== STEP 4: Blend match stats into team profiles =====
  for (const matchStat of matchStatsResults) {
    if (!matchStat.stats) continue;
    
    // Update home team profile from match stats
    const homeTeam = updatedTeams[matchStat.homeTeam];
    if (homeTeam && matchStat.stats.home) {
      blendMatchStatsIntoProfile(homeTeam, matchStat.stats.home);
    }
    
    // Update away team profile from match stats
    const awayTeam = updatedTeams[matchStat.awayTeam];
    if (awayTeam && matchStat.stats.away) {
      blendMatchStatsIntoProfile(awayTeam, matchStat.stats.away);
    }
  }

  const updatedRound = (standingsResult?.meta?.round > 0) 
    ? standingsResult.meta.round 
    : existingData.round;

  results.success = true;
  results.data = {
    ...existingData,
    teams: updatedTeams,
    round: updatedRound,
    lastRefresh: new Date().toISOString(),
    lastRefreshSource: results.source,
    teamsUpdated,
  };

  // Extract match results for ML training
  results.matches = [];
  if (standingsResult?.matches && Array.isArray(standingsResult.matches)) {
    results.matches = standingsResult.matches
      .filter(m => m && m.home && m.away && m.homeScore != null && m.awayScore != null)
      .map(m => ({
        homeTeam: m.home, awayTeam: m.away,
        homeScore: m.homeScore, awayScore: m.awayScore,
        date: m.date || new Date().toISOString().split('T')[0],
        round: m.round || null,
        competition: existingData.name || tournamentId,
        tournamentId,
      }));
  }
  
  if (teamsUpdated === 0 && results.matches.length === 0 && matchStatsResults.length === 0) {
    results.error = "No new data found. The AI may not have recent results for this tournament.";
  } else {
    results.error = null;
  }
  
  return results;
}

/**
 * Blend per-match stats into a team's profile using running average
 */
function blendMatchStatsIntoProfile(team, matchStats) {
  if (!team || !matchStats) return;
  
  // === ATTACK ===
  if (matchStats.territory_pct != null && team.attack) {
    team.attack.gl = Math.round((team.attack.gl + matchStats.territory_pct) / 2);
  }
  if (matchStats.line_breaks != null && team.attack) {
    team.attack.lb = parseFloat(((team.attack.lb + matchStats.line_breaks) / 2).toFixed(1));
  }
  if (matchStats.carries != null && team.attack) {
    const ruckProxy = Math.min(4.0, Math.max(2.0, matchStats.carries / 45));
    team.attack.rs = parseFloat(((team.attack.rs + ruckProxy) / 2).toFixed(1));
  }
  if (matchStats.possession_pct != null && team.attack) {
    team.attack.c22 = Math.round((team.attack.c22 + matchStats.possession_pct * 0.65) / 2);
  }
  if (matchStats.line_breaks != null && matchStats.tries != null && team.attack) {
    const entries = (matchStats.line_breaks || 0) + (matchStats.tries || 0);
    team.attack.e22 = parseFloat(((team.attack.e22 + entries) / 2).toFixed(1));
  }

  // === DEFENSE ===
  if (matchStats.tackle_rate != null && team.defense) {
    team.defense.tr = Math.round((team.defense.tr + matchStats.tackle_rate) / 2);
  }
  if (matchStats.tackles_missed != null && team.defense) {
    team.defense.missed = parseFloat(((team.defense.missed + matchStats.tackles_missed) / 2).toFixed(1));
  }
  if (matchStats.turnovers_won != null && team.defense) {
    team.defense.to = parseFloat(((team.defense.to + matchStats.turnovers_won) / 2).toFixed(1));
    team.defense.steals = parseFloat(((team.defense.steals + matchStats.turnovers_won) / 2).toFixed(1));
  }
  if (matchStats.tackles_made != null && matchStats.tackle_rate != null && team.defense) {
    const domProxy = Math.round(matchStats.tackles_made * (matchStats.tackle_rate / 100) * 0.08);
    team.defense.dom = parseFloat(((team.defense.dom + domProxy) / 2).toFixed(1));
  }
  if (matchStats.turnovers_lost != null && team.defense) {
    team.defense.ob = parseFloat(((team.defense.ob + matchStats.turnovers_lost) / 2).toFixed(1));
  }

  // === SET PIECE ===
  if (matchStats.scrum_win_pct != null && team.setpiece) {
    team.setpiece.so = Math.round((team.setpiece.so + matchStats.scrum_win_pct) / 2);
  }
  if (matchStats.lineout_win_pct != null && team.setpiece) {
    team.setpiece.lo = Math.round((team.setpiece.lo + matchStats.lineout_win_pct) / 2);
  }
  if (matchStats.scrums != null && matchStats.penalties != null && team.setpiece) {
    const scrumPens = matchStats.penalties * 0.2;
    team.setpiece.ps = parseFloat(((team.setpiece.ps + scrumPens) / 2).toFixed(1));
  }
  if (matchStats.post_contact_metres != null && team.setpiece) {
    const maulProxy = Math.min(95, Math.max(40, matchStats.post_contact_metres / 4));
    team.setpiece.maul = Math.round((team.setpiece.maul + maulProxy) / 2);
  }

  // === KICKING ===
  if (matchStats.tries != null && matchStats.conversions != null && matchStats.tries > 0 && team.kicking) {
    const convRate = Math.round((matchStats.conversions / matchStats.tries) * 100);
    team.kicking.goal = Math.round((team.kicking.goal + convRate) / 2);
  }
  if (matchStats.kicks != null && team.kicking) {
    const kmEstimate = matchStats.kicks * 40;
    team.kicking.km = Math.round((team.kicking.km + kmEstimate) / 2);
  }

  // === DISCIPLINE ===
  if (matchStats.penalties != null && team.discipline) {
    team.discipline.pen = Math.round((team.discipline.pen + matchStats.penalties) / 2);
    const idx = Math.max(20, Math.min(80, 100 - matchStats.penalties * 5));
    team.discipline.idx = Math.round((team.discipline.idx + idx) / 2);
  }
}

/**
 * Parse rugbypass stats page content into structured match stats.
 * Format: "HOME_VALUE Label AWAY_VALUE" (e.g., "153 Tackles Made 173")
 */
function parseRugbypassStats(content) {
  const scoreMatch = content.match(/(\w[\w\s]+?)\s+(\d+)\s*-\s*(\d+)\s*(?:Full\s*Time|FT|HT)?\s*(\w[\w\s]+)/i);
  if (!scoreMatch) return null;

  const homeTeam = scoreMatch[1].trim();
  const homeScore = parseInt(scoreMatch[2]);
  const awayScore = parseInt(scoreMatch[3]);
  const awayTeam = scoreMatch[4].trim();

  function extractStat(label) {
    const patterns = [
      new RegExp(`(\\d+\\.?\\d*)\\s*${label}\\s*(\\d+\\.?\\d*)`, 'i'),
      new RegExp(`(\\d+\\.?\\d*)m?\\s*${label}\\s*(\\d+\\.?\\d*)m?`, 'i'),
    ];
    for (const re of patterns) {
      const m = content.match(re);
      if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    }
    return null;
  }

  function extractPctStat(label) {
    const re = new RegExp(`(\\d+)%\\s*${label}\\s*(\\d+)%`, 'i');
    const m = content.match(re);
    if (m) return [parseInt(m[1]), parseInt(m[2])];
    return null;
  }

  const tackles = extractStat('Tackles Made');
  const missedTackles = extractStat('Tackles Missed');
  const tackleRate = extractPctStat('Tackle Completion');
  const carries = extractStat('Ball Carries') || extractStat('Carries');
  const lineBreaks = extractStat('Line Breaks');
  const turnoversWon = extractStat('Turnovers Won');
  const turnoversLost = extractStat('Turnovers Lost');
  const penalties = extractStat('Penalties Conceded');
  const passes = extractStat('Passes');
  const kicks = extractStat('Total Kicks') || extractStat('Kicks');
  const scrums = extractStat('Scrums');
  const scrumWin = extractPctStat('Scrum Win');
  const lineouts = extractStat('Lineout') || extractStat('Lineouts');
  const lineoutWin = extractPctStat('Lineout Win');
  const postContact = extractStat('Post Contact Metres');
  const tries = extractStat('Tries');
  const conversions = extractStat('Conversions');
  const penaltyGoals = extractStat('Penalty Goals');
  const yellowCards = extractStat('Yellow Cards');
  const redCards = extractStat('Red Cards');
  const territory = extractPctStat('Territory');
  const possession = extractPctStat('Possession');

  return {
    homeTeam, awayTeam, homeScore, awayScore,
    date: new Date().toISOString().split('T')[0],
    source: 'rugbypass',
    stats: {
      home: {
        tackles_made: tackles?.[0] || null, tackles_missed: missedTackles?.[0] || null,
        tackle_rate: tackleRate?.[0] || null, carries: carries?.[0] || null,
        line_breaks: lineBreaks?.[0] || null, turnovers_won: turnoversWon?.[0] || null,
        turnovers_lost: turnoversLost?.[0] || null, penalties: penalties?.[0] || null,
        passes: passes?.[0] || null, kicks: kicks?.[0] || null,
        scrums: scrums?.[0] || null, scrum_win_pct: scrumWin?.[0] || null,
        lineouts: lineouts?.[0] || null, lineout_win_pct: lineoutWin?.[0] || null,
        post_contact_metres: postContact?.[0] || null, tries: tries?.[0] || null,
        conversions: conversions?.[0] || null, penalty_goals: penaltyGoals?.[0] || null,
        yellow_cards: yellowCards?.[0] || null, red_cards: redCards?.[0] || null,
        territory_pct: territory?.[0] || null, possession_pct: possession?.[0] || null,
      },
      away: {
        tackles_made: tackles?.[1] || null, tackles_missed: missedTackles?.[1] || null,
        tackle_rate: tackleRate?.[1] || null, carries: carries?.[1] || null,
        line_breaks: lineBreaks?.[1] || null, turnovers_won: turnoversWon?.[1] || null,
        turnovers_lost: turnoversLost?.[1] || null, penalties: penalties?.[1] || null,
        passes: passes?.[1] || null, kicks: kicks?.[1] || null,
        scrums: scrums?.[1] || null, scrum_win_pct: scrumWin?.[1] || null,
        lineouts: lineouts?.[1] || null, lineout_win_pct: lineoutWin?.[1] || null,
        post_contact_metres: postContact?.[1] || null, tries: tries?.[1] || null,
        conversions: conversions?.[1] || null, penalty_goals: penaltyGoals?.[1] || null,
        yellow_cards: yellowCards?.[1] || null, red_cards: redCards?.[1] || null,
        territory_pct: territory?.[1] || null, possession_pct: possession?.[1] || null,
      },
    },
  };
}

// ===== LEGACY API (backward compat) =====

export async function refreshFromCustomUrl(url, existingTeams, tournamentName) {
  const { apiKey } = getAIConfig();
  if (!apiKey) return { success: false, data: null, error: "Configure an AI API key to enable data extraction." };

  try {
    const content = await fetchWithProxy(url);
    const teamNames = Object.keys(existingTeams || {});
    const chunks = chunkContent(content);
    const bestChunk = findStatsChunk(chunks) || chunks[0];
    const prompt = buildStandingsPrompt(tournamentName || "Custom Tournament", teamNames, bestChunk);
    const aiResult = await callAI(prompt);
    if (aiResult?.teams) return { success: true, data: aiResult.teams, error: null };
    return { success: false, data: null, error: "No team data found in page content." };
  } catch (error) {
    return { success: false, data: null, error: error.message };
  }
}

export async function fetchRugbypassMatchStats(matchUrl) {
  try {
    let url = matchUrl;
    if (!url.includes('/stats')) {
      url = url.replace(/\/?$/, '/stats/');
    }
    const content = await fetchWithProxy(url);
    if (!content || content.length < 200) throw new Error("Could not fetch stats page");
    
    const chunks = chunkContent(content);
    const statsChunk = findStatsChunk(chunks);
    const stats = parseRugbypassStats(statsChunk || content);
    if (!stats) throw new Error("Could not parse stats from page");
    
    // Validate with zod
    const validation = validateMatchStats(stats);
    if (validation.errors.length > 0) {
      console.warn("Stats validation warnings:", validation.errors);
    }
    
    return { success: true, matchStats: stats, quality: extractionQualityScore(stats.stats), error: null };
  } catch (e) {
    return { success: false, matchStats: null, quality: 0, error: e.message };
  }
}

export function getAvailableProviders() {
  return Object.entries(AI_PROVIDERS).map(([id, config]) => ({ id, name: config.name, model: config.model }));
}

export default { refreshTournamentData, refreshFromCustomUrl, fetchRugbypassMatchStats, getAIConfig, setAIConfig, getAvailableProviders };
