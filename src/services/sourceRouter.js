/**
 * Source Router - directs data fetches to the correct page type
 * 
 * Root cause fix: tournament index pages don't carry per-match advanced stats
 * like gainline%, ruck speed, scrums won. Those only live on match-center pages.
 */

export const SOURCE_TYPES = {
  standings: { 
    fields: ['played','won','lost','drawn','pts','pf','pa','tries_for','tries_against','try_bonus','loss_bonus'],
    description: 'Tournament table page - season aggregates only'
  },
  matchStats: { 
    fields: ['gainline','ruck_speed','tackles','missed_tackles','carries','line_breaks','scrums','scrum_pct','lineouts','lineout_pct','penalties','turnovers','territory','possession'],
    description: 'Per-match stats page - detailed performance metrics'
  },
};

function slugify(teamName) {
  return teamName.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Resolve the URL for a specific match's stats page
 */
export function resolveMatchStatsUrl(homeTeam, awayTeam) {
  return `https://www.rugbypass.com/live/${slugify(homeTeam)}-vs-${slugify(awayTeam)}/stats/`;
}

/**
 * Resolve standings URL for a tournament
 */
export function resolveStandingsUrl(tournamentId) {
  const urls = {
    nc2026: 'https://www.rugbypass.com/nations-championship/standings/',
    srp2026: 'https://super.rugby/superrugby/competition-stats/',
    trc2026: 'https://all.rugby/tournament/rugby-championship/table',
  };
  return urls[tournamentId] || null;
}

/**
 * Given a tournament's fixture list, resolve all match stats URLs for completed matches
 */
export function resolveAllMatchUrls(results) {
  if (!Array.isArray(results)) return [];
  const urls = [];
  for (const round of results) {
    if (!round.matches) continue;
    for (const match of round.matches) {
      urls.push({
        url: resolveMatchStatsUrl(match.home, match.away),
        homeTeam: match.home,
        awayTeam: match.away,
        round: round.round,
        date: round.date,
      });
    }
  }
  return urls;
}

export default { SOURCE_TYPES, resolveMatchStatsUrl, resolveStandingsUrl, resolveAllMatchUrls };
