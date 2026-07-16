/**
 * Server-side AI Stats Extraction
 * 
 * POST /api/extract-stats
 * Body: { url: "https://rugbypass.com/...", tournamentId: "nc2026", teamNames: [...] }
 * 
 * Moves the Groq API key server-side (env var GROQ_API_KEY).
 * The browser never sees or needs the key.
 * 
 * This also allows central rate-limiting and caching of LLM calls.
 */

export const config = { maxDuration: 60 };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Allowed domains for fetching
const ALLOWED_DOMAINS = [
  'super.rugby', 'all.rugby', 'sixnationsrugby.com', 'rugbypass.com',
  'sofascore.com', 'world.rugby', 'rugbychampionship.com', 'nationschampionshiprugby.com',
];

function truncateContent(html, maxChars = 6000) {
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

function buildExtractionPrompt(tournamentName, content, teamNames) {
  return `You are a rugby data extraction AI. Extract team statistics AND match results from this webpage for "${tournamentName}".

TEAMS: ${teamNames.join(", ")}

Return ONLY valid JSON with this structure. Use NULL for any field you cannot find:
{
  "teams": {
    "Team Name": {
      "season": { "played": null, "won": null, "lost": null, "pts": null, "pf": null, "pa": null, "tries_for": null, "tries_against": null, "try_bonus": null, "loss_bonus": null },
      "form": { "last5": null, "streak": null, "rating": null }
    }
  },
  "matches": [
    { "home": "Team A", "away": "Team B", "homeScore": 35, "awayScore": 21, "date": "2026-07-04", "round": 1 }
  ],
  "meta": { "round": null, "source": "url" }
}

IMPORTANT:
- Extract ALL match results you can find
- Use NULL for anything not found
- Team names must EXACTLY match the names given
- Return ONLY JSON

CONTENT:
${content}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured in environment' });
  }

  const { url, tournamentId, teamNames, tournamentName } = req.body || {};

  if (!url || !teamNames || !Array.isArray(teamNames)) {
    return res.status(400).json({ error: 'Required: url, teamNames (array). Optional: tournamentId, tournamentName' });
  }

  // Validate URL domain
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

  try {
    // 1. Fetch the page
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
    const content = truncateContent(html);

    if (content.length < 100) {
      return res.status(422).json({ error: 'Page content too short to extract stats' });
    }

    // 2. Call Groq AI for extraction
    const prompt = buildExtractionPrompt(tournamentName || tournamentId || 'Tournament', content, teamNames);

    const aiRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You extract data from HTML into JSON. Return ONLY valid JSON. No markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.0,
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return res.status(502).json({ error: `Groq API error (${aiRes.status}): ${err.slice(0, 200)}` });
    }

    const aiData = await aiRes.json();
    let jsonStr = (aiData.choices?.[0]?.message?.content || '').trim();
    
    // Strip markdown code fences
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(422).json({ error: 'AI returned invalid JSON', raw: jsonStr.slice(0, 300) });
      }
    }

    const durationMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: parsed,
      meta: {
        durationMs,
        source: url,
        teamsFound: Object.keys(parsed.teams || {}).length,
        matchesFound: (parsed.matches || []).length,
      },
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream timeout' });
    }
    res.status(500).json({ error: e.message });
  }
}
