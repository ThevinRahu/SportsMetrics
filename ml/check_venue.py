import json
with open('ml/rugbypy_team_stats.json') as f:
    data = json.load(f)

# The 'team' in rugbypy_team_stats.json is the team whose stats are reported
# NOT necessarily the home team. We assumed team=home in training.
# This means venue=0.5 is randomly assigned to ~50% of samples incorrectly.
# This dilutes the venue signal for the regressor.

print("In Part B of training:")
print("  - We set venue=0.5 for the first team in each pair")  
print("  - But the first team is just whoever's stats were reported first")
print("  - NOT necessarily the home team")
print("  - This means venue feature is NOISE in Part B (673 matches)")
print("  - Part A (169 verified matches) has correct venue assignment")
print()
print("This explains why the regressor lost venue sensitivity after retraining:")
print("  - 1346 samples with random venue dilute the 338 samples with correct venue")
print("  - Classifier still works because sample weights (3x for verified) help")
print("  - But regressor has no sample weighting")
print()
print("FIX: Set venue=0 (neutral) for all Part B rugbypy matches")
print("     since we don't know which team is home")
