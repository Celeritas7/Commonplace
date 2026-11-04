#!/usr/bin/env python3
# add_gate.py - puts the login gate (_lib/gate.js) first in <head> of every Commonplace page.
#
#   Run:  python add_gate.py          (make_offline.py also runs it at the end)
#
# Safe to re-run: pages that already load gate.js are left alone. Skips the same
# scratch folders as make_offline.py, but not AI_study: the gate covers every app.

import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
LIB  = os.path.join(ROOT, "_lib")
SKIP = {"Temp", "_Temp", "temp", "_archive", "_superseded_flat_build", ".git", "_lib",
        "node_modules", "supabase", "New folder"}
HEAD_RE = re.compile(r"<head\b[^>]*>", re.I)

def pages():
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP]
        for fn in fns:
            if fn.lower().endswith((".html", ".htm")):
                yield os.path.join(dp, fn)

def main():
    added, no_head = 0, []
    for p in pages():
        try:
            with open(p, encoding="utf-8", newline="") as f:
                t = f.read()
        except (UnicodeDecodeError, OSError) as e:
            print("  skip (unreadable):", os.path.relpath(p, ROOT), "-", e)
            continue
        if "_lib/gate.js" in t:
            continue
        m = HEAD_RE.search(t)
        if not m:
            no_head.append(os.path.relpath(p, ROOT))
            continue
        rl = os.path.relpath(LIB, os.path.dirname(p)).replace(os.sep, "/")
        nl = "\r\n" if "\r\n" in t[:2000] else "\n"
        t = t[:m.end()] + nl + '<script src="' + rl + '/gate.js"></script>' + t[m.end():]
        with open(p, "w", encoding="utf-8", newline="") as f:
            f.write(t)
        added += 1
    print("gate: added to %d page(s)" % added)
    for p in no_head:
        print("  no <head>, not gated:", p)

if __name__ == "__main__":
    main()
