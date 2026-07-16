/**
 * Server-side database layer - Neon Postgres (free tier)
 * 
 * This is the shared, canonical data store. IndexedDB on the client
 * acts as a cache/offline layer on top of this.
 * 
 * Schema:
 * - tournaments: tournament metadata + JSON team data
 * - matches: individual match results with stats
 * - refresh_logs: history of auto/manual refreshes
 * - events: SSE event queue for real-time push
 * 
 * Setup: Create a Neon project at https://neon.tech (free tier)
 * and set DATABASE_URL in Vercel environment variables.
 */

import { neon } from '@neondatabase/serverless';

let sql;

function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Create a free Neon database at https://neon.tech and add the connection string to Vercel env vars.');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

/**
 * Initialize database tables (run once on first deploy)
 */
export async function initSchema() {
  const db = getDb();
  
  await db`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      season INTEGER,
      sport TEXT DEFAULT 'rugby',
      status TEXT DEFAULT 'in-progress',
      round INTEGER DEFAULT 1,
      total_rounds INTEGER DEFAULT 6,
      data_version INTEGER DEFAULT 1,
      teams JSONB NOT NULL DEFAULT '{}',
      fixtures JSONB DEFAULT '[]',
      results JSONB DEFAULT '[]',
      pools JSONB DEFAULT '{}',
      highlights TEXT,
      source TEXT,
      data_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      tournament_id TEXT REFERENCES tournaments(id),
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'scheduled',
      round INTEGER,
      match_date DATE,
      stats JSONB DEFAULT '{}',
      source TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tournament_id, home_team, away_team, round)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS refresh_logs (
      id SERIAL PRIMARY KEY,
      tournament_id TEXT,
      source TEXT,
      success BOOLEAN DEFAULT false,
      matches_found INTEGER DEFAULT 0,
      teams_updated INTEGER DEFAULT 0,
      error TEXT,
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Index for efficient SSE polling
  await db`
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC)
  `;

  // Index for match status checks
  await db`
    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status, match_date)
  `;

  return { success: true };
}

/**
 * Upsert tournament data
 */
export async function upsertTournament(tournament) {
  const db = getDb();
  const result = await db`
    INSERT INTO tournaments (id, name, season, sport, status, round, total_rounds, data_version, teams, fixtures, results, pools, highlights, source, data_url, updated_at)
    VALUES (
      ${tournament.id},
      ${tournament.name},
      ${tournament.season || null},
      ${tournament.sport || 'rugby'},
      ${tournament.status || 'in-progress'},
      ${tournament.round || 1},
      ${tournament.totalRounds || 6},
      ${tournament.dataVersion || 1},
      ${JSON.stringify(tournament.teams || {})},
      ${JSON.stringify(tournament.fixtures || [])},
      ${JSON.stringify(tournament.results || [])},
      ${JSON.stringify(tournament.pools || {})},
      ${tournament.highlights || null},
      ${tournament.source || null},
      ${tournament.dataUrl || null},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      season = EXCLUDED.season,
      status = EXCLUDED.status,
      round = EXCLUDED.round,
      data_version = EXCLUDED.data_version,
      teams = EXCLUDED.teams,
      fixtures = EXCLUDED.fixtures,
      results = EXCLUDED.results,
      pools = EXCLUDED.pools,
      highlights = EXCLUDED.highlights,
      source = EXCLUDED.source,
      updated_at = NOW()
    RETURNING id, updated_at
  `;
  return result[0];
}

/**
 * Get tournament by ID
 */
export async function getTournament(id) {
  const db = getDb();
  const result = await db`SELECT * FROM tournaments WHERE id = ${id}`;
  return result[0] || null;
}

/**
 * Get all tournaments
 */
export async function getAllTournaments() {
  const db = getDb();
  return db`SELECT id, name, season, sport, status, round, total_rounds, data_version, highlights, source, updated_at FROM tournaments ORDER BY updated_at DESC`;
}

/**
 * Upsert a match result
 */
export async function upsertMatch(match) {
  const db = getDb();
  const result = await db`
    INSERT INTO matches (tournament_id, home_team, away_team, home_score, away_score, status, round, match_date, stats, source)
    VALUES (
      ${match.tournamentId},
      ${match.homeTeam},
      ${match.awayTeam},
      ${match.homeScore || null},
      ${match.awayScore || null},
      ${match.status || 'scheduled'},
      ${match.round || null},
      ${match.date || null},
      ${JSON.stringify(match.stats || {})},
      ${match.source || null}
    )
    ON CONFLICT (tournament_id, home_team, away_team, round) DO UPDATE SET
      home_score = COALESCE(EXCLUDED.home_score, matches.home_score),
      away_score = COALESCE(EXCLUDED.away_score, matches.away_score),
      status = EXCLUDED.status,
      stats = CASE WHEN EXCLUDED.stats::text != '{}' THEN EXCLUDED.stats ELSE matches.stats END,
      source = EXCLUDED.source,
      updated_at = NOW()
    RETURNING id, status
  `;
  return result[0];
}

/**
 * Get matches needing status check (scheduled/live for today)
 */
export async function getLiveOrScheduledMatches() {
  const db = getDb();
  return db`
    SELECT * FROM matches 
    WHERE status IN ('scheduled', 'live') 
    AND match_date <= CURRENT_DATE
    ORDER BY match_date, round
  `;
}

/**
 * Publish an event for SSE consumers
 */
export async function publishEvent(type, payload) {
  const db = getDb();
  const result = await db`
    INSERT INTO events (type, payload) 
    VALUES (${type}, ${JSON.stringify(payload)})
    RETURNING id, created_at
  `;
  return result[0];
}

/**
 * Get events since a timestamp (for SSE polling)
 */
export async function getEventsSince(since) {
  const db = getDb();
  return db`
    SELECT * FROM events 
    WHERE created_at > ${since}
    ORDER BY created_at ASC
    LIMIT 50
  `;
}

/**
 * Log a refresh attempt
 */
export async function logRefresh(log) {
  const db = getDb();
  return db`
    INSERT INTO refresh_logs (tournament_id, source, success, matches_found, teams_updated, error, duration_ms)
    VALUES (${log.tournamentId}, ${log.source}, ${log.success}, ${log.matchesFound || 0}, ${log.teamsUpdated || 0}, ${log.error || null}, ${log.durationMs || 0})
  `;
}

export default { initSchema, upsertTournament, getTournament, getAllTournaments, upsertMatch, getLiveOrScheduledMatches, publishEvent, getEventsSince, logRefresh };
