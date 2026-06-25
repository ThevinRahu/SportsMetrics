"""
Vercel Serverless Function — ML Model Retraining

Endpoint: POST /api/retrain
Body: { "teams": { ... } }  (current tournament team data)
Returns: { "classifier": base64_onnx, "regressor": base64_onnx, "accuracy": float }

Trains a fresh GradientBoostingClassifier + RandomForestRegressor
on the provided team data and returns ONNX models as base64 strings.
The frontend loads these directly into ONNX Runtime Web.
"""

from http.server import BaseHTTPRequestHandler
import json
import base64
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType


def extract_features(team_a, team_b):
    """Extract 12 normalized differential features from two teams."""
    def g(team, *path):
        val = team
        for key in path:
            if isinstance(val, dict):
                val = val.get(key, None)
            else:
                return 0
        return val if val is not None else 0

    return [
        (g(team_a, 'elo') - g(team_b, 'elo')) / 400,
        (g(team_a, 'attack', 'gl') - g(team_b, 'attack', 'gl')) / 50,
        (g(team_a, 'defense', 'tr') - g(team_b, 'defense', 'tr')) / 20,
        (g(team_a, 'setpiece', 'so') - g(team_b, 'setpiece', 'so')) / 20,
        (g(team_a, 'setpiece', 'lo') - g(team_b, 'setpiece', 'lo')) / 20,
        (g(team_a, 'kicking', 'goal') - g(team_b, 'kicking', 'goal')) / 30,
        (g(team_a, 'form', 'rating') - g(team_b, 'form', 'rating')) / 50,
        (g(team_b, 'discipline', 'pen') - g(team_a, 'discipline', 'pen')) / 100,
        (g(team_a, 'attack', 'pts_pg') - g(team_b, 'attack', 'pts_pg')) / 30,
        (g(team_a, 'defense', 'to') - g(team_b, 'defense', 'to')) / 10,
        (g(team_a, 'attack', 'lb') - g(team_b, 'attack', 'lb')) / 10,
        (g(team_b, 'defense', 'missed') - g(team_a, 'defense', 'missed')) / 30,
    ]


def generate_training_data(teams):
    """Generate training samples from team pairwise comparisons."""
    team_keys = list(teams.keys())
    X = []
    y_win = []
    y_margin = []

    for i in range(len(team_keys)):
        for j in range(i + 1, len(team_keys)):
            a = teams[team_keys[i]]
            b = teams[team_keys[j]]

            feats_ab = extract_features(a, b)
            feats_ba = extract_features(b, a)

            # Determine outcome from team strength
            a_str = (a.get('elo', 1400) + (a.get('form', {}).get('rating', 50)) * 3 +
                     (a.get('season', {}).get('won', 0)) * 5)
            b_str = (b.get('elo', 1400) + (b.get('form', {}).get('rating', 50)) * 3 +
                     (b.get('season', {}).get('won', 0)) * 5)
            a_win_prob = a_str / (a_str + b_str)
            margin_ab = (a.get('attack', {}).get('pts_pg', 20) - b.get('attack', {}).get('pts_pg', 20)) * 0.6

            # Data augmentation
            for _ in range(5):
                noise = np.random.randn(12) * 0.05
                X.append(np.array(feats_ab) + noise)
                y_win.append(1 if (a_win_prob + np.random.randn() * 0.1) > 0.5 else 0)
                y_margin.append(margin_ab + np.random.randn() * 4)

                X.append(np.array(feats_ba) + noise * -1)
                y_win.append(1 - y_win[-1])
                y_margin.append(-margin_ab + np.random.randn() * 4)

    return np.array(X, dtype=np.float32), np.array(y_win), np.array(y_margin, dtype=np.float32)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))
            teams = body.get('teams', {})

            if len(teams) < 4:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Need at least 4 teams to train'}).encode())
                return

            # Generate training data
            X, y_win, y_margin = generate_training_data(teams)

            # Train classifier
            clf = GradientBoostingClassifier(
                n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42
            )
            clf.fit(X, y_win)
            accuracy = clf.score(X, y_win)

            # Train regressor
            reg = RandomForestRegressor(
                n_estimators=50, max_depth=6, random_state=42
            )
            reg.fit(X, y_margin)

            # Export to ONNX
            initial_type = [('features', FloatTensorType([None, 12]))]

            onnx_clf = convert_sklearn(clf, initial_types=initial_type, target_opset=13)
            onnx_reg = convert_sklearn(reg, initial_types=initial_type, target_opset=13)

            # Return as base64
            clf_b64 = base64.b64encode(onnx_clf.SerializeToString()).decode('utf-8')
            reg_b64 = base64.b64encode(onnx_reg.SerializeToString()).decode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'classifier': clf_b64,
                'regressor': reg_b64,
                'accuracy': round(accuracy * 100, 1),
                'samples': len(X),
                'features': 12,
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
