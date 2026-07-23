"""Sanity check the exported ONNX models"""
import numpy as np
from onnxruntime import InferenceSession

clf = InferenceSession('public/model/win_classifier.onnx')
reg = InferenceSession('public/model/margin_regressor.onnx')

teams = {
    'Hurricanes': {'elo':1574,'gl':64,'tr':86,'so':90,'lo':82,'goal':82,'form':92,'idx':51,'pts_pg':40.1,'to':14.2,'lb':9.7,'missed':22,'maul':82,'km':680,'rs':3.4,'ps':2.1},
    'Chiefs': {'elo':1549,'gl':62,'tr':87,'so':91,'lo':84,'goal':84,'form':85,'idx':50,'pts_pg':38.4,'to':13.8,'lb':9.2,'missed':25.5,'maul':78,'km':640,'rs':3.2,'ps':2.3},
    'Moana Pasifika': {'elo':1318,'gl':38,'tr':74,'so':70,'lo':60,'goal':58,'form':15,'idx':39,'pts_pg':19.7,'to':6.4,'lb':4.0,'missed':48,'maul':45,'km':380,'rs':2.4,'ps':3.2},
    'Ireland': {'elo':1855,'gl':58,'tr':87,'so':87,'lo':82,'goal':80,'form':88,'idx':50,'pts_pg':27.4,'to':12.8,'lb':7.0,'missed':19,'maul':72,'km':810,'rs':3.1,'ps':2.4},
    'Wales': {'elo':1580,'gl':42,'tr':74,'so':68,'lo':60,'goal':58,'form':25,'idx':69,'pts_pg':19.8,'to':6.8,'lb':3.5,'missed':42,'maul':46,'km':750,'rs':3.0,'ps':0.6},
    'Crusaders': {'elo':1487,'gl':56,'tr':88,'so':89,'lo':81,'goal':78,'form':78,'idx':47,'pts_pg':34.5,'to':12.8,'lb':8.4,'missed':20,'maul':75,'km':620,'rs':3.1,'ps':2.0},
}

def feat(a, b, v=0.0):
    return np.array([[(a['elo']-b['elo'])/400,(a['gl']-b['gl'])/50,(a['tr']-b['tr'])/20,
        (a['so']-b['so'])/20,(a['lo']-b['lo'])/20,(a['goal']-b['goal'])/30,
        (a['form']-b['form'])/50,(a['idx']-b['idx'])/50,(a['pts_pg']-b['pts_pg'])/30,
        (a['to']-b['to'])/10,(a['lb']-b['lb'])/10,(b['missed']-a['missed'])/30,
        (a['maul']-b['maul'])/30,(a['km']-b['km'])/400,(a['rs']-b['rs'])/2,
        (a['ps']-b['ps'])/4, v]], dtype=np.float32)

def predict(a_name, b_name, venue='neutral'):
    a, b = teams[a_name], teams[b_name]
    vv = 0.5 if venue == 'home' else -0.5 if venue == 'away' else 0.0
    f = feat(a, b, vv)
    probs = clf.run(None, {'features': f})[1][0]
    margin_raw = float(reg.run(None, {'features': f})[0][0][0])
    win = int(round(float(probs[1]) * 100))
    margin = int(round(margin_raw * 20))
    mid = (a['pts_pg'] + b['pts_pg']) / 2
    sa = int(round(mid + margin / 2))
    sb = int(round(mid - margin / 2))
    return win, margin, sa, sb

print("SANITY CHECK - ONNX Model Predictions")
print("=" * 70)
tests = [
    ('Hurricanes', 'Moana Pasifika', 'home'),
    ('Hurricanes', 'Moana Pasifika', 'neutral'),
    ('Hurricanes', 'Chiefs', 'home'),
    ('Hurricanes', 'Chiefs', 'neutral'),
    ('Hurricanes', 'Chiefs', 'away'),
    ('Ireland', 'Wales', 'home'),
    ('Ireland', 'Wales', 'away'),
    ('Crusaders', 'Chiefs', 'neutral'),
    ('Chiefs', 'Moana Pasifika', 'neutral'),
]
for a, b, v in tests:
    win, margin, sa, sb = predict(a, b, v)
    print(f"  {a:15s} vs {b:15s} ({v:7s}): Win={win:2d}%  Margin={margin:+3d}pts  Score={sa}-{sb}")

print()
print("VALIDATION:")
passes = 0
total = 4

# Test 1: Dominant matchup
w, _, _, _ = predict('Hurricanes', 'Moana Pasifika', 'home')
ok = w > 80
print(f"  1. Hurricanes vs Moana (home) = {w}% ... {'PASS' if ok else 'FAIL'} (expect >80%)")
passes += ok

# Test 2: Venue effect
h, _, _, _ = predict('Hurricanes', 'Chiefs', 'home')
a, _, _, _ = predict('Hurricanes', 'Chiefs', 'away')
ok = h > a
print(f"  2. Venue shift: home={h}% away={a}% diff={h-a}% ... {'PASS' if ok else 'FAIL'} (expect home > away)")
passes += ok

# Test 3: Close matchup near 50%
n, _, _, _ = predict('Hurricanes', 'Chiefs', 'neutral')
ok = 30 <= n <= 70
print(f"  3. Close match (neutral) = {n}% ... {'PASS' if ok else 'FAIL'} (expect 30-70%)")
passes += ok

# Test 4: Ireland dominates Wales
iw, _, _, _ = predict('Ireland', 'Wales', 'neutral')
ok = iw > 70
print(f"  4. Ireland vs Wales = {iw}% ... {'PASS' if ok else 'FAIL'} (expect >70%)")
passes += ok

print(f"\nResult: {passes}/{total} checks passed")
if passes == total:
    print("[OK] Model is sane - ready to deploy")
else:
    print("[WARN] Some checks failed - review predictions")
