# SportsMetrics

**AI & ML-Powered Sports Analytics Platform for Professional Coaching**

SportsMetrics uses real machine learning models, statistical algorithms, and AI-powered data extraction to deliver match predictions, tactical game plans, and season projections. Built for coaches who need data-driven decisions - not guesswork.

Currently live with **Rugby Union**. Architecture designed for gradual expansion into Football, Cricket, Basketball, and other sports.

**Live:** https://sports-metrics.vercel.app

---

## Architecture

```
Browser (React + ONNX inference)
    |
    v
/api/tournaments (Neon Postgres - shared source of truth)
/api/matches (H2H history from Postgres)
/api/extract-stats (server-side Groq AI extraction)
/api/events (SSE/poll - real-time match updates)
/api/cron/check-matches (Crawl4AI + auto-refresh on match completion)
/api/proxy (CORS relay for rugby data sources)
    |
    v
Neon Postgres (free tier) - tournaments, matches, events, refresh_logs
    |
    v
Crawl4AI (renders JS pages, extracts stats from SPAs like rugbypass)
```

**Data flow:** Neon Postgres -> `/api/tournaments` -> React state -> IndexedDB (offline cache)

All clients see the same data. Updates propagate automatically when matches complete.

---

## Machine Learning Models

| Model | Type | Training Data | What it predicts |
|-------|------|---------------|-----------------|
| **ONNX GradientBoostingClassifier** | Pre-trained (scikit-learn) | 1666 samples | Win probability |
| **ONNX GradientBoostingRegressor** | Pre-trained (scikit-learn) | 1666 samples | Expected margin & score |
| **JS Gradient Boosted Trees** | Trains at runtime | Tournament data | Win prob + feature importance |
| **JS Random Forest** | Trains at runtime | Tournament data | Confidence intervals |

### Training Data Sources
- **187 verified matches** from Super Rugby Pacific 2025/2026, Six Nations 2026, Nations Championship 2026 (R1-R3), Rugby Championship 2025 (exact team stats from all.rugby, rugbypass.com)
- **673 matches from rugbypy** across Top 14, URC, Premiership, Japan League One, Sevens, and international competitions - with real per-match stats
- **120 teams** total with real rugby metrics
- **Recency-weighted training** - recent matches weighted 3-4x more than older data via exponential decay (240-day half-life)

### 17 Input Features (what drives predictions)
| # | Feature | Source Stat | Importance |
|---|---------|-------------|------------|
| 1 | Elo Rating Gap | Overall team quality | ~22% |
| 2 | Gainline Advantage | Gainline success % | ~3% |
| 3 | Tackle Efficiency | Tackle rate % | ~3% |
| 4 | Scrum Dominance | Scrum success % | ~4% |
| 5 | Lineout Control | Lineout success % | ~5% |
| 6 | Kicking Accuracy | Goal kick % | ~5% |
| 7 | Form & Momentum | EMA over last 10-12 results | ~17% |
| 8 | Discipline Edge | Penalties conceded | ~6% |
| 9 | Scoring Rate | Points per game | ~9% |
| 10 | Turnover Threat | Turnovers won/game | ~5% |
| 11 | Line Break Power | Line breaks/game | ~6% |
| 12 | Defensive Pressure | Missed tackles/game | ~5% |
| 13 | Maul Dominance | Maul success % | ~3% |
| 14 | Kick Metres Edge | Kick metres/game | ~3% |
| 15 | Ruck Speed | Ruck recycling tempo | ~2% |
| 16 | Scrum Pressure | Scrum penalties/game | ~2% |
| 17 | Venue | Home (+0.5) / Away (-0.5) / Neutral (0) | ~9% |

### How Prediction Works
1. User selects two teams + venue
2. Browser computes 13 feature differences from team stats
3. ONNX classifier (200-tree GBT) returns win probability
4. ONNX regressor (100-tree GBT) returns expected margin
5. Scores derived from margin + teams' average scoring rates

### Retrain Models
```bash
pip install scikit-learn skl2onnx onnx numpy onnxruntime rugbypy
python ml/fetch_all_stats.py    # Fetch latest stats from rugbypy (optional)
python ml/fetch_and_train.py    # Train and export ONNX models (reports honest accuracy)
python ml/sanity_check.py       # Verify predictions are sane
```

### Model Accuracy Note
The training script reports three accuracy metrics:
1. **Standard 5-Fold CV** — 61.1% (optimistic — mirrored rows can leak across folds)
2. **GroupKFold CV** — 61.9% (honest — both perspectives of a match stay in the same fold)
3. **Temporal Holdout** — **57.1%** (most honest — train on pre-2026 data, test only on 2026 matches)

The temporal holdout is the number to trust for real-world predictive power. The model genuinely predicts the correct winner ~57% of the time on unseen future matches — above the 50% coin-flip baseline, and in line with the inherent variance of rugby (even bookmakers sit around 60-65% on outright winner calls with far more data). For a coaching-analytics tool showing relative probabilities and game plans, this is a useful directional signal — not a crystal ball, and never claimed to be one.

---

## Features

### Tournaments
- **Nations Championship 2026** - Live (Round 2 complete, R3 July 19)
- **Super Rugby Pacific 2026** - Complete verified data
- **Rugby Championship 2026** - Pre-tournament (starts Aug)
- **Domestic/Custom** - Manual data entry for any level

### ML Prediction Panel
- **Win Probability** - From ONNX GradientBoostedTrees (trained on real stats)
- **Expected Margin** - From ONNX regressor
- **Predicted Score** - ML margin + team scoring averages
- **Key Factors** - Which metrics are driving THIS specific prediction
- **Model Confidence** - Tree vote variance

### Match Analysis
- Head-to-head metric comparison bars
- Performance radar chart
- Predicted score (consistent with win probability)
- Opponent threat assessment
- Tactical intelligence insights
- **Momentum charts** - Form trajectory over last 10 matches
- **H2H history** - Past meetings with win record and scores

### Game Plan
- Areas to improve (ranked by priority)
- Exploitable opponent weaknesses
- **ML Keys to Win** - Sensitivity analysis showing where improvement matters most
- Strategic recommendations and risk factors
- Drill suggestions

### Season Simulator
- Monte Carlo projection (5000 iterations)
- Playoff odds, championship probability
- Average projected position

### Venue Toggle
- Home / Away / Neutral selection
- ONNX model natively handles venue (up to 50% prediction swing)
- Affects win probability, margin, and scores

### Auto-Refresh (Crawl4AI + Server-Side)
- Cron checks rugbypass match pages via Crawl4AI (renders JS, extracts from SPA)
- Detects match completion (Full Time), extracts scores + all stats
- Full recompute: standings, Elo, form, team profile stats blended
- Publishes `match_completed` events to Postgres
- Clients poll `/api/events` every 30s and auto-update UI
- Refresh Data button triggers the same server-side pipeline
- Only processes matches not already marked final (no re-extraction)

### AI Data Extraction (5-Stage Pipeline)
1. **Source Router** - Routes to correct page (match-center for stats, index for standings)
2. **Content Chunker** - Non-destructive HTML cleaning, section-aware chunking
3. **LLM Extraction** - Server-side Groq with field-specific hints
4. **Zod Validation** - Schema validation, quality scoring, fail loudly on bad data
5. **Merge & Persist** - Write to Neon Postgres with provenance

### Database
- **Neon Postgres** (shared source of truth) - all clients see same data
- **IndexedDB** (client cache) - offline access, fast loads
- Hardcoded JS files as last-resort fallback only

---

## Analytics Algorithms

| Algorithm | Used for | Why |
|-----------|----------|-----|
| **Gradient Boosted Trees** | Win probability, key factors | Best for tabular data, interpretable |
| **Random Forest** | Margin prediction, confidence | Robust, gives uncertainty via tree variance |
| **ONNX Runtime (WASM)** | Production inference | Real scikit-learn models in browser at native speed |
| **Monte Carlo** | Season projections | Models uncertainty across remaining fixtures |
| **Sensitivity Analysis** | Keys to Win | SHAP-like - shows which improvement gives biggest boost |
| **Exponential Moving Average** | Form / momentum (last 10-12) | Captures direction + recency without hard cutoffs |
| **Poisson Distribution** | Try scoring distributions | Statistically correct for discrete scoring events |
| **Elo with Season Regression** | Team strength baseline | 30% regression-to-mean at season boundaries |
| **Recency-Weighted Training** | ML model stability | 240-day half-life decay on sample weights |

---

## Recency-Weighted Analytics

The system uses a two-tier data model:

**Tier 1 - Canonical Ledger (Postgres `matches` table)**
- Immutable, never deleted
- Full history, all seasons
- Used for ML training with sample-weight exponential decay
- Volume improves model stability

**Tier 2 - Live Form Projection (team profiles)**
- Recomputed on every match completion
- Rolling EMA over last 10-12 games (alpha = 0.30)
- Elo with season regression (30% pull-to-mean at season boundaries)
- This is what predictions read from

Old matches aren't deleted - they're weighted less. This gives the effect of "only use recent games" without starving the ML model of training volume or creating artificial cliff-edges.

---

## Quick Start

```bash
npm install
npm run dev
```

### First-time setup:
1. Open http://localhost:5173
2. Click **AI Settings** - add free Groq API key from [console.groq.com](https://console.groq.com)
3. Click **Refresh Data** to pull live stats

### Deploy:
```bash
npm run build
vercel --prod
```

### Server Backend Setup:
See [SETUP.md](./SETUP.md) for Neon Postgres + environment variable configuration.

---

## Project Structure

```
src/
├── analytics/               # ML + statistical engine
│   ├── mlEngine.js          # ONNX + Gradient Boosting + Random Forest
│   ├── bayesian.js          # Score prediction, Poisson, EMA, formEMAExtended
│   ├── gamePlan.js          # Tactical recommendations + sensitivity analysis
│   ├── monteCarlo.js        # Season simulator (5000 iterations)
│   └── elo.js               # Elo rating + season regression
├── components/              # UI
│   ├── MatchAnalysis.jsx    # H2H comparison + ML panel
│   ├── MatchCharts.jsx      # Momentum chart + H2H history
│   ├── StandingsTable.jsx   # League table with momentum
│   ├── SeasonSimulator.jsx  # Monte Carlo projections
│   ├── RadarChart.jsx       # Performance radar
│   ├── Settings.jsx         # AI provider config
│   └── Sidebar.jsx          # Navigation
├── config/
│   └── sports.js            # Multi-sport metric definitions
├── data/
│   ├── matchHistory.js      # Real match results (NC, SR, 6N, RC)
│   ├── teamFactory.js       # Team schema (includes form.last12)
│   ├── superRugby2026.js    # Verified team data
│   ├── nationsChampionship2026.js
│   └── rugbyChampionship2026.js
├── db/
│   └── index.js             # IndexedDB (Dexie) - client-side cache
├── services/
│   ├── dataFetcher.js       # 5-stage extraction pipeline
│   ├── sourceRouter.js      # URL routing (match-center vs standings)
│   ├── contentChunker.js    # Non-destructive HTML chunking
│   ├── extractionPrompts.js # AI field hints for reliable extraction
│   ├── statsValidator.js    # Zod schema validation
│   └── liveSync.js          # SSE/poll client for real-time updates
├── pages/
│   ├── TournamentDashboard.jsx
│   ├── DomesticTournament.jsx
│   └── AnalyticsTheory.jsx
api/
├── proxy.js                 # CORS proxy (domain allowlist)
├── tournaments.js           # GET/POST tournament data from Neon
├── extract-stats.js         # Server-side AI extraction (Groq key safe)
├── events.js                # SSE/poll endpoint for live updates
├── seed.js                  # Seed data into Postgres
├── db-init.js               # Schema initialization
├── lib/
│   └── db.js                # Neon Postgres client + queries
└── cron/
    └── check-matches.js     # Auto-refresh on match completion
ml/
├── fetch_all_stats.py       # Fetch per-match stats from rugbypy API
├── fetch_and_train.py       # Recency-weighted training + ONNX export
├── sanity_check.py          # Validate ONNX predictions
├── rugbypy_matches.json     # 682 match results
└── rugbypy_team_stats.json  # 1363 per-match stat records
public/model/
├── win_classifier.onnx      # GBT 200 trees, 57% temporal holdout accuracy
└── margin_regressor.onnx    # GBT 200 trees, R²=0.475
```

---

## Data Sources

| Source | What | Verified |
|--------|------|----------|
| rugbypass.com | Per-match stats (tackles, carries, scrums, lineouts) | Yes |
| all.rugby | Match results + standings | Yes |
| sixnationsrugby.com | Six Nations 2026 results | Yes |
| rugbypy (API) | 1363 per-match stat records across 120 teams | Yes |
| sofascore.com | World Rugby rankings | Yes |
| super.rugby | Official competition stats | Yes |

---

## Sports Roadmap

| Sport | Status |
|-------|--------|
| Rugby Union | **Live** |
| Football | Config ready |
| Cricket | Config ready |
| Basketball | Config ready |

---

## Technology Stack

- React 19 + Vite 8
- ONNX Runtime Web (WebAssembly ML inference)
- scikit-learn (model training - GBT + recency-weighted)
- Neon Postgres (shared backend - free tier)
- Zod (schema validation)
- Dexie.js (IndexedDB client cache)
- Crawl4AI (headless browser rendering for JS-heavy pages)
- Groq API (server-side AI extraction)
- Vercel (hosting + cron + serverless functions)

---

## License

Private - commercial use intended.

*SportsMetrics v2.1 - Server-backed architecture with Crawl4AI auto-refresh, recency-weighted 17-feature ML, and 5-stage extraction pipeline.*
