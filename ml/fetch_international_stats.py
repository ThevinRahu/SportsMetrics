"""
Fetch historical international team stats from rugbypy for Nations Championship teams.
Pulls data from Six Nations, Rugby Championship, and Autumn Internationals.

These provide the baseline stats that Nations Championship Round 1+ data layers on top of.

Usage: python ml/fetch_international_stats.py
Output: ml/international_team_stats.json
"""
import json
import os
import numpy as np
from rugbypy.team import fetch_all_teams, fetch_team_stats

# Nations Championship teams and their rugbypy IDs (from our earlier fetch)
NC_TEAMS = {
    'France': '67d88578',
    'Ireland': '165b36e5',
    'Scotland': '4409215c',
    'Italy': 'd0cffe5e',
    'England': 'f60f757d',
    'Wales': '094dae60',
    # Southern teams - need to find IDs
}

def find_team_ids():
    """Find rugbypy team IDs for all NC teams"""
    print("Fetching all teams from rugbypy...")
    all_teams = fetch_all_teams()
    
    nc_names = ['France', 'Ireland', 'Scotland', 'Italy', 'England', 'Wales',
                'South Africa', 'New Zealand', 'Australia', 'Argentina', 'Fiji', 'Japan']
    
    found = {}
    for _, row in all_teams.iterrows():
        name = row['team_name']
        # Match rugbypy names to our names
        for nc_name in nc_names:
            if nc_name.lower() in name.lower() and '7s' not in name and 'U20' not in name and 'Women' not in name:
                if nc_name not in found:  # Take first match only
                    found[nc_name] = row['team_id']
                    print(f"  {nc_name:15s} -> {row['team_id']} ({name})")
    
    return found


def fetch_team_history(team_id, team_name):
    """Fetch all available match stats for a team"""
    try:
        stats = fetch_team_stats(team_id)
        if stats is None or len(stats) == 0:
            print(f"  {team_name}: No stats available")
            return None
        
        records = []
        for _, row in stats.iterrows():
            records.append({
                'team': team_name,
                'team_vs': str(row.get('team_vs', '')),
                'game_date': str(row.get('game_date', '')),
                'score': int(row.get('score', 0)),
                'team_vs_score': int(row.get('team_vs_score', 0)),
                '22m_entries': float(row.get('22m_entries', 0) or 0),
                '22m_conversion': float(row.get('22m_conversion', 0) or 0),
                'line_breaks': float(row.get('line_breaks', 0) or 0),
                'carries': float(row.get('carries', 0) or 0),
                'kicks': float(row.get('kicks', 0) or 0),
                'post_contact_metres': float(row.get('post_contact_metres', 0) or 0),
                'dominant_tackles': float(row.get('dominant_tackles', 0) or 0),
                'tackles_made': float(row.get('tackles_made', 0) or 0),
                'tackles_missed': float(row.get('tackles_missed', 0) or 0),
                'turnovers_won': float(row.get('turnovers_won', 0) or 0),
                'tackle_turnover': float(row.get('tackle_turnover', 0) or 0),
                'tackle_offload_allowed': float(row.get('tackle_offload_allowed', 0) or 0),
                'ruck_speed_0_3_pct': float(row.get('ruck_speed_0_3_pct', 0) or 0),
                'rucks_won': float(row.get('rucks_won', 0) or 0),
            })
        
        print(f"  {team_name:15s}: {len(records)} matches with full stats")
        return records
    except Exception as e:
        print(f"  {team_name:15s}: ERROR - {e}")
        return None


def compute_team_averages(records):
    """Compute average stats across all matches for a team"""
    if not records or len(records) == 0:
        return None
    
    n = len(records)
    wins = sum(1 for r in records if r['score'] > r['team_vs_score'])
    
    avg = {
        'matches': n,
        'wins': wins,
        'win_rate': wins / n,
        'ppg': np.mean([r['score'] for r in records]),
        'papg': np.mean([r['team_vs_score'] for r in records]),
        '22m_entries': np.mean([r['22m_entries'] for r in records]),
        '22m_conversion': np.mean([r['22m_conversion'] for r in records]),
        'line_breaks': np.mean([r['line_breaks'] for r in records]),
        'carries': np.mean([r['carries'] for r in records]),
        'kicks': np.mean([r['kicks'] for r in records]),
        'post_contact_metres': np.mean([r['post_contact_metres'] for r in records]),
        'dominant_tackles': np.mean([r['dominant_tackles'] for r in records]),
        'tackles_made': np.mean([r['tackles_made'] for r in records]),
        'tackles_missed': np.mean([r['tackles_missed'] for r in records]),
        'turnovers_won': np.mean([r['turnovers_won'] for r in records]),
        'tackle_offload_allowed': np.mean([r['tackle_offload_allowed'] for r in records]),
        'ruck_speed_0_3_pct': np.mean([r['ruck_speed_0_3_pct'] for r in records]),
        'rucks_won': np.mean([r['rucks_won'] for r in records]),
    }
    
    # Compute tackle rate
    total_made = sum(r['tackles_made'] for r in records)
    total_missed = sum(r['tackles_missed'] for r in records)
    avg['tackle_rate'] = total_made / max(1, total_made + total_missed) * 100
    
    return avg


def convert_to_app_format(team_name, avg):
    """Convert rugbypy averages to our app's stat format"""
    if not avg:
        return None
    
    tackle_rate = avg['tackle_rate']
    pcm = avg['post_contact_metres']
    
    return {
        'elo': round(1400 + (avg['win_rate'] - 0.5) * 800),
        'attack': {
            'pts_pg': round(avg['ppg'], 1),
            'tries_pg': round(avg['ppg'] / 7, 1),  # Approximate
            'gl': round(min(70, max(30, pcm / 5))),
            'lb': round(avg['line_breaks'], 1),
            'rs': round(max(2.5, min(4.5, 4.5 - avg['ruck_speed_0_3_pct'] / 40)), 1),
            'c22': round(avg['22m_conversion'] * 10, 0),
            'e22': round(avg['22m_entries'], 1),
            'off': round(avg['tackle_offload_allowed'], 1),
        },
        'defense': {
            'tr': round(tackle_rate),
            'missed': round(avg['tackles_missed'], 1),
            'to': round(avg['turnovers_won'], 1),
            'dom': round(avg['dominant_tackles'], 1),
            'steals': round(avg['turnovers_won'], 1),
            'ob': round(avg['tackle_offload_allowed'], 1),
        },
        'setpiece': {
            'so': 85,  # Not available from rugbypy per-match
            'lo': 80,  # Not available
        },
        'kicking': {
            'km': round(avg['kicks'] * 30),
            'goal': 75,  # Not available per-match
        },
        'discipline': {
            'pen': round(avg['tackles_missed'] * 3 + (1 - avg['win_rate']) * 40 + 40),
            'idx': round(70 - avg['tackles_missed']),
        },
    }


if __name__ == '__main__':
    print("=" * 60)
    print("Fetching International Team Stats from rugbypy")
    print("For Nations Championship 2026 baseline data")
    print("=" * 60)
    
    # Find team IDs
    team_ids = find_team_ids()
    
    if len(team_ids) < 10:
        print(f"\nWARNING: Only found {len(team_ids)}/12 teams")
    
    # Fetch stats for each team
    all_data = {}
    for team_name, team_id in team_ids.items():
        records = fetch_team_history(team_id, team_name)
        if records:
            avg = compute_team_averages(records)
            app_format = convert_to_app_format(team_name, avg)
            all_data[team_name] = {
                'raw_matches': records,
                'averages': avg,
                'app_format': app_format,
            }
    
    # Save
    output_path = os.path.join(os.path.dirname(__file__), 'international_team_stats.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, default=str)
    
    print(f"\n[DONE] Saved stats for {len(all_data)} teams to {output_path}")
    
    # Print summary
    print("\nTeam Averages (from rugbypy historical data):")
    print(f"{'Team':15s} {'Games':>5s} {'Win%':>5s} {'PPG':>5s} {'TR%':>5s} {'LB':>5s} {'TO':>5s} {'Missed':>7s}")
    print("-" * 60)
    for name, data in sorted(all_data.items(), key=lambda x: -x[1]['averages']['win_rate']):
        a = data['averages']
        print(f"{name:15s} {a['matches']:5d} {a['win_rate']*100:5.1f} {a['ppg']:5.1f} {a['tackle_rate']:5.1f} {a['line_breaks']:5.1f} {a['turnovers_won']:5.1f} {a['tackles_missed']:7.1f}")
