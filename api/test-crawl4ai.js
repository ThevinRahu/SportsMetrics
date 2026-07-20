/**
 * Test Crawl4AI extraction - temporary endpoint for debugging
 * GET /api/test-crawl4ai?secret=CRON_SECRET
 */
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const crawl4aiKey = process.env.CRAWL4AI_KEY;
  if (!crawl4aiKey) {
    return res.status(500).json({ error: 'CRAWL4AI_KEY not set', envKeys: Object.keys(process.env).filter(k => k.includes('CRAWL')) });
  }

  const url = 'https://www.rugbypass.com/live/new-zealand-vs-ireland/stats/';

  try {
    const crawlRes = await fetch('https://gate.crawl4ai.com/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${crawl4aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, format: 'md' }),
    });

    const status = crawlRes.status;
    const data = await crawlRes.json();

    return res.status(200).json({
      crawl4aiStatus: status,
      ok: data.ok,
      markdownLength: data.markdown?.length || 0,
      markdownPreview: data.markdown?.substring(0, 1000) || 'empty',
      error: data.error || null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
