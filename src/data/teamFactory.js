/**
 * Team data factory - creates standardized team objects
 * 
 * Sport-agnostic design:
 * The factory accepts any metric categories as objects. The sport config
 * (src/config/sports.js) defines what keys each sport uses, but the
 * factory doesn't enforce a specific schema- it passes through whatever
 * metrics you provide. This means adding a new sport requires:
 * 
 * 1. Adding a sport config in config/sports.js (defines labels, thresholds, radar)
 * 2. Creating team data files that use that sport's metric keys
 * 3. No changes needed to the factory or analytics engine
 * 
 * The analytics engine reads from standardized paths:
 * - team.elo → used by Elo system (universal)
 * - team.form → used by momentum/EMA (universal)
 * - team.season → used by standings/simulator (universal)
 * - team[category][key] → used by game plan engine (sport-configured)
 */

/**
 * Create a team for any sport
 * @param {Object} config - Team configuration
 * @param {string} config.sport - Sport identifier (default: "rugby")
 */
export function createTeam({
  name, abbr, color, country, elo, sport = "rugby",
  season = {}, attack = {}, defense = {},
  setpiece = {}, kicking = {}, discipline = {},
  form = {}, players = [],
  // Sport-generic categories (for non-rugby sports)
  batting = {}, bowling = {}, fielding = {},
  offense = {}, 
}) {
  const base = {
    name: name || "",
    abbr: abbr || (name || "").slice(0, 3).toUpperCase(),
    color: color || "#10b981",
    country: country || "",
    elo: elo || 1400,
    sport: sport,
    season: {
      played: season.played || 0,
      won: season.won || 0,
      lost: season.lost || 0,
      drawn: season.drawn || 0,
      pts: season.pts || 0,
      pf: season.pf || 0,
      pa: season.pa || 0,
      pd: (season.pf || 0) - (season.pa || 0),
      tries_for: season.tries_for || 0,
      tries_against: season.tries_against || 0,
      try_bonus: season.try_bonus || 0,
      loss_bonus: season.loss_bonus || 0
    },
    form: {
      last5: form.last5 || ["W", "L", "W", "L", "W"],
      streak: form.streak || "W1",
      rating: form.rating || 60
    },
    players: players.map(p => ({
      name: p.name || "",
      pos: p.pos || "",
      num: p.num || 0,
      rating: p.rating || 70,
      injury: p.injury || "Low",
      note: p.note || ""
    }))
  };

  // Rugby-specific categories
  if (sport === "rugby") {
    base.attack = {
      pts_pg: attack.pts_pg || 0,
      tries_pg: attack.tries_pg || 0,
      gl: attack.gl || 50,
      lb: attack.lb || 15,
      rs: attack.rs || 4.0,
      c22: attack.c22 || 30,
      e22: attack.e22 || 6,
      off: attack.off || 6
    };
    base.defense = {
      tr: defense.tr || 80,
      missed: defense.missed || 25,
      to: defense.to || 10,
      dom: defense.dom || 15,
      steals: defense.steals || 2,
      ob: defense.ob || 20
    };
    base.setpiece = {
      so: setpiece.so || 80,
      ss: setpiece.ss || 50,
      lo: setpiece.lo || 75,
      ls: setpiece.ls || 30,
      ps: setpiece.ps || 1.5,
      maul: setpiece.maul || 65
    };
    base.kicking = {
      km: kicking.km || 400,
      goal: kicking.goal || 72
    };
    base.discipline = {
      pen: discipline.pen || 80,
      idx: discipline.idx || 65
    };
  }

  // Football-specific categories
  if (sport === "football") {
    base.attack = { ...attack };
    base.defense = { ...defense };
    base.setpiece = { ...setpiece };
    base.discipline = { ...discipline };
  }

  // Cricket-specific categories
  if (sport === "cricket") {
    base.batting = { ...batting };
    base.bowling = { ...bowling };
    base.fielding = { ...fielding };
  }

  // Basketball-specific categories
  if (sport === "basketball") {
    base.offense = { ...offense };
    base.defense = { ...defense };
  }

  return base;
}

/**
 * Create a blank team template for custom/domestic tournaments
 */
export function createBlankTeam(name = "", color = "#10b981", sport = "rugby") {
  if (sport === "rugby") {
    return createTeam({
      name,
      color,
      sport,
      elo: 1400,
      season: { played: 10, won: 5, lost: 5, pts: 22, pf: 220, pa: 220, tries_for: 30, tries_against: 30, try_bonus: 2, loss_bonus: 2 },
      attack: { pts_pg: 22, tries_pg: 3, gl: 50, lb: 18, rs: 4.0, c22: 32, e22: 6, off: 6 },
      defense: { tr: 80, missed: 28, to: 10, dom: 14, steals: 2.2, ob: 22 },
      setpiece: { so: 80, ss: 50, lo: 74, ls: 30, ps: 1.5, maul: 65 },
      kicking: { km: 420, goal: 72 },
      discipline: { pen: 85, idx: 65 },
      form: { last5: ["W", "L", "W", "L", "W"], streak: "W1", rating: 60 },
      players: []
    });
  }

  // Generic blank for other sports
  return createTeam({
    name, color, sport, elo: 1400,
    season: { played: 10, won: 5, lost: 5, pts: 15, pf: 0, pa: 0 },
    form: { last5: ["W", "L", "W", "L", "W"], streak: "W1", rating: 60 },
    players: []
  });
}

export default { createTeam, createBlankTeam };
