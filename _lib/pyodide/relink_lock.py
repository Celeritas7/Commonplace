#!/usr/bin/env python3
"""relink_lock.py — point pyodide-lock.json at the right place for each package.

Only a few wheels are bundled in this folder (numpy today). Pyodide resolves every
package's `file_name` against the folder it was loaded from, so an unbundled
package such as pandas would 404 here even when the user is online.

This rewrites the lock so that:
  * a wheel present in this folder keeps its bare file name  → loads locally, works offline
  * any other package points at the official CDN for this version → works online

Run it again after dropping more wheels into this folder:  python relink_lock.py
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOCK = os.path.join(HERE, "pyodide-lock.json")

with open(LOCK, encoding="utf-8") as f:
    lock = json.load(f)

version = lock["info"]["version"]                      # e.g. "0.26.4"
cdn = "https://cdn.jsdelivr.net/pyodide/v%s/full/" % version
local = set(os.listdir(HERE))

bundled, remote = [], 0
for name, pkg in lock["packages"].items():
    bare = pkg["file_name"].rsplit("/", 1)[-1]         # strip any URL we added earlier
    if bare in local:
        pkg["file_name"] = bare; bundled.append(name)
    else:
        pkg["file_name"] = cdn + bare; remote += 1

with open(LOCK, "w", encoding="utf-8") as f:
    json.dump(lock, f, separators=(",", ":"))

print("pyodide %s · bundled: %s · from CDN: %d" % (version, ", ".join(bundled) or "none", remote))
