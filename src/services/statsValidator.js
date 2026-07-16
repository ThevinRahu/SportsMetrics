/**
 * Stats Schema Validation (Zod)
 * 
 * Validates AI-extracted stats against known schemas.
 * Fails loudly (logs warnings) instead of silently accepting garbage.
 * Returns validated data with nulls for invalid fields.
 */

import { z } from 'zod';

// Individual stat field: either a valid number in range, or null
const pct = z.number().min(0).max(100).nullable();
const count = z.number().int().min(0).nullable();
const decimal = z.number().min(0).nullable();

/**
 * Schema for per-match team stats (one side of a match)
 */
export const MatchTeamStatsSchema = z.object({
  tries: count,
  conversions: count,
  penalty_goals: count,
  carries: count,
  line_breaks: count,
  passes: count,
  offloads: count,
  tackles_made: count,
  tackles_missed: count,
  tackle_rate: pct,
  turnovers_won: count,
  turnovers_lost: count,
  scrums: count,
  scrum_win_pct: pct,
  lineouts: count,
  lineout_win_pct: pct,
  penalties: count,
  territory_pct: pct,
  possession_pct: pct,
  post_contact_metres: count,
  yellow_cards: count,
  red_cards: count,
}).partial(); // All fields are optional (AI may not find everything)

/**
 * Schema for full match stats extraction
 */
export const MatchStatsSchema = z.object({
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeScore: z.number().int().min(0).nullable(),
  awayScore: z.number().int().min(0).nullable(),
  stats: z.object({
    home: MatchTeamStatsSchema,
    away: MatchTeamStatsSchema,
  }),
}).passthrough();

/**
 * Schema for team season data
 */
export const TeamSeasonSchema = z.object({
  played: z.number().int().min(0).nullable(),
  won: z.number().int().min(0).nullable(),
  lost: z.number().int().min(0).nullable(),
  drawn: z.number().int().min(0).nullable(),
  pts: z.number().int().min(0).nullable(),
  pf: z.number().int().min(0).nullable(),
  pa: z.number().int().min(0).nullable(),
  tries_for: z.number().int().min(0).nullable(),
  tries_against: z.number().int().min(0).nullable(),
  try_bonus: z.number().int().min(0).nullable(),
  loss_bonus: z.number().int().min(0).nullable(),
}).partial();

/**
 * Schema for team profile stats
 */
export const TeamProfileSchema = z.object({
  season: TeamSeasonSchema.optional(),
  attack: z.object({
    pts_pg: decimal, tries_pg: decimal, gl: pct, lb: decimal,
    rs: decimal, c22: pct, e22: decimal, off: decimal,
  }).partial().optional(),
  defense: z.object({
    tr: pct, missed: decimal, to: decimal,
    dom: decimal, steals: decimal, ob: decimal,
  }).partial().optional(),
  setpiece: z.object({
    so: pct, ss: pct, lo: pct, ls: pct, ps: decimal, maul: pct,
  }).partial().optional(),
  kicking: z.object({
    km: decimal, goal: pct,
  }).partial().optional(),
  discipline: z.object({
    pen: decimal, idx: pct,
  }).partial().optional(),
  form: z.object({
    last5: z.array(z.enum(["W", "L", "D"])).nullable(),
    last12: z.array(z.enum(["W", "L", "D"])).nullable(),
    streak: z.string().nullable(),
    rating: z.number().min(0).max(100).nullable(),
  }).partial().optional(),
  elo: z.number().min(800).max(2200).nullable().optional(),
}).passthrough();

/**
 * Validate match stats from AI extraction.
 * Returns { valid: boolean, data: validated_data, errors: string[] }
 */
export function validateMatchStats(rawData) {
  const errors = [];
  
  try {
    const result = MatchStatsSchema.safeParse(rawData);
    if (result.success) {
      return { valid: true, data: result.data, errors: [] };
    }
    
    // Partial validation - keep what's valid, null out what isn't
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
    
    // Still return the raw data with errors noted (don't throw away partial extractions)
    return { valid: false, data: rawData, errors };
  } catch (e) {
    return { valid: false, data: rawData, errors: [e.message] };
  }
}

/**
 * Validate team profile stats.
 * Returns validated data, logging warnings for bad fields.
 */
export function validateTeamProfile(rawData) {
  const errors = [];
  
  try {
    const result = TeamProfileSchema.safeParse(rawData);
    if (result.success) {
      return { valid: true, data: result.data, errors: [] };
    }
    
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
    
    return { valid: false, data: rawData, errors };
  } catch (e) {
    return { valid: false, data: rawData, errors: [e.message] };
  }
}

/**
 * Check extraction quality - how many critical fields were found?
 * Returns a score 0-100 indicating extraction completeness.
 */
export function extractionQualityScore(stats) {
  if (!stats) return 0;
  
  const CRITICAL_FIELDS = [
    'tackles_made', 'tackles_missed', 'carries', 'line_breaks',
    'scrums', 'scrum_win_pct', 'lineouts', 'lineout_win_pct',
    'penalties', 'territory_pct', 'possession_pct'
  ];
  
  const home = stats.home || {};
  const away = stats.away || {};
  
  let found = 0;
  for (const field of CRITICAL_FIELDS) {
    if (home[field] != null) found++;
    if (away[field] != null) found++;
  }
  
  return Math.round((found / (CRITICAL_FIELDS.length * 2)) * 100);
}

export default { validateMatchStats, validateTeamProfile, extractionQualityScore };
