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
  dataVersion: 2,  // Bump this when hardcoded data changes to re-seed DB
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
      name: "South Africa", abbr: "RSA", color: "#007749", country: "ZA", elo: 1950,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 45, pa: 21, tries_for: 7, tries_against: 3, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 45, tries_pg: 7, gl: 62, lb: 10, rs: 3.2, c22: 46, e22: 8.1, off: 7.2 },
      defense: { tr: 86, missed: 29, to: 4, dom: 32, steals: 4, ob: 6 },
      setpiece: { so: 100, ss: 68, lo: 89, ls: 46, ps: 4.1, maul: 88 },
      kicking: { km: 621, goal: 85 },
      discipline: { pen: 6, idx: 84 },
      form: { last5: ["W", "W", "L", "W", "W"], streak: "W3", rating: 95 },
      players: [
        { name: "Eben Etzebeth", pos: "LK", num: 4, rating: 92, injury: "Low", note: "Set piece titan - World #1 lock" },
        { name: "Siya Kolisi", pos: "FL", num: 6, rating: 89, injury: "Low", note: "Captain - World Cup pedigree" },
        { name: "Cheslin Kolbe", pos: "W", num: 14, rating: 91, injury: "Medium", note: "World class winger" },
        { name: "Handre Pollard", pos: "FH", num: 10, rating: 87, injury: "Low", note: "Tactical kicker - 85% goal" },
        { name: "Kwagga Smith", pos: "FL", num: 7, rating: 88, injury: "Low", note: "Breakdown excellence" }
      ]
    }),
    "New Zealand": createTeam({
      name: "New Zealand", abbr: "NZL", color: "#1a1a1a", country: "NZ", elo: 1880,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 34, pa: 32, tries_for: 5, tries_against: 4, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 34, tries_pg: 5, gl: 67, lb: 11, rs: 2.8, c22: 42, e22: 9, off: 9.8 },
      defense: { tr: 87, missed: 25, to: 3, dom: 13, steals: 3, ob: 15 },
      setpiece: { so: 92, ss: 66, lo: 86, ls: 44, ps: 3.6, maul: 82 },
      kicking: { km: 398, goal: 88 },
      discipline: { pen: 55, idx: 88 },
      form: { last5: ["L", "W", "W", "W", "W"], streak: "W4", rating: 91 },
      players: [
        { name: "Ardie Savea", pos: "No.8", num: 8, rating: 94, injury: "Low", note: "Best No.8 in world rugby" },
        { name: "Jordie Barrett", pos: "FH", num: 10, rating: 93, injury: "Low", note: "SR 2026 Player of Tournament" },
        { name: "Scott Barrett", pos: "LK", num: 5, rating: 88, injury: "Low", note: "Captain - lineout cornerstone" },
        { name: "Beauden Barrett", pos: "FB", num: 15, rating: 88, injury: "Medium", note: "World class - high mileage" },
        { name: "Cam Roigard", pos: "SH", num: 9, rating: 87, injury: "Medium", note: "Explosive from SR form" }
      ]
    }),
    Ireland: createTeam({
      name: "Ireland", abbr: "IRE", color: "#1b8841", country: "IE", elo: 1855,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 33, pa: 31, tries_for: 5, tries_against: 5, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 33, tries_pg: 5, gl: 58, lb: 4, rs: 3.4, c22: 36, e22: 6.9, off: 6.4 },
      defense: { tr: 85, missed: 31, to: 2, dom: 21, steals: 2, ob: 17 },
      setpiece: { so: 100, ss: 57, lo: 82, ls: 38, ps: 2.4, maul: 72 },
      kicking: { km: 412, goal: 80 },
      discipline: { pen: 10, idx: 76 },
      form: { last5: ["W", "W", "W", "W", "W"], streak: "W5", rating: 90 },
      players: [
        { name: "Caelan Doris", pos: "No.8", num: 8, rating: 89, injury: "Low", note: "World class No.8 - captain" },
        { name: "Jamison Gibson-Park", pos: "SH", num: 9, rating: 87, injury: "Low", note: "Elite tempo controller" },
        { name: "James Lowe", pos: "W", num: 11, rating: 85, injury: "Medium", note: "Powerful finisher" },
        { name: "Tadhg Furlong", pos: "THP", num: 3, rating: 86, injury: "Medium", note: "Scrum anchor - veteran" },
        { name: "Sam Prendergast", pos: "FH", num: 10, rating: 84, injury: "Low", note: "Rising playmaker" }
      ]
    }),
    France: createTeam({
      name: "France", abbr: "FRA", color: "#0055a4", country: "FR", elo: 1825,
      season: { played: 1, won: 0, lost: 1, pts: 2, pf: 32, pa: 34, tries_for: 4, tries_against: 5, try_bonus: 0, loss_bonus: 2 },
      attack: { pts_pg: 32, tries_pg: 4, gl: 60, lb: 12, rs: 3.0, c22: 36, e22: 9, off: 8 },
      defense: { tr: 87, missed: 27, to: 2, dom: 16, steals: 2, ob: 8 },
      setpiece: { so: 86, ss: 59, lo: 83, ls: 40, ps: 3.0, maul: 76 },
      kicking: { km: 455, goal: 82 },
      discipline: { pen: 64, idx: 80 },
      form: { last5: ["W", "W", "L", "W", "L"], streak: "L1", rating: 82 },
      players: [
        { name: "Antoine Dupont", pos: "SH", num: 9, rating: 96, injury: "Low", note: "Best player in world rugby" },
        { name: "Louis Bielle-Biarrey", pos: "W", num: 11, rating: 90, injury: "Low", note: "Electric pace - top try scorer" },
        { name: "Grégory Alldritt", pos: "No.8", num: 8, rating: 88, injury: "Low", note: "Powerful ball carrier" },
        { name: "Thomas Ramos", pos: "FH", num: 10, rating: 86, injury: "Low", note: "Reliable goal kicker" },
        { name: "Charles Ollivon", pos: "FL", num: 7, rating: 84, injury: "Medium", note: "Experienced captain option" }
      ]
    }),
    Argentina: createTeam({
      name: "Argentina", abbr: "ARG", color: "#74acdf", country: "AR", elo: 1775,
      season: { played: 1, won: 0, lost: 1, pts: 2, pf: 38, pa: 47, tries_for: 5, tries_against: 7, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 38, tries_pg: 5, gl: 55, lb: 6, rs: 3.4, c22: 41, e22: 7.8, off: 8.4 },
      defense: { tr: 89, missed: 23, to: 7, dom: 22, steals: 7, ob: 14 },
      setpiece: { so: 100, ss: 60, lo: 100, ls: 38, ps: 2.8, maul: 78 },
      kicking: { km: 448, goal: 82 },
      discipline: { pen: 8, idx: 74 },
      form: { last5: ["W", "L", "L", "W", "L"], streak: "L1", rating: 70 },
      players: [
        { name: "Julián Montoya", pos: "HK", num: 2, rating: 88, injury: "Low", note: "World class hooker - captain" },
        { name: "Santiago Carreras", pos: "FH", num: 10, rating: 86, injury: "Low", note: "Attack runs through him" },
        { name: "Marcos Kremer", pos: "FL", num: 7, rating: 87, injury: "Low", note: "Breakdown monster" },
        { name: "Matías Moroni", pos: "C", num: 12, rating: 82, injury: "Medium", note: "Experienced organiser" },
        { name: "Facundo Isa", pos: "No.8", num: 8, rating: 83, injury: "Low", note: "Powerful carrier" }
      ]
    }),
    England: createTeam({
      name: "England", abbr: "ENG", color: "#c8102e", country: "GB", elo: 1755,
      season: { played: 1, won: 0, lost: 1, pts: 0, pf: 21, pa: 45, tries_for: 3, tries_against: 7, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 21, tries_pg: 3, gl: 54, lb: 5, rs: 3.6, c22: 33, e22: 6.2, off: 6.0 },
      defense: { tr: 84, missed: 30, to: 1, dom: 18, steals: 1, ob: 21 },
      setpiece: { so: 75, ss: 50, lo: 100, ls: 33, ps: 1.9, maul: 68 },
      kicking: { km: 461, goal: 77 },
      discipline: { pen: 13, idx: 50 },
      form: { last5: ["L", "L", "L", "L", "L"], streak: "L5", rating: 30 },
      players: [
        { name: "Maro Itoje", pos: "LK", num: 4, rating: 87, injury: "Low", note: "World class lineout operator" },
        { name: "Ben Earl", pos: "FL", num: 7, rating: 85, injury: "Low", note: "Breakdown work rate elite" },
        { name: "Marcus Smith", pos: "FH", num: 10, rating: 84, injury: "Medium", note: "Creative playmaker" },
        { name: "Tommy Freeman", pos: "W", num: 14, rating: 83, injury: "Low", note: "Powerful finisher" },
        { name: "Jamie George", pos: "HK", num: 2, rating: 82, injury: "Medium", note: "Experienced captain" }
      ]
    }),
    Scotland: createTeam({
      name: "Scotland", abbr: "SCO", color: "#0065bd", country: "GB", elo: 1735,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 47, pa: 38, tries_for: 7, tries_against: 5, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 47, tries_pg: 7, gl: 56, lb: 10, rs: 3.5, c22: 35, e22: 6.8, off: 7.0 },
      defense: { tr: 90, missed: 19, to: 9, dom: 17, steals: 9, ob: 22 },
      setpiece: { so: 100, ss: 48, lo: 100, ls: 31, ps: 1.6, maul: 64 },
      kicking: { km: 421, goal: 72 },
      discipline: { pen: 9, idx: 70 },
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
      name: "Australia", abbr: "AUS", color: "#b8860b", country: "AU", elo: 1705,
      season: { played: 1, won: 0, lost: 1, pts: 2, pf: 31, pa: 33, tries_for: 5, tries_against: 5, try_bonus: 1, loss_bonus: 1 },
      attack: { pts_pg: 31, tries_pg: 5, gl: 52, lb: 10, rs: 3.6, c22: 38, e22: 14, off: 10 },
      defense: { tr: 89, missed: 18, to: 3, dom: 15, steals: 3, ob: 22 },
      setpiece: { so: 100, ss: 54, lo: 92, ls: 35, ps: 2.1, maul: 70 },
      kicking: { km: 498, goal: 78 },
      discipline: { pen: 12, idx: 68 },
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
      season: { played: 1, won: 0, lost: 1, pts: 0, pf: 24, pa: 39, tries_for: 3, tries_against: 5, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 24, tries_pg: 3, gl: 49, lb: 9, rs: 3.7, c22: 30, e22: 6.0, off: 12.4 },
      defense: { tr: 87, missed: 11, to: 8, dom: 11, steals: 8, ob: 33 },
      setpiece: { so: 100, ss: 46, lo: 89, ls: 29, ps: 1.0, maul: 55 },
      kicking: { km: 298, goal: 64 },
      discipline: { pen: 13, idx: 42 },
      form: { last5: ["L", "L", "W", "W", "L"], streak: "L1", rating: 55 },
      players: [
        { name: "Levani Botia", pos: "FL", num: 6, rating: 87, injury: "Low", note: "World class enforcer" },
        { name: "Vinaya Habosi", pos: "W", num: 11, rating: 83, injury: "Low", note: "X-factor finisher" },
        { name: "Caleb Muntz", pos: "FH", num: 10, rating: 80, injury: "Low", note: "Creative kicking game" },
        { name: "Frank Lomani", pos: "SH", num: 9, rating: 82, injury: "Low", note: "Tempo controller" },
        { name: "Tevita Ratuva", pos: "No.8", num: 8, rating: 79, injury: "Medium", note: "Physical ball carrier" }
      ]
    }),
    Italy: createTeam({
      name: "Italy", abbr: "ITA", color: "#0c4da2", country: "IT", elo: 1670,
      season: { played: 1, won: 0, lost: 1, pts: 0, pf: 10, pa: 27, tries_for: 1, tries_against: 3, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 10, tries_pg: 1, gl: 50, lb: 3, rs: 3.8, c22: 29, e22: 5.6, off: 6.2 },
      defense: { tr: 93, missed: 13, to: 1, dom: 13, steals: 1, ob: 28 },
      setpiece: { so: 100, ss: 46, lo: 90, ls: 28, ps: 1.4, maul: 58 },
      kicking: { km: 378, goal: 66 },
      discipline: { pen: 6, idx: 72 },
      form: { last5: ["L", "L", "W", "L", "L"], streak: "L1", rating: 40 },
      players: [
        { name: "Paolo Garbisi", pos: "FH", num: 10, rating: 83, injury: "Low", note: "Improving game manager" },
        { name: "Ange Capuozzo", pos: "FB", num: 15, rating: 84, injury: "Low", note: "Explosive counter-attacker" },
        { name: "Michele Lamaro", pos: "FL", num: 6, rating: 82, injury: "Low", note: "Captain - high work rate" },
        { name: "Niccolò Cannone", pos: "LK", num: 4, rating: 79, injury: "Low", note: "Emerging lineout option" },
        { name: "Juan Ignacio Brex", pos: "C", num: 12, rating: 78, injury: "Low", note: "Physical defender" }
      ]
    }),
    Wales: createTeam({
      name: "Wales", abbr: "WAL", color: "#d4213d", country: "GB", elo: 1580,
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 39, pa: 24, tries_for: 5, tries_against: 3, try_bonus: 1, loss_bonus: 0 },
      attack: { pts_pg: 39, tries_pg: 6, gl: 42, lb: 3, rs: 4.2, c22: 22, e22: 4.4, off: 4.8 },
      defense: { tr: 81, missed: 39, to: 7, dom: 8, steals: 7, ob: 38 },
      setpiece: { so: 100, ss: 38, lo: 94, ls: 21, ps: 0.6, maul: 46 },
      kicking: { km: 341, goal: 58 },
      discipline: { pen: 6, idx: 72 },
      form: { last5: ["L", "L", "L", "W", "W"], streak: "W2", rating: 35 },
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
      season: { played: 1, won: 1, lost: 0, pts: 5, pf: 27, pa: 10, tries_for: 3, tries_against: 1, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 27, tries_pg: 3, gl: 46, lb: 3, rs: 4.0, c22: 25, e22: 5.0, off: 9.6 },
      defense: { tr: 90, missed: 17, to: 4, dom: 9, steals: 4, ob: 36 },
      setpiece: { so: 89, ss: 40, lo: 100, ls: 24, ps: 0.8, maul: 42 },
      kicking: { km: 312, goal: 60 },
      discipline: { pen: 9, idx: 62 },
      form: { last5: ["L", "W", "L", "L", "W"], streak: "W1", rating: 35 },
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
