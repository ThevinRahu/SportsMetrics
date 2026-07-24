/**
 * DEBUG: Test Crawl4AI connectivity and key availability.
 * DELETE after testing.
 */
import { crawl4aiExtract, discoverMatchUrls, buildFallbackStatsUrl } from './lib/crawl4ai.js';

export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const hasKey = !!process.env.CRAWL4AI_KEY;
  const keyPrefix = process.env.CRAWL4AI_KEY ? process.env.CRAWL4AI_KEY.substring(0, 10) + '...' : 'NOT SET';

  // Test 1: Check key exists
  const results = { hasKey, keyPrefix, tests: [] };

  // Test 2: Try URL discovery
  const fixturesUrl = 'https://www.rugbypass.com/nations-championship/fixtures-results/';
  try {
    const links = await discoverMatchUrls(fixturesUrl, 3);
    results.tests.push({ name: 'discoverMatchUrls', success: links.length > 0, count: links.length, sample: links[0] || null });
  } catch (e) {
    results.tests.push({ name: 'discoverMatchUrls', success: false, error: e.message });
  }

  // Test 3: Try direct extraction on a known stats page
  const testUrl = buildFallbackStatsUrl('New Zealand', 'Ireland');
  try {
    const extracted = await crawl4aiExtract(testUrl, 'What is the final score? Return JSON: {"played": true/false, "homeScore": X, "awayScore": Y}');
    results.tests.push({ name: 'directExtract', success: !!extracted, url: testUrl, result: extracted });
  } catch (e) {
    results.tests.push({ name: 'directExtract', success: false, error: e.message });
  }

  res.status(200).json(results);
}
