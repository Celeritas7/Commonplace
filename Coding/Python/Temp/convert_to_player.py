"""Phase 2: turn each notebook page into a thin shell around lib/notebook-player.js.

Usage:  python convert_to_player.py <Python folder> [--dry]
Backs every original up to <folder>/Temp/pre_player/<name>.html first (once).
Keeps the nbdata JSON byte-for-byte, and keeps the page id so saved edits
(localStorage pynb_<id>_code_N) still load.
"""
import html, json, os, re, shutil, sys

ROOT = os.path.abspath(sys.argv[1])
DRY = "--dry" in sys.argv
FOLDERS = ["fundamentals", "libraries", "practice"]

NB_RE = re.compile(r'<script type="application/json" id="nbdata">(.*?)</script>', re.S)


def grab(pat, t, flags=re.S, default=""):
    m = re.search(pat, t, flags)
    return m.group(1).strip() if m else default


def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def cfg_house(t, folder, stem):
    """fundamentals/ + libraries/ pages (already in house style)."""
    c = {
        "id": grab(r'var PAGE_ID = "([^"]+)"', t, default=stem),
        "folder": folder,
        "file": grab(r'\.mast::after \{ content:"([^"]+)"', t, default=stem + ".ipynb"),
        "crumb": text(grab(r'<span class="here">(.*?)</span>', t, default=stem)),
        "kicker": text(grab(r'<div class="k">(.*?)</div>', t, default="Notebook")),
        "title": grab(r'<header class="mast">.*?<h1>(.*?)</h1>', t, default=stem),
    }
    sub = grab(r'<p class="sub">(.*?)</p>', t)
    if sub:
        # the old pages had a "Detail" toggle; the player shows notes inline
        sub = sub.replace(", and open <b>Detail</b> on any cell for the why behind it", "; the notes between cells explain the why")
        c["sub"] = sub
    repl = grab(r'<div class="repl">(.*?)</div>', t)
    repl = re.sub(r'<span class="pr">.*?</span>\s*', "", repl)
    repl = re.sub(r'<span class="cur"></span>', "", repl).strip()
    if repl:
        c["repl"] = repl
    return c


def cfg_practice(t, folder, stem):
    title = text(grab(r'<div class="nbx-head">\s*<h1>(.*?)</h1>', t, default=stem))
    src = text(grab(r'generated from <code>(.*?)</code>', t, default=stem + ".ipynb"))
    return {
        "id": stem, "folder": folder, "file": src, "crumb": title,
        "kicker": "Practice · Notebook", "title": html.escape(title),
        "sub": "My practice log &#8212; read each problem, then edit and run the attempts. Use the outline to jump between problems.",
        "unit": "Problem",
    }


SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title_tag}</title>
<meta name="theme-color" content="#0d1e16" />
<link href="../../../_lib/fonts/gf-135340b0.css" rel="stylesheet" />
<link rel="stylesheet" href="../../../_lib/codemirror/codemirror.min.css" />
<link rel="stylesheet" href="../lib/tokens.css" />
<link rel="stylesheet" href="../lib/notebook-player.css" />
<script src="../../../_lib/marked.min.js"></script>
<script src="../../../_lib/codemirror/codemirror.min.js"></script>
<script src="../../../_lib/codemirror/mode/python/python.min.js"></script>
<script src="../../../_lib/pyodide/pyodide.js"></script>
<script src="../lib/notebook-player.js"></script>
</head>
<body>
<script type="application/json" id="nbdata">{nbdata}</script>
<script>NotebookPlayer.mount({cfg});</script>
<script src="../../../_lib/progress-backup.js"></script>
<script src="../lib/py-kb-fix.js?v=2"></script>
</body>
</html>
"""


def convert(path, folder):
    t = open(path, encoding="utf-8").read()
    if "NotebookPlayer.mount" in t:
        return "already converted"
    m = NB_RE.search(t)
    if not m:
        return "no nbdata - skipped"
    nb = m.group(1)
    json.loads(nb)  # sanity: must parse
    stem = os.path.splitext(os.path.basename(path))[0]
    c = cfg_practice(t, folder, stem) if 'class="nbx-wrap"' in t else cfg_house(t, folder, stem)
    cfg = json.dumps(c, ensure_ascii=False, indent=1).replace("</", "<\\/")
    out = SHELL.format(title_tag=html.escape(c["crumb"] + " · Python · Commonplace"), nbdata=nb, cfg=cfg)
    if DRY:
        return "would write %d -> %d bytes  %s" % (len(t), len(out), json.dumps({k: c[k] for k in ("id", "file", "crumb")}, ensure_ascii=False))
    bdir = os.path.join(ROOT, folder, "Temp", "pre_player")
    os.makedirs(bdir, exist_ok=True)
    b = os.path.join(bdir, os.path.basename(path))
    if not os.path.exists(b):
        shutil.copy2(path, b)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(out)
    return "%d -> %d bytes" % (len(t), len(out))


for folder in FOLDERS:
    d = os.path.join(ROOT, folder)
    for name in sorted(os.listdir(d)):
        if name.endswith(".html"):
            print("%-52s %s" % (folder + "/" + name, convert(os.path.join(d, name), folder)))
