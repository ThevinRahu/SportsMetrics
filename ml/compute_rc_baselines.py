"""Compute RC 2025 baselines for Southern teams from ESPN match stats"""
import numpy as np

rc_stats = {
    'South Africa': [
        {'tackles_made':109,'tackles_missed':26,'line_breaks':14,'carries':139,'kicks':18,'penalties':10,'scrums_pct':100,'lineouts_pct':68,'ppg':22},
        {'tackles_made':109,'tackles_missed':25,'line_breaks':2,'carries':96,'kicks':31,'penalties':10,'scrums_pct':100,'lineouts_pct':77,'ppg':30},
        {'tackles_made':87,'tackles_missed':33,'line_breaks':11,'carries':110,'kicks':32,'penalties':7,'scrums_pct':77,'lineouts_pct':78,'ppg':43},
        {'tackles_made':174,'tackles_missed':29,'line_breaks':10,'carries':117,'kicks':30,'penalties':6,'scrums_pct':100,'lineouts_pct':89,'ppg':45},  # NC R1
    ],
    'New Zealand': [
        {'tackles_made':146,'tackles_missed':22,'line_breaks':3,'carries':95,'kicks':34,'penalties':10,'scrums_pct':66,'lineouts_pct':80,'ppg':24},
        {'tackles_made':111,'tackles_missed':46,'line_breaks':9,'carries':95,'kicks':30,'penalties':7,'scrums_pct':88,'lineouts_pct':69,'ppg':10},
        {'tackles_made':159,'tackles_missed':11,'line_breaks':5,'carries':162,'kicks':18,'penalties':10,'scrums_pct':85,'lineouts_pct':100,'ppg':33},
        {'tackles_made':165,'tackles_missed':25,'line_breaks':11,'carries':146,'kicks':17,'penalties':11,'scrums_pct':92,'lineouts_pct':86,'ppg':34},  # NC R1
    ],
    'Australia': [
        {'tackles_made':157,'tackles_missed':22,'line_breaks':10,'carries':97,'kicks':29,'penalties':4,'scrums_pct':83,'lineouts_pct':77,'ppg':38},
        {'tackles_made':216,'tackles_missed':40,'line_breaks':2,'carries':126,'kicks':13,'penalties':15,'scrums_pct':60,'lineouts_pct':90,'ppg':24},
        {'tackles_made':153,'tackles_missed':18,'line_breaks':10,'carries':141,'kicks':22,'penalties':12,'scrums_pct':100,'lineouts_pct':92,'ppg':31},  # NC R1
    ],
    'Argentina': [
        # No ESPN per-match stats available for RC 2025
        # Using NC Round 1 data only + RC PPG from Wikipedia (27.0/game across 6 matches)
        {'tackles_made':180,'tackles_missed':23,'line_breaks':6,'carries':134,'kicks':18,'penalties':8,'scrums_pct':100,'lineouts_pct':100,'ppg':38},  # NC R1
    ],
}

print('COMBINED AVERAGES (RC 2025 + NC Round 1):')
print(f"{'Team':15s} {'N':>3s} {'TR%':>5s} {'Miss':>5s} {'LB':>5s} {'Car':>5s} {'Kicks':>5s} {'Pen':>5s} {'Scr%':>5s} {'Lin%':>5s} {'PPG':>5s}")
print('-' * 75)

for team, matches in rc_stats.items():
    n = len(matches)
    tr_made = sum(m['tackles_made'] for m in matches)
    tr_miss = sum(m['tackles_missed'] for m in matches)
    tr_pct = tr_made / (tr_made + tr_miss) * 100
    missed = np.mean([m['tackles_missed'] for m in matches])
    lb = np.mean([m['line_breaks'] for m in matches])
    carries = np.mean([m['carries'] for m in matches])
    kicks = np.mean([m['kicks'] for m in matches])
    pen = np.mean([m['penalties'] for m in matches])
    scr = np.mean([m['scrums_pct'] for m in matches])
    lin = np.mean([m['lineouts_pct'] for m in matches])
    ppg = np.mean([m['ppg'] for m in matches])
    print(f"{team:15s} {n:3d} {tr_pct:5.1f} {missed:5.1f} {lb:5.1f} {carries:5.0f} {kicks:5.0f} {pen:5.1f} {scr:5.0f} {lin:5.0f} {ppg:5.1f}")

# Also print Wikipedia RC 2025 PPG for reference
print("\nRC 2025 season PPG (Wikipedia): SA=34.7, NZ=26.5, AUS=25.3, ARG=27.0")
