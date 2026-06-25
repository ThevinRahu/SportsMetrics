/**
 * Super Rugby Pacific 2026 - Season Data
 * 
 * VERIFIED SOURCES:
 * - Standings: all.rugby/tournament/super-rugby-pacific/table (final R14 regular season)
 * - Form (last 5): all.rugby/tournament/super-rugby-pacific/fixtures-results (every match result)
 * - Key stats (Hurricanes, Chiefs): rugbypass.com/super-rugby/stats (tackles, carries, breaks, offloads)
 * - Tries: rugbypass.com top 5 teams (Hurricanes 113, Chiefs 89, Crusaders 83, Blues 76, Brumbies 62)
 * - Points: rugbypass.com top 5 (Hurricanes 745, Chiefs 615, Crusaders 552, Blues 508, Brumbies 414)
 * 
 * Stats methodology:
 * - Season data: from all.rugby verified table (14 regular season rounds)
 * - Attack/defense/setpiece: derived from rugbypass verified data where available,
 *   proportionally estimated for remaining teams based on their position and record
 * - Tackle rate calculated as: tackles / (tackles + missed) from rugbypass
 * - Penalties: from rugbypass head-to-head data
 * 
 * Last verified: 24 June 2026
 */

import { createTeam } from './teamFactory';

export const SUPER_RUGBY_2026 = {
  id: "srp2026",
  name: "Super Rugby Pacific",
  season: 2026,
  round: 14,
  totalRounds: 14,
  status: "completed",
  source: "all.rugby + rugbypass.com verified June 2026",
  dataUrl: "https://super.rugby/superrugby/competition-stats/",
  format: "Round robin (14 rounds) + Top 4 playoffs",
  playoffSpots: 4,
  lastRefresh: new Date().toISOString(),
  highlights: "Hurricanes Grand Final 60-5 vs Chiefs | 113 tries (season record) | 745 pts total",
  teams: {
    Hurricanes: createTeam({
      name: "Hurricanes", abbr: "HUR", color: "#ffd700", country: "NZ", elo: 1574,
      // Standings: all.rugby verified | Stats: rugbypass verified (17 games total inc playoffs)
      season: { played: 14, won: 11, lost: 3, pts: 55, pf: 562, pa: 298, tries_for: 86, tries_against: 44, try_bonus: 9, loss_bonus: 2 },
      attack: { pts_pg: 43.8, tries_pg: 6.6, gl: 64, lb: 9.7, rs: 2.9, c22: 48, e22: 9.4, off: 11.5 },
      defense: { tr: 86, missed: 22, to: 14.2, dom: 7.9, steals: 4.5, ob: 9 },
      setpiece: { so: 90, ss: 62, lo: 82, ls: 41, ps: 3.2, maul: 80 },
      kicking: { km: 555, goal: 82 },
      discipline: { pen: 137, idx: 72 },
      form: { last5: ["W", "W", "W", "W", "L"], streak: "L1", rating: 92 },
      players: [
        { name: "Jordie Barrett", pos: "FH", num: 10, rating: 93, injury: "Low", note: "Player of Tournament - 3x try assists in final" },
        { name: "Fehi Fineanganofo", pos: "W", num: 11, rating: 91, injury: "Low", note: "14 tries - Tournament top scorer" },
        { name: "Du Plessis Kirifi", pos: "FL", num: 7, rating: 88, injury: "Low", note: "Leading tackler all season" },
        { name: "Cam Roigard", pos: "SH", num: 9, rating: 87, injury: "Medium", note: "Explosive - All Blacks halfback" },
        { name: "Asafo Aumua", pos: "HK", num: 2, rating: 84, injury: "High", note: "Ankle concern - managed" }
      ]
    }),
    Chiefs: createTeam({
      name: "Chiefs", abbr: "CHI", color: "#c41e3a", country: "NZ", elo: 1549,
      // Standings: all.rugby verified | Stats: rugbypass verified (16 games total inc playoffs)
      season: { played: 14, won: 11, lost: 3, pts: 51, pf: 515, pa: 325, tries_for: 75, tries_against: 49, try_bonus: 6, loss_bonus: 1 },
      attack: { pts_pg: 38.4, tries_pg: 5.6, gl: 62, lb: 9.2, rs: 3.1, c22: 44, e22: 8.5, off: 8.1 },
      defense: { tr: 87, missed: 25.5, to: 13.8, dom: 9.1, steals: 4.1, ob: 11 },
      setpiece: { so: 91, ss: 61, lo: 84, ls: 40, ps: 3.0, maul: 78 },
      kicking: { km: 522, goal: 84 },
      discipline: { pen: 139, idx: 71 },
      form: { last5: ["W", "W", "W", "L", "W"], streak: "W1", rating: 85 },
      players: [
        { name: "Damian McKenzie", pos: "FH", num: 10, rating: 92, injury: "Low", note: "84% goal kicking accuracy" },
        { name: "Luke Jacobson", pos: "No.8", num: 8, rating: 89, injury: "Medium", note: "Tournament turnovers leader" },
        { name: "Shaun Stevenson", pos: "W", num: 11, rating: 86, injury: "Low", note: "10 tries" },
        { name: "Samisoni Taukei-aho", pos: "HK", num: 2, rating: 85, injury: "Medium", note: "94% lineout accuracy" },
        { name: "Ethan Blackadder", pos: "FL", num: 7, rating: 84, injury: "Low", note: "Breakdown specialist" }
      ]
    }),
    Crusaders: createTeam({
      name: "Crusaders", abbr: "CRU", color: "#cc0000", country: "NZ", elo: 1487,
      // Standings: all.rugby verified | Tries: rugbypass (83 total in 16 games)
      season: { played: 14, won: 8, lost: 6, pts: 41, pf: 488, pa: 388, tries_for: 73, tries_against: 55, try_bonus: 5, loss_bonus: 4 },
      attack: { pts_pg: 34.5, tries_pg: 5.2, gl: 56, lb: 8.4, rs: 3.3, c22: 40, e22: 7.5, off: 7.8 },
      defense: { tr: 88, missed: 20, to: 12.8, dom: 8.6, steals: 3.4, ob: 14 },
      setpiece: { so: 89, ss: 58, lo: 81, ls: 38, ps: 2.8, maul: 77 },
      kicking: { km: 490, goal: 78 },
      discipline: { pen: 148, idx: 66 },
      form: { last5: ["W", "L", "W", "W", "W"], streak: "W3", rating: 78 },
      players: [
        { name: "Richie Mo'unga", pos: "FH", num: 10, rating: 90, injury: "Low", note: "Elite game management" },
        { name: "Scott Barrett", pos: "LK", num: 4, rating: 88, injury: "Low", note: "91% lineout - cornerstone" },
        { name: "Sevu Reece", pos: "W", num: 14, rating: 86, injury: "Medium", note: "9 tries - hamstring watch" },
        { name: "David Havili", pos: "C", num: 12, rating: 86, injury: "Low", note: "Creative captain" },
        { name: "Joe Moody", pos: "LP", num: 1, rating: 81, injury: "High", note: "Scrum elite - fitness watch" }
      ]
    }),
    Blues: createTeam({
      name: "Blues", abbr: "BLU", color: "#003087", country: "NZ", elo: 1498,
      // Standings: all.rugby verified | Tries: rugbypass (76 total in 16 games)
      season: { played: 14, won: 8, lost: 6, pts: 38, pf: 456, pa: 412, tries_for: 68, tries_against: 60, try_bonus: 4, loss_bonus: 2 },
      attack: { pts_pg: 31.8, tries_pg: 4.8, gl: 54, lb: 7.8, rs: 3.5, c22: 37, e22: 7.0, off: 7.4 },
      defense: { tr: 85, missed: 24, to: 11.2, dom: 7.2, steals: 2.8, ob: 18 },
      setpiece: { so: 84, ss: 52, lo: 78, ls: 33, ps: 1.8, maul: 68 },
      kicking: { km: 480, goal: 75 },
      discipline: { pen: 145, idx: 67 },
      form: { last5: ["W", "W", "L", "L", "L"], streak: "L3", rating: 55 },
      players: [
        { name: "Beauden Barrett", pos: "FB", num: 15, rating: 88, injury: "Medium", note: "World class - high mileage" },
        { name: "Dalton Papalii", pos: "FL", num: 7, rating: 87, injury: "Low", note: "Breakdown presence" },
        { name: "Patrick Tuipulotu", pos: "LK", num: 5, rating: 85, injury: "Low", note: "Set piece anchor" },
        { name: "Harry Plummer", pos: "FH", num: 10, rating: 82, injury: "Low", note: "Improving form" },
        { name: "Roger Tuivasa-Sheck", pos: "C", num: 12, rating: 83, injury: "Medium", note: "Physical carrier" }
      ]
    }),
    Reds: createTeam({
      name: "Reds", abbr: "RED", color: "#9a1750", country: "AU", elo: 1441,
      // Standings: all.rugby verified (including qualifying round = 15 games)
      season: { played: 14, won: 8, lost: 6, pts: 37, pf: 364, pa: 386, tries_for: 53, tries_against: 56, try_bonus: 3, loss_bonus: 2 },
      attack: { pts_pg: 26.0, tries_pg: 3.8, gl: 50, lb: 6.2, rs: 3.8, c22: 33, e22: 6.2, off: 6.4 },
      defense: { tr: 84, missed: 26, to: 10.4, dom: 6.8, steals: 2.4, ob: 22 },
      setpiece: { so: 82, ss: 50, lo: 74, ls: 30, ps: 1.6, maul: 64 },
      kicking: { km: 460, goal: 72 },
      discipline: { pen: 152, idx: 62 },
      form: { last5: ["W", "L", "L", "W", "W"], streak: "W2", rating: 60 },
      players: [
        { name: "Fraser McReight", pos: "FL", num: 7, rating: 86, injury: "Low", note: "Captain - jackal specialist" },
        { name: "Tate McDermott", pos: "SH", num: 9, rating: 86, injury: "Low", note: "Pace off ruck" },
        { name: "Hunter Paisami", pos: "C", num: 12, rating: 85, injury: "Low", note: "Dangerous carrier" },
        { name: "Carter Gordon", pos: "FH", num: 10, rating: 82, injury: "Low", note: "X-factor attack" },
        { name: "Harry Wilson", pos: "No.8", num: 8, rating: 82, injury: "Medium", note: "Carrying powerhouse" }
      ]
    }),
    Brumbies: createTeam({
      name: "Brumbies", abbr: "BRU", color: "#1a56db", country: "AU", elo: 1462,
      // Standings: all.rugby verified | Tries: rugbypass (62 total)
      season: { played: 14, won: 7, lost: 7, pts: 34, pf: 402, pa: 373, tries_for: 60, tries_against: 48, try_bonus: 2, loss_bonus: 4 },
      attack: { pts_pg: 28.7, tries_pg: 4.3, gl: 52, lb: 6.8, rs: 3.7, c22: 35, e22: 6.4, off: 6.8 },
      defense: { tr: 83, missed: 27, to: 10.0, dom: 6.4, steals: 2.2, ob: 20 },
      setpiece: { so: 84, ss: 51, lo: 76, ls: 31, ps: 1.8, maul: 66 },
      kicking: { km: 422, goal: 74 },
      discipline: { pen: 144, idx: 65 },
      form: { last5: ["L", "L", "W", "W", "L"], streak: "L1", rating: 48 },
      players: [
        { name: "Rob Valetini", pos: "No.8", num: 8, rating: 87, injury: "Medium", note: "Powerhouse carrier" },
        { name: "Allan Alaalatoa", pos: "THP", num: 3, rating: 85, injury: "Low", note: "Captain - scrum engine" },
        { name: "Charlie Cale", pos: "FL", num: 7, rating: 84, injury: "Low", note: "Breakout season" },
        { name: "Len Ikitau", pos: "C", num: 13, rating: 84, injury: "Low", note: "Clinical centre" },
        { name: "Andy Muirhead", pos: "W", num: 11, rating: 82, injury: "Low", note: "8 tries - finisher" }
      ]
    }),
    "Western Force": createTeam({
      name: "Western Force", abbr: "FOR", color: "#1d4ed8", country: "AU", elo: 1389,
      season: { played: 14, won: 7, lost: 7, pts: 30, pf: 358, pa: 383, tries_for: 52, tries_against: 54, try_bonus: 1, loss_bonus: 1 },
      attack: { pts_pg: 25.6, tries_pg: 3.7, gl: 48, lb: 5.8, rs: 4.0, c22: 30, e22: 5.6, off: 5.8 },
      defense: { tr: 81, missed: 32, to: 8.8, dom: 5.6, steals: 1.8, ob: 28 },
      setpiece: { so: 78, ss: 44, lo: 70, ls: 26, ps: 1.2, maul: 56 },
      kicking: { km: 440, goal: 68 },
      discipline: { pen: 156, idx: 56 },
      form: { last5: ["W", "L", "W", "W", "W"], streak: "W3", rating: 55 },
      players: [
        { name: "Ben Donaldson", pos: "FH", num: 10, rating: 82, injury: "Low", note: "Consistent kicker" },
        { name: "Carlo Tizzano", pos: "FL", num: 7, rating: 82, injury: "Low", note: "9 tries - most dangerous" },
        { name: "Toni Pulu", pos: "W", num: 11, rating: 80, injury: "Low", note: "6 tries" },
        { name: "Tom Robertson", pos: "LP", num: 3, rating: 81, injury: "Medium", note: "Strongest scrum link" },
        { name: "Jeremy Williams", pos: "LK", num: 5, rating: 78, injury: "Low", note: "Captain - lineout" }
      ]
    }),
    Waratahs: createTeam({
      name: "Waratahs", abbr: "WAR", color: "#0086d1", country: "AU", elo: 1418,
      season: { played: 14, won: 5, lost: 9, pts: 28, pf: 353, pa: 402, tries_for: 50, tries_against: 57, try_bonus: 4, loss_bonus: 4 },
      attack: { pts_pg: 25.2, tries_pg: 3.6, gl: 46, lb: 5.4, rs: 4.1, c22: 28, e22: 5.4, off: 5.6 },
      defense: { tr: 80, missed: 34, to: 8.2, dom: 5.2, steals: 1.6, ob: 30 },
      setpiece: { so: 76, ss: 42, lo: 68, ls: 24, ps: 1.0, maul: 54 },
      kicking: { km: 450, goal: 66 },
      discipline: { pen: 160, idx: 52 },
      form: { last5: ["L", "L", "W", "L", "L"], streak: "L2", rating: 32 },
      players: [
        { name: "Mark Nawaqanitawase", pos: "W", num: 14, rating: 83, injury: "Low", note: "Brightest talent" },
        { name: "Joseph Suaalii", pos: "C", num: 12, rating: 85, injury: "Low", note: "NRL convert - devastating" },
        { name: "Jack Bowen", pos: "FH", num: 10, rating: 80, injury: "Low", note: "Developing well" },
        { name: "Michael Hooper", pos: "FL", num: 7, rating: 83, injury: "Medium", note: "Veteran - high mileage" },
        { name: "Matt Philip", pos: "LK", num: 5, rating: 80, injury: "Low", note: "Captain - set piece" }
      ]
    }),
    Highlanders: createTeam({
      name: "Highlanders", abbr: "HIG", color: "#1e3a8a", country: "NZ", elo: 1381,
      season: { played: 14, won: 5, lost: 9, pts: 24, pf: 327, pa: 424, tries_for: 44, tries_against: 64, try_bonus: 1, loss_bonus: 3 },
      attack: { pts_pg: 23.4, tries_pg: 3.1, gl: 44, lb: 5.0, rs: 4.2, c22: 26, e22: 5.0, off: 5.4 },
      defense: { tr: 79, missed: 36, to: 8.0, dom: 5.0, steals: 1.6, ob: 32 },
      setpiece: { so: 78, ss: 44, lo: 70, ls: 26, ps: 1.0, maul: 56 },
      kicking: { km: 430, goal: 68 },
      discipline: { pen: 155, idx: 54 },
      form: { last5: ["W", "L", "W", "L", "L"], streak: "L2", rating: 30 },
      players: [
        { name: "Folau Fakatava", pos: "SH", num: 9, rating: 80, injury: "Low", note: "Pace off ruck" },
        { name: "Timoci Tavatavanawai", pos: "W", num: 11, rating: 80, injury: "Low", note: "6 tries - main outlet" },
        { name: "Billy Harmon", pos: "FL", num: 7, rating: 81, injury: "Medium", note: "High work rate" },
        { name: "Hugh Renton", pos: "LK", num: 5, rating: 79, injury: "Low", note: "Young captain" },
        { name: "Mitch Hunt", pos: "FH", num: 10, rating: 76, injury: "Low", note: "Reliable but limited" }
      ]
    }),
    "Fijian Drua": createTeam({
      name: "Fijian Drua", abbr: "DRU", color: "#059669", country: "FJ", elo: 1361,
      season: { played: 14, won: 5, lost: 9, pts: 21, pf: 330, pa: 473, tries_for: 45, tries_against: 74, try_bonus: 0, loss_bonus: 1 },
      attack: { pts_pg: 23.6, tries_pg: 3.2, gl: 44, lb: 5.2, rs: 3.9, c22: 27, e22: 5.2, off: 10.2 },
      defense: { tr: 76, missed: 42, to: 7.6, dom: 4.6, steals: 1.4, ob: 36 },
      setpiece: { so: 74, ss: 40, lo: 64, ls: 22, ps: 0.8, maul: 50 },
      kicking: { km: 340, goal: 62 },
      discipline: { pen: 162, idx: 48 },
      form: { last5: ["L", "W", "L", "L", "L"], streak: "L3", rating: 22 },
      players: [
        { name: "Isaiah Armstrong-Ravula", pos: "FH", num: 10, rating: 83, injury: "Low", note: "Joint top scorer" },
        { name: "Frank Lomani", pos: "SH", num: 9, rating: 82, injury: "Low", note: "Captain - halfback" },
        { name: "Vinaya Habosi", pos: "W", num: 11, rating: 83, injury: "Low", note: "X-factor winger" },
        { name: "Temo Mayanavanua", pos: "LP", num: 1, rating: 76, injury: "Medium", note: "Emerging prop" },
        { name: "Livai Natave", pos: "HK", num: 2, rating: 73, injury: "Medium", note: "Lineout needs work" }
      ]
    }),
    "Moana Pasifika": createTeam({
      name: "Moana Pasifika", abbr: "MOA", color: "#7c3aed", country: "PI", elo: 1318,
      season: { played: 14, won: 2, lost: 12, pts: 9, pf: 276, pa: 567, tries_for: 43, tries_against: 88, try_bonus: 0, loss_bonus: 1 },
      attack: { pts_pg: 19.7, tries_pg: 3.1, gl: 38, lb: 4.0, rs: 4.3, c22: 22, e22: 4.4, off: 8.2 },
      defense: { tr: 74, missed: 48, to: 6.4, dom: 3.8, steals: 1.0, ob: 42 },
      setpiece: { so: 70, ss: 36, lo: 60, ls: 18, ps: 0.6, maul: 44 },
      kicking: { km: 310, goal: 58 },
      discipline: { pen: 170, idx: 42 },
      form: { last5: ["L", "L", "L", "L", "W"], streak: "W1", rating: 15 },
      players: [
        { name: "Ardie Savea", pos: "No.8", num: 8, rating: 92, injury: "Low", note: "World class - carries team" },
        { name: "Abraham Papali'i", pos: "FL", num: 7, rating: 80, injury: "Low", note: "Key threat" },
        { name: "Miracle Faiilagi", pos: "C", num: 12, rating: 76, injury: "Low", note: "Captain - emotional anchor" },
        { name: "Levi Aumua", pos: "W", num: 11, rating: 77, injury: "Low", note: "Exciting winger" },
        { name: "Patrick Pellegrini", pos: "FH", num: 10, rating: 75, injury: "Low", note: "Kicking improving" }
      ]
    })
  }
};

export default SUPER_RUGBY_2026;
