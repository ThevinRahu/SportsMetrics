# SportsMetrics — Server Backend Setup

## Architecture (Post-Upgrade)

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENT (React + ONNX in-browser)                             │
│  IndexedDB = offline cache                                   │
│  Reads from /api/tournaments (shared source of truth)        │
│  Polls /api/events for live updates                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ VERCEL SERVERLESS FUNCTIONS                                  │
│                                                              │
│  /api/tournaments     - GET/POST tournament data             │
│  /api/extract-stats   - Server-side AI extraction (Groq)     │
│  /api/events          - SSE/poll endpoint for live updates   │
│  /api/cron/check-matches - Scheduled match status checker    │
│  /api/proxy           - CORS proxy (existing)                │
│  /api/db-init         - Schema initialization                │
│  /api/seed            - Seed data into Postgres              │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ NEON POSTGRES (Free Tier)                                    │
│  tournaments, matches, refresh_logs, events                  │
│  Shared source of truth for ALL clients                      │
└──────────────────────────────────────────────────────────────┘
```

## Setup Steps (All Free Tier)

### 1. Create Neon Database (2 minutes)

1. Go to https://neon.tech and sign up (free, no credit card)
2. Create a new project (name: "sportsmetrics")
3. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)

### 2. Add Environment Variables to Vercel

In your Vercel project settings → Environment Variables, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | From Neon dashboard |
| `GROQ_API_KEY` | `gsk_...` | Your Groq API key (free at console.groq.com) |
| `CRON_SECRET` | `any-random-string` | Protects admin endpoints |

### 3. Initialize Database

After deploying, call the init endpoint:

```bash
curl -X POST https://sports-metrics.vercel.app/api/db-init \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Seed Tournament Data

```bash
curl -X POST https://sports-metrics.vercel.app/api/seed \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tournament": {"id": "nc2026", "name": "Nations Championship", ...}}'
```

Or use the admin script (coming soon) to push local data to server.

### 5. Verify

- `GET /api/tournaments` → should return seeded data
- `GET /api/events?since=2024-01-01` → should return empty events array
- The cron job runs every 6 hours automatically (on Vercel Hobby, upgrade to Pro for more frequent)

## How Auto-Refresh Works

```
Every 6 hours (Vercel Cron):
  /api/cron/check-matches runs
    → Queries Postgres for matches with status = 'scheduled' or 'live'
    → For each: hits rugbypass.com to check if "Full Time" appears
    → If match completed:
        → Updates match record in Postgres
        → Publishes "match_completed" event
        
Every 30 seconds (client poll):
  Client calls /api/events?since=<last_check>
    → If new "match_completed" event exists:
        → Client fetches fresh data from /api/tournaments
        → Updates local IndexedDB cache
        → UI re-renders with new data (no manual refresh needed)
```

## Upgrade Path

| Need | Solution | Cost |
|------|----------|------|
| More frequent cron (every 5 min during matches) | Vercel Pro | $20/mo |
| OR: External scheduler hitting your endpoint | cron-job.org / GitHub Actions | Free |
| True real-time push (instant, not 30s poll) | Pusher/Ably/Supabase Realtime | Free tier available |
| Official live data feed (sub-second) | Sportradar Rugby API | $$ (enterprise) |

## Security Improvements Made

1. **Groq API key moved server-side** → `GROQ_API_KEY` env var, never exposed to browser
2. **CRON_SECRET protects admin endpoints** → write operations require auth
3. **Domain allowlist maintained** → proxy only hits approved rugby domains
4. **No client-side secrets** → localStorage no longer stores API keys for new users
   (existing `sm_ai_key` in localStorage still works as fallback for backward compat)
