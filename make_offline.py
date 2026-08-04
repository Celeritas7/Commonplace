#!/usr/bin/env python3
# make_offline.py - makes the Commonplace hub work fully offline.
#
#   1. Copy this file into your Commonplace/ root folder (next to index.html).
#   2. Run:  python make_offline.py   (needs internet ONCE)
#
# What it does:
#   - Downloads every CDN library your pages use into  Commonplace/_lib/
#     (Pyodide + numpy, CodeMirror, marked, supabase-js, Google Fonts as woff2)
#   - Rewrites your .html files to load those local copies instead of the CDN
#   - Adds a small Export/Import progress button to every page (bottom-left)
#
# Safe to re-run any time (skips files already downloaded, edits are idempotent).
# Skipped folders: Temp, _archive, _superseded_flat_build, AI_study (JupyterLite
# already has its own offline support), .git, _lib itself.

import hashlib, json, os, re, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.abspath(__file__))
LIB  = os.path.join(ROOT, "_lib")
SKIP = {"Temp", "_archive", "_superseded_flat_build", ".git", "_lib",
        "AI_study", "node_modules", "supabase"}
UA   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"

PYO = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
CM  = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/"
ONE = {  # exact url -> file inside _lib/
    "https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js": "marked.min.js",
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2":     "supabase.js",
}
PYO_PKGS = ["numpy"]  # pyodide packages to keep available offline
SQLJS = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/"
# runtime expression that finds where sql-wasm.js was loaded from (works at any page depth)
SQL_BASE_EXPR = '(function(){var s=document.querySelector(\'script[src*="sql-wasm"]\');return s?s.src.slice(0,s.src.lastIndexOf("/")+1):"";})()'
REACT = {
    "https://unpkg.com/react@18.3.1/umd/react.development.js":         "react/react.development.js",
    "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js": "react/react-dom.development.js",
    "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js":         "react/babel.min.js",
}
FONT_RE   = re.compile(r'https://fonts\.googleapis\.com/css2\?[^"\'\s>]+')
PRECON_RE = re.compile(r'\s*<link[^>]+preconnect[^>]+fonts\.g[^>]+>', re.I)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()

def save(rel, data):
    p = os.path.join(LIB, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as f:
        f.write(data)

def have(rel):
    return os.path.exists(os.path.join(LIB, rel.replace("/", os.sep)))

def ensure(url, rel):
    if have(rel):
        return
    print("  down:", rel)
    save(rel, fetch(url))

def walk_files(exts):
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP]
        for fn in fns:
            if fn.lower().endswith(exts):
                yield os.path.join(dp, fn)

def main():
    pages, scripts = {}, {}
    for p in walk_files((".html",)):
        try:
            with open(p, encoding="utf-8") as f:
                pages[p] = f.read()
        except (UnicodeDecodeError, OSError) as e:
            print("  skip (unreadable):", os.path.relpath(p, ROOT), "-", e)
    for p in walk_files((".js", ".jsx")):
        try:
            with open(p, encoding="utf-8") as f:
                scripts[p] = f.read()
        except (UnicodeDecodeError, OSError):
            pass

    # ---- 1. find what the pages actually use -------------------------------
    cm_paths, pyo_hit, font_urls = set(), False, set()
    for t in pages.values():
        for m in re.finditer(re.escape(CM) + r'[A-Za-z0-9_\-./]+', t):
            cm_paths.add(m.group(0)[len(CM):])
        if PYO in t:
            pyo_hit = True
        for m in FONT_RE.finditer(t):
            font_urls.add(m.group(0))

    print("Downloading libraries into _lib/ (first run takes a few minutes)...")
    for sub in sorted(cm_paths):
        ensure(CM + sub, "codemirror/" + sub)
    for url, rel in ONE.items():
        if any(url in t for t in pages.values()):
            ensure(url, rel)
    if any(SQLJS in t for t in list(pages.values()) + list(scripts.values())):
        ensure(SQLJS + "sql-wasm.js",   "sqljs/sql-wasm.js")
        ensure(SQLJS + "sql-wasm.wasm", "sqljs/sql-wasm.wasm")
    for url, rel in REACT.items():
        if any(url in t for t in pages.values()):
            ensure(url, rel)

    if pyo_hit:
        for f in ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm",
                  "python_stdlib.zip", "pyodide-lock.json"]:
            ensure(PYO + f, "pyodide/" + f)
        with open(os.path.join(LIB, "pyodide", "pyodide-lock.json"), encoding="utf-8") as f:
            lock = json.load(f)
        pkgs, want, seen = lock.get("packages", {}), list(PYO_PKGS), set()
        while want:
            n = want.pop()
            key = next((k for k in pkgs if k.lower() == n.lower()), None)
            if not key or key in seen:
                continue
            seen.add(key)
            ensure(PYO + pkgs[key]["file_name"], "pyodide/" + pkgs[key]["file_name"])
            want += pkgs[key].get("depends", [])

    # ---- 2. Google Fonts -> local woff2 ------------------------------------
    font_map = {}
    for u in sorted(font_urls):
        clean = u.replace("&amp;", "&")
        rel = "fonts/gf-" + hashlib.md5(clean.encode()).hexdigest()[:8] + ".css"
        if not have(rel):
            css = fetch(clean).decode("utf-8")
            def repl(m):
                fu = m.group(1)
                ext = os.path.splitext(fu.split("?")[0])[1] or ".woff2"
                name = "f/" + hashlib.md5(fu.encode()).hexdigest()[:10] + ext
                if not have("fonts/" + name):
                    save("fonts/" + name, fetch(fu))
                return "url(" + name + ")"
            css = re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', repl, css)
            save(rel, css.encode("utf-8"))
            print("  down:", rel)
        font_map[u] = rel

    # ---- 3. progress backup helper -----------------------------------------
    save("progress-backup.js", BACKUP_JS.encode("utf-8"))

    # ---- 4. rewrite the pages ----------------------------------------------
    changed, leftovers = 0, {}
    for path, t in pages.items():
        rl = os.path.relpath(LIB, os.path.dirname(path)).replace(os.sep, "/")
        orig = t
        t = t.replace(CM, rl + "/codemirror/")
        t = t.replace(PYO, rl + "/pyodide/")
        # sql.js: first swap the locateFile string literal for a runtime lookup,
        # then point the remaining <script src> at the local copy
        t = t.replace('"' + SQLJS + '"', SQL_BASE_EXPR).replace("'" + SQLJS + "'", SQL_BASE_EXPR)
        t = t.replace(SQLJS, rl + "/sqljs/")
        for url, rel in ONE.items():
            t = t.replace(url, rl + "/" + rel)
        for url, rel in REACT.items():
            t = t.replace(url, rl + "/" + rel)
        # local files don't need SRI/CORS attributes (and they can break on file://)
        t = re.sub(r'(<script[^>]*_lib/react/[^>]*?)\s+integrity="[^"]*"', r'\1', t)
        t = re.sub(r'(<script[^>]*_lib/react/[^>]*?)\s+crossorigin="[^"]*"', r'\1', t)
        for u, rel in font_map.items():
            t = t.replace(u, rl + "/" + rel)
        t = PRECON_RE.sub("", t)
        if "progress-backup.js" not in t:
            i = t.lower().rfind("</body>")
            if i != -1:
                t = t[:i] + '<script src="' + rl + '/progress-backup.js"></script>\n' + t[i:]
        if t != orig:
            with open(path, "w", encoding="utf-8") as f:
                f.write(t)
            changed += 1
        for m in re.finditer(r'<script[^>]+src="(https?://[^"]+)"', t):
            leftovers[m.group(1)] = leftovers.get(m.group(1), 0) + 1
        for m in re.finditer(r'<link[^>]+rel="stylesheet"[^>]+href="(https?://[^"]+)"', t):
            leftovers[m.group(1)] = leftovers.get(m.group(1), 0) + 1

    js_changed = 0
    for path, t in scripts.items():
        orig = t
        t = t.replace('"' + SQLJS + '"', SQL_BASE_EXPR).replace("'" + SQLJS + "'", SQL_BASE_EXPR)
        if t != orig:
            with open(path, "w", encoding="utf-8") as f:
                f.write(t)
            js_changed += 1

    print("\nRewrote %d HTML files, %d JS files." % (changed, js_changed))
    if leftovers:
        print("Still loading from the internet (tell Claude if any of these should work offline too):")
        for u, c in sorted(leftovers.items()):
            print("  %3d x  %s" % (c, u))
    print("Done. Copy the whole Commonplace folder (including _lib/) to iCloud as usual.")

BACKUP_JS = r"""/* Commonplace - progress export/import (injected by make_offline.py) */
(function(){
if(window.__cpBackup)return;window.__cpBackup=1;
function dl(){var d={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);d[k]=localStorage.getItem(k);}
 var blob=new Blob([JSON.stringify({app:"commonplace",exportedAt:new Date().toISOString(),data:d},null,1)],{type:"application/json"});
 var a=document.createElement("a");a.href=URL.createObjectURL(blob);
 a.download="commonplace-progress-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
function imp(){var inp=document.createElement("input");inp.type="file";inp.accept=".json,application/json";
 inp.onchange=function(){var f=inp.files[0];if(!f)return;var r=new FileReader();
  r.onload=function(){try{var j=JSON.parse(r.result),d=j.data||j,n=0;
   Object.keys(d).forEach(function(k){var v=d[k];
    if(k.indexOf("crs::")===0){try{var cur=JSON.parse(localStorage.getItem(k)||"{}"),inc=JSON.parse(v);
     Object.keys(inc).forEach(function(ik){if(inc[ik]==="done")cur[ik]="done";else if(!(ik in cur))cur[ik]=inc[ik];});
     localStorage.setItem(k,JSON.stringify(cur));n++;return;}catch(e){}}
    if(localStorage.getItem(k)===null){localStorage.setItem(k,v);n++;}});
   alert("Imported "+n+" entries. Reloading.");location.reload();
  }catch(e){alert("Could not read that file: "+e.message);}};
  r.readAsText(f);};
 inp.click();}
function boot(){
 var st=document.createElement("style");
 st.textContent=".cpb-pill{position:fixed;left:10px;bottom:10px;z-index:9998;display:flex;gap:6px;align-items:center;font-family:system-ui,-apple-system,sans-serif}.cpb-main{width:30px;height:30px;border-radius:50%;border:1px solid #d8cbb8;background:#fffdf7;color:#8a5a2b;opacity:.4;cursor:pointer;font-size:14px;line-height:1}.cpb-main:hover{opacity:1}.cpb-menu button{font-size:12px;margin-right:6px;padding:5px 10px;border-radius:999px;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)}";
 document.head.appendChild(st);
 var box=document.createElement("div");box.className="cpb-pill";
 box.innerHTML='<button class="cpb-main" title="Backup / restore study progress">&#8645;</button><span class="cpb-menu" hidden><button data-a="ex">Export progress</button><button data-a="im">Import progress</button></span>';
 document.body.appendChild(box);
 box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
  var m=box.querySelector(".cpb-menu");
  if(b.className==="cpb-main"){m.hidden=!m.hidden;return;}
  if(b.getAttribute("data-a")==="ex")dl();else imp();m.hidden=true;});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
"""

if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as e:
        sys.exit("Network error: %s - are you online? Re-run to resume." % e)
