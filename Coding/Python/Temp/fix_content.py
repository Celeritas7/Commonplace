"""Phase 1 content fixes for two practice notebooks (edits the nbdata JSON in place).
Usage: python fix_content.py <Python folder> [--dry]
Backs up to practice/Temp/pre_phase1/ first. Only markdown cells are removed, moved or
edited; code cells keep their order, so saved edits (pynb_<id>_code_N) stay aligned."""
import json, os, re, shutil, sys

ROOT = os.path.abspath(sys.argv[1]); DRY = "--dry" in sys.argv
NB_RE = re.compile(r'(<script type="application/json" id="nbdata">)(.*?)(</script>)', re.S)
log = []

def load(path):
    t = open(path, encoding="utf-8").read()
    m = NB_RE.search(t)
    return t, m, json.loads(m.group(2))

def save(path, t, m, cells):
    if DRY: return
    b = os.path.join(ROOT, "practice", "Temp", "pre_phase1"); os.makedirs(b, exist_ok=True)
    bp = os.path.join(b, os.path.basename(path))
    if not os.path.exists(bp): shutil.copy2(path, bp)
    out = t[:m.start(2)] + json.dumps(cells, ensure_ascii=False).replace("</", "<\\/") + t[m.end(2):]
    open(path, "w", encoding="utf-8", newline="\n").write(out)

def md(s): return {"t": "md", "s": s}
def first(c): return c["s"].strip().split("\n")[0].strip()

# ------------------------------------------------------------- beginner
def fix_beginner():
    path = os.path.join(ROOT, "practice", "self_practice_beginner.html")
    t, m, cells = load(path); n0 = len(cells)
    codes0 = [c["s"] for c in cells if c["t"] == "code"]

    # 1. unfilled template blocks: a '#Section XX' or '##N. XXXX' heading, and the bare '####' under it
    def is_template(c):
        if c["t"] != "md": return False
        f = first(c)
        return bool(re.fullmatch(r'#+\s*(Section XX: XXXX|\d\.\s*x{3,4})', f, re.I)) or f == "####"
    kept = [c for c in cells if not is_template(c)]
    log.append(f"beginner: removed {len(cells)-len(kept)} template cells")
    cells = kept

    # 2. retitles (first line only)
    RENAME = {
        "#17. Fhjshsjejsb": "# Section 17: The Quiz Project",
        "##wih excel": "## With Excel (pandas)",
        "##Googleshees -> excel (column names issue)": "## Google Sheets → Excel (column names issue)",
        "##Googleshees -> excel": "## Google Sheets → Excel",
        "##Googleshees": "## Google Sheets (gspread)",
        "##new google shees": "## New Google Sheet (gspread)",
        "##inermediae": "## Task list filtered by location and mood",
        "#Section 9: Dictionaries, nesting and scret auction": "# Section 9: Dictionaries, nesting and secret auction",
        "##4. Globle constants": "## 4. Global constants",
    }
    for c in cells:
        if c["t"] != "md": continue
        f = first(c)
        if f in RENAME:
            c["s"] = c["s"].replace(f, RENAME[f], 1); log.append(f"beginner: '{f}' -> '{RENAME[f]}'")

    # 3. move the task-list prompt next to its code (just after the renamed heading)
    pi = next((i for i, c in enumerate(cells) if c["t"] == "md" and first(c).startswith("####Can you make a sample tasklist")), None)
    hi = next((i for i, c in enumerate(cells) if c["t"] == "md" and first(c) == "## Task list filtered by location and mood"), None)
    if pi is not None and hi is not None and pi < hi:
        p = cells.pop(pi); hi -= 1
        cells.insert(hi + 1, p); log.append("beginner: moved task-list prompt under its heading")

    # 4. rock-paper-scissors: empty '##' heading followed by the real text as another '##' -> demote the text to a prompt
    for i in range(len(cells) - 1):
        if cells[i]["t"] == "md" and first(cells[i]) == "##Rock paper scissors game" and cells[i+1]["t"] == "md" and first(cells[i+1]).startswith("##Please choose"):
            cells[i+1]["s"] = "####" + cells[i+1]["s"].lstrip("#"); log.append("beginner: RPS prompt demoted under its heading"); break

    # 5. orphan hangman snippet after the dice game -> own heading
    for i, c in enumerate(cells):
        if c["t"] == "code" and c["s"].lstrip().startswith("import random") and '"artwork", "baboon", "camel"' in c["s"]:
            prev = cells[i-1]
            if not (prev["t"] == "md" and "Hangman" in prev["s"]):
                cells.insert(i, md("## Hangman — pick a random word")); log.append("beginner: heading added for hangman snippet")
            break

    assert [c["s"] for c in cells if c["t"] == "code"] == codes0, "code cells changed!"
    log.append(f"beginner: {n0} -> {len(cells)} cells")
    save(path, t, m, cells)

# ------------------------------------------------------------- structured
def fix_structured():
    path = os.path.join(ROOT, "practice", "self_practice_intermediate_structured.html")
    t, m, cells = load(path); n0 = len(cells)
    codes0 = [c["s"] for c in cells if c["t"] == "code"]
    PROB = re.compile(r'^#\s*\W*\s*Problem\s*(\d+|X)', re.I)
    isprob = lambda c: c["t"] == "md" and bool(PROB.match(first(c)))

    # 1. junk
    cells = [c for c in cells if not (c["t"] == "md" and c["s"].strip() == "bold text####Daa")]

    # 2. an attempt block with no Problem heading above it (code after '## Attempt' whose previous problem already has a verified block)
    out = []; seen_verified = False
    for i, c in enumerate(cells):
        if isprob(c): seen_verified = False
        elif c["t"] == "md" and re.search(r'verified|working solution', first(c), re.I): seen_verified = True
        elif c["t"] == "md" and re.search(r'attempt', first(c), re.I) and seen_verified:
            nxt = cells[i+1] if i + 1 < len(cells) else None
            if nxt and nxt["t"] == "code":
                stmt = "Flowchart with graphviz (Digraph)" if "graphviz" in nxt["s"] else "Untitled problem"
                out.append(md("# \U0001F522 Problem X\n\n## \U0001F4CC Problem Statement\n" + stmt))
                log.append(f"structured: inserted a Problem heading for the orphan '{stmt}' attempt"); seen_verified = False
        out.append(c)
    cells = out

    # 3. drop empty stubs: a Problem heading with no code before the next Problem heading
    keep = []; removed = []
    i = 0
    while i < len(cells):
        if isprob(cells[i]):
            j = i + 1
            while j < len(cells) and not isprob(cells[j]): j += 1
            if not any(c["t"] == "code" and not all(l.strip().startswith("#") or not l.strip() for l in c["s"].split("\n")) for c in cells[i:j]):
                removed.append(first(cells[i])); i = j; continue
            keep.extend(cells[i:j]); i = j
        else:
            keep.append(cells[i]); i += 1
    cells = keep
    log.append(f"structured: removed {len(removed)} empty problem stubs ({removed[0] if removed else ''} …)")

    # 4. renumber
    n = 0
    for c in cells:
        if isprob(c):
            n += 1
            c["s"] = PROB.sub("# \U0001F522 Problem " + str(n), c["s"], 1)
    log.append(f"structured: renumbered to Problem 1..{n}")
    assert [c["s"] for c in cells if c["t"] == "code"] == codes0, "code cells changed!"
    log.append(f"structured: {n0} -> {len(cells)} cells")
    save(path, t, m, cells)

fix_beginner(); fix_structured()
print("\n".join(log)); print("DRY RUN — nothing written" if DRY else "written")
