/**
 * Seed Database
 * 
 * POST /api/seed
 * Pushes the current hardcoded tournament data into Postgres.
 * Run once after setting up your Neon database.
 * 
 * Protected by CRON_SECRET.
 */

import { initSchema, upsertTournament, upsertMatch } from './lib/db.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const auth = req.headers['authorization']?.replace('Bearer ', '') || req.query.secret;
  if (auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Init schema first
    await initSchema();

    // Import tournament data dynamically (these are ES modules)
    // We'll accept the tournament data in the request body for flexibility
    const { tournament, matches } = req.body || {};

    if (!tournament) {
      return res.status(400).json({ 
        error: 'Send tournament data in request body',
        example: 'POST with { tournament: { id, name, teams, ... }, matches: [...] }'
      });
    }

    const result = await upsertTournament(tournament);

    // Seed matches if provided
    let matchCount = 0;
    if (Array.isArray(matches)) {
      for (const m of matches) {
        await upsertMatch(m);
        matchCount++;
      }
    }

    res.status(200).json({ 
      success: true, 
      tournament: result,
      matchesSeeded: matchCount,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
