import { neon } from '@neondatabase/serverless';
export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const sql = neon(process.env.DATABASE_URL);
  
  if (req.query.action === 'reset-r3') {
    const result = await sql`UPDATE matches SET status = 'scheduled', home_score = NULL, away_score = NULL, stats = '{}' WHERE round = 3 AND tournament_id = 'nc2026' RETURNING id, home_team, away_team`;
    return res.status(200).json({ reset: result.length, matches: result });
  }
  
  const matches = await sql`SELECT id, home_team, away_team, home_score, away_score, stats, source FROM matches WHERE round = 3 AND tournament_id = 'nc2026' ORDER BY id`;
  res.status(200).json(matches);
}
