/**
 * TEST ONLY: Reset NC2026 Round 3 to pre-match state
 * 
 * POST /api/reset-r3?secret=CRON_SECRET
 * 
 * This resets:
 * 1. R3 matches → status='scheduled', scores null
 * 2. Tournament teams → R1+R2 baseline (from hardcoded data)
 * 3. Tournament round → 3
 * 4. Sets data_url for Crawl4AI URL discovery
 * 
 * After running this, hit "Refresh Data" on NC2026 to test the extraction pipeline.
 * DELETE THIS ENDPOINT after testing.
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sql = neon(process.env.DATABASE_URL);

  // 1. Reset R3 matches to scheduled
  const resetMatches = await sql`
    UPDATE matches 
    SET status = 'scheduled', home_score = NULL, away_score = NULL, stats = '{}'
    WHERE tournament_id = 'nc2026' AND round = 3
    RETURNING id, home_team, away_team
  `;

  // 2. Reseed tournament teams with R1+R2 baseline data
  const teams = {
    "South Africa": { elo: 1989, attack: { pts_pg: 35.5, tries_pg: 5.5, gl: 63, lb: 7.1, rs: 2.7, c22: 38, e22: 11, off: 8.7 }, defense: { tr: 81, missed: 37.1, to: 4, dom: 14, steals: 4, ob: 11 }, setpiece: { so: 91, ss: 17, lo: 84, ls: 10, ps: 4.1, maul: 88 }, kicking: { km: 840, goal: 82 }, discipline: { pen: 54, idx: 57 }, form: { last5: ["W","W","W","W","W"], last12: ["W","W","W","W","W"], streak: "W4", rating: 95 }, season: { played: 2, won: 2, lost: 0, drawn: 0, pts: 10, pf: 87, pa: 49, pd: 38, tries_for: 13, tries_against: 7, try_bonus: 2, loss_bonus: 0 } },
    "New Zealand": { elo: 1907, attack: { pts_pg: 30.5, tries_pg: 5.3, gl: 63, lb: 9.5, rs: 2.6, c22: 40, e22: 10, off: 8.5 }, defense: { tr: 87, missed: 20, to: 3.5, dom: 13, steals: 3.5, ob: 14 }, setpiece: { so: 84, ss: 14, lo: 82, ls: 17, ps: 3.6, maul: 82 }, kicking: { km: 750, goal: 75 }, discipline: { pen: 57, idx: 52 }, form: { last5: ["W","W","W","W","W"], last12: ["W","W","W","W","W"], streak: "W5", rating: 85 }, season: { played: 2, won: 2, lost: 0, drawn: 0, pts: 10, pf: 81, pa: 49, pd: 32, tries_for: 12, tries_against: 6, try_bonus: 2, loss_bonus: 0 } },
    "Ireland": { elo: 1880, attack: { pts_pg: 31.5, tries_pg: 5, gl: 56, lb: 6.7, rs: 3.1, c22: 34, e22: 9, off: 12 }, defense: { tr: 91, missed: 17.6, to: 5.4, dom: 9, steals: 5.9, ob: 12 }, setpiece: { so: 91, ss: 0, lo: 80, ls: 11, ps: 2.4, maul: 72 }, kicking: { km: 810, goal: 75 }, discipline: { pen: 60, idx: 50 }, form: { last5: ["W","W","W","W","W"], last12: ["W","W","W","W","W"], streak: "W6", rating: 82 }, season: { played: 2, won: 2, lost: 0, drawn: 0, pts: 10, pf: 69, pa: 51, pd: 18, tries_for: 10, tries_against: 7, try_bonus: 2, loss_bonus: 0 } },
    "France": { elo: 1846, attack: { pts_pg: 37, tries_pg: 5, gl: 67, lb: 11.5, rs: 3.1, c22: 38, e22: 10, off: 13 }, defense: { tr: 89, missed: 23, to: 4.3, dom: 11, steals: 3.3, ob: 13 }, setpiece: { so: 93, ss: 14, lo: 88, ls: 14, ps: 3.0, maul: 76 }, kicking: { km: 810, goal: 90 }, discipline: { pen: 66, idx: 45 }, form: { last5: ["W","W","L","W","W"], last12: ["W","W","L","W","W"], streak: "W1", rating: 72 }, season: { played: 2, won: 1, lost: 1, drawn: 0, pts: 7, pf: 74, pa: 60, pd: 14, tries_for: 10, tries_against: 9, try_bonus: 2, loss_bonus: 1 } },
    "England": { elo: 1802, attack: { pts_pg: 43.3, tries_pg: 7, gl: 58, lb: 8.9, rs: 3.2, c22: 34, e22: 10, off: 8.5 }, defense: { tr: 83, missed: 24.5, to: 4.7, dom: 11, steals: 4.7, ob: 8.5 }, setpiece: { so: 79, ss: 0, lo: 100, ls: 11, ps: 1.9, maul: 70 }, kicking: { km: 870, goal: 80 }, discipline: { pen: 72, idx: 38 }, form: { last5: ["L","L","L","L","W"], last12: ["L","L","L","L","W"], streak: "W1", rating: 58 }, season: { played: 2, won: 1, lost: 1, drawn: 0, pts: 5, pf: 94, pa: 53, pd: 41, tries_for: 14, tries_against: 8, try_bonus: 1, loss_bonus: 0 } },
    "Scotland": { elo: 1762, attack: { pts_pg: 30.7, tries_pg: 5.5, gl: 54, lb: 10.3, rs: 3.1, c22: 30, e22: 10, off: 10 }, defense: { tr: 87, missed: 20.7, to: 4.1, dom: 11, steals: 3.1, ob: 10 }, setpiece: { so: 100, ss: 0, lo: 96, ls: 4, ps: 1.6, maul: 64 }, kicking: { km: 720, goal: 77 }, discipline: { pen: 58, idx: 52 }, form: { last5: ["W","W","L","W","L"], last12: ["W","W","L","W","L"], streak: "L1", rating: 62 }, season: { played: 2, won: 1, lost: 1, drawn: 0, pts: 6, pf: 75, pa: 80, pd: -5, tries_for: 11, tries_against: 11, try_bonus: 2, loss_bonus: 0 } },
    "Argentina": { elo: 1760, attack: { pts_pg: 32.1, tries_pg: 3.9, gl: 53, lb: 9, rs: 3.1, c22: 36, e22: 10, off: 9.5 }, defense: { tr: 91, missed: 17, to: 6, dom: 14, steals: 4.5, ob: 9.5 }, setpiece: { so: 100, ss: 12, lo: 97, ls: 8, ps: 2.8, maul: 78 }, kicking: { km: 600, goal: 76 }, discipline: { pen: 56, idx: 53 }, form: { last5: ["L","L","W","L","W"], last12: ["L","L","W","L","W"], streak: "W1", rating: 58 }, season: { played: 2, won: 1, lost: 1, drawn: 0, pts: 6, pf: 73, pa: 68, pd: 5, tries_for: 10, tries_against: 10, try_bonus: 2, loss_bonus: 0 } },
    "Australia": { elo: 1659, attack: { pts_pg: 28.5, tries_pg: 3.5, gl: 60, lb: 6.2, rs: 2.8, c22: 36, e22: 10, off: 7.5 }, defense: { tr: 84, missed: 28.4, to: 4, dom: 14, steals: 4, ob: 10 }, setpiece: { so: 91, ss: 12, lo: 93, ls: 14, ps: 2.1, maul: 70 }, kicking: { km: 650, goal: 71 }, discipline: { pen: 57, idx: 51 }, form: { last5: ["L","W","L","L","L"], last12: ["L","W","L","L","L"], streak: "L2", rating: 38 }, season: { played: 2, won: 0, lost: 2, drawn: 0, pts: 3, pf: 57, pa: 75, pd: -18, tries_for: 9, tries_against: 11, try_bonus: 2, loss_bonus: 1 } },
    "Wales": { elo: 1613, attack: { pts_pg: 28.6, tries_pg: 5.3, gl: 49, lb: 5, rs: 3.0, c22: 27, e22: 9.4, off: 11.7 }, defense: { tr: 85, missed: 31.2, to: 6.3, dom: 11, steals: 6.8, ob: 11.7 }, setpiece: { so: 96, ss: 0, lo: 96, ls: 5, ps: 0.6, maul: 46 }, kicking: { km: 750, goal: 74 }, discipline: { pen: 37, idx: 69 }, form: { last5: ["L","L","W","W","L"], last12: ["L","L","W","W","L"], streak: "L1", rating: 52 }, season: { played: 2, won: 1, lost: 1, drawn: 0, pts: 5, pf: 60, pa: 59, pd: 1, tries_for: 9, tries_against: 8, try_bonus: 1, loss_bonus: 0 } },
    "Italy": { elo: 1601, attack: { pts_pg: 14.8, tries_pg: 1.3, gl: 45, lb: 5, rs: 3.3, c22: 17, e22: 8.6, off: 11 }, defense: { tr: 89, missed: 23.3, to: 6.6, dom: 14, steals: 4.2, ob: 11 }, setpiece: { so: 100, ss: 11, lo: 93, ls: 3, ps: 1.4, maul: 58 }, kicking: { km: 840, goal: 90 }, discipline: { pen: 36, idx: 70 }, form: { last5: ["L","W","L","L","L"], last12: ["L","W","L","L","L"], streak: "L2", rating: 18 }, season: { played: 2, won: 0, lost: 2, drawn: 0, pts: 0, pf: 27, pa: 74, pd: -47, tries_for: 3, tries_against: 10, try_bonus: 0, loss_bonus: 0 } },
    "Fiji": { elo: 1632, attack: { pts_pg: 21, tries_pg: 2.8, gl: 47, lb: 14, rs: 3.6, c22: 27, e22: 5.6, off: 12.2 }, defense: { tr: 79, missed: 30, to: 8.8, dom: 11, steals: 5, ob: 31 }, setpiece: { so: 86, ss: 46, lo: 82, ls: 29, ps: 1.0, maul: 54 }, kicking: { km: 300, goal: 64 }, discipline: { pen: 107, idx: 39 }, form: { last5: ["L","L","W","L","L"], last12: ["L","L","W","L","L"], streak: "L2", rating: 22 }, season: { played: 2, won: 0, lost: 2, drawn: 0, pts: 0, pf: 32, pa: 112, pd: -80, tries_for: 4, tries_against: 17, try_bonus: 0, loss_bonus: 0 } },
    "Japan": { elo: 1547, attack: { pts_pg: 22.5, tries_pg: 2.7, gl: 47, lb: 9, rs: 3.9, c22: 25, e22: 5.1, off: 9.7 }, defense: { tr: 82, missed: 31, to: 7.4, dom: 9, steals: 2.5, ob: 33 }, setpiece: { so: 83, ss: 40, lo: 79, ls: 24, ps: 0.8, maul: 43 }, kicking: { km: 326, goal: 63 }, discipline: { pen: 98, idx: 38 }, form: { last5: ["L","W","L","W","L"], last12: ["L","W","L","W","L"], streak: "L1", rating: 35 }, season: { played: 2, won: 1, lost: 1, drawn: 0, pts: 4, pf: 47, pa: 46, pd: 1, tries_for: 5, tries_against: 6, try_bonus: 0, loss_bonus: 0 } }
  };

  // Update tournament: reset teams to R1+R2 baseline, set round=3, set data_url
  await sql`
    UPDATE tournaments 
    SET 
      teams = ${JSON.stringify(teams)}::jsonb,
      round = 3,
      data_url = 'https://www.rugbypass.com/nations-championship/fixtures-results/',
      updated_at = NOW()
    WHERE id = 'nc2026'
  `;

  res.status(200).json({
    success: true,
    matchesReset: resetMatches.length,
    matches: resetMatches.map(m => `${m.home_team} vs ${m.away_team}`),
    teamsReset: Object.keys(teams).length,
    message: 'NC2026 R3 reset to pre-match state. Hit Refresh Data to test extraction pipeline.'
  });
}
