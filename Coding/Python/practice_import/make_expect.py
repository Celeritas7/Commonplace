"""Generate practice/data/<set>.expect.json from attempts that passed.

For each problem, take the LAST attempt marked "passed" (or the only attempt, if
it is unmarked and the problem has exactly one). Run it in a clean Python with no
stdin (input() raises, so interactive problems are skipped), a 10 s timeout, and
no network. Keep the output only if the run is clean, prints something, and two
runs print the same thing (so random/time-based code is skipped).

Existing entries in <set>.expect.json are kept; your hand-written ones win.
Usage:  python make_expect.py <practice/data dir> [--dry]
"""
import json, os, subprocess, sys, tempfile

DATA = os.path.abspath(sys.argv[1]); DRY = "--dry" in sys.argv
PY = sys.executable
BANNED = ("input(", "import random", "from random", "import time", "datetime", "import os", "subprocess",
          "open(", "requests", "urllib", "google.colab", "!pip", "!apt", "graphviz", "matplotlib", "pandas", "numpy",
          "turtle", "tkinter", "while True")

def run(code):
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, "a.py"); open(f, "w", encoding="utf-8").write(code)
        try:
            r = subprocess.run([PY, "-I", f], cwd=d, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=10)
        except subprocess.TimeoutExpired:
            return None, "timeout"
    if r.returncode != 0: return None, (r.stderr.strip().split("\n") or ["error"])[-1]
    return r.stdout, None

def pick(p):
    atts = p.get("attempts", [])
    passed = [a for a in atts if a.get("status") == "passed"]
    if passed: return passed[-1]["code"]
    if len(atts) == 1 and atts[0].get("status") != "failed": return atts[0]["code"]
    return None

report = []
for name in sorted(os.listdir(DATA)):
    if not name.endswith(".json") or name.endswith(".expect.json"): continue
    d = json.load(open(os.path.join(DATA, name), encoding="utf-8"))
    ep = os.path.join(DATA, d["set"] + ".expect.json")
    existing = json.load(open(ep, encoding="utf-8")) if os.path.exists(ep) else {}
    added, skipped = 0, []
    for p in d["problems"]:
        if p["id"] in existing: continue
        code = pick(p)
        if not code: skipped.append((p["id"], "no passed attempt")); continue
        if any(b in code for b in BANNED): skipped.append((p["id"], "needs input/random/files")); continue
        out1, err = run(code)
        if err: skipped.append((p["id"], err[:60])); continue
        if not out1.strip(): skipped.append((p["id"], "prints nothing")); continue
        out2, _ = run(code)
        if out2 != out1: skipped.append((p["id"], "not deterministic")); continue
        if len(out1) > 20000: skipped.append((p["id"], "output too long")); continue
        existing[p["id"]] = {"expect": out1.rstrip("\n"), "auto": True}
        added += 1
    if added and not DRY:
        json.dump(existing, open(ep, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    report.append((d["set"], added, len(d["problems"]), skipped))

for set_id, added, total, skipped in report:
    print(f"{set_id}: {added} expected outputs added ({total} problems)")
    for pid, why in skipped: print(f"    - {pid}: {why}")
print("DRY RUN" if DRY else "done")
