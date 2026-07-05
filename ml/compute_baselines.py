"""Compute baseline stats for Six Nations teams from rugbypy data"""
import json
import numpy as np

with open('ml/rugbypy_team_stats.json') as f:
    data = json.load(f)

six_nations = ['France', 'Ireland', 'Scotland', 'Italy', 'England', 'Wales']

print('SIX NATIONS 2026 BASELINE STATS (from rugbypy):')
print(f'{"Team":12s} {"W/L":5s} {"PPG":>5s} {"TR%":>5s} {"Miss":>5s} {"LB":>5s} {"TO":>5s} {"Dom":>5s} {"Car":>5s} {"PCM":>5s} {"Rk%":>5s} {"22E":>5s} {"22C":>5s} {"Kk":>4s}')
print('-' * 90)

for team in six_nations:
    matches = [r for r in data if r['team'] == team]
    if not matches:
        print(f'{team}: NO DATA')
        continue
    n = len(matches)
    wins = sum(1 for m in matches if m['score'] > m['team_vs_score'])
    ppg = np.mean([m['score'] for m in matches])
    tr_made = sum(m['tackles_made'] for m in matches)
    tr_miss = sum(m['tackles_missed'] for m in matches)
    tr_pct = tr_made / (tr_made + tr_miss) * 100
    missed = np.mean([m['tackles_missed'] for m in matches])
    lb = np.mean([m['line_breaks'] for m in matches])
    to = np.mean([m['turnovers_won'] for m in matches])
    dom = np.mean([m['dominant_tackles'] for m in matches])
    carries = np.mean([m['carries'] for m in matches])
    pcm = np.mean([m['post_contact_metres'] for m in matches])
    rk_spd = np.mean([m['ruck_speed_0_3_pct'] for m in matches])
    e22 = np.mean([m['22m_entries'] for m in matches])
    c22 = np.mean([m['22m_conversion'] for m in matches])
    kicks = np.mean([m['kicks'] for m in matches])
    
    print(f'{team:12s} {wins}/{n-wins}  {ppg:5.1f} {tr_pct:5.1f} {missed:5.1f} {lb:5.1f} {to:5.1f} {dom:5.1f} {carries:5.0f} {pcm:5.0f} {rk_spd:5.1f} {e22:5.1f} {c22:5.2f} {kicks:4.0f}')

print()
print('These are REAL averaged stats from 5 Six Nations 2026 matches per team.')
print('Southern teams (SA, NZ, AUS, ARG, FIJ, JPN) not available in rugbypy for XV test rugby.')
