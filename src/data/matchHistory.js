/**
 * Historical Match Results Database
 * 
 * Real match results used to train ML models on actual outcomes.
 * Format: [homeTeam, awayTeam, homeScore, awayScore, year, competition]
 * 
 * Sources: all.rugby, sixnationsrugby.com, rugbypass.com (verified)
 * 
 * This gives the ML model REAL outcome data to learn from,
 * not synthetic data generated from team metrics.
 */

// Super Rugby Pacific 2026 - ALL 70+ regular season matches (from all.rugby verified)
export const SUPER_RUGBY_2026_MATCHES = [
  ["Highlanders","Crusaders",25,23,"2026","SRP"],
  ["Waratahs","Reds",36,12,"2026","SRP"],
  ["Fijian Drua","Moana Pasifika",26,40,"2026","SRP"],
  ["Blues","Chiefs",15,19,"2026","SRP"],
  ["Western Force","Brumbies",24,56,"2026","SRP"],
  ["Hurricanes","Moana Pasifika",52,10,"2026","SRP"],
  ["Waratahs","Fijian Drua",36,13,"2026","SRP"],
  ["Highlanders","Chiefs",23,26,"2026","SRP"],
  ["Western Force","Blues",32,42,"2026","SRP"],
  ["Crusaders","Brumbies",24,50,"2026","SRP"],
  ["Moana Pasifika","Western Force",19,35,"2026","SRP"],
  ["Reds","Highlanders",31,14,"2026","SRP"],
  ["Fijian Drua","Hurricanes",25,20,"2026","SRP"],
  ["Chiefs","Crusaders",33,43,"2026","SRP"],
  ["Brumbies","Blues",30,27,"2026","SRP"],
  ["Chiefs","Moana Pasifika",57,24,"2026","SRP"],
  ["Waratahs","Hurricanes",19,59,"2026","SRP"],
  ["Highlanders","Western Force",39,31,"2026","SRP"],
  ["Blues","Crusaders",29,13,"2026","SRP"],
  ["Brumbies","Reds",31,34,"2026","SRP"],
  ["Hurricanes","Western Force",31,23,"2026","SRP"],
  ["Fijian Drua","Brumbies",42,27,"2026","SRP"],
  ["Crusaders","Highlanders",29,18,"2026","SRP"],
  ["Reds","Waratahs",26,17,"2026","SRP"],
  ["Blues","Moana Pasifika",43,7,"2026","SRP"],
  ["Highlanders","Hurricanes",7,50,"2026","SRP"],
  ["Brumbies","Chiefs",33,24,"2026","SRP"],
  ["Fijian Drua","Reds",6,21,"2026","SRP"],
  ["Moana Pasifika","Crusaders",21,50,"2026","SRP"],
  ["Waratahs","Blues",20,35,"2026","SRP"],
  ["Moana Pasifika","Highlanders",19,39,"2026","SRP"],
  ["Brumbies","Waratahs",28,30,"2026","SRP"],
  ["Hurricanes","Reds",52,14,"2026","SRP"],
  ["Blues","Fijian Drua",40,15,"2026","SRP"],
  ["Western Force","Chiefs",14,24,"2026","SRP"],
  ["Crusaders","Fijian Drua",69,26,"2026","SRP"],
  ["Chiefs","Waratahs",42,14,"2026","SRP"],
  ["Reds","Western Force",19,42,"2026","SRP"],
  ["Highlanders","Brumbies",10,14,"2026","SRP"],
  ["Moana Pasifika","Chiefs",17,62,"2026","SRP"],
  ["Fijian Drua","Western Force",24,22,"2026","SRP"],
  ["Hurricanes","Blues",42,19,"2026","SRP"],
  ["Reds","Crusaders",31,26,"2026","SRP"],
  ["Blues","Highlanders",47,40,"2026","SRP"],
  ["Waratahs","Moana Pasifika",29,14,"2026","SRP"],
  ["Chiefs","Hurricanes",22,17,"2026","SRP"],
  ["Brumbies","Fijian Drua",28,33,"2026","SRP"],
  ["Western Force","Crusaders",31,26,"2026","SRP"],
  ["Crusaders","Waratahs",35,20,"2026","SRP"],
  ["Hurricanes","Brumbies",45,12,"2026","SRP"],
  ["Blues","Reds",36,33,"2026","SRP"],
  ["Highlanders","Moana Pasifika",27,17,"2026","SRP"],
  ["Chiefs","Fijian Drua",42,22,"2026","SRP"],
  ["Hurricanes","Crusaders",38,31,"2026","SRP"],
  ["Waratahs","Western Force",17,20,"2026","SRP"],
  ["Fijian Drua","Highlanders",24,14,"2026","SRP"],
  ["Moana Pasifika","Blues",19,45,"2026","SRP"],
  ["Reds","Brumbies",30,21,"2026","SRP"],
  ["Crusaders","Blues",36,20,"2026","SRP"],
  ["Reds","Chiefs",21,31,"2026","SRP"],
  ["Highlanders","Waratahs",31,26,"2026","SRP"],
  ["Moana Pasifika","Hurricanes",17,50,"2026","SRP"],
  ["Brumbies","Western Force",32,15,"2026","SRP"],
  ["Chiefs","Highlanders",42,12,"2026","SRP"],
  ["Fijian Drua","Waratahs",35,50,"2026","SRP"],
  ["Blues","Hurricanes",24,47,"2026","SRP"],
  ["Western Force","Reds",19,14,"2026","SRP"],
  ["Crusaders","Chiefs",36,32,"2026","SRP"],
  ["Waratahs","Brumbies",14,21,"2026","SRP"],
  ["Moana Pasifika","Reds",31,33,"2026","SRP"],
  ["Hurricanes","Highlanders",45,28,"2026","SRP"],
  ["Western Force","Fijian Drua",19,15,"2026","SRP"],
  ["Crusaders","Hurricanes",47,14,"2026","SRP"],
  ["Reds","Fijian Drua",45,24,"2026","SRP"],
  ["Brumbies","Moana Pasifika",19,21,"2026","SRP"],
  ["Chiefs","Blues",59,34,"2026","SRP"],
  ["Western Force","Waratahs",31,25,"2026","SRP"],
];

// Six Nations 2026 - ALL matches (from sixnationsrugby.com verified)
export const SIX_NATIONS_2026_MATCHES = [
  ["France","Ireland",36,14,"2026","6N"],
  ["Italy","Scotland",18,15,"2026","6N"],
  ["England","Wales",48,7,"2026","6N"],
  ["Ireland","Italy",20,13,"2026","6N"],
  ["Scotland","England",31,20,"2026","6N"],
  ["Wales","France",12,54,"2026","6N"],
  ["England","Ireland",21,42,"2026","6N"],
  ["Wales","Scotland",23,26,"2026","6N"],
  ["France","Italy",33,8,"2026","6N"],
  ["Ireland","Wales",27,17,"2026","6N"],
  ["Scotland","France",50,40,"2026","6N"],
  ["Italy","England",23,18,"2026","6N"],
  ["Ireland","Scotland",43,21,"2026","6N"],
  ["Wales","Italy",31,17,"2026","6N"],
  ["France","England",48,46,"2026","6N"],
];

/**
 * Get all historical matches as a flat array
 */
export function getAllMatches() {
  return [...SUPER_RUGBY_2026_MATCHES, ...SIX_NATIONS_2026_MATCHES];
}

/**
 * Get matches for a specific team
 */
export function getTeamMatches(teamName) {
  return getAllMatches().filter(m => m[0] === teamName || m[1] === teamName);
}

/**
 * Get head-to-head history between two teams
 */
export function getH2H(teamA, teamB) {
  return getAllMatches().filter(m => 
    (m[0] === teamA && m[1] === teamB) || (m[0] === teamB && m[1] === teamA)
  );
}

export default { getAllMatches, getTeamMatches, getH2H, SUPER_RUGBY_2026_MATCHES, SIX_NATIONS_2026_MATCHES };
