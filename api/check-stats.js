import { neon } from '@neondatabase/serverless';
export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const sql = neon(process.env.DATABASE_URL);
  
  if (req.query.action === 'reset-r3') {
    const result = await sql`UPDATE matches SET status = 'scheduled', home_score = NULL, away_score = NULL, stats = '{}' WHERE round = 3 AND tournament_id = 'nc2026' RETURNING id, home_team, away_team`;
    return res.status(200).json({ reset: result.length, matches: result });
  }

  if (req.query.action === 'fix-r3') {
    // Set all R3 scores to correct verified values
    await sql`UPDATE matches SET home_score = 40, away_score = 21, status = 'final' WHERE tournament_id = 'nc2026' AND round = 3 AND home_team = 'New Zealand' AND away_team = 'Ireland'`;
    await sql`UPDATE matches SET home_score = 15, away_score = 42, status = 'final' WHERE tournament_id = 'nc2026' AND round = 3 AND home_team = 'Japan' AND away_team = 'France'`;
    await sql`UPDATE matches SET home_score = 57, away_score = 10, status = 'final' WHERE tournament_id = 'nc2026' AND round = 3 AND home_team = 'Australia' AND away_team = 'Italy'`;
    await sql`UPDATE matches SET home_score = 17, away_score = 33, status = 'final' WHERE tournament_id = 'nc2026' AND round = 3 AND home_team = 'Fiji' AND away_team = 'Scotland'`;
    await sql`UPDATE matches SET home_score = 43, away_score = 0, status = 'final' WHERE tournament_id = 'nc2026' AND round = 3 AND home_team = 'South Africa' AND away_team = 'Wales'`;
    await sql`UPDATE matches SET home_score = 24, away_score = 31, status = 'final' WHERE tournament_id = 'nc2026' AND round = 3 AND home_team = 'Argentina' AND away_team = 'England'`;
    return res.status(200).json({ fixed: 'All 6 R3 scores set to verified values' });
  }
  
  const matches = await sql`SELECT id, home_team, away_team, home_score, away_score, status FROM matches WHERE round = 3 AND tournament_id = 'nc2026' ORDER BY id`;
  res.status(200).json(matches);
}
