"""
Compute final Nations Championship team stats:
- Northern teams: 80% Six Nations baseline + 20% Round 1
- Southern teams: Round 1 data only (no rugbypy test data available)
- Elo: computed from updateRatings after Round 1

Outputs the stats in our app format for manual paste into nationsChampionship2026.js
"""
import json
import numpy as np
import math

# Load rugbypy stats (Six Nations 2026 data)
with open('ml/rugbypy_team_stats.json') as f:
    all_stats = json.load(f)

# Six Nations baseline (5 matches per team)
def get_six_nations_avg(team_name):
    matches = [r for r in all_stats if r['team'] == team_name]
    if not matches:
        return None
    n = len(matches)
    wins = sum(1 for m in matches if m['score'] > m['team_vs_score'])
    return {
        'ppg': np.mean([m['score'] for m in matches]),
        'papg': np.mean([m['team_vs_score'] for m in matches]),
        'win_rate': wins / n,
        'tackles_made': np.mean([m['tackles_made'] for m in matches]),
        'tackles_missed': np.mean([m['tackles_missed'] for m in matches]),
        'line_breaks': np.mean([m['line_breaks'] for m in matches]),
        'turnovers_won': np.mean([m['turnovers_won'] for m in matches]),
        'dominant_tackles': np.mean([m['dominant_tackles'] for m in matches]),
        'carries': np.mean([m['carries'] for m in matches]),
        'pcm': np.mean([m['post_contact_metres'] for m in matches]),
        'ruck_speed': np.mean([m['ruck_speed_0_3_pct'] for m in matches]),
        '22m_entries': np.mean([m['22m_entries'] for m in matches]),
        '22m_conversion': np.mean([m['22m_conversion'] for m in matches]),
        'kicks': np.mean([m['kicks'] for m in matches]),
        'tackle_offload_allowed': np.mean([m['tackle_offload_allowed'] for m in matches]),
        'rucks_won': np.mean([m['rucks_won'] for m in matches]),
    }

# Round 1 stats from rugbypass (already verified)
round1 = {
    'New Zealand': {'score': 34, 'tries': 5, 'tackles_made': 165, 'tackles_missed': 25, 'line_breaks': 11, 'turnovers_won': 3, 'dominant_tackles': 13, 'carries': 146, 'pcm': 311, 'ruck_speed': 81, '22m_entries': 9, '22m_conversion': 3.78, 'kicks': 17, 'offloads_allowed': 15, 'penalties': 11, 'scrums_pct': 92, 'lineouts_pct': 86},
    'France': {'score': 32, 'tries': 4, 'tackles_made': 188, 'tackles_missed': 27, 'line_breaks': 12, 'turnovers_won': 2, 'dominant_tackles': 16, 'carries': 146, 'pcm': 285, 'ruck_speed': 77, '22m_entries': 9, '22m_conversion': 3.22, 'kicks': 21, 'offloads_allowed': 8, 'penalties': 11, 'scrums_pct': 86, 'lineouts_pct': 83},
    'Australia': {'score': 31, 'tries': 5, 'tackles_made': 153, 'tackles_missed': 18, 'line_breaks': 10, 'turnovers_won': 3, 'dominant_tackles': 15, 'carries': 141, 'pcm': 368, 'ruck_speed': 70, '22m_entries': 14, '22m_conversion': 3.71, 'kicks': 22, 'offloads_allowed': 10, 'penalties': 12, 'scrums_pct': 100, 'lineouts_pct': 92},
    'Ireland': {'score': 33, 'tries': 5, 'tackles_made': 173, 'tackles_missed': 31, 'line_breaks': 4, 'turnovers_won': 2, 'dominant_tackles': 14, 'carries': 126, 'pcm': 227, 'ruck_speed': 65, '22m_entries': 9, '22m_conversion': 3.5, 'kicks': 22, 'offloads_allowed': 9, 'penalties': 10, 'scrums_pct': 100, 'lineouts_pct': 82},
    'South Africa': {'score': 45, 'tries': 7, 'tackles_made': 174, 'tackles_missed': 29, 'line_breaks': 10, 'turnovers_won': 4, 'dominant_tackles': 14, 'carries': 117, 'pcm': 324, 'ruck_speed': 72, '22m_entries': 12, '22m_conversion': 4.0, 'kicks': 30, 'offloads_allowed': 12, 'penalties': 6, 'scrums_pct': 100, 'lineouts_pct': 89},
    'England': {'score': 21, 'tries': 3, 'tackles_made': 162, 'tackles_missed': 30, 'line_breaks': 5, 'turnovers_won': 1, 'dominant_tackles': 13, 'carries': 117, 'pcm': 278, 'ruck_speed': 65, '22m_entries': 8, '22m_conversion': 2.5, 'kicks': 25, 'offloads_allowed': 12, 'penalties': 13, 'scrums_pct': 75, 'lineouts_pct': 100},
    'Scotland': {'score': 47, 'tries': 7, 'tackles_made': 169, 'tackles_missed': 19, 'line_breaks': 10, 'turnovers_won': 9, 'dominant_tackles': 14, 'carries': 140, 'pcm': 282, 'ruck_speed': 68, '22m_entries': 12, '22m_conversion': 3.8, 'kicks': 21, 'offloads_allowed': 10, 'penalties': 9, 'scrums_pct': 100, 'lineouts_pct': 100},
    'Argentina': {'score': 38, 'tries': 5, 'tackles_made': 180, 'tackles_missed': 23, 'line_breaks': 6, 'turnovers_won': 7, 'dominant_tackles': 14, 'carries': 134, 'pcm': 246, 'ruck_speed': 65, '22m_entries': 10, '22m_conversion': 3.5, 'kicks': 18, 'offloads_allowed': 10, 'penalties': 8, 'scrums_pct': 100, 'lineouts_pct': 100},
    'Fiji': {'score': 24, 'tries': 3, 'tackles_made': 75, 'tackles_missed': 11, 'line_breaks': 9, 'turnovers_won': 8, 'dominant_tackles': 6, 'carries': 148, 'pcm': 403, 'ruck_speed': 70, '22m_entries': 10, '22m_conversion': 2.5, 'kicks': 15, 'offloads_allowed': 39, 'penalties': 13, 'scrums_pct': 100, 'lineouts_pct': 89},
    'Wales': {'score': 39, 'tries': 6, 'tackles_made': 166, 'tackles_missed': 39, 'line_breaks': 3, 'turnovers_won': 7, 'dominant_tackles': 13, 'carries': 79, 'pcm': 156, 'ruck_speed': 60, '22m_entries': 8, '22m_conversion': 4.5, 'kicks': 21, 'offloads_allowed': 11, 'penalties': 6, 'scrums_pct': 100, 'lineouts_pct': 94},
    'Japan': {'score': 27, 'tries': 3, 'tackles_made': 155, 'tackles_missed': 17, 'line_breaks': 3, 'turnovers_won': 4, 'dominant_tackles': 12, 'carries': 127, 'pcm': 252, 'ruck_speed': 68, '22m_entries': 9, '22m_conversion': 3.0, 'kicks': 35, 'offloads_allowed': 7, 'penalties': 9, 'scrums_pct': 89, 'lineouts_pct': 100},
    'Italy': {'score': 10, 'tries': 1, 'tackles_made': 170, 'tackles_missed': 13, 'line_breaks': 3, 'turnovers_won': 1, 'dominant_tackles': 14, 'carries': 115, 'pcm': 242, 'ruck_speed': 60, '22m_entries': 7, '22m_conversion': 1.5, 'kicks': 26, 'offloads_allowed': 8, 'penalties': 6, 'scrums_pct': 100, 'lineouts_pct': 90},
}

# Compute Elo after Round 1
def update_elo(ra, rb, sa, sb, K=32, home=True):
    adj = 40 if home else 0
    expected = 1 / (1 + 10**(-(ra - rb + adj) / 400))
    actual = 1 if sa > sb else 0 if sa < sb else 0.5
    margin = math.log(abs(sa - sb) + 1) * (2.2 / (2.2 + 0.001 * abs(sa - sb)))
    change = K * margin * (actual - expected)
    return round(ra + change), round(rb - change)

elos = {'South Africa': 1950, 'New Zealand': 1880, 'Ireland': 1855, 'France': 1825,
        'Argentina': 1775, 'England': 1755, 'Scotland': 1735, 'Australia': 1705,
        'Fiji': 1700, 'Italy': 1670, 'Wales': 1580, 'Japan': 1560}

r1_matches = [('New Zealand','France',34,32), ('Australia','Ireland',31,33),
              ('South Africa','England',45,21), ('Argentina','Scotland',38,47),
              ('Fiji','Wales',24,39), ('Japan','Italy',27,10)]
for h, a, hs, aws in r1_matches:
    elos[h], elos[a] = update_elo(elos[h], elos[a], hs, aws)

# Northern teams: blend Six Nations baseline (80%) + Round 1 (20%)
# Southern teams: Round 1 only
northern = ['France', 'Ireland', 'England', 'Scotland', 'Wales', 'Italy']

def blend(baseline_val, round1_val, is_northern):
    if is_northern and baseline_val is not None:
        return baseline_val * 0.8 + round1_val * 0.2
    return round1_val

def to_app_format(team_name):
    r1 = round1[team_name]
    sn = get_six_nations_avg(team_name) if team_name in northern else None
    is_n = team_name in northern
    
    # Compute blended stats
    tackles_made = blend(sn['tackles_made'] if sn else None, r1['tackles_made'], is_n)
    tackles_missed = blend(sn['tackles_missed'] if sn else None, r1['tackles_missed'], is_n)
    tr_pct = round(tackles_made / (tackles_made + tackles_missed) * 100)
    lb = round(blend(sn['line_breaks'] if sn else None, r1['line_breaks'], is_n), 1)
    to = round(blend(sn['turnovers_won'] if sn else None, r1['turnovers_won'], is_n), 1)
    dom = round(blend(sn['dominant_tackles'] if sn else None, r1['dominant_tackles'], is_n), 1)
    carries = blend(sn['carries'] if sn else None, r1['carries'], is_n)
    pcm = blend(sn['pcm'] if sn else None, r1['pcm'], is_n)
    ruck_spd = blend(sn['ruck_speed'] if sn else None, r1['ruck_speed'], is_n)
    e22 = round(blend(sn['22m_entries'] if sn else None, r1['22m_entries'], is_n), 1)
    c22 = round(blend(sn['22m_conversion'] if sn else None, r1['22m_conversion'], is_n), 2)
    kicks = round(blend(sn['kicks'] if sn else None, r1['kicks'], is_n))
    off_allowed = blend(sn['tackle_offload_allowed'] if sn else None, r1['offloads_allowed'], is_n)
    ppg = blend(sn['ppg'] if sn else None, r1['score'], is_n)
    
    # Convert to app fields
    gl = round(min(70, max(30, pcm / 5)))
    rs = round(max(2.5, min(4.5, 4.5 - ruck_spd / 40)), 1)
    
    return {
        'elo': elos[team_name],
        'attack': {
            'pts_pg': round(ppg, 1),
            'tries_pg': round(r1['tries'], 1),  # From actual match
            'gl': gl,
            'lb': lb,
            'rs': rs,
            'c22': round(c22 * 10),  # Scale to percentage
            'e22': e22,
            'off': round(off_allowed, 1),
        },
        'defense': {
            'tr': tr_pct,
            'missed': round(tackles_missed, 1),
            'to': to,
            'dom': dom,
            'steals': to,  # Same as turnovers for now
            'ob': round(off_allowed, 1),
        },
        'setpiece': {
            'so': r1['scrums_pct'],
            'lo': r1['lineouts_pct'],
        },
        'kicking': {
            'km': kicks * 30,
            'goal': round(min(90, max(50, r1['score'] / max(1, r1['tries']) / 7 * 80))),
        },
        'discipline': {
            'pen': r1['penalties'] * 6,  # Scale to 6-match tournament
            'idx': round(100 - r1['penalties'] * 5),
        },
    }

# Output
print("NATIONS CHAMPIONSHIP 2026 - FINAL COMPUTED STATS")
print("=" * 70)
print("Northern teams: 80% Six Nations 2026 + 20% Round 1")
print("Southern teams: 100% Round 1 (no baseline available)")
print("Elo: computed with updateRatings() after Round 1")
print("=" * 70)

for team in ['South Africa', 'New Zealand', 'Ireland', 'France', 'Scotland',
             'England', 'Argentina', 'Australia', 'Fiji', 'Italy', 'Wales', 'Japan']:
    stats = to_app_format(team)
    print(f"\n{team} (Elo: {stats['elo']}):")
    print(f"  attack: {{ pts_pg: {stats['attack']['pts_pg']}, tries_pg: {stats['attack']['tries_pg']}, gl: {stats['attack']['gl']}, lb: {stats['attack']['lb']}, rs: {stats['attack']['rs']}, c22: {stats['attack']['c22']}, e22: {stats['attack']['e22']}, off: {stats['attack']['off']} }}")
    print(f"  defense: {{ tr: {stats['defense']['tr']}, missed: {stats['defense']['missed']}, to: {stats['defense']['to']}, dom: {stats['defense']['dom']}, steals: {stats['defense']['steals']}, ob: {stats['defense']['ob']} }}")
    print(f"  setpiece: {{ so: {stats['setpiece']['so']}, lo: {stats['setpiece']['lo']} }}")
    print(f"  kicking: {{ km: {stats['kicking']['km']}, goal: {stats['kicking']['goal']} }}")
    print(f"  discipline: {{ pen: {stats['discipline']['pen']}, idx: {stats['discipline']['idx']} }}")
