/**
 * Server-Sent Events (SSE) Endpoint
 * 
 * GET /api/events?since=2026-07-11T00:00:00Z
 * 
 * Returns new events since the given timestamp as an SSE stream.
 * The client connects with EventSource and receives real-time updates
 * when matches complete, standings change, etc.
 * 
 * Falls back to a single JSON response if SSE isn't practical
 * (Vercel serverless has a 30s timeout, so we do a long-poll style).
 */

import { getEventsSince } from './lib/db.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const since = req.query.since || new Date(Date.now() - 3600000).toISOString(); // default: last hour
  const mode = req.query.mode || 'poll'; // 'poll' (default) or 'stream'

  try {
    const events = await getEventsSince(since);

    if (mode === 'stream') {
      // SSE mode - send as event stream
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      for (const event of events) {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event.payload)}\n`);
        res.write(`id: ${event.id}\n\n`);
      }

      // Keep alive for a bit to catch new events (up to 25s)
      const deadline = Date.now() + 25000;
      const interval = setInterval(async () => {
        if (Date.now() > deadline) {
          clearInterval(interval);
          res.end();
          return;
        }
        // Check for new events
        const latest = events.length > 0 
          ? events[events.length - 1].created_at 
          : since;
        const newEvents = await getEventsSince(latest);
        for (const event of newEvents) {
          res.write(`event: ${event.type}\n`);
          res.write(`data: ${JSON.stringify(event.payload)}\n`);
          res.write(`id: ${event.id}\n\n`);
          events.push(event);
        }
      }, 3000);

      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    } else {
      // Poll mode - return JSON array of events
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json({
        events: events.map(e => ({
          id: e.id,
          type: e.type,
          payload: e.payload,
          timestamp: e.created_at,
        })),
        since,
        count: events.length,
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
