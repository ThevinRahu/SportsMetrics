/**
 * Sport Configuration Registry
 * 
 * Defines the metric schema, labels, thresholds, and analysis logic
 * for each supported sport. The analytics engine and UI components
 * read from this config to render sport-appropriate interfaces.
 * 
 * To add a new sport:
 * 1. Define its config object following the schema below
 * 2. Register it in SPORTS_CONFIG
 * 3. Create a data file with teams using that sport's metric keys
 * 
 * The analytics engine (Elo, Monte Carlo, form) works universally.
 * Only the game plan logic and UI labels change per sport.
 */

export const SPORTS_CONFIG = {
  rugby: {
    id: "rugby",
    name: "Rugby Union",
    icon: "🏉",
    
    // Scoring terminology
    scoring: {
      unit: "points",
      scoringEvents: ["try", "conversion", "penalty", "drop goal"],
      bonusPointSystem: true,
    },

    // Metric categories and their fields
    // Each field: { key, label, unit, higherBetter, good, warning }
    categories: {
      attack: {
        label: "Attack",
        icon: "⚔️",
        metrics: [
          { key: "pts_pg", label: "Points/Game", unit: "", higherBetter: true, good: 28, warning: 20 },
          { key: "tries_pg", label: "Tries/Game", unit: "", higherBetter: true, good: 4, warning: 2.5 },
          { key: "gl", label: "Gainline %", unit: "%", higherBetter: true, good: 60, warning: 45 },
          { key: "lb", label: "Line Breaks", unit: "/gm", higherBetter: true, good: 25, warning: 15 },
          { key: "rs", label: "Ruck Speed", unit: "s", higherBetter: false, good: 3.2, warning: 4.2 },
          { key: "c22", label: "22m Conversion", unit: "%", higherBetter: true, good: 40, warning: 25 },
          { key: "e22", label: "22m Entries", unit: "/gm", higherBetter: true, good: 7, warning: 5 },
          { key: "off", label: "Offloads", unit: "/gm", higherBetter: true, good: 8, warning: 5 },
        ]
      },
      defense: {
        label: "Defense",
        icon: "🛡️",
        metrics: [
          { key: "tr", label: "Tackle Rate", unit: "%", higherBetter: true, good: 85, warning: 78 },
          { key: "missed", label: "Missed Tackles", unit: "/gm", higherBetter: false, good: 18, warning: 35 },
          { key: "to", label: "Turnovers Won", unit: "/gm", higherBetter: true, good: 12, warning: 8 },
          { key: "dom", label: "Dominant Tackles", unit: "/gm", higherBetter: true, good: 20, warning: 12 },
          { key: "steals", label: "Steals", unit: "/gm", higherBetter: true, good: 3, warning: 1.5 },
          { key: "ob", label: "Offloads Conceded", unit: "/gm", higherBetter: false, good: 12, warning: 30 },
        ]
      },
      setpiece: {
        label: "Set Piece",
        icon: "⚡",
        metrics: [
          { key: "so", label: "Scrum Win %", unit: "%", higherBetter: true, good: 88, warning: 76 },
          { key: "ss", label: "Scrum Steal %", unit: "%", higherBetter: true, good: 55, warning: 35 },
          { key: "lo", label: "Lineout Win %", unit: "%", higherBetter: true, good: 82, warning: 68 },
          { key: "ls", label: "Lineout Steal %", unit: "%", higherBetter: true, good: 35, warning: 20 },
          { key: "ps", label: "Scrum Pens/Gm", unit: "", higherBetter: true, good: 2.5, warning: 1 },
          { key: "maul", label: "Maul Success %", unit: "%", higherBetter: true, good: 75, warning: 55 },
        ]
      },
      kicking: {
        label: "Kicking",
        icon: "🦶",
        metrics: [
          { key: "goal", label: "Goal Kicking %", unit: "%", higherBetter: true, good: 80, warning: 65 },
          { key: "km", label: "Kick Metres", unit: "m", higherBetter: true, good: 450, warning: 320 },
        ]
      },
      discipline: {
        label: "Discipline",
        icon: "⚖️",
        metrics: [
          { key: "pen", label: "Penalties", unit: "/season", higherBetter: false, good: 65, warning: 95 },
          { key: "idx", label: "Discipline Index", unit: "", higherBetter: true, good: 75, warning: 50 },
        ]
      }
    },

    // Win probability weights (must sum to ~1.0)
    winFactors: [
      { category: "attack", key: "gl", weight: 0.20 },
      { category: "defense", key: "tr", weight: 0.18 },
      { category: "setpiece", key: "so", weight: 0.12 },
      { category: "setpiece", key: "lo", weight: 0.10 },
      { category: "form", key: "rating", weight: 0.15 },
      { category: "discipline", key: "pen", weight: 0.10, inverted: true },
      { category: "kicking", key: "goal", weight: 0.08 },
      { category: "attack", key: "c22", weight: 0.07 },
    ],

    // Threat thresholds for opponent analysis
    threatThresholds: {
      attack: [55, 62],
      defense: [83, 86],
      setpiece: [82, 87],
      kicking: [75, 82],
    },

    // Position list for players
    positions: ["FH", "SH", "LP", "HK", "THP", "LK", "FL", "No.8", "C", "W", "FB"],

    // Radar chart dimensions
    radarAxes: [
      { label: "Attack", getValue: (t) => (t.attack?.gl || 50) / 100 },
      { label: "Defense", getValue: (t) => (t.defense?.tr || 80) / 100 },
      { label: "Set Piece", getValue: (t) => ((t.setpiece?.so || 80) + (t.setpiece?.lo || 75)) / 200 },
      { label: "Discipline", getValue: (t) => (t.discipline?.idx || 65) / 100 },
      { label: "Form", getValue: (t) => (t.form?.rating || 50) / 100 },
      { label: "Kicking", getValue: (t) => (t.kicking?.goal || 70) / 100 },
    ],
  },

  // =========================================================
  // FUTURE SPORT TEMPLATES (ready to implement)
  // =========================================================

  football: {
    id: "football",
    name: "Football (Soccer)",
    icon: "⚽",
    scoring: { unit: "goals", scoringEvents: ["goal", "penalty"], bonusPointSystem: false },
    categories: {
      attack: {
        label: "Attack",
        icon: "⚔️",
        metrics: [
          { key: "goals_pg", label: "Goals/Game", unit: "", higherBetter: true, good: 2.0, warning: 1.0 },
          { key: "xg", label: "Expected Goals (xG)", unit: "", higherBetter: true, good: 1.8, warning: 1.0 },
          { key: "shots_pg", label: "Shots/Game", unit: "", higherBetter: true, good: 15, warning: 8 },
          { key: "sot", label: "Shots on Target %", unit: "%", higherBetter: true, good: 40, warning: 25 },
          { key: "possession", label: "Possession %", unit: "%", higherBetter: true, good: 58, warning: 42 },
          { key: "pass_acc", label: "Pass Accuracy %", unit: "%", higherBetter: true, good: 85, warning: 75 },
          { key: "chances", label: "Chances Created", unit: "/gm", higherBetter: true, good: 4, warning: 2 },
        ]
      },
      defense: {
        label: "Defense",
        icon: "🛡️",
        metrics: [
          { key: "ga_pg", label: "Goals Conceded/Gm", unit: "", higherBetter: false, good: 0.8, warning: 1.5 },
          { key: "clean_sheets", label: "Clean Sheet %", unit: "%", higherBetter: true, good: 40, warning: 20 },
          { key: "tackles_pg", label: "Tackles/Game", unit: "", higherBetter: true, good: 20, warning: 14 },
          { key: "interceptions", label: "Interceptions/Gm", unit: "", higherBetter: true, good: 12, warning: 7 },
          { key: "aerial", label: "Aerial Win %", unit: "%", higherBetter: true, good: 55, warning: 45 },
        ]
      },
      setpiece: {
        label: "Set Pieces",
        icon: "🎯",
        metrics: [
          { key: "corner_conv", label: "Corner Conv %", unit: "%", higherBetter: true, good: 5, warning: 2 },
          { key: "fk_goals", label: "Free Kick Goals", unit: "", higherBetter: true, good: 3, warning: 0 },
          { key: "pen_conv", label: "Penalty Conv %", unit: "%", higherBetter: true, good: 80, warning: 60 },
        ]
      },
      discipline: {
        label: "Discipline",
        icon: "⚖️",
        metrics: [
          { key: "yellows", label: "Yellow Cards", unit: "/season", higherBetter: false, good: 3, warning: 7 },
          { key: "reds", label: "Red Cards", unit: "/season", higherBetter: false, good: 0, warning: 2 },
          { key: "fouls", label: "Fouls/Game", unit: "", higherBetter: false, good: 10, warning: 15 },
        ]
      }
    },
    positions: ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"],
    radarAxes: [
      { label: "Attack", getValue: (t) => (t.attack?.xg || 1) / 2.5 },
      { label: "Defense", getValue: (t) => 1 - ((t.defense?.ga_pg || 1) / 3) },
      { label: "Possession", getValue: (t) => (t.attack?.possession || 50) / 100 },
      { label: "Set Piece", getValue: (t) => (t.setpiece?.pen_conv || 70) / 100 },
      { label: "Discipline", getValue: (t) => 1 - ((t.discipline?.fouls || 12) / 25) },
      { label: "Form", getValue: (t) => (t.form?.rating || 50) / 100 },
    ],
  },

  cricket: {
    id: "cricket",
    name: "Cricket",
    icon: "🏏",
    scoring: { unit: "runs", scoringEvents: ["boundary", "six", "single"], bonusPointSystem: true },
    categories: {
      batting: {
        label: "Batting",
        icon: "🏏",
        metrics: [
          { key: "avg", label: "Team Average", unit: "", higherBetter: true, good: 35, warning: 25 },
          { key: "sr", label: "Strike Rate", unit: "", higherBetter: true, good: 140, warning: 110 },
          { key: "boundaries", label: "Boundaries/Inn", unit: "", higherBetter: true, good: 20, warning: 12 },
          { key: "pp_sr", label: "Powerplay SR", unit: "", higherBetter: true, good: 8.5, warning: 6.5 },
          { key: "death_sr", label: "Death Overs SR", unit: "", higherBetter: true, good: 10, warning: 7.5 },
        ]
      },
      bowling: {
        label: "Bowling",
        icon: "🎯",
        metrics: [
          { key: "econ", label: "Economy Rate", unit: "", higherBetter: false, good: 7, warning: 9 },
          { key: "avg", label: "Bowling Average", unit: "", higherBetter: false, good: 22, warning: 32 },
          { key: "dot_pct", label: "Dot Ball %", unit: "%", higherBetter: true, good: 45, warning: 35 },
          { key: "wickets_inn", label: "Wickets/Inn", unit: "", higherBetter: true, good: 6, warning: 3 },
        ]
      },
      fielding: {
        label: "Fielding",
        icon: "🧤",
        metrics: [
          { key: "catches", label: "Catch Success %", unit: "%", higherBetter: true, good: 85, warning: 70 },
          { key: "runouts", label: "Run Outs/Match", unit: "", higherBetter: true, good: 1.5, warning: 0.5 },
        ]
      }
    },
    positions: ["Opener", "Top Order", "Middle Order", "Finisher", "WK", "Pace", "Spin", "All-rounder"],
    radarAxes: [
      { label: "Batting", getValue: (t) => ((t.batting?.avg || 25) - 15) / 30 },
      { label: "Bowling", getValue: (t) => 1 - ((t.bowling?.econ || 8) - 5) / 7 },
      { label: "Fielding", getValue: (t) => (t.fielding?.catches || 75) / 100 },
      { label: "Powerplay", getValue: (t) => ((t.batting?.pp_sr || 7) - 5) / 6 },
      { label: "Death", getValue: (t) => ((t.batting?.death_sr || 8) - 6) / 6 },
      { label: "Form", getValue: (t) => (t.form?.rating || 50) / 100 },
    ],
  },

  basketball: {
    id: "basketball",
    name: "Basketball",
    icon: "🏀",
    scoring: { unit: "points", scoringEvents: ["2pt", "3pt", "free throw"], bonusPointSystem: false },
    categories: {
      offense: {
        label: "Offense",
        icon: "⚔️",
        metrics: [
          { key: "ppg", label: "Points/Game", unit: "", higherBetter: true, good: 115, warning: 100 },
          { key: "fg_pct", label: "FG %", unit: "%", higherBetter: true, good: 48, warning: 43 },
          { key: "three_pct", label: "3PT %", unit: "%", higherBetter: true, good: 38, warning: 33 },
          { key: "ast", label: "Assists/Game", unit: "", higherBetter: true, good: 26, warning: 20 },
          { key: "off_reb", label: "Off Rebounds/Gm", unit: "", higherBetter: true, good: 12, warning: 8 },
          { key: "pace", label: "Pace", unit: "", higherBetter: true, good: 102, warning: 95 },
        ]
      },
      defense: {
        label: "Defense",
        icon: "🛡️",
        metrics: [
          { key: "opp_ppg", label: "Opp Pts/Game", unit: "", higherBetter: false, good: 105, warning: 115 },
          { key: "stl", label: "Steals/Game", unit: "", higherBetter: true, good: 8, warning: 6 },
          { key: "blk", label: "Blocks/Game", unit: "", higherBetter: true, good: 5.5, warning: 3.5 },
          { key: "def_reb", label: "Def Rebounds/Gm", unit: "", higherBetter: true, good: 35, warning: 30 },
          { key: "opp_fg", label: "Opp FG %", unit: "%", higherBetter: false, good: 44, warning: 48 },
        ]
      }
    },
    positions: ["PG", "SG", "SF", "PF", "C"],
    radarAxes: [
      { label: "Scoring", getValue: (t) => ((t.offense?.ppg || 105) - 90) / 35 },
      { label: "Efficiency", getValue: (t) => ((t.offense?.fg_pct || 45) - 38) / 15 },
      { label: "Defense", getValue: (t) => 1 - ((t.defense?.opp_ppg || 110) - 95) / 30 },
      { label: "3PT", getValue: (t) => ((t.offense?.three_pct || 35) - 28) / 15 },
      { label: "Rebounding", getValue: (t) => ((t.defense?.def_reb || 32) - 25) / 15 },
      { label: "Form", getValue: (t) => (t.form?.rating || 50) / 100 },
    ],
  },
};

/**
 * Get sport config by id
 */
export function getSportConfig(sportId) {
  return SPORTS_CONFIG[sportId] || SPORTS_CONFIG.rugby;
}

/**
 * Get all supported sports
 */
export function getSupportedSports() {
  return Object.values(SPORTS_CONFIG).map(s => ({ id: s.id, name: s.name, icon: s.icon }));
}

export default SPORTS_CONFIG;
