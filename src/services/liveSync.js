/**
 * Live Sync Service
 * 
 * Connects the client to the server-side event stream.
 * When a match completes (detected by the cron job), the server publishes
 * an event. This service picks it up and updates the local UI.
 * 
 * Architecture:
 * - On mount: fetch latest tournament data from /api/tournaments
 * - Poll /api/events every 30s for new events (match_completed, etc.)
 * - When event received: refresh local IndexedDB cache from server
 * 
 * This replaces the "manual refresh only" pattern with automatic updates
 * while keeping IndexedDB as a fast offline cache.
 */

const API_BASE = '/api';
const POLL_INTERVAL = 30000; // 30 seconds

let pollTimer = null;
let lastEventTime = new Date(Date.now() - 3600000).toISOString();
let listeners = [];

/**
 * Subscribe to live events
 * @param {function} callback - Called with event data when something happens
 * @returns {function} Unsubscribe function
 */
export function onLiveEvent(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners(event) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (e) {
      console.warn('Live event listener error:', e);
    }
  }
}

/**
 * Fetch tournament data from the shared server
 * Falls back gracefully if server is not set up yet (no DATABASE_URL)
 */
export async function fetchFromServer(tournamentId) {
  try {
    const res = await fetch(`${API_BASE}/tournaments?id=${tournamentId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Server not available (no DB configured yet) - fall back to local data
    return null;
  }
}

/**
 * Poll for new events from the server
 */
async function pollEvents() {
  try {
    const res = await fetch(`${API_BASE}/events?since=${encodeURIComponent(lastEventTime)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;

    const data = await res.json();
    if (data.events && data.events.length > 0) {
      for (const event of data.events) {
        notifyListeners(event);
        lastEventTime = event.timestamp;
      }
    }
  } catch {
    // Server not available - silent fail, try again next interval
  }
}

/**
 * Start live sync polling
 */
export function startLiveSync() {
  if (pollTimer) return; // Already running
  
  // Initial poll
  pollEvents();
  
  // Schedule recurring polls
  pollTimer = setInterval(pollEvents, POLL_INTERVAL);
}

/**
 * Stop live sync polling
 */
export function stopLiveSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Check if the server-side backend is available
 * (graceful degradation if DATABASE_URL isn't configured yet)
 */
export async function isServerAvailable() {
  try {
    const res = await fetch(`${API_BASE}/tournaments`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default { onLiveEvent, fetchFromServer, startLiveSync, stopLiveSync, isServerAvailable };
