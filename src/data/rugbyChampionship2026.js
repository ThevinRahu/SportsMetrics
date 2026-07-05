/**
 * The Rugby Championship 2026
 * Source: World Rugby rankings, 2025 Rugby Championship data as baseline
 * 
 * Format: 4 teams (NZ, SA, AUS, ARG), double round-robin (6 rounds)
 * Season: August-September 2026
 * Status: Pre-tournament - data from 2025 season as baseline
 * Refresh when July 2026 begins with latest form data
 */

import { createTeam } from './teamFactory';

export const RUGBY_CHAMPIONSHIP_2026 = {
  id: "trc2026",
  name: "The Rugby Championship",
  season: 2026,
  round: 0,
  totalRounds: 6,
  status: "pre-tournament",
  dataVersion: 1,
  source: "World Rugby Rankings | 2025 TRC baseline",
  dataUrl: "https://www.rugbychampionship.rugby/",
  format: "4 teams double round-robin (home and away)",
  playoffSpots: 1,
  lastRefresh: new Date().toISOString(),
  highlights: "Season starts Aug 2026 - Refresh when live data available",
  teams: {
    "New Zealand": createTeam({
      name: "New Zealand", abbr: "NZL", color: "#1a1a1a", country: "NZ", elo: 1924,
      season: { played: 0, won: 0, lost: 0, pts: 0, pf: 0, pa: 0, tries_for: 0, tries_against: 0, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 38.2, tries_pg: 5.1, gl: 67, lb: 44, rs: 2.8, c22: 51, e22: 9.8, off: 9.8 },
      defense: { tr: 90, missed: 12, to: 16.2, dom: 28, steals: 5.1, ob: 8 },
      setpiece: { so: 92, ss: 66, lo: 86, ls: 44, ps: 3.6, maul: 82 },
      kicking: { km: 398, goal: 88 },
      discipline: { pen: 55, idx: 88 },
      form: { last5: ["W", "L", "W", "W", "W"], streak: "W3", rating: 90 },
      players: [
        { name: "Ardie Savea", pos: "No.8", num: 8, rating: 94, injury: "Low", note: "Best No.8 in world rugby" },
        { name: "Jordie Barrett", pos: "FH", num: 10, rating: 93, injury: "Low", note: "SR 2026 form - elite" },
        { name: "Scott Barrett", pos: "LK", num: 5, rating: 88, injury: "Low", note: "Captain - lineout cornerstone" },
        { name: "Beauden Barrett", pos: "FB", num: 15, rating: 88, injury: "Medium", note: "World class - veteran" },
        { name: "Cam Roigard", pos: "SH", num: 9, rating: 87, injury: "Medium", note: "Explosive from SR form" }
      ]
    }),
    "South Africa": createTeam({
      name: "South Africa", abbr: "RSA", color: "#007749", country: "ZA", elo: 1906,
      season: { played: 0, won: 0, lost: 0, pts: 0, pf: 0, pa: 0, tries_for: 0, tries_against: 0, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 32.8, tries_pg: 4.2, gl: 62, lb: 31, rs: 3.2, c22: 46, e22: 8.1, off: 7.2 },
      defense: { tr: 92, missed: 11, to: 17.4, dom: 32, steals: 5.8, ob: 6 },
      setpiece: { so: 94, ss: 68, lo: 88, ls: 46, ps: 4.1, maul: 88 },
      kicking: { km: 621, goal: 85 },
      discipline: { pen: 62, idx: 84 },
      form: { last5: ["W", "W", "L", "W", "W"], streak: "W2", rating: 94 },
      players: [
        { name: "Eben Etzebeth", pos: "LK", num: 4, rating: 92, injury: "Low", note: "Set piece titan" },
        { name: "Handre Pollard", pos: "FH", num: 10, rating: 87, injury: "Low", note: "Tactical kicker" },
        { name: "Cheslin Kolbe", pos: "W", num: 14, rating: 91, injury: "Medium", note: "World class winger" },
        { name: "Kwagga Smith", pos: "FL", num: 7, rating: 88, injury: "Low", note: "Breakdown excellence" },
        { name: "Faf de Klerk", pos: "SH", num: 9, rating: 86, injury: "Low", note: "Territory kicker" }
      ]
    }),
    Australia: createTeam({
      name: "Australia", abbr: "AUS", color: "#b8860b", country: "AU", elo: 1748,
      season: { played: 0, won: 0, lost: 0, pts: 0, pf: 0, pa: 0, tries_for: 0, tries_against: 0, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 28.4, tries_pg: 3.6, gl: 52, lb: 26, rs: 3.6, c22: 38, e22: 7.2, off: 7.8 },
      defense: { tr: 83, missed: 22, to: 11.8, dom: 16, steals: 3.2, ob: 22 },
      setpiece: { so: 84, ss: 54, lo: 78, ls: 35, ps: 2.1, maul: 70 },
      kicking: { km: 498, goal: 78 },
      discipline: { pen: 78, idx: 68 },
      form: { last5: ["L", "W", "L", "W", "L"], streak: "L1", rating: 52 },
      players: [
        { name: "Tate McDermott", pos: "SH", num: 9, rating: 86, injury: "Low", note: "Explosive halfback" },
        { name: "Rob Valetini", pos: "No.8", num: 8, rating: 87, injury: "Medium", note: "Best Wallaby carrier" },
        { name: "Nick Frost", pos: "LK", num: 5, rating: 83, injury: "Low", note: "Future captain" },
        { name: "Hunter Paisami", pos: "C", num: 12, rating: 84, injury: "Low", note: "Physical midfield" },
        { name: "Noah Lolesio", pos: "FH", num: 10, rating: 82, injury: "Low", note: "Key pivot" }
      ]
    }),
    Argentina: createTeam({
      name: "Argentina", abbr: "ARG", color: "#74acdf", country: "AR", elo: 1821,
      season: { played: 0, won: 0, lost: 0, pts: 0, pf: 0, pa: 0, tries_for: 0, tries_against: 0, try_bonus: 0, loss_bonus: 0 },
      attack: { pts_pg: 30.1, tries_pg: 3.9, gl: 55, lb: 28, rs: 3.4, c22: 41, e22: 7.8, off: 8.4 },
      defense: { tr: 86, missed: 18, to: 13.4, dom: 22, steals: 4.2, ob: 14 },
      setpiece: { so: 88, ss: 60, lo: 82, ls: 38, ps: 2.8, maul: 78 },
      kicking: { km: 448, goal: 82 },
      discipline: { pen: 70, idx: 74 },
      form: { last5: ["W", "W", "L", "L", "W"], streak: "W1", rating: 75 },
      players: [
        { name: "Julián Montoya", pos: "HK", num: 2, rating: 88, injury: "Low", note: "World class hooker - captain" },
        { name: "Santiago Carreras", pos: "FH", num: 10, rating: 86, injury: "Low", note: "Attack pivot" },
        { name: "Marcos Kremer", pos: "FL", num: 7, rating: 87, injury: "Low", note: "Breakdown monster" },
        { name: "Matías Moroni", pos: "C", num: 12, rating: 82, injury: "Medium", note: "Experienced organiser" },
        { name: "Facundo Isa", pos: "No.8", num: 8, rating: 83, injury: "Low", note: "Powerful carrier" }
      ]
    })
  }
};

export default RUGBY_CHAMPIONSHIP_2026;
