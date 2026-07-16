/**
 * Seed full tournament data to Neon Postgres via the /api/seed endpoint.
 * 
 * Usage: node --experimental-vm-modules scripts/seed-full.mjs
 * 
 * This script builds the tournament data using a minimal inline version
 * of createTeam, then posts it to the production API.
 */

const API_URL = 'https://sports-metrics.vercel.app/api/seed';
const SECRET = 'SportsMetricsCronLive';

// Minimal createTeam equivalent (just passes through the data as-is)
function createTeam(config) {
  const { name, abbr, color, country, elo, sport = "rugby",
    season = {}, attack = {}, defense = {},
    setpiece = {}, kicking = {}, discipline = {},
    form = {}, players = [] } = config;
  return {
    name: name || "",
    abbr: abbr || (name || "").slice(0, 3).toUpperCase(),
    color: color || "#10b981",
    country: country || "",
    elo: elo || 1400,
    sport: sport,
    season: {
      played: season.played || 0, won: season.won || 0, lost: season.lost || 0, drawn: season.drawn || 0,
      pts: season.pts || 0, pf: season.pf || 0, pa: season.pa || 0,
      pd: (season.pf || 0) - (season.pa || 0),
      tries_for: season.tries_for || 0, tries_against: season.tries_against || 0,
      try_bonus: season.try_bonus || 0, loss_bonus: season.loss_bonus || 0
    },
    attack: { pts_pg: attack.pts_pg || 0, tries_pg: attack.tries_pg || 0, gl: attack.gl || 50, lb: attack.lb || 15, rs: attack.rs || 4.0, c22: attack.c22 || 30, e22: attack.e22 || 6, off: attack.off || 6 },
    defense: { tr: defense.tr || 80, missed: defense.missed || 25, to: defense.to || 10, dom: defense.dom || 15, steals: defense.steals || 2, ob: defense.ob || 20 },
    setpiece: { so: setpiece.so || 80, ss: setpiece.ss || 50, lo: setpiece.lo || 75, ls: setpiece.ls || 30, ps: setpiece.ps || 1.5, maul: setpiece.maul || 65 },
    kicking: { km: kicking.km || 400, goal: kicking.goal || 72 },
    discipline: { pen: discipline.pen || 80, idx: discipline.idx || 65 },
    form: { last5: form.last5 || ["W","L","W","L","W"], streak: form.streak || "W1", rating: form.rating || 60 },
    players: players.map(p => ({ name: p.name || "", pos: p.pos || "", num: p.num || 0, rating: p.rating || 70, injury: p.injury || "Low", note: p.note || "" }))
  };
}

// We'll read the source file content and eval it with createTeam available
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// Read and eval each tournament file
function loadTournament(filename, exportName) {
  let src = readFileSync(join(root, 'src', 'data', filename), 'utf-8');
  // Remove import/export statements
  src = src.replace(/import\s+.*?from\s+['"].*?['"];?\n?/g, '');
  src = src.replace(/export\s+default\s+\w+;?\n?/g, '');
  src = src.replace(/export\s+const\s+/g, 'const ');
  src = src.replace(/export\s+/g, '');
  // Eval with createTeam in scope
  const fn = new Function('createTeam', src + `\nreturn ${exportName};`);
  return fn(createTeam);
}

async function seedTournament(data, id) {
  console.log(`Seeding ${id}...`);
  const body = JSON.stringify({ tournament: { ...data, id } });
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body
  });
  const result = await res.json();
  console.log(`  ${id}: ${res.status}`, result);
  return result;
}

async function main() {
  console.log('Loading tournament data from source files...\n');
  
  const nc2026 = loadTournament('nationsChampionship2026.js', 'NATIONS_CHAMPIONSHIP_2026');
  console.log(`  NC2026: ${Object.keys(nc2026.teams).length} teams loaded`);
  
  const srp2026 = loadTournament('superRugby2026.js', 'SUPER_RUGBY_2026');
  console.log(`  SRP2026: ${Object.keys(srp2026.teams).length} teams loaded`);
  
  const trc2026 = loadTournament('rugbyChampionship2026.js', 'RUGBY_CHAMPIONSHIP_2026');
  console.log(`  TRC2026: ${Object.keys(trc2026.teams).length} teams loaded`);
  
  console.log('\nSeeding to Postgres...\n');
  
  await seedTournament(nc2026, 'nc2026');
  await seedTournament(srp2026, 'srp2026');
  await seedTournament(trc2026, 'trc2026');
  
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
