import { neon } from '@neondatabase/serverless';
import { upsertTournament, getTournament } from './lib/db.js';

export default async function handler(req, res) {
  try {
    const secret = req.query.secret || req.headers['authorization']?.replace('Bearer ', '');
    if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    const sql = neon(process.env.DATABASE_URL);
    const r = await sql`UPDATE matches SET status = 'scheduled', home_score = NULL, away_score = NULL, stats = '{}' WHERE tournament_id = 'nc2026' AND round = 3 RETURNING id, home_team, away_team`;
    const t = await getTournament('nc2026');
    if (t) {
      t.round = 3;
      t.data_url = 'https://www.rugbypass.com/nations-championship/fixtures-results/';
      const teamKeys = Object.keys(t.teams || {});
      for (const k of teamKeys) {
        const team = t.teams[k];
        if (team && team.season) { team.season.played = 2; }
      }
      await upsertTournament(t);
    }
    res.status(200).json({ success: true, matchesReset: r.length, matches: r.map(m => m.home_team + ' vs ' + m.away_team) });
  } catch (e) { res.status(500).json({ error: e.message }); }
}