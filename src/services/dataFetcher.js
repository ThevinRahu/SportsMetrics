/**
 * AI-Powered Data Fetcher Service
 * 
 * Strategy:
 * 1. Fetch raw HTML/content from the tournament's data source via CORS proxy
 * 2. Send content to a free AI model (Groq/Llama)
 * 3. AI parses ALL stats (penalties, scrums, lineouts, tackle rate, gainline, etc.)
 * 4. AI returns structured JSON matching our team schema
 * 5. We validate, merge carefully (never overwrite good data with defaults), save to IndexedDB
 */

const CORS_PROXIES = [
  (url) => `/api/proxy?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

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
        return truncateContent(text, 6000);
      }
    } catch (e) {
      console.warn(`Proxy failed for ${url}:`, e.message);
      continue;
    }
  }
  throw new Error(`All proxies failed for ${url}`);
}

function truncateContent(html, maxChars) {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/\s+/g, ' ');
  
  if (cleaned.length > maxChars) {
    const tables = cleaned.match(/<table[\s\S]*?<\/table>/gi) || [];
    if (tables.length > 0) {
      cleaned = tables.join('\n').slice(0, maxChars);
    } else {
      cleaned = cleaned.slice(0, maxChars);
    }
  }
  return cleaned;
}

/**
 * CRITICAL: The prompt now tells the AI to use NULL for unknown data, NOT defaults.
 * This way we can distinguish "AI found this value" from "AI didn't find it".
 */
function getExtractionPrompt(tournamentName, content, existingTeamNames) {
  return `You are a rugby data extraction AI. Extract team statistics AND match results from this webpage for "${tournamentName}".

TEAMS: ${existingTeamNames.join(", ")}

Return ONLY valid JSON with this structure. Use NULL for any field you cannot find:
{
  "teams": {
    "Team Name": {
      "season": { "played": null, "won": null, "lost": null, "drawn": null, "pts": null, "pf": null, "pa": null, "tries_for": null, "tries_against": null, "try_bonus": null, "loss_bonus": null },
      "attack": { "pts_pg": null, "tries_pg": null, "gl": null, "lb": null, "rs": null, "c22": null, "e22": null, "off": null },
      "defense": { "tr": null, "missed": null, "to": null, "dom": null, "steals": null, "ob": null },
      "setpiece": { "so": null, "ss": null, "lo": null, "ls": null, "ps": null, "maul": null },
      "kicking": { "km": null, "goal": null },
      "discipline": { "pen": null, "idx": null },
      "form": { "last5": null, "streak": null, "rating": null },
      "elo": null
    }
  },
  "matches": [
    { "home": "Team A", "away": "Team B", "homeScore": 35, "awayScore": 21, "date": "2026-07-04", "round": 1 }
  ],
  "meta": { "round": null, "source": "url" }
}

IMPORTANT - MATCHES SECTION:
- Extract ALL match results you can find on the page
- Each match needs: home team name, away team name, home score, away score
- Date and round are optional (use null if not found)
- Team names must match the TEAMS list I provided
- This is CRITICAL for ML training - extract every result you can find

FIELDS:
- season: played, won, lost, drawn, competition points, points for, points against, tries scored, tries conceded, try bonus pts, losing bonus pts  
- attack: pts/game, tries/game, gainline %, line breaks/game, ruck speed (s), 22m conversion %, 22m entries/game, offloads/game
- defense: tackle rate %, missed tackles/game, turnovers won/game, dominant tackles/game, steals/game, offloads conceded/game
- setpiece: scrum win %, scrum steal %, lineout win %, lineout steal %, scrum penalties/game, maul success %
- kicking: kick metres/game, goal kicking %
- discipline: total penalties in season, discipline index 0-100
- form: last5 = array of "W" or "L" for last 5 matches, streak like "W3" or "L2", rating 0-100
- elo: team rating 1300-1600 club, 1500-1950 international

CRITICAL RULES:
- Use NULL for anything not found in the content
- Do NOT invent or guess numbers
- Team names must EXACTLY match the names I gave you
- form.last5 must be an array like ["W","W","L","W","W"] or null if unknown
- Return ONLY JSON, no other text

CONTENT:
${content}`;
}

/**
 * Knowledge-based prompt: Ask AI directly for tournament data using its training knowledge.
 * No web scraping needed - the AI knows recent results if they're within its training cutoff.
 */
function getKnowledgePrompt(tournamentName, teamNames, existingData) {
  const currentDate = new Date().toISOString().split('T')[0];
  const existingSeason = Object.entries(existingData.teams || {}).map(([name, t]) => 
    `${name}: P${t.season?.played || 0} W${t.season?.won || 0} L${t.season?.lost || 0} PF${t.season?.pf || 0} PA${t.season?.pa || 0}`
  ).join(', ');

  return `You are a rugby statistics AI. Provide the LATEST available data for "${tournamentName}" as of ${currentDate}.

TEAMS: ${teamNames.join(", ")}

CURRENT DATA WE HAVE: ${existingSeason}

Your job: Return updated stats with any NEW match results and updated standings you know about. If the tournament has started and you know results, include them. If you don't have newer data than what we already have, return the existing data unchanged.

Return ONLY valid JSON with this structure:
{
  "teams": {
    "Team Name": {
      "season": { "played": N, "won": N, "lost": N, "drawn": N, "pts": N, "pf": N, "pa": N, "tries_for": N, "tries_against": N, "try_bonus": N, "loss_bonus": N },
      "attack": { "pts_pg": N, "tries_pg": N, "gl": N, "lb": N, "rs": N, "c22": N, "e22": N, "off": N },
      "defense": { "tr": N, "missed": N, "to": N, "dom": N, "steals": N, "ob": N },
      "setpiece": { "so": N, "ss": N, "lo": N, "ls": N, "ps": N, "maul": N },
      "kicking": { "km": N, "goal": N },
      "discipline": { "pen": N, "idx": N },
      "form": { "last5": ["W","L",...], "streak": "W1", "rating": N },
      "elo": N
    }
  },
  "matches": [
    { "home": "Team A", "away": "Team B", "homeScore": 35, "awayScore": 21, "date": "2026-07-04", "round": 1 }
  ],
  "meta": { "round": N, "source": "AI knowledge" }
}

IMPORTANT:
- Include ALL match results you know about for this tournament
- Update season stats (played, won, lost, pts, pf, pa) based on results
- Update form.last5 arrays based on recent results
- Use NULL for any stat you genuinely don't know
- Team names must EXACTLY match: ${teamNames.join(", ")}
- Return ONLY JSON, no other text`;
}

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
      // Rate limited - wait and retry
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

/**
 * Merge AI-extracted data with existing team data.
 * 
 * KEY RULE: Only overwrite existing values if the AI returned a non-null value.
 * Null means "not found"- we keep existing data intact.
 */
function mergeTeamData(existing, extracted) {
  const merged = JSON.parse(JSON.stringify(existing)); // deep clone
  
  function mergeSection(target, source) {
    if (!source) return;
    for (const [k, v] of Object.entries(source)) {
      // Only overwrite if AI found actual data (non-null)
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
  
  // Recalculate derived attack stats from season
  if (merged.season?.played > 0 && merged.season?.pf > 0) {
    merged.attack.pts_pg = parseFloat((merged.season.pf / merged.season.played).toFixed(1));
  }
  if (merged.season?.played > 0 && merged.season?.tries_for > 0) {
    merged.attack.tries_pg = parseFloat((merged.season.tries_for / merged.season.played).toFixed(1));
  }
  
  // Form: only update if AI found real results
  if (extracted.form) {
    if (Array.isArray(extracted.form.last5) && extracted.form.last5.length >= 3 &&
        extracted.form.last5.every(r => r === "W" || r === "L" || r === "D")) {
      merged.form.last5 = extracted.form.last5;
    }
    if (extracted.form.streak && typeof extracted.form.streak === "string" && extracted.form.streak.match(/^[WLD]\d+$/)) {
      merged.form.streak = extracted.form.streak;
    }
    if (typeof extracted.form.rating === "number" && extracted.form.rating > 0 && extracted.form.rating <= 100) {
      merged.form.rating = extracted.form.rating;
    }
  }
  
  // Elo: only update if meaningful
  if (typeof extracted.elo === "number" && extracted.elo > 1000 && extracted.elo < 2200) {
    merged.elo = extracted.elo;
  }

  return merged;
}

/**
 * MAIN REFRESH FUNCTION
 */
export async function refreshTournamentData(tournamentId, existingData) {
  const results = { success: false, data: null, error: null, source: "" };
  const { apiKey } = getAIConfig();
  
  const dataUrl = existingData.dataUrl;

  if (!apiKey) {
    results.error = "Configure an AI API key (Groq is free) in Settings to enable live data refresh.";
    results.data = { ...existingData, lastRefresh: new Date().toISOString() };
    return results;
  }

  const teamNames = Object.keys(existingData.teams || {});
  let aiResult = null;

  // Strategy 1: Fetch URL and have AI extract data from HTML
  if (dataUrl) {
    try {
      results.source = dataUrl;
      const content = await fetchWithProxy(dataUrl);
      
      if (content && content.length >= 100) {
        const prompt = getExtractionPrompt(existingData.name || tournamentId, content, teamNames);
        aiResult = await callAI(prompt);
      }
    } catch (e) {
      console.warn("URL fetch failed, falling back to AI knowledge:", e.message);
    }
  }

  // Strategy 2: If URL fetch failed or AI found nothing, ask AI directly from its knowledge
  if (!aiResult || !aiResult.teams || Object.keys(aiResult.teams).length === 0 ||
      (aiResult.matches && aiResult.matches.length === 0 && Object.values(aiResult.teams).every(t => !t.season?.played))) {
    try {
      results.source = "AI Knowledge (Groq)";
      const knowledgePrompt = getKnowledgePrompt(existingData.name || tournamentId, teamNames, existingData);
      aiResult = await callAI(knowledgePrompt);
    } catch (e) {
      results.error = e.message;
      results.data = { ...existingData, lastRefresh: new Date().toISOString() };
      return results;
    }
  }

  if (!aiResult || !aiResult.teams) {
    results.error = "AI did not return valid team data.";
    results.data = { ...existingData, lastRefresh: new Date().toISOString() };
    return results;
  }

  // Merge with existing - only overwrite where AI found real data
  const updatedTeams = JSON.parse(JSON.stringify(existingData.teams));
  let teamsUpdated = 0;
  
  for (const [teamName, extractedData] of Object.entries(aiResult.teams)) {
    const matchKey = teamNames.find(k => 
      k === teamName ||
      k.toLowerCase() === teamName.toLowerCase() ||
      k.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(k.toLowerCase())
    );
    
    if (matchKey) {
      const before = JSON.stringify(updatedTeams[matchKey]);
      updatedTeams[matchKey] = mergeTeamData(updatedTeams[matchKey], extractedData);
      if (JSON.stringify(updatedTeams[matchKey]) !== before) {
        teamsUpdated++;
      }
    }
  }

  const updatedRound = (typeof aiResult.meta?.round === "number" && aiResult.meta.round > 0) 
    ? aiResult.meta.round 
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

  // Extract match results from AI response
  results.matches = [];
  if (Array.isArray(aiResult.matches)) {
    results.matches = aiResult.matches
      .filter(m => m && m.home && m.away && m.homeScore != null && m.awayScore != null)
      .map(m => ({
        homeTeam: m.home,
        awayTeam: m.away,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        date: m.date || new Date().toISOString().split('T')[0],
        round: m.round || null,
        competition: existingData.name || tournamentId,
        tournamentId,
      }));
  }
  
  if (teamsUpdated === 0 && results.matches.length === 0) {
    results.error = "AI processed but no new data found. The AI may not have recent results for this tournament.";
  } else {
    results.error = null;
  }
  
  return results;
}

export async function refreshFromCustomUrl(url, existingTeams, tournamentName) {
  const { apiKey } = getAIConfig();
  if (!apiKey) return { success: false, data: null, error: "Configure an AI API key to enable data extraction." };

  try {
    const content = await fetchWithProxy(url);
    const teamNames = Object.keys(existingTeams || {});
    const prompt = getExtractionPrompt(tournamentName || "Custom Tournament", content, teamNames);
    const aiResult = await callAI(prompt);
    if (aiResult?.teams) return { success: true, data: aiResult.teams, error: null };
    return { success: false, data: null, error: "No team data found in page content." };
  } catch (error) {
    return { success: false, data: null, error: error.message };
  }
}

export function getAvailableProviders() {
  return Object.entries(AI_PROVIDERS).map(([id, config]) => ({ id, name: config.name, model: config.model }));
}

/**
 * Fetch match stats from rugbypass and save to DB.
 * 
 * URL format: https://www.rugbypass.com/live/{team-a}-vs-{team-b}/stats/
 * Parses the stats page directly (no AI needed - structured text).
 * 
 * Returns: { success, matchStats, error }
 */
export async function fetchRugbypassMatchStats(matchUrl) {
  try {
    // Ensure URL ends with /stats/
    let url = matchUrl;
    if (!url.includes('/stats')) {
      url = url.replace(/\/?$/, '/stats/');
    }

    const content = await fetchWithProxy(url);
    if (!content || content.length < 200) {
      throw new Error("Could not fetch stats page");
    }

    // Parse stats from the text content
    const stats = parseRugbypassStats(content);
    if (!stats) {
      throw new Error("Could not parse stats from page");
    }

    return { success: true, matchStats: stats, error: null };
  } catch (e) {
    return { success: false, matchStats: null, error: e.message };
  }
}

/**
 * Parse rugbypass stats page content into structured match stats.
 * The page has format like: "153 Tackles Made 173" (home value | label | away value)
 */
function parseRugbypassStats(content) {
  // Extract team names from the score line: "Australia 31 - 33 Ireland" or similar
  const scoreMatch = content.match(/(\w[\w\s]+?)\s+(\d+)\s*-\s*(\d+)\s*(?:Full\s*Time|FT|HT)?\s*(\w[\w\s]+)/i);
  if (!scoreMatch) return null;

  const homeTeam = scoreMatch[1].trim();
  const homeScore = parseInt(scoreMatch[2]);
  const awayScore = parseInt(scoreMatch[3]);
  const awayTeam = scoreMatch[4].trim();

  // Helper: extract a stat pair "X Label Y" where X is home, Y is away
  function extractStat(label) {
    // Pattern: number(s) then label then number(s)
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

  // Territory/possession
  const territory = extractPctStat('Territory');
  const possession = extractPctStat('Possession');

  return {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    date: new Date().toISOString().split('T')[0],
    source: 'rugbypass',
    stats: {
      home: {
        tackles_made: tackles?.[0] || null,
        tackles_missed: missedTackles?.[0] || null,
        tackle_rate: tackleRate?.[0] || null,
        carries: carries?.[0] || null,
        line_breaks: lineBreaks?.[0] || null,
        turnovers_won: turnoversWon?.[0] || null,
        turnovers_lost: turnoversLost?.[0] || null,
        penalties: penalties?.[0] || null,
        passes: passes?.[0] || null,
        kicks: kicks?.[0] || null,
        scrums: scrums?.[0] || null,
        scrum_win_pct: scrumWin?.[0] || null,
        lineouts: lineouts?.[0] || null,
        lineout_win_pct: lineoutWin?.[0] || null,
        post_contact_metres: postContact?.[0] || null,
        tries: tries?.[0] || null,
        conversions: conversions?.[0] || null,
        penalty_goals: penaltyGoals?.[0] || null,
        yellow_cards: yellowCards?.[0] || null,
        red_cards: redCards?.[0] || null,
        territory_pct: territory?.[0] || null,
        possession_pct: possession?.[0] || null,
      },
      away: {
        tackles_made: tackles?.[1] || null,
        tackles_missed: missedTackles?.[1] || null,
        tackle_rate: tackleRate?.[1] || null,
        carries: carries?.[1] || null,
        line_breaks: lineBreaks?.[1] || null,
        turnovers_won: turnoversWon?.[1] || null,
        turnovers_lost: turnoversLost?.[1] || null,
        penalties: penalties?.[1] || null,
        passes: passes?.[1] || null,
        kicks: kicks?.[1] || null,
        scrums: scrums?.[1] || null,
        scrum_win_pct: scrumWin?.[1] || null,
        lineouts: lineouts?.[1] || null,
        lineout_win_pct: lineoutWin?.[1] || null,
        post_contact_metres: postContact?.[1] || null,
        tries: tries?.[1] || null,
        conversions: conversions?.[1] || null,
        penalty_goals: penaltyGoals?.[1] || null,
        yellow_cards: yellowCards?.[1] || null,
        red_cards: redCards?.[1] || null,
        territory_pct: territory?.[1] || null,
        possession_pct: possession?.[1] || null,
      },
    },
  };
}

export default { refreshTournamentData, refreshFromCustomUrl, fetchRugbypassMatchStats, getAIConfig, setAIConfig, getAvailableProviders };
