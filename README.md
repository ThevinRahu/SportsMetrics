# SportsMetrics

**AI & ML-Powered Sports Analytics Platform for Professional Coaching**

SportsMetrics uses real machine learning models, statistical algorithms, and AI-powered data extraction to deliver match predictions, tactical game plans, and season projections. Built for coaches who need data-driven decisions - not guesswork.

Currently live with **Rugby Union**. Architecture designed for gradual expansion into Football, Cricket, Basketball, and other sports.

**Live:** https://sports-metrics.vercel.app

---

## Machine Learning Models

| Model | Type | Training Data | What it predicts |
|-------|------|---------------|-----------------|
| **ONNX GradientBoostingClassifier** | Pre-trained (scikit-learn) | 1642 samples | Win probability |
| **ONNX RandomForestRegressor** | Pre-trained (scikit-learn) | 1642 samples | Expected margin & score |
| **JS Gradient Boosted Trees** | Trains at runtime | Tournament data | Win prob + feature importance |
| **JS Random Forest** | Trains at runtime | Tournament data | Confidence intervals |

### Training Data Sources
- **169 verified matches** from Super Rugby Pacific 2025/2026 + Six Nations 2026 (exact team stats from all.rugby, rugbypass.com)
- **673 matches from rugbypy** across Top 14, URC, Premiership, Japan League One, Sevens, and international competitions - with real per-match stats (tackles, line breaks, 22m entries, ruck speed, turnovers, carries, dominant tackles)
- **120 teams** total with real rugby metrics

### 13 Input Features (what drives predictions)
| # | Feature | Source Stat | Importance |
|---|---------|-------------|------------|
| 1 | Elo Rating Gap | Overall team quality | 21.2% |
| 2 | Gainline Advantage | 22m entries / gainline % | 2.0% |
| 3 | Tackle Efficiency | Tackle rate % | 4.4% |
| 4 | Scrum Dominance | Scrum success % | 3.7% |
| 5 | Lineout Control | Lineout success % | 4.9% |
| 6 | Kicking Accuracy | Goal kick % | 5.1% |
| 7 | Form & Momentum | Recent results (0-100) | 19.7% |
| 8 | Discipline Edge | Penalties conceded | 6.7% |
| 9 | Scoring Rate | Points per game | 8.4% |
| 10 | Turnover Threat | Turnovers won/game | 5.5% |
| 11 | Line Break Power | Line breaks/game | 6.4% |
| 12 | Defensive Pressure | Missed tackles/game | 6.8% |
| 13 | Venue | Home (+0.5) / Away (-0.5) / Neutral (0) | 5.3% |

### How Prediction Works
1. User selects two teams + venue
2. Browser computes 13 feature differences from team stats
3. ONNX classifier (200-tree GBT) returns win probability
4. ONNX regressor (100-tree RandomForest) returns expected margin
5. Scores derived from margin + teams' average scoring rates

### Retrain Models
```bash
pip install scikit-learn skl2onnx onnx numpy onnxruntime rugbypy
python ml/fetch_all_stats.py    # Fetch latest stats from rugbypy (optional)
python ml/fetch_and_train.py    # Train and export ONNX models
python ml/sanity_check.py       # Verify predictions are sane
```

---

## Features

### 🏆 Tournaments
- **Super Rugby Pacific 2026** - Complete verified data
- **Nations Championship 2026** - Pre-tournament (starts Jul 4)
- **Rugby Championship 2026** - Pre-tournament (starts Aug)
- **Domestic/Custom** - Manual data entry for any level

### 🤖 ML Prediction Panel
- **Win Probability** - From ONNX GradientBoostedTrees (trained on real stats)
- **Expected Margin** - From ONNX RandomForest regressor
- **Predicted Score** - ML margin + team scoring averages
- **Key Factors** - Which metrics are driving THIS specific prediction
- **Model Confidence** - Tree vote variance from Random Forest

### 📊 Match Analysis
- Head-to-head metric comparison bars
- Performance radar chart
- Predicted score (consistent with win probability)
- Opponent threat assessment
- Tactical intelligence insights
- **Momentum charts** - Form trajectory over last 10 matches
- **H2H history** - Past meetings with win record and scores

### 🎯 Game Plan
- Areas to improve (ranked by priority)
- Exploitable opponent weaknesses
- **ML Keys to Win** - Sensitivity analysis showing where improvement matters most
- Strategic recommendations
- Risk factors
- Drill suggestions

### 📈 Season Simulator
- Monte Carlo projection (5000 iterations)
- Playoff odds, championship probability
- Average projected position

### 🏠 Venue Toggle
- Home / Away / Neutral selection
- ONNX model natively handles venue (~12% prediction swing)
- Affects win probability, margin, and scores

### 🔄 AI Data Refresh
- Fetches live data from tournament websites
- AI (Groq Llama 3.3 70B) extracts team stats + match results
- Saves to IndexedDB (persistent, not hardcoded)
- ML model retrains automatically on new data

### 💾 Database (IndexedDB)
- Tournament data, match history, custom teams - all persistent
- Match results grow with every refresh
- No server needed - runs entirely in browser

---

## Analytics Algorithms

| Algorithm | Used for | Why this one |
|-----------|----------|--------------|
| **Gradient Boosted Trees** | Win probability, key factors | #1 for tabular data - beats neural nets, interpretable |
| **Random Forest** | Margin prediction, confidence | Robust, gives uncertainty via tree variance |
| **ONNX Runtime (WebAssembly)** | Production inference | Real scikit-learn models running in browser at native speed |
| **Monte Carlo Simulation** | Season projections | Only way to model uncertainty across remaining fixtures |
| **Sensitivity Analysis** | "Keys to Win" | SHAP-like - shows which improvement gives biggest win% boost |
| **Exponential Moving Average** | Form / momentum | Captures direction + recency - better than simple win% |
| **Poisson Distribution** | Try scoring distributions | Statistically correct model for discrete scoring events |

---

## Quick Start

```bash
npm install
npm run dev
```

### First-time setup:
1. Open http://localhost:5173
2. Click **AI Settings** → add free Groq API key from [console.groq.com](https://console.groq.com)
3. Click **Refresh Data** to pull live stats

### Deploy:
```bash
npm run build
vercel --prod
```

---

## Project Structure

```
src/
├── analytics/           # ML + statistical engine
│   ├── mlEngine.js      # ONNX + Gradient Boosting + Random Forest
│   ├── bayesian.js      # Score prediction, Poisson, EMA, momentum
│   ├── gamePlan.js      # Tactical recommendations + sensitivity analysis
│   ├── monteCarlo.js    # Season simulator (5000 iterations)
│   └── elo.js           # Elo rating system
├── components/          # UI
│   ├── MatchAnalysis.jsx    # H2H comparison + ML panel
│   ├── MatchCharts.jsx      # Momentum chart + H2H history
│   ├── StandingsTable.jsx   # League table with momentum
│   ├── SeasonSimulator.jsx  # Monte Carlo projections
│   ├── RadarChart.jsx       # Performance radar
│   ├── Settings.jsx         # AI provider config
│   └── Sidebar.jsx          # Navigation (responsive/collapsible)
├── config/
│   └── sports.js        # Multi-sport metric definitions
├── data/
│   ├── matchHistory.js  # Real match results (seeds IndexedDB)
│   ├── superRugby2026.js        # Verified team data
│   ├── nationsChampionship2026.js
│   └── rugbyChampionship2026.js
├── db/
│   └── index.js         # IndexedDB (Dexie) - tournaments + matches
├── services/
│   └── dataFetcher.js   # AI-powered refresh (Groq + CORS proxy)
├── pages/
│   ├── TournamentDashboard.jsx  # Main view (7 tabs)
│   ├── DomesticTournament.jsx   # Custom tournaments
│   └── AnalyticsTheory.jsx      # Algorithm explanations
ml/
├── fetch_all_stats.py       # Fetch per-match stats from rugbypy API
├── fetch_and_train.py       # Feature-aligned training + ONNX export
├── train_model.py           # Legacy training (verified matches only)
├── sanity_check.py          # Validate ONNX predictions
├── rugbypy_matches.json     # 682 match results from rugbypy
└── rugbypy_team_stats.json  # 1363 per-match stat records (real data)
public/model/
├── win_classifier.onnx      # GBT 200 trees, 82% train accuracy
└── margin_regressor.onnx    # RF 100 trees, R²=0.448
```

---

## Data Sources

| Source | What | Verified |
|--------|------|----------|
| all.rugby | Super Rugby standings + all match results | ✅ |
| sixnationsrugby.com | Six Nations 2026 all results | ✅ |
| rugbypass.com | Detailed team stats (tackles, carries, breaks) | ✅ |
| rugbypy (API) | 1363 per-match stat records across 131 teams | ✅ |
| sofascore.com | World Rugby rankings | ✅ |
| super.rugby | Official competition stats | ✅ |

---

## Sports Roadmap

| Sport | Status |
|-------|--------|
| 🏉 Rugby Union | **Live** |
| ⚽ Football | Config ready |
| 🏏 Cricket | Config ready |
| 🏀 Basketball | Config ready |

---

## Technology Stack

- React 19 + Vite
- ONNX Runtime Web (WebAssembly ML inference)
- scikit-learn (model training - GBT + RandomForest)
- rugbypy (real match data + per-match stats)
- Dexie.js (IndexedDB)
- Groq API (AI data extraction)
- Vercel (hosting)

---

## License

Private - commercial use intended.

*SportsMetrics v1.1 - ML models trained on real rugby stats from 120 teams across 6 competitions.*
