"""
Fetch ALL team stats from rugbypy and save to JSON for training.
This gives us real per-match stats: tackles, line breaks, carries,
ruck speed, turnovers, 22m entries, etc.

Run: python ml/fetch_all_stats.py
Output: ml/rugbypy_team_stats.json
"""
import json
import os
import sys
from rugbypy.team import fetch_all_teams, fetch_team_stats

def main():
    print("Fetching all teams...")
    teams = fetch_all_teams()
    print(f"Found {len(teams)} teams")

    all_stats = []
    errors = 0

    for idx, row in teams.iterrows():
        team_id = row['team_id']
        team_name = row['team_name']

        try:
            stats = fetch_team_stats(team_id)
            if stats is None or len(stats) == 0:
                errors += 1
                continue

            for _, match_row in stats.iterrows():
                record = {
                    'team': str(match_row.get('team', team_name)),
                    'team_vs': str(match_row.get('team_vs', '')),
                    'game_date': str(match_row.get('game_date', '')),
                    'match_id': str(match_row.get('match_id', '')),
                    'score': int(match_row.get('score', 0)),
                    'team_vs_score': int(match_row.get('team_vs_score', 0)),
                    # Real rugby stats
                    '22m_entries': float(match_row.get('22m_entries', 0) or 0),
                    '22m_conversion': float(match_row.get('22m_conversion', 0) or 0),
                    'line_breaks': float(match_row.get('line_breaks', 0) or 0),
                    'carries': float(match_row.get('carries', 0) or 0),
                    'kicks': float(match_row.get('kicks', 0) or 0),
                    'post_contact_metres': float(match_row.get('post_contact_metres', 0) or 0),
                    'dominant_tackles': float(match_row.get('dominant_tackles', 0) or 0),
                    'tackles_made': float(match_row.get('tackles_made', 0) or 0),
                    'tackles_missed': float(match_row.get('tackles_missed', 0) or 0),
                    'turnovers_won': float(match_row.get('turnovers_won', 0) or 0),
                    'tackle_turnover': float(match_row.get('tackle_turnover', 0) or 0),
                    'tackle_offload_allowed': float(match_row.get('tackle_offload_allowed', 0) or 0),
                    'ruck_speed_0_3_pct': float(match_row.get('ruck_speed_0_3_pct', 0) or 0),
                    'ruck_speed_3_6_pct': float(match_row.get('ruck_speed_3_6_pct', 0) or 0),
                    'ruck_speed_6_plus_pct': float(match_row.get('ruck_speed_6_plus_pct', 0) or 0),
                    'rucks_won': float(match_row.get('rucks_won', 0) or 0),
                }
                all_stats.append(record)

            n = len(stats)
            print(f"  [{idx+1:3d}/{len(teams)}] {team_name:30s} -> {n:3d} matches")

        except Exception as e:
            errors += 1
            print(f"  [{idx+1:3d}/{len(teams)}] {team_name:30s} -> ERROR: {e}")
            continue

    # Save
    output_path = os.path.join(os.path.dirname(__file__), 'rugbypy_team_stats.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_stats, f, indent=2)

    print(f"\n[DONE] Saved {len(all_stats)} match-stat records to {output_path}")
    print(f"  Errors: {errors}")


if __name__ == '__main__':
    main()
