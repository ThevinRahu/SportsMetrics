/**
 * Tournament Data API
 * 
 * GET /api/tournaments - List all tournaments
 * GET /api/tournaments?id=nc2026 - Get specific tournament
 * POST /api/tournaments - Upsert tournament data (protected)
 * 
 * This is the shared source of truth. Every client reads from here.
 * IndexedDB on the client acts as a cache for offline/fast access.
 */

import { getTournament, getAllTournaments, upsertTournament } from './lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        const tournament = await getTournament(id);
        if (!tournament) {
          return res.status(404).json({ error: `Tournament ${id} not found` });
        }
        return res.status(200).json(tournament);
      }
      
      const tournaments = await getAllTournaments();
      return res.status(200).json(tournaments);
    }

    if (req.method === 'POST') {
      // Protected: only server/admin can write
      const auth = req.headers['authorization']?.replace('Bearer ', '');
      if (auth !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tournament = req.body;
      if (!tournament || !tournament.id) {
        return res.status(400).json({ error: 'Tournament must have an id' });
      }

      const result = await upsertTournament(tournament);
      return res.status(200).json({ success: true, ...result });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
