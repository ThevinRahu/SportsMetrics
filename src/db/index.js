/**
 * SportsMetrics Database Layer
 * 
 * Uses Dexie.js (IndexedDB wrapper) for persistent in-browser storage.
 * 
 * Why IndexedDB over localStorage:
 * - No 5MB limit (can store hundreds of MB)
 * - Structured data with indexes for fast queries
 * - Async/non-blocking operations
 * - Survives page reloads, browser restarts
 * - Supports complex objects (no JSON.stringify needed)
 * 
 * Schema:
 * - tournaments: All tournament metadata + team data
 * - refreshLogs: History of data refreshes
 * - customTournaments: User-created domestic tournaments
 */

import Dexie from 'dexie';

const db = new Dexie('SportsMetricsDB');

// Version 2: data corrections June 2026
db.version(2).stores({
  // Primary key is tournament id, indexed by name and season
  tournaments: 'id, name, season, sport, status, lastRefresh',
  // Refresh history
  refreshLogs: '++id, tournamentId, timestamp, success, source',
  // User-created domestic tournaments
  customTournaments: 'id, name, sport, createdAt',
});

export default db;

/**
 * Save/update tournament data (including all teams)
 */
export async function saveTournament(tournament) {
  if (!tournament || !tournament.id) return;
  await db.tournaments.put({
    ...tournament,
    lastRefresh: new Date().toISOString(),
    savedAt: new Date().toISOString(),
  });
}

/**
 * Get a tournament by id
 */
export async function getTournament(id) {
  return db.tournaments.get(id);
}

/**
 * Get all tournaments
 */
export async function getAllTournaments() {
  return db.tournaments.toArray();
}

/**
 * Save custom/domestic tournament
 */
export async function saveCustomTournament(tournament) {
  if (!tournament || !tournament.id) return;
  await db.customTournaments.put({
    ...tournament,
    savedAt: new Date().toISOString(),
  });
}

/**
 * Get all custom tournaments
 */
export async function getAllCustomTournaments() {
  return db.customTournaments.toArray();
}

/**
 * Update a custom tournament
 */
export async function updateCustomTournament(id, data) {
  await db.customTournaments.update(id, { ...data, savedAt: new Date().toISOString() });
}

/**
 * Delete a custom tournament
 */
export async function deleteCustomTournament(id) {
  await db.customTournaments.delete(id);
}

/**
 * Log a refresh attempt
 */
export async function logRefresh(tournamentId, success, source, details = "") {
  await db.refreshLogs.add({
    tournamentId,
    timestamp: new Date().toISOString(),
    success,
    source,
    details,
  });
}

/**
 * Get refresh history for a tournament
 */
export async function getRefreshHistory(tournamentId, limit = 10) {
  return db.refreshLogs
    .where('tournamentId')
    .equals(tournamentId)
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Clear all data (reset)
 */
export async function clearAll() {
  await db.tournaments.clear();
  await db.refreshLogs.clear();
  await db.customTournaments.clear();
}
