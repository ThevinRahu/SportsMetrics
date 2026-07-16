/**
 * Extraction Prompts with Field-Specific Hints
 * 
 * The AI needs explicit guidance on where to find specific fields
 * in the page content. These hints dramatically improve extraction accuracy.
 */

export const FIELD_HINTS = {
  // Attack
  gl: 'Look for "Gainline %" or "Gainline Success" — a percentage (0-100). May appear near "22m Entries" or "Attack" section.',
  lb: 'Look for "Line Breaks" — a count, usually home value then away value.',
  rs: 'Look for "Ruck Speed" — may show as percentage rows "0-3 secs / X%". Use the 0-3 second row percentage as the value.',
  carries: 'Look for "Ball Carries" or just "Carries" — a count per team.',
  off: 'Look for "Offloads" — a count per team.',
  
  // Defense  
  tr: 'Look for "Tackle Completion %" or "Tackle Rate" — shown as "XX% Tackle Completion % YY%".',
  missed: 'Look for "Tackles Missed" — a count per team.',
  to: 'Look for "Turnovers Won" — a count per team.',
  
  // Set Piece
  so: 'Look for "Scrum Win %" — shown as "XX% Scrum Win % YY%" or "Scrums Won X/Y".',
  ss: 'Look for "Scrum Steal" or scrums lost by opposition.',
  lo: 'Look for "Lineout Win %" — shown as "XX% Lineout Win % YY%".',
  
  // Discipline
  pen: 'Look for "Penalties Conceded" — a count per team.',
  
  // Territory
  territory: 'Look for "Territory" — shown as "XX% Territory YY%".',
  possession: 'Look for "Possession" — shown as "XX% Possession YY%".',
};

/**
 * Build the match stats extraction prompt
 */
export function buildMatchStatsPrompt(homeTeam, awayTeam, content) {
  const fieldGuide = Object.entries(FIELD_HINTS)
    .map(([key, hint]) => `  ${key}: ${hint}`)
    .join('\n');

  return `You are extracting rugby match statistics from a stats page.
Match: ${homeTeam} vs ${awayTeam}

FIELD EXTRACTION GUIDE:
${fieldGuide}

The page format is typically: "HOME_VALUE Label AWAY_VALUE" (e.g. "153 Tackles Made 173")
Or for percentages: "XX% Label YY%" (e.g. "89% Tackle Completion % 87%")

Return ONLY valid JSON:
{
  "homeTeam": "${homeTeam}",
  "awayTeam": "${awayTeam}",
  "homeScore": null,
  "awayScore": null,
  "stats": {
    "home": {
      "tries": null,
      "conversions": null,
      "penalty_goals": null,
      "carries": null,
      "line_breaks": null,
      "passes": null,
      "offloads": null,
      "tackles_made": null,
      "tackles_missed": null,
      "tackle_rate": null,
      "turnovers_won": null,
      "turnovers_lost": null,
      "scrums": null,
      "scrum_win_pct": null,
      "lineouts": null,
      "lineout_win_pct": null,
      "penalties": null,
      "territory_pct": null,
      "possession_pct": null,
      "post_contact_metres": null,
      "yellow_cards": null,
      "red_cards": null
    },
    "away": {
      "tries": null,
      "conversions": null,
      "penalty_goals": null,
      "carries": null,
      "line_breaks": null,
      "passes": null,
      "offloads": null,
      "tackles_made": null,
      "tackles_missed": null,
      "tackle_rate": null,
      "turnovers_won": null,
      "turnovers_lost": null,
      "scrums": null,
      "scrum_win_pct": null,
      "lineouts": null,
      "lineout_win_pct": null,
      "penalties": null,
      "territory_pct": null,
      "possession_pct": null,
      "post_contact_metres": null,
      "yellow_cards": null,
      "red_cards": null
    }
  }
}

Use NULL for anything not found. Look carefully — stats are usually between "Match Summary" section and "Comments" section.

PAGE CONTENT:
${content}`;
}

/**
 * Build the standings extraction prompt
 */
export function buildStandingsPrompt(tournamentName, teamNames, content) {
  return `Extract standings table for "${tournamentName}" from this page.
Teams: ${teamNames.join(', ')}

Return ONLY valid JSON:
{
  "teams": {
    "Team Name": {
      "season": { "played": null, "won": null, "lost": null, "drawn": null, "pts": null, "pf": null, "pa": null, "tries_for": null, "tries_against": null, "try_bonus": null, "loss_bonus": null }
    }
  }
}

Use NULL for anything not found. Team names must EXACTLY match the list given.

CONTENT:
${content}`;
}

export default { FIELD_HINTS, buildMatchStatsPrompt, buildStandingsPrompt };
