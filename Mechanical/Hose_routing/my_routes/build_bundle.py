"""Packs this folder's route notes into _bundle.js so index.html also works when
opened by double-click (file://), where the browser can't read files.
Run refresh.bat after you save changes. Served pages (localhost / hosted) read
the real files directly and don't need this."""
import json, os, time

HERE = os.path.dirname(os.path.abspath(__file__))
manifest_path = os.path.join(HERE, "routes.json")
with open(manifest_path, encoding="utf-8") as f:
    manifest = json.load(f)

files = {"routes.json": open(manifest_path, encoding="utf-8").read()}
for name in ["log.md"]:
    p = os.path.join(HERE, name)
    if os.path.isfile(p):
        files[name] = open(p, encoding="utf-8").read()
for r in manifest["routes"]:
    for st in manifest["stages"]:
        rel = r["id"] + "/" + st["file"]
        p = os.path.join(HERE, r["id"], st["file"])
        if os.path.isfile(p):
            files[rel] = open(p, encoding="utf-8", errors="replace").read()

stamp = time.strftime("%Y-%m-%d %H:%M")
js = "window.MY_ROUTES_BUNDLE = " + json.dumps({"stamp": stamp, "files": files}, ensure_ascii=False) + ";\n"
with open(os.path.join(HERE, "_bundle.js"), "w", encoding="utf-8") as f:
    f.write(js)
print(f"_bundle.js updated ({len(files)} files, {stamp})")
