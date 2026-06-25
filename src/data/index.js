/**
 * Tournament Data Registry
 * Central export for all tournament datasets
 */

export { SUPER_RUGBY_2026 } from './superRugby2026';
export { NATIONS_CHAMPIONSHIP_2026 } from './nationsChampionship2026';
export { RUGBY_CHAMPIONSHIP_2026 } from './rugbyChampionship2026';

export const ALL_TOURNAMENTS = {
  srp2026: () => import('./superRugby2026').then(m => m.SUPER_RUGBY_2026),
  nc2026: () => import('./nationsChampionship2026').then(m => m.NATIONS_CHAMPIONSHIP_2026),
  trc2026: () => import('./rugbyChampionship2026').then(m => m.RUGBY_CHAMPIONSHIP_2026),
};
