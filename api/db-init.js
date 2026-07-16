/**
 * Database initialization endpoint
 * 
 * POST /api/db-init
 * Creates all tables in Neon Postgres. Safe to call multiple times (IF NOT EXISTS).
 * Protected by CRON_SECRET.
 */

import { initSchema } from './lib/db.js';

export default async function handler(req, res) {
  // Allow GET for easy browser testing during setup, but protect with secret
  const secret = req.headers['authorization']?.replace('Bearer ', '') || req.query.secret;
  
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await initSchema();
    res.status(200).json({ message: 'Database schema initialized', ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
