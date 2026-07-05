import json

matches = json.load(open('ml/rugbypy_matches.json'))
stats = json.load(open('ml/rugbypy_team_stats.json'))

# Build home team lookup from rugbypy_matches.json (which has correct home/away)
home_lookup = {}
for m in matches:
    home_lookup[(m['home'], m['away'])] = m['home']

print(f"Home lookup: {len(home_lookup)} matches with known home team")
print(f"Stats records: {len(stats)} per-match team stats")

# Check if stats records can be matched to home/away
matched = 0
is_home_count = 0
for s in stats:
    team = s['team']
    vs = s['team_vs']
    if (team, vs) in home_lookup:
        matched += 1
        if home_lookup[(team, vs)] == team:
            is_home_count += 1
    elif (vs, team) in home_lookup:
        matched += 1
        if home_lookup[(vs, team)] == team:
            is_home_count += 1

print(f"Matched: {matched}/{len(stats)} ({matched/len(stats)*100:.0f}%)")
print(f"Of matched, team IS home: {is_home_count}/{matched} ({is_home_count/max(1,matched)*100:.0f}%)")
print()
if is_home_count / max(1, matched) > 0.6:
    print("CONCLUSION: 'team' field IS mostly the home team!")
    print("We CAN use venue=0.5 for team perspective in training.")
else:
    print("CONCLUSION: 'team' field is NOT reliably the home team.")
    print("Setting venue=0 (neutral) was correct.")
