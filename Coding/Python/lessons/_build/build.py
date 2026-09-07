# -*- coding: utf-8 -*-
"""Build Python Book lesson pages.

Each lesson is authored as a dict in parts/part_<n>.py; this renders it into a
single self-contained HTML file in ../ . The reader never sees a build step —
CSS and JS are inlined at build time. Run:  python build.py
"""
import io, os, json, importlib, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
OUT    = os.path.abspath(os.path.join(HERE, '..'))
ROMAN  = ["0","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"]
PARTNM = ["Before You Code","The Basics","Decisions and Loops","Collections",
          "Functions","Errors and Debugging","Files, Formats and the OS",
          "Standard Library Toolbox","Object-Oriented Python","Programs People Use",
          "Talking to the Internet","Data Libraries","Automating the Boring Stuff"]

CSS = io.open(os.path.join(HERE,'lesson.css'), encoding='utf-8').read()
JS  = io.open(os.path.join(HERE,'lesson.js'),  encoding='utf-8').read()

HUD_SVG = '''<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 52c-10 0-16-5-16-11s5-9 11-9h10c4 0 7-2 7-5s-3-5-7-5H22" fill="none" stroke="#2f6b4f" stroke-width="5" stroke-linecap="round"/>
      <circle cx="20" cy="22" r="8" fill="#3c8362"/>
      <circle cx="17.5" cy="21" r="3" fill="#fbfcf6"/><circle cx="17.5" cy="21" r="1.4" fill="#1a2820"/>
    </svg>'''

COBRA_SVG = '''<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M33 55c-11 0-18-5.5-18-12s5.5-10 12-10h11c4.5 0 8-2.2 8-5.5S42.5 22 38 22H24"
            fill="none" stroke="#2f6b4f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M33 55c-11 0-18-5.5-18-12s5.5-10 12-10h11c4.5 0 8-2.2 8-5.5S42.5 22 38 22H24"
            fill="none" stroke="#7fa68b" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 7"/>
      <circle cx="21" cy="20" r="9.5" fill="#3c8362"/>
      <circle cx="17.4" cy="18.6" r="4.4" fill="#fbfcf6" stroke="#234f3b" stroke-width="1.5"/>
      <circle cx="27.2" cy="18.6" r="4.4" fill="#fbfcf6" stroke="#234f3b" stroke-width="1.5"/>
      <path d="M21.8 18.6h2.6" stroke="#234f3b" stroke-width="1.5"/>
      <circle cx="17.4" cy="18.6" r="1.7" fill="#1a2820"/>
      <circle cx="27.2" cy="18.6" r="1.7" fill="#1a2820"/>
      <path d="M21 29.5v3.5m0 0l-2.4 2m2.4-2l2.4 2" stroke="#a5432f" stroke-width="1.5" stroke-linecap="round"/>
    </svg>'''

SECTION_TITLES = ["Why this matters","The mental model","Walk-through","Try it",
                  "Predict the output","What trips people here","Your turn","Quick recap"]

def src(kind, body):
    """Provenance callout. kind: notes | nb | fresh"""
    tag = {"notes":"☆︎ Notes","nb":"▤ Notebook","fresh":"✦ Newly written"}
    lbl = {"notes":"\U0001F4D6 From your notes","nb":"\U0001F9EA From your notebook","fresh":"✨ Newly written"}
    return ('<div class="src %s"><span class="src-tag">%s</span>\n    <p>%s</p>\n  </div>'
            % (kind, lbl[kind], body))

def code(name, lines):
    return ('<div class="code">\n    <div class="code-head"><span class="code-dot"></span>'
            '<span class="code-dot"></span><span class="code-dot"></span>'
            '<span class="code-name">%s</span></div>\n<pre>%s</pre>\n  </div>' % (name, lines))

def ann(rows):
    out = ['<div class="ann">']
    for where, text in rows:
        out.append('    <span class="ln">%s</span><span class="tx">%s</span>' % (where, text))
    out.append('  </div>')
    return "\n".join(out)

def matcher(rows):
    """rows: list of (english, [(key,codetext),...], answerkey)"""
    out = ['<div class="try-grid" id="matcher">']
    for eng, opts, ansk in rows:
        o = "".join('<button class="opt" data-k="%s">%s</button>' % (k, t) for k, t in opts)
        out.append('    <div class="try-row">\n      <div class="eng">%s</div>\n'
                   '      <div class="try-arrow">→</div>\n'
                   '      <div class="opts" data-answer="%s">%s</div>\n    </div>' % (eng, ansk, o))
    out.append('  </div>')
    return "\n".join(out)

def quiz(question, codeblock, opts, ansk, reveal):
    o = "".join('<button class="opt" data-k="%s">%s</button>' % (k, t) for k, t in opts)
    cb = ('\n    ' + codeblock) if codeblock else ''
    return ('<div class="quiz">\n    <p class="quiz-q">%s</p>%s\n'
            '    <div class="quiz-opts" id="quiz" data-answer="%s">%s</div>\n'
            '    <div class="reveal" id="quizR">%s</div>\n  </div>' % (question, cb, ansk, o, reveal))

def mistakes(items):
    out = []
    for icon, title, body in items:
        out.append('<div class="mistake"><div class="mistake-icon">%s</div><div class="mistake-body">\n'
                   '    <strong>%s</strong>\n    <p>%s</p>\n  </div></div>' % (icon, title, body))
    return "\n\n  ".join(out)

def exercises(items):
    out = []
    for tag, body in items:
        out.append('<div class="exercise"><span class="ex-tag">%s</span>\n    <p>%s</p>\n  </div>' % (tag, body))
    return "\n  ".join(out)

def recap(title, bullets):
    lis = "\n      ".join('<li>%s</li>' % b for b in bullets)
    return ('<div class="recap">\n    <h2>%s</h2>\n    <ul>\n      %s\n    </ul>\n  </div>' % (title, lis))

def tryit_notebook(href, label, note):
    return ('<p>%s</p>\n  <p><a class="nb-link" href="%s">%s ↗</a></p>' % (note, href, label))


def render(L):
    pn, ln = L["id"].split(".")
    pi = int(pn)
    roman, partname = ROMAN[pi], PARTNM[pi]
    fname = "Py_Lesson_%s_%s.html" % (pn, ln)

    nxt = L.get("next")
    nxt_html = ('<a href="%s">Next — %s &rarr;</a>' % (nxt[0], nxt[1])) if nxt else \
               '<span style="font-family:var(--mono);font-size:13px;color:var(--ink-mute)">Next lesson not written yet</span>'
    nav = ('<div class="next">\n    <a href="../index.html">&larr; All Python lessons</a>\n    %s\n  </div>' % nxt_html)

    secs = []
    for i, key in enumerate(["s1","s2","s3","s4","s5","s6","s7","s8"]):
        heading = L.get(key + "_title", SECTION_TITLES[i])
        body = L[key] + ("\n  " + nav if key == "s8" else "")
        secs.append('<!-- %d -->\n<section class="lesson-section" id="s%d">\n'
                    '  <div class="step-label"><span class="step-num">%d</span><h2>%s</h2></div>\n'
                    '  %s\n</section>' % (i+1, i+1, i+1, heading, body))

    js = JS.replace("__COBRA_LINES__", json.dumps(L["cobra"], ensure_ascii=False, indent=4))
    js = js.replace("__LESSON_ID__", '"%s"' % L["id"])

    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lesson %(id)s — %(short)s · The Python Book</title>
<link href="../../../_lib/fonts/gf-135340b0.css" rel="stylesheet">
<script src="../js/progress-adapter.js"></script>
<style>
%(css)s
</style>
</head>
<body>

<div class="topbar"><div class="topbar-in">
  <div class="crumb"><a href="../../index.html">Coding</a><span class="sep">/</span><a href="../index.html">Python</a><span class="sep">/</span>%(id)s</div>
  <div class="progress-bar"><div class="progress-fill" id="pfill"></div></div>
  <div class="pct" id="ppc">0%%</div>
</div></div>

<div class="hud">
  <div class="hud-mascot">
    %(hud)s
  </div>
  <div class="hud-xp">XP<strong id="xp">0</strong></div>
</div>

<div class="page">

<header class="hero">
  <div class="hero-tag">The Python Book · Part %(roman)s · %(partname)s</div>
  <h1>%(title)s</h1>
  <p class="hero-sub">%(sub)s</p>
  <div class="hero-meta">
    <span>8 sections</span><span>~%(mins)s min</span><span>%(meta3)s</span>
  </div>
</header>

%(sections)s

</div><!-- /page -->

<div class="cobra">
  <div class="cobra-avatar">
    %(cobra)s
  </div>
  <div class="cobra-bubble"><span class="cobra-name">Cobra</span><span id="cobraLine">%(cobra0)s</span></div>
</div>

<div class="toast" id="toast"></div>

<script>
(function () {
%(js)s
})();
</script>

<!-- Commonplace cloud reading-progress sync -->
<script>window.READING_SYNC={resourceSet:"py_%(pn)s_%(ln)s",mode:"page",items:"section.lesson-section",pageName:"Python Lesson %(id)s"};</script>
<script src="../../../reading-sync.js"></script>
<script src="../../../_lib/progress-backup.js"></script>
<script src="../lib/lesson-reader.js" defer></script>
</body>
</html>
''' % dict(id=L["id"], short=L["short"], css=CSS, hud=HUD_SVG, cobra=COBRA_SVG,
           roman=roman, partname=partname, title=L["title"], sub=L["sub"],
           mins=L.get("mins","12"), meta3=L.get("meta3","No setup needed"),
           sections="\n\n".join(secs), cobra0=L["cobra"]["s1"], js=js,
           pn=pn, ln=ln) , fname


def sync_shelf():
    """Rewrite SEED.live.bookWritten in js/shelf-data.js from the lessons on disk,
    so the launcher never shows a written lesson as 'planned'."""
    import re
    shelf = os.path.abspath(os.path.join(HERE, "..", "..", "js", "shelf-data.js"))
    if not os.path.isfile(shelf):
        print("  (shelf-data.js not found; skipped)"); return
    ids = []
    for fn in os.listdir(OUT):
        m = re.fullmatch(r"Py_Lesson_(\d+)_(\d+)\.html", fn)
        if m: ids.append((int(m.group(1)), int(m.group(2))))
    ids.sort()
    listing = "[" + ",".join('"%d.%d"' % t for t in ids) + "]"
    s = io.open(shelf, encoding="utf-8", newline="").read()
    s2 = re.sub(r"bookWritten:\[[^\]]*\]", "bookWritten:" + listing, s, count=1)
    if s2 != s:
        io.open(shelf, "w", encoding="utf-8", newline="").write(s2)
    print("  shelf-data.js bookWritten: %d lesson(s)" % len(ids))


def main():
    which = sys.argv[1:] or ["0","1","2","3","4","5"]
    total = 0
    for p in which:
        try:
            mod = importlib.import_module("parts.part_%s" % p)
        except ImportError:
            print("  (no content for part %s yet)" % p); continue
        for L in mod.LESSONS:
            html, fname = render(L)
            io.open(os.path.join(OUT, fname), "w", encoding="utf-8", newline="").write(html)
            print("  wrote %-26s %6d bytes" % (fname, len(html)))
            total += 1
    print("%d lesson(s) built" % total)
    sync_shelf()

if __name__ == "__main__":
    sys.path.insert(0, HERE)
    main()
