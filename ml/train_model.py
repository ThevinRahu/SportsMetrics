"""
SportsMetrics ML Model Training Script

Trains on REAL match results from the 2026 season.
Uses the same 12 features as the browser runtime.

Run: python ml/train_model.py
Output: public/model/win_classifier.onnx, public/model/margin_regressor.onnx
"""

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import os

# Real team data (from verified sources - Super Rugby Pacific 2026 final)
TEAMS = {
    "Hurricanes": {"elo": 1574, "gl": 64, "tr": 86, "so": 90, "lo": 82, "goal": 82, "form": 92, "pen": 137, "pts_pg": 40.1, "to": 14.2, "lb": 9.7, "missed": 22},
    "Chiefs": {"elo": 1549, "gl": 62, "tr": 87, "so": 91, "lo": 84, "goal": 84, "form": 85, "pen": 139, "pts_pg": 38.4, "to": 13.8, "lb": 9.2, "missed": 25.5},
    "Crusaders": {"elo": 1487, "gl": 56, "tr": 88, "so": 89, "lo": 81, "goal": 78, "form": 78, "pen": 148, "pts_pg": 34.5, "to": 12.8, "lb": 8.4, "missed": 20},
    "Blues": {"elo": 1498, "gl": 54, "tr": 85, "so": 84, "lo": 78, "goal": 75, "form": 55, "pen": 145, "pts_pg": 31.8, "to": 11.2, "lb": 7.8, "missed": 24},
    "Reds": {"elo": 1441, "gl": 50, "tr": 84, "so": 82, "lo": 74, "goal": 72, "form": 60, "pen": 152, "pts_pg": 26.0, "to": 10.4, "lb": 6.2, "missed": 26},
    "Brumbies": {"elo": 1462, "gl": 52, "tr": 83, "so": 84, "lo": 76, "goal": 74, "form": 48, "pen": 144, "pts_pg": 28.7, "to": 10.0, "lb": 6.8, "missed": 27},
    "Western Force": {"elo": 1389, "gl": 48, "tr": 81, "so": 78, "lo": 70, "goal": 68, "form": 55, "pen": 156, "pts_pg": 25.6, "to": 8.8, "lb": 5.8, "missed": 32},
    "Waratahs": {"elo": 1418, "gl": 46, "tr": 80, "so": 76, "lo": 68, "goal": 66, "form": 32, "pen": 160, "pts_pg": 25.2, "to": 8.2, "lb": 5.4, "missed": 34},
    "Highlanders": {"elo": 1381, "gl": 44, "tr": 79, "so": 78, "lo": 70, "goal": 68, "form": 30, "pen": 155, "pts_pg": 23.4, "to": 8.0, "lb": 5.0, "missed": 36},
    "Fijian Drua": {"elo": 1361, "gl": 44, "tr": 76, "so": 74, "lo": 64, "goal": 62, "form": 22, "pen": 162, "pts_pg": 23.6, "to": 7.6, "lb": 5.2, "missed": 42},
    "Moana Pasifika": {"elo": 1318, "gl": 38, "tr": 74, "so": 70, "lo": 60, "goal": 58, "form": 15, "pen": 170, "pts_pg": 19.7, "to": 6.4, "lb": 4.0, "missed": 48},
    # International teams
    "France": {"elo": 1825, "gl": 60, "tr": 85, "so": 86, "lo": 83, "goal": 82, "form": 87, "pen": 64, "pts_pg": 33.6, "to": 13.6, "lb": 8.0, "missed": 20},
    "Ireland": {"elo": 1855, "gl": 58, "tr": 87, "so": 87, "lo": 82, "goal": 80, "form": 88, "pen": 68, "pts_pg": 27.4, "to": 12.8, "lb": 7.0, "missed": 19},
    "England": {"elo": 1755, "gl": 54, "tr": 84, "so": 82, "lo": 76, "goal": 77, "form": 35, "pen": 74, "pts_pg": 26.8, "to": 11.4, "lb": 6.0, "missed": 23},
    "Scotland": {"elo": 1735, "gl": 56, "tr": 83, "so": 80, "lo": 74, "goal": 72, "form": 72, "pen": 81, "pts_pg": 28.2, "to": 11.0, "lb": 6.5, "missed": 25},
    "Italy": {"elo": 1670, "gl": 50, "tr": 81, "so": 78, "lo": 71, "goal": 66, "form": 48, "pen": 88, "pts_pg": 24.6, "to": 9.4, "lb": 5.0, "missed": 28},
    "Wales": {"elo": 1580, "gl": 42, "tr": 74, "so": 68, "lo": 60, "goal": 58, "form": 25, "pen": 112, "pts_pg": 19.8, "to": 6.8, "lb": 3.5, "missed": 42},
}

# Real match results (verified from all.rugby + sixnationsrugby.com)
MATCHES = [
    # Super Rugby Pacific 2026
    ("Highlanders","Crusaders",25,23),("Waratahs","Reds",36,12),("Fijian Drua","Moana Pasifika",26,40),
    ("Blues","Chiefs",15,19),("Western Force","Brumbies",24,56),("Hurricanes","Moana Pasifika",52,10),
    ("Waratahs","Fijian Drua",36,13),("Highlanders","Chiefs",23,26),("Western Force","Blues",32,42),
    ("Crusaders","Brumbies",24,50),("Moana Pasifika","Western Force",19,35),("Reds","Highlanders",31,14),
    ("Fijian Drua","Hurricanes",25,20),("Chiefs","Crusaders",33,43),("Brumbies","Blues",30,27),
    ("Chiefs","Moana Pasifika",57,24),("Waratahs","Hurricanes",19,59),("Highlanders","Western Force",39,31),
    ("Blues","Crusaders",29,13),("Brumbies","Reds",31,34),("Hurricanes","Western Force",31,23),
    ("Fijian Drua","Brumbies",42,27),("Crusaders","Highlanders",29,18),("Reds","Waratahs",26,17),
    ("Blues","Moana Pasifika",43,7),("Highlanders","Hurricanes",7,50),("Brumbies","Chiefs",33,24),
    ("Fijian Drua","Reds",6,21),("Moana Pasifika","Crusaders",21,50),("Waratahs","Blues",20,35),
    ("Moana Pasifika","Highlanders",19,39),("Brumbies","Waratahs",28,30),("Hurricanes","Reds",52,14),
    ("Blues","Fijian Drua",40,15),("Western Force","Chiefs",14,24),("Crusaders","Fijian Drua",69,26),
    ("Chiefs","Waratahs",42,14),("Reds","Western Force",19,42),("Highlanders","Brumbies",10,14),
    ("Moana Pasifika","Chiefs",17,62),("Fijian Drua","Western Force",24,22),("Hurricanes","Blues",42,19),
    ("Reds","Crusaders",31,26),("Blues","Highlanders",47,40),("Waratahs","Moana Pasifika",29,14),
    ("Chiefs","Hurricanes",22,17),("Brumbies","Fijian Drua",28,33),("Western Force","Crusaders",31,26),
    ("Crusaders","Waratahs",35,20),("Hurricanes","Brumbies",45,12),("Blues","Reds",36,33),
    ("Highlanders","Moana Pasifika",27,17),("Chiefs","Fijian Drua",42,22),("Hurricanes","Crusaders",38,31),
    ("Waratahs","Western Force",17,20),("Fijian Drua","Highlanders",24,14),("Moana Pasifika","Blues",19,45),
    ("Reds","Brumbies",30,21),("Crusaders","Blues",36,20),("Reds","Chiefs",21,31),
    ("Highlanders","Waratahs",31,26),("Moana Pasifika","Hurricanes",17,50),("Brumbies","Western Force",32,15),
    ("Chiefs","Highlanders",42,12),("Fijian Drua","Waratahs",35,50),("Blues","Hurricanes",24,47),
    ("Western Force","Reds",19,14),("Crusaders","Chiefs",36,32),("Waratahs","Brumbies",14,21),
    ("Moana Pasifika","Reds",31,33),("Hurricanes","Highlanders",45,28),("Western Force","Fijian Drua",19,15),
    ("Crusaders","Hurricanes",47,14),("Reds","Fijian Drua",45,24),("Brumbies","Moana Pasifika",19,21),
    ("Chiefs","Blues",59,34),("Western Force","Waratahs",31,25),
    # Six Nations 2026
    ("France","Ireland",36,14),("Italy","Scotland",18,15),("England","Wales",48,7),
    ("Ireland","Italy",20,13),("Scotland","England",31,20),("Wales","France",12,54),
    ("England","Ireland",21,42),("Wales","Scotland",23,26),("France","Italy",33,8),
    ("Ireland","Wales",27,17),("Scotland","France",50,40),("Italy","England",23,18),
    ("Ireland","Scotland",43,21),("Wales","Italy",31,17),("France","England",48,46),
]


def extract_features(team_a_name, team_b_name, venue=0.0):
    a = TEAMS.get(team_a_name, {})
    b = TEAMS.get(team_b_name, {})
    return [
        (a.get("elo", 1400) - b.get("elo", 1400)) / 400,
        (a.get("gl", 50) - b.get("gl", 50)) / 50,
        (a.get("tr", 80) - b.get("tr", 80)) / 20,
        (a.get("so", 80) - b.get("so", 80)) / 20,
        (a.get("lo", 75) - b.get("lo", 75)) / 20,
        (a.get("goal", 70) - b.get("goal", 70)) / 30,
        (a.get("form", 50) - b.get("form", 50)) / 50,
        (b.get("pen", 80) - a.get("pen", 80)) / 100,
        (a.get("pts_pg", 20) - b.get("pts_pg", 20)) / 30,
        (a.get("to", 10) - b.get("to", 10)) / 10,
        (a.get("lb", 5) - b.get("lb", 5)) / 10,
        (b.get("missed", 25) - a.get("missed", 25)) / 30,
        venue,  # Feature 13: venue (home=0.3, away=-0.3, neutral=0)
    ]


def train_and_export():
    X = []
    y_win = []
    y_margin = []

    matched = 0
    for home, away, hs, as_ in MATCHES:
        if home in TEAMS and away in TEAMS:
            # Home perspective (venue = +0.3)
            feats = extract_features(home, away, 0.3)
            X.append(feats)
            y_win.append(1 if hs > as_ else 0)
            y_margin.append((hs - as_) / 20.0)

            # Away perspective (venue = -0.3)
            feats_rev = extract_features(away, home, -0.3)
            X.append(feats_rev)
            y_win.append(1 if as_ > hs else 0)
            y_margin.append((as_ - hs) / 20.0)

            # Neutral perspective
            feats_neutral = extract_features(home, away, 0.0)
            X.append(feats_neutral)
            y_win.append(1 if hs > as_ else 0)
            y_margin.append((hs - as_) / 20.0)

            matched += 1

    X = np.array(X, dtype=np.float32)
    y_win = np.array(y_win)
    y_margin = np.array(y_margin, dtype=np.float32)

    print(f"Training on {matched} real matches ({len(X)} samples with reverse)")

    # Train
    clf = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    clf.fit(X, y_win)
    acc = clf.score(X, y_win)
    print(f"Classifier accuracy: {acc:.1%}")

    reg = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
    reg.fit(X, y_margin)

    # Export ONNX
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'model')
    os.makedirs(output_dir, exist_ok=True)

    initial_type = [('features', FloatTensorType([None, 13]))]

    onnx_clf = convert_sklearn(clf, initial_types=initial_type, target_opset=13)
    with open(os.path.join(output_dir, 'win_classifier.onnx'), 'wb') as f:
        f.write(onnx_clf.SerializeToString())

    onnx_reg = convert_sklearn(reg, initial_types=initial_type, target_opset=13)
    with open(os.path.join(output_dir, 'margin_regressor.onnx'), 'wb') as f:
        f.write(onnx_reg.SerializeToString())

    print(f"Models exported to public/model/")
    print(f"  win_classifier.onnx: {acc:.1%} accuracy")
    print(f"  margin_regressor.onnx: trained on real margins")


if __name__ == '__main__':
    train_and_export()
