/**
 * Matches API - serves match results from Postgres
 * 
 * GET /api/matches?tournament=nc2026 - all matches for a tournament
 * GET /api/matches?h2h=New Zealand,Ireland - head-to-head between two teams
 * GET /api/matches?team=New Zealand - all matches for a team
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const { tournament, h2h, team } = req.query;

    if (h2h) {
      // Head-to-head: get all matches between two teams
      const [teamA, teamB] = h2h.split(',').map(t => t.trim());
      const matches = await sql`
        SELECT home_team, away_team, home_score, away_score, round, match_date, stats, source
        FROM matches 
        WHERE status = 'final'
        AND (
          (home_team = ${teamA} AND away_team = ${teamB}) OR
          (home_team = ${teamB} AND away_team = ${teamA})
        )
        ORDER BY match_date DESC
        LIMIT 20
      `;
      return res.status(200).json(matches);
    }

    if (team) {
      // All matches for a specific team
      const matches = await sql`
        SELECT home_team, away_team, home_score, away_score, round, match_date, tournament_id, stats
        FROM matches 
        WHERE status = 'final'
        AND (home_team = ${team} OR away_team = ${team})
        ORDER BY match_date DESC
        LIMIT 30
      `;
      return res.status(200).json(matches);
    }

    if (tournament) {
      // All matches for a tournament
      const matches = await sql`
        SELECT home_team, away_team, home_score, away_score, round, match_date, status, stats
        FROM matches 
        WHERE tournament_id = ${tournament}
        ORDER BY round, id
      `;
      return res.status(200).json(matches);
    }

    // Default: all completed matches (for ML training data)
    const matches = await sql`
      SELECT home_team, away_team, home_score, away_score, match_date, tournament_id
      FROM matches 
      WHERE status = 'final'
      ORDER BY match_date DESC
      LIMIT 100
    `;
    return res.status(200).json(matches);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
