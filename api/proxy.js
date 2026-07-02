/**
 * Vercel Serverless CORS Proxy
 * 
 * Usage: /api/proxy?url=https://super.rugby/superrugby/competition-stats/
 * 
 * Fetches the target URL server-side (no CORS issues) and returns the content.
 */

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  // Only allow fetching from known rugby data sources
  const allowed = [
    'super.rugby',
    'all.rugby',
    'sixnationsrugby.com',
    'rugbypass.com',
    'sofascore.com',
    'world.rugby',
    'rugbychampionship.com',
    'nationschampionshiprugby.com',
  ];

  try {
    const targetUrl = new URL(url);
    const isAllowed = allowed.some(domain => targetUrl.hostname.includes(domain));

    if (!isAllowed) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    const body = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.status(200).send(body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
