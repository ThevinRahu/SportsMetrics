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
        return truncateContent(text, 12000);
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
  return `You are a rugby data extraction AI. Extract team statistics from this webpage for "${tournamentName}".

TEAMS: ${existingTeamNames.join(", ")}

Return ONLY valid JSON with this structure. Use NULL for any field you cannot find in the content- do NOT guess or use default values:
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
  "meta": { "round": null, "source": "url" }
}

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

async function callAI(prompt) {
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
  if (!dataUrl) {
    results.error = "No data URL configured for this tournament.";
    results.data = existingData;
    return results;
  }

  if (!apiKey) {
    results.error = "Configure an AI API key (Groq is free) in Settings to enable live data refresh.";
    results.data = { ...existingData, lastRefresh: new Date().toISOString() };
    return results;
  }

  try {
    results.source = dataUrl;
    const content = await fetchWithProxy(dataUrl);
    
    if (!content || content.length < 100) {
      throw new Error("Fetched content too short- site may be blocking requests.");
    }

    const teamNames = Object.keys(existingData.teams || {});
    const prompt = getExtractionPrompt(existingData.name || tournamentId, content, teamNames);
    const aiResult = await callAI(prompt);
    
    if (!aiResult || !aiResult.teams) {
      throw new Error("AI did not return valid team data structure.");
    }

    // Merge with existing- only overwrite where AI found real data
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
      lastRefreshSource: dataUrl,
      teamsUpdated,
    };
    
    if (teamsUpdated === 0) {
      results.error = "AI processed content but no new data was found different from existing. Source may not have detailed stats.";
    } else {
      results.error = null;
    }
    
  } catch (error) {
    results.error = error.message;
    results.data = { ...existingData, lastRefresh: new Date().toISOString() };
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

export default { refreshTournamentData, refreshFromCustomUrl, getAIConfig, setAIConfig, getAvailableProviders };
