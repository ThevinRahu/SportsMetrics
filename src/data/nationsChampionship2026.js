/**
 * Nations Championship 2026 - Inaugural Tournament
 * Source: nationschampionshiprugby.com, World Rugby rankings, rugbypass.com
 * 
 * Format: 12 teams, 2 pools of 6
 * Pool A (Southern): NZ, South Africa, Australia, Argentina, Fiji, Japan
 * Pool B (Northern): Ireland, France, England, Scotland, Italy, Wales
 * 
 * Each team plays 6 matches (vs all teams in opposing pool)
 * 3 Southern Series (July) + 3 Northern Series (November)
 * Top 2 advance to Nations Championship Final (London)
 * 
 * Round 1: 4 July 2026 - NZL v FRA, AUS v IRE, RSA v ENG, ARG v SCO, FIJ v WAL, JPN v ITA
 * Round 2: 11 July 2026 - NZL v ITA, AUS v FRA, JPN v IRE, FIJ v ENG, RSA v SCO, ARG v WAL
 * 
 * Data: Based on 2025-26 international form, Six Nations 2026, and World Rugby rankings
 * Round 2 stats sourced from rugbypass.com per-match stats pages (verified 12 Jul 2026)
 */

import { createTeam } from './teamFactory';

export const NATIONS_CHAMPIONSHIP_2026 = {
  id: "nc2026",
  name: "Nations Championship",
  season: 2026,
  round: 3,
  totalRounds: 6,
  status: "in-progress",
  dataVersion: 8,  // Bump this when hardcoded data changes to re-seed DB
  source: "all.rugby | rugbypass.com | Verified 12 Jul 2026",
  dataUrl: "https://all.rugby/tournament/nations-championship/table",
  format: "2 pools × 6 teams, cross-pool matches, top teams to final",
  playoffSpots: 2,
  lastRefresh: new Date().toISOString(),
  highlights: "Round 2 complete: NZ 47-17 ITA | FRA 42-26 AUS | IRE 36-20 JPN | ENG 73-8 FIJ | SA 42-28 SCO | ARG 35-21 WAL",
  pools: {
    A: ["South Africa", "New Zealand", "Australia", "Argentina", "Fiji", "Japan"],
    B: ["Ireland", "France", "England", "Scotland", "Italy", "Wales"]
  },
  fixtures: [
    { round: 1, date: "2026-07-04", matches: [
      ["New Zealand", "France"], ["Australia", "Ireland"], ["South Africa", "England"],
      ["Argentina", "Scotland"], ["Fiji", "Wales"], ["Japan", "Italy"]
    ]},
    { round: 2, date: "2026-07-11", matches: [
      ["New Zealand", "Italy"], ["Australia", "France"], ["Japan", "Ireland"],
      ["Fiji", "England"], ["South Africa", "Scotland"], ["Argentina", "Wales"]
    ]},
    { round: 3, date: "2026-07-19", matches: [
      ["South Africa", "France"], ["New Zealand", "England"], ["Australia", "Scotland"],
      ["Argentina", "Italy"], ["Fiji", "Ireland"], ["Japan", "Wales"]
    ]},
    { round: 4, date: "2026-11-07", matches: [
      ["France", "South Africa"], ["Ireland", "New Zealand"], ["England", "Australia"],
      ["Scotland", "Argentina"], ["Wales", "Fiji"], ["Italy", "Japan"]
    ]},
    { round: 5, date: "2026-11-14", matches: [
      ["Ireland", "South Africa"], ["France", "Australia"], ["England", "New Zealand"],
      ["Scotland", "Fiji"], ["Italy", "Argentina"], ["Wales", "Japan"]
    ]},
    { round: 6, date: "2026-11-21", matches: [
      ["Ireland", "Argentina"], ["France", "New Zealand"], ["England", "South Africa"],
      ["Scotland", "Australia"], ["Italy", "Fiji"], ["Wales", "Japan"]
    ]}
  ],
  results: [
    { round: 1, date: "2026-07-04", matches: [
      { home: "New Zealand", away: "France", score: [34, 32] },
      { home: "Australia", away: "Ireland", score: [31, 33] },
      { home: "South Africa", away: "England", score: [45, 21] },
      { home: "Argentina", away: "Scotland", score: [38, 47] },
      { home: "Fiji", away: "Wales", score: [24, 39] },
      { home: "Japan", away: "Italy", score: [10, 27] }
    ]},
    { round: 2, date: "2026-07-11", matches: [
      { home: "Italy", away: "New Zealand", score: [17, 47] },
      { home: "Australia", away: "France", score: [26, 42] },
      { home: "Japan", away: "Ireland", score: [20, 36] },
      { home: "Fiji", away: "England", score: [8, 73] },
      { home: "South Africa", away: "Scotland", score: [42, 28] },
      { home: "Argentina", away: "Wales", score: [35, 21] }
    ]}
  ],
  teams: {
    "South Africa": createTeam({
      name: "South Africa", abbr: "RSA", color: "#007749", country: "ZA", elo: 1989,
      season: { played: 2, won: 2, lost: 0, pts: 10, pf: 87, pa: 49, tries_for: 13, tries_against: 7, try_bonus: 2, loss_bonus: 0 },
      attack: { pts_pg: 35.5, tries_pg: 5.5, gl: 63, lb: 7.1, rs: 2.7, c22: 38, e22: 11, off: 8.7 },
      defense: { tr: 81, missed: 37.1, to: 4, dom: 14, steals: 4, ob: 11 },
      setpiece: { so: 91, ss: 17, lo: 84, ls: 10, ps: 4.1, maul: 88 },
      kicking: { km: 840, goal: 82 },
      discipline: { pen: 54, idx: 57 },
      form: { last5: ["W", "W", "W", "W", "W"], streak: "W4", rating: 95 },
      players: [
        { name: "Eben Etzebeth", pos: "LK", num: 4, rating: 92, injury: "Low", note: "Set piece titan - World #1 lock" },
        { name: "Siya Kolisi", pos: "FL", num: 6, rating: 89, injury: "Low", note: "Captain - World Cup pedigree" },
        { name: "Cheslin Kolbe", pos: "W", num: 14, rating: 91, injury: "Medium", note: "World class winger" },
        { name: "Handre Pollard", pos: "FH", num: 10, rating: 87, injury: "Low", note: "Tactical kicker - 85% goal" },
        { name: "Kwagga Smith", pos: "FL", num: 7, rating: 88, injury: "Low", note: "Breakdown excellence" }
      ]
    }),
    "New Zealand": createTeam({
      name: "New Zealand", abbr: "NZL", color: "#1a1a1a", country: "NZ", elo: 1907,
      season: { played: 2, won: 2, lost: 0, pts: 10, pf: 81, pa: 49, tries_for: 12, tries_against: 6, try_bonus: 2, loss_bonus: 0 },
      attack: { pts_pg: 30.5, tries_pg: 5.3, gl: 63, lb: 9.5, rs: 2.6, c22: 40, e22: 10, off: 8.5 },
      defense: { tr: 87, missed: 20, to: 3.5, dom: 13, steals: 3.5, ob: 14 },
      setpiece: { so: 84, ss: 14, lo: 82, ls: 17, ps: 3.6, maul: 82 },
      kicking: { km: 750, goal: 75 },
      discipline: { pen: 57, idx: 52 },
      form: { last5: ["W", "W", "W", "W", "W"], streak: "W5", rating: 85 },
      players: [
        { name: "Ardie Savea", pos: "No.8", num: 8, rating: 94, injury: "Low", note: "Best No.8 in world rugby" },
        { name: "Jordie Barrett", pos: "FH", num: 10, rating: 93, injury: "Low", note: "SR 2026 Player of Tournament" },
        { name: "Scott Barrett", pos: "LK", num: 5, rating: 88, injury: "Low", note: "Captain - lineout cornerstone" },
        { name: "Beauden Barrett", pos: "FB", num: 15, rating: 88, injury: "Medium", note: "World class - high mileage" },
        { name: "Cam Roigard", pos: "SH", num: 9, rating: 88, injury: "Low", note: "Explosive - R2 try scorer" }
      ]
    }),
    Ireland: createTeam({
      name: "Ireland", abbr: "IRE", color: "#1b8841", country: "IE", elo: 1880,
      season: { played: 2, won: 2, lost: 0, pts: 10, pf: 69, pa: 51, tries_for: 10, tries_against: 7, try_bonus: 2, loss_bonus: 0 },
      attack: { pts_pg: 31.5, tries_pg: 5, gl: 56, lb: 6.7, rs: 3.1, c22: 34, e22: 9, off: 12 },
      defense: { tr: 91, missed: 17.6, to: 5.4, dom: 9, steals: 5.9, ob: 12 },
      setpiece: { so: 91, ss: 0, lo: 80, ls: 11, ps: 2.4, maul: 72 },
      kicking: { km: 810, goal: 75 },
      discipline: { pen: 60, idx: 50 },
      form: { last5: ["W", "W", "W", "W", "W"], streak: "W6", rating: 82 },
      players: [
        { name: "Caelan Doris", pos: "No.8", num: 8, rating: 89, injury: "Low", note: "World class No.8 - captain" },
        { name: "Jamison Gibson-Park", pos: "SH", num: 9, rating: 87, injury: "Low", note: "Elite tempo controller" },
        { name: "James Lowe", pos: "W", num: 11, rating: 85, injury: "Medium", note: "Powerful finisher" },
        { name: "Tadhg Furlong", pos: "THP", num: 3, rating: 86, injury: "Medium", note: "Scrum anchor - veteran" },
        { name: "Sam Prendergast", pos: "FH", num: 10, rating: 84, injury: "Low", note: "Rising playmaker" }
      ]
    }),
    France: createTeam({
      name: "France", abbr: "FRA", color: "#0055a4", country: "FR", elo: 1846,
      season: { played: 2, won: 1, lost: 1, pts: 7, pf: 74, pa: 60, tries_for: 10, tries_against: 9, try_bonus: 2, loss_bonus: 1 },
      attack: { pts_pg: 37, tries_pg: 5, gl: 67, lb: 11.5, rs: 3.1, c22: 38, e22: 10, off: 13 },
      defense: { tr: 89, missed: 23, to: 4.3, dom: 11, steals: 3.3, ob: 13 },
      setpiece: { so: 93, ss: 14, lo: 88, ls: 14, ps: 3.0, maul: 76 },
      kicking: { km: 810, goal: 90 },
      discipline: { pen: 66, idx: 45 },
      form: { last5: ["W", "W", "L", "W", "W"], streak: "W1", rating: 72 },
      players: [
        { name: "Antoine Dupont", pos: "SH", num: 9, rating: 96, injury: "Low", note: "Best player in world rugby" },
        { name: "Louis Bielle-Biarrey", pos: "W", num: 11, rating: 90, injury: "Low", note: "Electric pace - top try scorer" },
        { name: "Grégory Alldritt", pos: "No.8", num: 8, rating: 88, injury: "Low", note: "Powerful ball carrier" },
        { name: "Thomas Ramos", pos: "FH", num: 10, rating: 86, injury: "Low", note: "Reliable goal kicker" },
        { name: "Charles Ollivon", pos: "FL", num: 7, rating: 84, injury: "Medium", note: "Experienced captain option" }
      ]
    }),
    Argentina: createTeam({
      name: "Argentina", abbr: "ARG", color: "#74acdf", country: "AR", elo: 1760,
      season: { played: 2, won: 1, lost: 1, pts: 6, pf: 73, pa: 68, tries_for: 10, tries_against: 10, try_bonus: 2, loss_bonus: 0 },
      attack: { pts_pg: 32.1, tries_pg: 3.9, gl: 53, lb: 9, rs: 3.1, c22: 36, e22: 10, off: 9.5 },
      defense: { tr: 91, missed: 17, to: 6, dom: 14, steals: 4.5, ob: 9.5 },
      setpiece: { so: 100, ss: 12, lo: 97, ls: 8, ps: 2.8, maul: 78 },
      kicking: { km: 600, goal: 76 },
      discipline: { pen: 56, idx: 53 },
      form: { last5: ["L", "L", "W", "L", "W"], streak: "W1", rating: 58 },
      players: [
        { name: "Julián Montoya", pos: "HK", num: 2, rating: 88, injury: "Low", note: "World class hooker - captain" },
        { name: "Santiago Carreras", pos: "FH", num: 10, rating: 86, injury: "Low", note: "Attack runs through him" },
        { name: "Marcos Kremer", pos: "FL", num: 7, rating: 87, injury: "Low", note: "Breakdown monster" },
        { name: "Matías Moroni", pos: "C", num: 12, rating: 82, injury: "Medium", note: "Experienced organiser" },
        { name: "Facundo Isa", pos: "No.8", num: 8, rating: 83, injury: "Low", note: "Powerful carrier" }
      ]
    }),
    England: createTeam({
      name: "England", abbr: "ENG", color: "#c8102e", country: "GB", elo: 1802,
      season: { played: 2, won: 1, lost: 1, pts: 5, pf: 94, pa: 53, tries_for: 14, tries_against: 8, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 43.3, tries_pg: 7, gl: 58, lb: 8.9, rs: 3.2, c22: 34, e22: 10, off: 8.5 },
      defense: { tr: 83, missed: 24.5, to: 4.7, dom: 11, steals: 4.7, ob: 8.5 },
      setpiece: { so: 79, ss: 0, lo: 100, ls: 11, ps: 1.9, maul: 70 },
      kicking: { km: 870, goal: 80 },
      discipline: { pen: 72, idx: 38 },
      form: { last5: ["L", "L", "L", "L", "W"], streak: "W1", rating: 58 },
      players: [
        { name: "Maro Itoje", pos: "LK", num: 4, rating: 87, injury: "Low", note: "World class lineout operator" },
        { name: "Ben Earl", pos: "FL", num: 7, rating: 86, injury: "Low", note: "Breakdown work rate elite" },
        { name: "Marcus Smith", pos: "FH", num: 10, rating: 84, injury: "Medium", note: "Creative playmaker" },
        { name: "Tommy Freeman", pos: "W", num: 14, rating: 84, injury: "Low", note: "Powerful finisher - R2 hat-trick" },
        { name: "Henry Pollock", pos: "FL", num: 6, rating: 83, injury: "Low", note: "Emerging star - R2 impact" }
      ]
    }),
    Scotland: createTeam({
      name: "Scotland", abbr: "SCO", color: "#0065bd", country: "GB", elo: 1762,
      season: { played: 2, won: 1, lost: 1, pts: 6, pf: 75, pa: 80, tries_for: 11, tries_against: 11, try_bonus: 2, loss_bonus: 0 },
      attack: { pts_pg: 30.7, tries_pg: 5.5, gl: 54, lb: 10.3, rs: 3.1, c22: 30, e22: 10, off: 10 },
      defense: { tr: 87, missed: 20.7, to: 4.1, dom: 11, steals: 3.1, ob: 10 },
      setpiece: { so: 100, ss: 0, lo: 96, ls: 4, ps: 1.6, maul: 64 },
      kicking: { km: 720, goal: 77 },
      discipline: { pen: 58, idx: 52 },
      form: { last5: ["W", "W", "L", "W", "L"], streak: "L1", rating: 62 },
      players: [
        { name: "Finn Russell", pos: "FH", num: 10, rating: 89, injury: "Low", note: "World class playmaker" },
        { name: "Duhan van der Merwe", pos: "W", num: 11, rating: 86, injury: "Low", note: "Powerful try-scoring winger" },
        { name: "Sione Tuipulotu", pos: "C", num: 12, rating: 83, injury: "Medium", note: "Physical centre" },
        { name: "Jamie Ritchie", pos: "FL", num: 6, rating: 82, injury: "Low", note: "Captain - breakdown threat" },
        { name: "Pierre Schoeman", pos: "LP", num: 1, rating: 80, injury: "Low", note: "Scrum disruptor" }
      ]
    }),
    Australia: createTeam({
      name: "Australia", abbr: "AUS", color: "#b8860b", country: "AU", elo: 1659,
      season: { played: 2, won: 0, lost: 2, pts: 3, pf: 57, pa: 75, tries_for: 9, tries_against: 11, try_bonus: 2, loss_bonus: 1 },
      attack: { pts_pg: 28.5, tries_pg: 3.5, gl: 60, lb: 6.2, rs: 2.8, c22: 36, e22: 10, off: 7.5 },
      defense: { tr: 84, missed: 28.4, to: 4, dom: 14, steals: 4, ob: 10 },
      setpiece: { so: 91, ss: 12, lo: 93, ls: 14, ps: 2.1, maul: 70 },
      kicking: { km: 650, goal: 71 },
      discipline: { pen: 57, idx: 51 },
      form: { last5: ["L", "W", "L", "L", "L"], streak: "L2", rating: 38 },
      players: [
        { name: "Tate McDermott", pos: "SH", num: 9, rating: 86, injury: "Low", note: "Explosive halfback" },
        { name: "Rob Valetini", pos: "No.8", num: 8, rating: 87, injury: "Medium", note: "Best Wallaby carrier" },
        { name: "Nick Frost", pos: "LK", num: 5, rating: 83, injury: "Low", note: "Future captain" },
        { name: "Hunter Paisami", pos: "C", num: 12, rating: 84, injury: "Low", note: "Physical midfield" },
        { name: "Noah Lolesio", pos: "FH", num: 10, rating: 82, injury: "Low", note: "Key pivot" }
      ]
    }),
    Fiji: createTeam({
      name: "Fiji", abbr: "FIJ", color: "#62b5e5", country: "FJ", elo: 1632,
      season: { played: 2, won: 0, lost: 2, pts: 0, pf: 32, pa: 112, tries_for: 4, tries_against: 17, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 21, tries_pg: 2.8, gl: 47, lb: 14, rs: 3.6, c22: 27, e22: 5.6, off: 12.2 },
      defense: { tr: 79, missed: 30, to: 8.8, dom: 11, steals: 5, ob: 31 },
      setpiece: { so: 86, ss: 46, lo: 82, ls: 29, ps: 1.0, maul: 54 },
      kicking: { km: 300, goal: 64 },
      discipline: { pen: 107, idx: 39 },
      form: { last5: ["L", "L", "W", "L", "L"], streak: "L2", rating: 22 },
      players: [
        { name: "Levani Botia", pos: "FL", num: 6, rating: 87, injury: "Low", note: "World class enforcer" },
        { name: "Vinaya Habosi", pos: "W", num: 11, rating: 83, injury: "Low", note: "X-factor finisher" },
        { name: "Caleb Muntz", pos: "FH", num: 10, rating: 80, injury: "Low", note: "Creative kicking game" },
        { name: "Frank Lomani", pos: "SH", num: 9, rating: 82, injury: "Low", note: "Tempo controller" },
        { name: "Tevita Ratuva", pos: "No.8", num: 8, rating: 79, injury: "Medium", note: "Physical ball carrier" }
      ]
    }),
    Italy: createTeam({
      name: "Italy", abbr: "ITA", color: "#0c4da2", country: "IT", elo: 1601,
      season: { played: 2, won: 0, lost: 2, pts: 0, pf: 27, pa: 74, tries_for: 3, tries_against: 10, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 14.8, tries_pg: 1.3, gl: 45, lb: 5, rs: 3.3, c22: 17, e22: 8.6, off: 11 },
      defense: { tr: 89, missed: 23.3, to: 6.6, dom: 14, steals: 4.2, ob: 11 },
      setpiece: { so: 100, ss: 11, lo: 93, ls: 3, ps: 1.4, maul: 58 },
      kicking: { km: 840, goal: 90 },
      discipline: { pen: 36, idx: 70 },
      form: { last5: ["L", "W", "L", "L", "L"], streak: "L2", rating: 18 },
      players: [
        { name: "Paolo Garbisi", pos: "FH", num: 10, rating: 83, injury: "Low", note: "Improving game manager" },
        { name: "Ange Capuozzo", pos: "FB", num: 15, rating: 84, injury: "Low", note: "Explosive counter-attacker" },
        { name: "Michele Lamaro", pos: "FL", num: 6, rating: 82, injury: "Low", note: "Captain - high work rate" },
        { name: "Niccolò Cannone", pos: "LK", num: 4, rating: 79, injury: "Low", note: "Emerging lineout option" },
        { name: "Juan Ignacio Brex", pos: "C", num: 12, rating: 78, injury: "Low", note: "Physical defender" }
      ]
    }),
    Wales: createTeam({
      name: "Wales", abbr: "WAL", color: "#d4213d", country: "GB", elo: 1613,
      season: { played: 2, won: 1, lost: 1, pts: 5, pf: 60, pa: 59, tries_for: 9, tries_against: 8, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 28.6, tries_pg: 5.3, gl: 49, lb: 5, rs: 3.0, c22: 27, e22: 9.4, off: 11.7 },
      defense: { tr: 85, missed: 31.2, to: 6.3, dom: 11, steals: 6.8, ob: 11.7 },
      setpiece: { so: 96, ss: 0, lo: 96, ls: 5, ps: 0.6, maul: 46 },
      kicking: { km: 750, goal: 74 },
      discipline: { pen: 37, idx: 69 },
      form: { last5: ["L", "L", "W", "W", "L"], streak: "L1", rating: 52 },
      players: [
        { name: "Jac Morgan", pos: "FL", num: 7, rating: 82, injury: "Low", note: "Captain - breakdown threat" },
        { name: "Tommy Reffell", pos: "FL", num: 6, rating: 80, injury: "Low", note: "High tackle count" },
        { name: "Cameron Winnett", pos: "FB", num: 15, rating: 77, injury: "Low", note: "Promising counter-attack" },
        { name: "Dewi Lake", pos: "HK", num: 2, rating: 78, injury: "Medium", note: "Set piece organiser" },
        { name: "Ben Thomas", pos: "C", num: 12, rating: 75, injury: "Low", note: "Developing midfielder" }
      ]
    }),
    Japan: createTeam({
      name: "Japan", abbr: "JPN", color: "#bc002d", country: "JP", elo: 1547,
      season: { played: 2, won: 1, lost: 1, pts: 4, pf: 47, pa: 46, tries_for: 5, tries_against: 6, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 22.5, tries_pg: 2.7, gl: 47, lb: 9, rs: 3.9, c22: 25, e22: 5.1, off: 9.7 },
      defense: { tr: 82, missed: 31, to: 7.4, dom: 9, steals: 2.5, ob: 33 },
      setpiece: { so: 83, ss: 40, lo: 79, ls: 24, ps: 0.8, maul: 43 },
      kicking: { km: 326, goal: 63 },
      discipline: { pen: 98, idx: 38 },
      form: { last5: ["L", "W", "L", "W", "L"], streak: "L1", rating: 35 },
      players: [
        { name: "Michael Leitch", pos: "FL", num: 6, rating: 81, injury: "Low", note: "Veteran leader and captain" },
        { name: "Lomano Lemeki", pos: "W", num: 14, rating: 79, injury: "Low", note: "Pace and finishing" },
        { name: "Naoto Saito", pos: "No.8", num: 8, rating: 78, injury: "Low", note: "Workmanlike carrier" },
        { name: "Seungsin Lee", pos: "FH", num: 10, rating: 76, injury: "Low", note: "Composed game manager" },
        { name: "Shota Horie", pos: "HK", num: 2, rating: 77, injury: "Medium", note: "Experienced set piece" }
      ]
    })
  }
};

export default NATIONS_CHAMPIONSHIP_2026;
