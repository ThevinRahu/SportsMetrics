# SportsMetrics

**AI & ML-Powered Sports Analytics Platform for Professional Coaching**

SportsMetrics uses real machine learning models, statistical algorithms, and AI-powered data extraction to deliver match predictions, tactical game plans, and season projections. Built for coaches who need data-driven decisions — not guesswork.

Currently live with **Rugby Union**. Architecture designed for gradual expansion into Football, Cricket, Basketball, and other sports.

**Live:** https://sports-metrics.vercel.app

---

## Machine Learning Models

| Model | Type | Accuracy | What it predicts |
|-------|------|----------|-----------------|
| **ONNX GradientBoostingClassifier** | Pre-trained (scikit-learn) | 93.5% | Win probability |
| **ONNX RandomForestRegressor** | Pre-trained (scikit-learn) | — | Expected margin |
| **JS Gradient Boosted Trees** | Trains at runtime | 81%+ | Win prob + feature importance |
| **JS Random Forest** | Trains at runtime | — | Confidence intervals |

All models trained on **92 real match results** from Super Rugby Pacific 2026 and Six Nations 2026 (verified from all.rugby + sixnationsrugby.com).

### Retrain ONNX models:
```bash
pip install scikit-learn skl2onnx onnx numpy
python ml/train_model.py
```

---

## Features

### 🏆 Tournaments
- **Super Rugby Pacific 2026** — Complete verified data
- **Nations Championship 2026** — Pre-tournament (starts Jul 4)
- **Rugby Championship 2026** — Pre-tournament (starts Aug)
- **Domestic/Custom** — Manual data entry for any level

### 🤖 ML Prediction Panel
- **Win Probability** — From trained Gradient Boosted Trees
- **Expected Margin** — How many points you'll win/lose by
- **Model Confidence** — How certain the model is (tree vote variance)
- **Key Factors** — Which metrics are driving THIS specific prediction

### 📊 Match Analysis
- Head-to-head metric comparison bars
- Performance radar chart
- Predicted score (consistent with win probability)
- Opponent threat assessment
- Tactical intelligence insights
- **Momentum charts** — Form trajectory over last 10 matches
- **H2H history** — Past meetings with win record and scores

### 🎯 Game Plan
- Areas to improve (ranked by priority)
- Exploitable opponent weaknesses
- **ML Keys to Win** — Sensitivity analysis showing where improvement matters most
- Strategic recommendations
- Risk factors
- Drill suggestions

### 📈 Season Simulator
- Monte Carlo projection (5000 iterations)
- Playoff odds, championship probability
- Average projected position

### 🏠 Venue Toggle
- Home / Away / Neutral selection
- Adjusts all predictions (+4% home advantage)
- Passed to every model and algorithm

### 🔄 AI Data Refresh
- Fetches live data from tournament websites
- AI (Groq Llama 3.3 70B) extracts team stats + match results
- Saves to IndexedDB (persistent, not hardcoded)
- ML model retrains automatically on new data

### 💾 Database (IndexedDB)
- Tournament data, match history, custom teams — all persistent
- Match results grow with every refresh
- No server needed — runs entirely in browser

---

## Analytics Algorithms

| Algorithm | Used for | Why this one |
|-----------|----------|--------------|
| **Gradient Boosted Trees** | Win probability, key factors | #1 for tabular data — beats neural nets, interpretable |
| **Random Forest** | Margin prediction, confidence | Robust, gives uncertainty via tree variance |
| **Sigmoid / Logistic** | Score prediction, unified model | Standard probability output, impossible to contradict |
| **Monte Carlo Simulation** | Season projections | Only way to model uncertainty across remaining fixtures |
| **Exponential Moving Average** | Form / momentum | Captures direction + recency — better than simple win% |
| **Poisson Distribution** | Try scoring distributions | Statistically correct model for discrete scoring events |
| **Sensitivity Analysis** | "Keys to Win" | SHAP-like — shows which improvement gives biggest win% boost |
| **ONNX Runtime (WebAssembly)** | Production inference | Real scikit-learn models running in browser at native speed |

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
│   ├── matchHistory.js  # 92 real match results (seeds IndexedDB)
│   ├── superRugby2026.js        # Verified team data
│   ├── nationsChampionship2026.js
│   └── rugbyChampionship2026.js
├── db/
│   └── index.js         # IndexedDB (Dexie) — tournaments + matches
├── services/
│   └── dataFetcher.js   # AI-powered refresh (Groq + CORS proxy)
├── pages/
│   ├── TournamentDashboard.jsx  # Main view (7 tabs)
│   ├── DomesticTournament.jsx   # Custom tournaments
│   └── AnalyticsTheory.jsx      # Algorithm explanations
├── ml/
│   └── train_model.py   # ONNX model training script
└── public/model/
    ├── win_classifier.onnx      # scikit-learn GBT (93.5% accuracy)
    └── margin_regressor.onnx    # scikit-learn Random Forest
```

---

## Data Sources

| Source | What | Verified |
|--------|------|----------|
| all.rugby | Super Rugby standings + all match results | ✅ |
| sixnationsrugby.com | Six Nations 2026 all results | ✅ |
| rugbypass.com | Detailed team stats (tackles, carries, breaks) | ✅ |
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
- Dexie.js (IndexedDB)
- Groq API (AI data extraction)
- Vercel (hosting)

---

## License

Private — commercial use intended.

*SportsMetrics v1.0 — Rugby Union live. More sports coming soon.*
