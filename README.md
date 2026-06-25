# SportsMetrics

**AI-Powered Sports Analytics Platform for Professional Coaching**

SportsMetrics is a comprehensive analytics engine that uses machine learning algorithms, statistical models, and AI-powered data extraction to give coaches and analysts a competitive edge. The platform delivers match predictions, game plan generation, season simulations, and detailed performance analysis- the kind of intelligence previously available only to elite teams with dedicated data departments.

Currently live with **Rugby Union**, with architecture designed for gradual expansion into Football, Cricket, Basketball, and other sports as the platform grows.

---

## Features

### 🏆 Multi-Tournament Support
- **Super Rugby Pacific 2026**- Complete season data (verified from all.rugby + rugbypass.com)
- **Nations Championship 2026**- Pre-tournament baselines, ready for live data as games begin (July 4)
- **Rugby Championship 2026**- Pre-tournament baselines (starts August 2026)
- **Domestic/Custom Tournaments**- Add your own teams with manual data entry for local leagues

### 🧠 Analytics Engine (7 Algorithms)
| Algorithm | Purpose |
|-----------|---------|
| **Elo Rating System** | Quantifies team strength from match history |
| **Monte Carlo Simulation** | Projects season outcomes across 5,000 iterations |
| **Bayesian/Poisson Model** | Predicts match scores with confidence intervals |
| **Multi-Factor Win Probability** | Combines Elo + 8 performance dimensions |
| **Exponential Moving Average** | Detects form trends and momentum shifts |
| **Game Plan Engine (MCDA)** | Generates coaching strategies from performance gaps |
| **Bayesian Injury Risk** | Estimates player availability using position priors |

### 📊 Coach's Dashboard
- **Standings**- Live table with momentum indicators
- **Overview**- Team comparison with radar charts
- **Match Analysis**- Head-to-head metrics, score prediction, threat assessment, intelligence insights
- **Set Piece**- Scrum, lineout, and kicking detailed comparison
- **Game Plan**- Areas to improve, exploitable weaknesses, strategic recommendations, drill suggestions
- **Season Simulator**- Playoff odds, championship probability, projected positions
- **Players**- Key player profiles with injury risk assessment

### 🔄 AI-Powered Live Data Refresh
- Fetches real data from tournament websites via CORS proxy
- Sends content to Groq (Llama 3.3 70B) for structured extraction
- Parses ALL stats: tackles, scrums, lineouts, gainline, penalties, kicking, form- everything
- Smart merge: only overwrites existing data when AI finds real values (null = not found)
- Persists to IndexedDB- survives page reloads

### 💾 Persistent Database (IndexedDB)
- All tournament data persists in the browser via Dexie.js
- Custom/domestic team data saved across sessions
- Refresh history logged with timestamps and sources
- No server required- runs entirely in the browser

### 🌍 Multi-Sport Extensible Architecture
- Sport configuration layer defines metrics, labels, thresholds per sport
- Ready-to-implement configs for Football, Cricket, and Basketball already defined
- Analytics engine (Elo, Monte Carlo, form) is sport-agnostic- works for any team sport
- Add a new sport by creating a config + data file- no architecture changes needed
- **Roadmap:** Rugby Union → Football (Soccer) → Cricket → Basketball → more

---

## Sports Roadmap

| Sport | Status | Notes |
|-------|--------|-------|
| 🏉 Rugby Union | **Live** | Super Rugby, Nations Championship, Rugby Championship, Domestic |
| ⚽ Football | Config ready | Metrics defined (xG, possession, pass accuracy, clean sheets) |
| 🏏 Cricket | Config ready | Metrics defined (batting avg, economy, strike rate, dot ball %) |
| 🏀 Basketball | Config ready | Metrics defined (FG%, 3PT%, pace, offensive/defensive rating) |
| 🏈 NRL | Planned |- |
| 🏀 NetBall | Planned |- |

The architecture is sport-agnostic by design. Each sport needs only:
1. A metric configuration in `src/config/sports.js` (labels, thresholds, radar axes)
2. Tournament data files with team objects using those metrics
3. The analytics engine, database, and UI adapt automatically

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open `http://localhost:5173` in your browser.

### First-Time Setup
1. Clear IndexedDB if you have stale data: DevTools → Application → IndexedDB → Delete "SportsMetricsDB"
2. Click **AI Settings** in the sidebar
3. Get a free API key from [console.groq.com](https://console.groq.com) (no credit card needed)
4. Paste the key and save
5. Click **Refresh Data** on any tournament to pull live stats

---

## Project Structure

```
src/
├── analytics/              # ML/statistics engine
│   ├── elo.js              # Elo rating system
│   ├── monteCarlo.js       # Season simulation (5000 iterations)
│   ├── bayesian.js         # Poisson score prediction + form EMA
│   ├── gamePlan.js         # Coach's strategic recommendation engine
│   └── index.js            # Unified exports
├── components/             # Reusable UI components
│   ├── Sidebar.jsx         # Navigation + tournament list
│   ├── StandingsTable.jsx  # League table with momentum
│   ├── MatchAnalysis.jsx   # H2H comparison, threats, intelligence
│   ├── SeasonSimulator.jsx # Monte Carlo projection UI
│   ├── RadarChart.jsx      # Canvas-based performance radar
│   ├── TeamSelector.jsx    # Team picker dropdown
│   └── Settings.jsx        # AI provider configuration
├── config/
│   └── sports.js           # Multi-sport metric definitions
├── data/                   # Tournament datasets
│   ├── teamFactory.js      # Sport-aware team object creator
│   ├── superRugby2026.js   # Verified Super Rugby Pacific data
│   ├── nationsChampionship2026.js  # Nations Championship baseline
│   ├── rugbyChampionship2026.js    # Rugby Championship baseline
│   └── index.js
├── db/
│   └── index.js            # Dexie.js IndexedDB layer
├── pages/
│   ├── TournamentDashboard.jsx  # Main tournament view (7 tabs)
│   ├── DomesticTournament.jsx   # Custom tournament manager
│   └── AnalyticsTheory.jsx      # Algorithm explanations
├── services/
│   └── dataFetcher.js      # AI-powered web scraping + data extraction
├── styles/
│   └── theme.js            # Design system tokens
├── App.jsx                 # Root component + DB initialization
├── main.jsx                # Entry point
└── index.css               # Global styles
```

---

## Data Sources

| Tournament | Source | What's Verified |
|------------|--------|-----------------|
| Super Rugby Pacific 2026 | all.rugby, rugbypass.com, super.rugby | Standings ✓, Form ✓, Top team stats ✓ |
| Nations Championship 2026 | sixnationsrugby.com, sofascore.com | Rankings ✓, Six Nations form ✓ |
| Rugby Championship 2026 | world.rugby, sofascore.com | Rankings ✓, Nov 2025 form ✓ |

Performance stats (scrum %, lineout %, tackle rate, etc.) for teams without verified public data use proportional estimates based on team strength and historical profile. These are replaced with real data when you refresh after games are played.

---

## How Refresh Works

```
Click "Refresh Data"
    → Fetch webpage from tournament URL (via CORS proxy)
    → Send HTML to Groq AI (Llama 3.3 70B)
    → AI extracts structured JSON (all stats, NULL for unknowns)
    → Merge: only overwrite where AI found real data
    → Save to IndexedDB
    → UI recalculates all analytics instantly
```

Supported AI providers:
- **Groq** (recommended)- Free tier, Llama 3.3 70B, fast inference
- **Groq SpecDec**- Same model, speculative decoding (fastest)
- **OpenRouter**- Free Llama 3.1 8B option

---

## Technology Stack

- **React 19**- UI framework
- **Vite**- Build tool
- **Dexie.js**- IndexedDB wrapper for persistence
- **Recharts**- Data visualization (available for future charts)
- **Lucide React**- Icons
- **Canvas API**- Custom radar charts
- **Groq API**- AI-powered data extraction

---

## For Coaches

This platform is designed as a **coach's brain**- select your team, pick an opponent, and get:

1. **Win probability** with the specific factors driving it
2. **Areas to work on** ranked by impact on your win chance
3. **Opponent weaknesses** to exploit with specific tactics
4. **Strategic recommendations** tailored to the matchup
5. **Risk factors** including player injury concerns
6. **Score prediction** with try distributions
7. **Season projections** showing your playoff chances

The Domestic Tournament feature lets any team- from provincial to school level- access the same analytical tools as international coaches by entering their own data.

---

## License

Private- commercial use intended.

---

*SportsMetrics v1.0- Rugby Union live. More sports coming soon.*
