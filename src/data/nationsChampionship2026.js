/**
 * Nations Championship 2026 - Inaugural Tournament
 * Source: nationschampionshiprugby.com, World Rugby rankings
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
 * 
 * Data: Based on 2025-26 international form, Six Nations 2026, and World Rugby rankings
 */

import { createTeam } from './teamFactory';

export const NATIONS_CHAMPIONSHIP_2026 = {
  id: "nc2026",
  name: "Nations Championship",
  season: 2026,
  round: 1,
  totalRounds: 6,
  status: "in-progress",
  dataVersion: 7,  // Bump this when hardcoded data changes to re-seed DB
  source: "all.rugby | rugbypass.com | Verified 5 Jul 2026",
  dataUrl: "https://all.rugby/tournament/nations-championship/table",
  format: "2 pools × 6 teams, cross-pool matches, top teams to final",
  playoffSpots: 2,
  lastRefresh: new Date().toISOString(),
  highlights: "Round 1 complete: SA 45-21 ENG | IRE 33-31 AUS | NZ 34-32 FRA | SCO 47-38 ARG | WAL 39-24 FIJ | JPN 27-10 ITA",
  pools: {
    A: ["South Africa", "New Zealand", "Australia", "Argentina", "Fiji", "Japan"],
    B: ["Ireland", "France", "England", "Scotland", "Italy", "Wales"]
  },
  fixtures: [
    { round: 1, date: "2026-07-04", matches: [
      ["New Zealand", "France"], ["Australia", "Ireland"], ["South Africa", "England"],
      ["Argentina", "Scotland"], ["Fiji", "Wales"], ["Japan", "Italy"]
    ]},
    { round: 2, date: "2026-07-12", matches: [
      ["New Zealand", "Ireland"], ["South Africa", "Scotland"], ["Australia", "France"],
      ["Argentina", "England"], ["Fiji", "Italy"], ["Japan", "Wales"]
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
  teams: {
    "South Africa": createTeam({
      name: "South Africa", abbr: "RSA", color: "#007749", country: "ZA", elo: 1971,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 45, pa: 21, tries_for: 7, tries_against: 3, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 35, tries_pg: 4.5, gl: 65, lb: 9.2, rs: 2.7, c22: 40, e22: 12, off: 9.3 },
      defense: { tr: 81, missed: 28.2, to: 4, dom: 14, steals: 4, ob: 12 },
      setpiece: { so: 94, ss: 17, lo: 78, ls: 10, ps: 4.1, maul: 88 },
      kicking: { km: 840, goal: 82 },
      discipline: { pen: 50, idx: 60 },
      form: { last5: ["W", "W", "L", "W", "W"], streak: "W3", rating: 92 },
      players: [
        { name: "Eben Etzebeth", pos: "LK", num: 4, rating: 92, injury: "Low", note: "Set piece titan - World #1 lock" },
        { name: "Siya Kolisi", pos: "FL", num: 6, rating: 89, injury: "Low", note: "Captain - World Cup pedigree" },
        { name: "Cheslin Kolbe", pos: "W", num: 14, rating: 91, injury: "Medium", note: "World class winger" },
        { name: "Handre Pollard", pos: "FH", num: 10, rating: 87, injury: "Low", note: "Tactical kicker - 85% goal" },
        { name: "Kwagga Smith", pos: "FL", num: 7, rating: 88, injury: "Low", note: "Breakdown excellence" }
      ]
    }),
    "New Zealand": createTeam({
      name: "New Zealand", abbr: "NZL", color: "#1a1a1a", country: "NZ", elo: 1893,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 34, pa: 32, tries_for: 5, tries_against: 4, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 25.2, tries_pg: 3.5, gl: 62, lb: 7, rs: 2.5, c22: 38, e22: 9, off: 8 },
      defense: { tr: 85, missed: 26, to: 3, dom: 13, steals: 3, ob: 15 },
      setpiece: { so: 83, ss: 14, lo: 84, ls: 17, ps: 3.6, maul: 82 },
      kicking: { km: 750, goal: 75 },
      discipline: { pen: 57, idx: 52 },
      form: { last5: ["L", "W", "W", "W", "W"], streak: "W4", rating: 72 },
      players: [
        { name: "Ardie Savea", pos: "No.8", num: 8, rating: 94, injury: "Low", note: "Best No.8 in world rugby" },
        { name: "Jordie Barrett", pos: "FH", num: 10, rating: 93, injury: "Low", note: "SR 2026 Player of Tournament" },
        { name: "Scott Barrett", pos: "LK", num: 5, rating: 88, injury: "Low", note: "Captain - lineout cornerstone" },
        { name: "Beauden Barrett", pos: "FB", num: 15, rating: 88, injury: "Medium", note: "World class - high mileage" },
        { name: "Cam Roigard", pos: "SH", num: 9, rating: 87, injury: "Medium", note: "Explosive from SR form" }
      ]
    }),
    Ireland: createTeam({
      name: "Ireland", abbr: "IRE", color: "#1b8841", country: "IE", elo: 1867,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 33, pa: 31, tries_for: 5, tries_against: 5, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 30, tries_pg: 5, gl: 55, lb: 6.4, rs: 3.1, c22: 33, e22: 8.7, off: 13.3 },
      defense: { tr: 88, missed: 25.2, to: 5.8, dom: 8.2, steals: 5.8, ob: 13.3 },
      setpiece: { so: 100, ss: 0, lo: 82, ls: 8, ps: 2.4, maul: 72 },
      kicking: { km: 810, goal: 75 },
      discipline: { pen: 60, idx: 50 },
      form: { last5: ["W", "W", "W", "W", "W"], streak: "W5", rating: 72 },
      players: [
        { name: "Caelan Doris", pos: "No.8", num: 8, rating: 89, injury: "Low", note: "World class No.8 - captain" },
        { name: "Jamison Gibson-Park", pos: "SH", num: 9, rating: 87, injury: "Low", note: "Elite tempo controller" },
        { name: "James Lowe", pos: "W", num: 11, rating: 85, injury: "Medium", note: "Powerful finisher" },
        { name: "Tadhg Furlong", pos: "THP", num: 3, rating: 86, injury: "Medium", note: "Scrum anchor - veteran" },
        { name: "Sam Prendergast", pos: "FH", num: 10, rating: 84, injury: "Low", note: "Rising playmaker" }
      ]
    }),
    France: createTeam({
      name: "France", abbr: "FRA", color: "#0055a4", country: "FR", elo: 1812,
      season: { played: 1, won: 0, lost: 1, pts: 2, pf: 32, pa: 34, tries_for: 4, tries_against: 5, try_bonus: 0, loss_bonus: 2 },
      attack: { pts_pg: 34.7, tries_pg: 4, gl: 67, lb: 9, rs: 3.1, c22: 37, e22: 9, off: 15.4 },
      defense: { tr: 87, missed: 23, to: 4.6, dom: 11.2, steals: 4.6, ob: 15.4 },
      setpiece: { so: 86, ss: 14, lo: 83, ls: 14, ps: 3.0, maul: 76 },
      kicking: { km: 810, goal: 90 },
      discipline: { pen: 66, idx: 45 },
      form: { last5: ["W", "W", "L", "W", "L"], streak: "L1", rating: 45 },
      players: [
        { name: "Antoine Dupont", pos: "SH", num: 9, rating: 96, injury: "Low", note: "Best player in world rugby" },
        { name: "Louis Bielle-Biarrey", pos: "W", num: 11, rating: 90, injury: "Low", note: "Electric pace - top try scorer" },
        { name: "Grégory Alldritt", pos: "No.8", num: 8, rating: 88, injury: "Low", note: "Powerful ball carrier" },
        { name: "Thomas Ramos", pos: "FH", num: 10, rating: 86, injury: "Low", note: "Reliable goal kicker" },
        { name: "Charles Ollivon", pos: "FL", num: 7, rating: 84, injury: "Medium", note: "Experienced captain option" }
      ]
    }),
    Argentina: createTeam({
      name: "Argentina", abbr: "ARG", color: "#74acdf", country: "AR", elo: 1730,
      season: { played: 1, won: 0, lost: 1, pts: 2, pf: 38, pa: 47, tries_for: 5, tries_against: 7, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 29.2, tries_pg: 2.7, gl: 49, lb: 6, rs: 3.1, c22: 35, e22: 10, off: 10 },
      defense: { tr: 87, missed: 23, to: 7, dom: 14, steals: 7, ob: 10 },
      setpiece: { so: 100, ss: 12, lo: 100, ls: 8, ps: 2.8, maul: 78 },
      kicking: { km: 570, goal: 76 },
      discipline: { pen: 56, idx: 53 },
      form: { last5: ["W", "L", "L", "W", "L"], streak: "L1", rating: 42 },
      players: [
        { name: "Julián Montoya", pos: "HK", num: 2, rating: 88, injury: "Low", note: "World class hooker - captain" },
        { name: "Santiago Carreras", pos: "FH", num: 10, rating: 86, injury: "Low", note: "Attack runs through him" },
        { name: "Marcos Kremer", pos: "FL", num: 7, rating: 87, injury: "Low", note: "Breakdown monster" },
        { name: "Matías Moroni", pos: "C", num: 12, rating: 82, injury: "Medium", note: "Experienced organiser" },
        { name: "Facundo Isa", pos: "No.8", num: 8, rating: 83, injury: "Low", note: "Powerful carrier" }
      ]
    }),
    England: createTeam({
      name: "England", abbr: "ENG", color: "#c8102e", country: "GB", elo: 1734,
      season: { played: 1, won: 0, lost: 1, pts: 0, pf: 21, pa: 45, tries_for: 3, tries_against: 7, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 31.6, tries_pg: 3, gl: 55, lb: 8.7, rs: 3.2, c22: 30, e22: 9.9, off: 8.5 },
      defense: { tr: 85, missed: 24.9, to: 4.4, dom: 11.1, steals: 4.4, ob: 8.5 },
      setpiece: { so: 75, ss: 0, lo: 100, ls: 11, ps: 1.9, maul: 68 },
      kicking: { km: 870, goal: 80 },
      discipline: { pen: 78, idx: 35 },
      form: { last5: ["L", "L", "L", "L", "L"], streak: "L5", rating: 28 },
      players: [
        { name: "Maro Itoje", pos: "LK", num: 4, rating: 87, injury: "Low", note: "World class lineout operator" },
        { name: "Ben Earl", pos: "FL", num: 7, rating: 85, injury: "Low", note: "Breakdown work rate elite" },
        { name: "Marcus Smith", pos: "FH", num: 10, rating: 84, injury: "Medium", note: "Creative playmaker" },
        { name: "Tommy Freeman", pos: "W", num: 14, rating: 83, injury: "Low", note: "Powerful finisher" },
        { name: "Jamie George", pos: "HK", num: 2, rating: 82, injury: "Medium", note: "Experienced captain" }
      ]
    }),
    Scotland: createTeam({
      name: "Scotland", abbr: "SCO", color: "#0065bd", country: "GB", elo: 1780,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 47, pa: 38, tries_for: 7, tries_against: 5, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 28.4, tries_pg: 7, gl: 51, lb: 5.5, rs: 3.1, c22: 27, e22: 10.1, off: 9 },
      defense: { tr: 88, missed: 21.4, to: 4.2, dom: 11.1, steals: 4.2, ob: 9 },
      setpiece: { so: 100, ss: 0, lo: 100, ls: 0, ps: 1.6, maul: 64 },
      kicking: { km: 720, goal: 77 },
      discipline: { pen: 54, idx: 55 },
      form: { last5: ["W", "W", "W", "L", "W"], streak: "W1", rating: 78 },
      players: [
        { name: "Finn Russell", pos: "FH", num: 10, rating: 89, injury: "Low", note: "World class playmaker" },
        { name: "Duhan van der Merwe", pos: "W", num: 11, rating: 86, injury: "Low", note: "Powerful try-scoring winger" },
        { name: "Sione Tuipulotu", pos: "C", num: 12, rating: 83, injury: "Medium", note: "Physical centre" },
        { name: "Jamie Ritchie", pos: "FL", num: 6, rating: 82, injury: "Low", note: "Captain - breakdown threat" },
        { name: "Pierre Schoeman", pos: "LP", num: 1, rating: 80, injury: "Low", note: "Scrum disruptor" }
      ]
    }),
    Australia: createTeam({
      name: "Australia", abbr: "AUS", color: "#b8860b", country: "AU", elo: 1693,
      season: { played: 1, won: 0, lost: 1, pts: 2, pf: 31, pa: 33, tries_for: 5, tries_against: 5, try_bonus: 1, loss_bonus: 1 },
      attack: { pts_pg: 31, tries_pg: 3.5, gl: 62, lb: 7.3, rs: 2.8, c22: 37, e22: 11, off: 7 },
      defense: { tr: 87, missed: 26.7, to: 3, dom: 15, steals: 3, ob: 10 },
      setpiece: { so: 81, ss: 12, lo: 86, ls: 14, ps: 2.1, maul: 70 },
      kicking: { km: 630, goal: 71 },
      discipline: { pen: 62, idx: 48 },
      form: { last5: ["W", "L", "W", "L", "L"], streak: "L1", rating: 48 },
      players: [
        { name: "Tate McDermott", pos: "SH", num: 9, rating: 86, injury: "Low", note: "Explosive halfback" },
        { name: "Rob Valetini", pos: "No.8", num: 8, rating: 87, injury: "Medium", note: "Best Wallaby carrier" },
        { name: "Nick Frost", pos: "LK", num: 5, rating: 83, injury: "Low", note: "Future captain" },
        { name: "Hunter Paisami", pos: "C", num: 12, rating: 84, injury: "Low", note: "Physical midfield" },
        { name: "Noah Lolesio", pos: "FH", num: 10, rating: 82, injury: "Low", note: "Key pivot" }
      ]
    }),
    Fiji: createTeam({
      name: "Fiji", abbr: "FIJ", color: "#62b5e5", country: "FJ", elo: 1700,
      season: { played: 0, won: 0, lost: 0, pts: 0, pf: 0, pa: 0, tries_for: 0, tries_against: 0, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 26.1, tries_pg: 3.6, gl: 49, lb: 22, rs: 3.7, c22: 30, e22: 6.0, off: 12.4 },
      defense: { tr: 76, missed: 38, to: 8.6, dom: 11, steals: 1.9, ob: 33 },
      setpiece: { so: 76, ss: 46, lo: 68, ls: 29, ps: 1.0, maul: 55 },
      kicking: { km: 298, goal: 64 },
      discipline: { pen: 101, idx: 42 },
      form: { last5: ["W", "L", "L", "W", "W"], streak: "W2", rating: 62 },
      players: [
        { name: "Levani Botia", pos: "FL", num: 6, rating: 87, injury: "Low", note: "World class enforcer" },
        { name: "Vinaya Habosi", pos: "W", num: 11, rating: 83, injury: "Low", note: "X-factor finisher" },
        { name: "Caleb Muntz", pos: "FH", num: 10, rating: 80, injury: "Low", note: "Creative kicking game" },
        { name: "Frank Lomani", pos: "SH", num: 9, rating: 82, injury: "Low", note: "Tempo controller" },
        { name: "Tevita Ratuva", pos: "No.8", num: 8, rating: 79, injury: "Medium", note: "Physical ball carrier" }
      ]
    }),
    Italy: createTeam({
      name: "Italy", abbr: "ITA", color: "#0c4da2", country: "IT", elo: 1615,
      season: { played: 1, won: 0, lost: 1, pts: 0, pf: 10, pa: 27, tries_for: 1, tries_against: 3, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 16.1, tries_pg: 1, gl: 46, lb: 4.9, rs: 3.3, c22: 16, e22: 8.6, off: 11 },
      defense: { tr: 88, missed: 21.6, to: 6.3, dom: 13.7, steals: 6.3, ob: 11 },
      setpiece: { so: 100, ss: 11, lo: 90, ls: 0, ps: 1.4, maul: 58 },
      kicking: { km: 840, goal: 90 },
      discipline: { pen: 36, idx: 70 },
      form: { last5: ["L", "L", "W", "L", "L"], streak: "L1", rating: 25 },
      players: [
        { name: "Paolo Garbisi", pos: "FH", num: 10, rating: 83, injury: "Low", note: "Improving game manager" },
        { name: "Ange Capuozzo", pos: "FB", num: 15, rating: 84, injury: "Low", note: "Explosive counter-attacker" },
        { name: "Michele Lamaro", pos: "FL", num: 6, rating: 82, injury: "Low", note: "Captain - high work rate" },
        { name: "Niccolò Cannone", pos: "LK", num: 4, rating: 79, injury: "Low", note: "Emerging lineout option" },
        { name: "Juan Ignacio Brex", pos: "C", num: 12, rating: 78, injury: "Low", note: "Physical defender" }
      ]
    }),
    Wales: createTeam({
      name: "Wales", abbr: "WAL", color: "#d4213d", country: "GB", elo: 1643,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 39, pa: 24, tries_for: 5, tries_against: 3, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 27.2, tries_pg: 6, gl: 50, lb: 7, rs: 3.0, c22: 27, e22: 9.4, off: 11.8 },
      defense: { tr: 87, missed: 26.8, to: 6, dom: 11.1, steals: 6, ob: 11.8 },
      setpiece: { so: 100, ss: 0, lo: 94, ls: 6, ps: 0.6, maul: 46 },
      kicking: { km: 750, goal: 74 },
      discipline: { pen: 36, idx: 70 },
      form: { last5: ["L", "L", "L", "W", "W"], streak: "W2", rating: 78 },
      players: [
        { name: "Jac Morgan", pos: "FL", num: 7, rating: 82, injury: "Low", note: "Captain - breakdown threat" },
        { name: "Tommy Reffell", pos: "FL", num: 6, rating: 80, injury: "Low", note: "High tackle count" },
        { name: "Cameron Winnett", pos: "FB", num: 15, rating: 77, injury: "Low", note: "Promising counter-attack" },
        { name: "Dewi Lake", pos: "HK", num: 2, rating: 78, injury: "Medium", note: "Set piece organiser" },
        { name: "Ben Thomas", pos: "C", num: 12, rating: 75, injury: "Low", note: "Developing midfielder" }
      ]
    }),
    Japan: createTeam({
      name: "Japan", abbr: "JPN", color: "#bc002d", country: "JP", elo: 1560,
      season: { played: 0, won: 0, lost: 0, pts: 0, pf: 0, pa: 0, tries_for: 0, tries_against: 0, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 21.4, tries_pg: 2.8, gl: 46, lb: 15, rs: 4.0, c22: 25, e22: 5.0, off: 9.6 },
      defense: { tr: 75, missed: 40, to: 7.2, dom: 9, steals: 1.5, ob: 36 },
      setpiece: { so: 70, ss: 40, lo: 62, ls: 24, ps: 0.8, maul: 42 },
      kicking: { km: 312, goal: 60 },
      discipline: { pen: 105, idx: 36 },
      form: { last5: ["L", "L", "W", "L", "L"], streak: "L2", rating: 28 },
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
