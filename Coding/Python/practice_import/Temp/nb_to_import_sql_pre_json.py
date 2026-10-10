#!/usr/bin/env python3
"""
nb_to_import_sql.py
===================

Turn a Commonplace practice notebook (either a `.ipynb`, or one of the rendered
`*.html` practice pages that carries a <script id="nbdata"> block) into an
**idempotent** SQL file that loads your attempts into Supabase:

    commonplace_exercises   <- one row per PROBLEM   (e.g. "Prime Number Checker")
    commonplace_attempts    <- one row per CODE CELL, all sharing that exercise_id
    commonplace_mistakes    <- one row per FAILED attempt, pointing at exercise+attempt

Because every attempt for a problem shares one `exercise_id`, your four prime-number
tries stay *linked to the prime-number question* — exactly like the existing
`import_beginner.sql`. Failed attempts become rows in your Mistake Bank / Drill.

The script resolves your `user_id` from your **login email** (looked up in
`auth.users`), so the rows can never land under the wrong account. The output is
idempotent: re-running it first deletes any prior rows it created for the same
user + import tag, then re-inserts.

--------------------------------------------------------------------------------
USAGE
--------------------------------------------------------------------------------

    python nb_to_import_sql.py  <notebook>  --email you@example.com  [options]

Examples:

    # Beginner page (HTML with nbdata) -> import_beginner.sql
    python nb_to_import_sql.py self_practice_beginner.html \
        --email you@example.com --tag import:beginner --out import_beginner.sql

    # Intermediate notebook (real .ipynb, keeps stdout) 
    python nb_to_import_sql.py Self_practice_intermediate.ipynb \
        --email you@example.com --tag import:intermediate --out import_intermediate.sql

    # Force every mistake to show in the bank (don't auto-resolve solved ones)
    python nb_to_import_sql.py random_module_practice.html \
        --email you@example.com --all-unresolved

Then open Supabase -> SQL Editor -> paste the generated file -> Run.

--------------------------------------------------------------------------------
OPTIONS
--------------------------------------------------------------------------------
  --email      EMAIL   (required) your magic-link login email; resolves user_id
  --tag        TAG     import marker tag (default: import:<filename-slug>)
  --subject    SUBJ    subject column value (default: python)
  --language   LANG    language column value (default: python)
  --out        FILE    write SQL here (default: stdout)
  --all-unresolved     mark every mistake resolved=false (so it shows in the bank)
  --bank-all           also bank non-failed attempts as (unresolved) mistakes
  --keep-stubs         keep placeholder code cells (e.g. "# Try fixing here")
                       instead of skipping comment-only / empty cells

--------------------------------------------------------------------------------
HOW IT READS A NOTEBOOK
--------------------------------------------------------------------------------
It walks cells top-to-bottom and auto-detects one of two layouts:

* "Structured" layout  — when many cells are `# ... Problem N`:
    each `# Problem N` starts a problem; a `## Problem Statement` body becomes the
    prompt; `## Verified / Working Solution` marks the next code cell as passed;
    `## Attempt / Fix / Refactor` mark it as ungraded.

* "Freeform" layout (the beginner / random-module pages):
    `#  heading`      -> SECTION (stored as the 2nd tag)
    `## / ###`        -> a new PROBLEM (its text is the title; an empty heading-only
                         block with no code is dropped)
    `#### heading`    -> the problem PROMPT
    `##### heading`   -> a status marker for the next code cell
                         ("failed" -> mistake, "successful" -> passed, ...)
    code cell         -> an ATTEMPT under the current problem

Grading from a status marker (case-insensitive substring):
    passed=True  if it mentions success / passed / worked / complete / solved
    passed=False if it mentions fail / can't / cannot / error / issue / wrong
    a negator (not / n't / never) flips a positive marker to False
    otherwise passed is NULL (ungraded)
A mistake row is written for every passed=False attempt (and is marked resolved
when a later attempt in the same problem passed).
"""

import argparse
import json
import os
import re
import sys


# ---------------------------------------------------------------- cell loading

def load_cells(path):
    """Return a list of {'kind': 'md'|'code', 'text': str, 'stdout': str|None}."""
    ext = os.path.splitext(path)[1].lower()
    raw = open(path, "r", encoding="utf-8").read()
    if ext == ".ipynb":
        return _load_ipynb(raw)
    # otherwise treat as an HTML page carrying <script id="nbdata">…</script>
    return _load_nbdata_html(raw, path)


def _load_ipynb(raw):
    nb = json.loads(raw)
    out = []
    for c in nb.get("cells", []):
        src = c.get("source", "")
        if isinstance(src, list):
            src = "".join(src)
        kind = "code" if c.get("cell_type") == "code" else "md"
        stdout = None
        if kind == "code":
            chunks = []
            for o in c.get("outputs", []):
                if o.get("output_type") == "stream":
                    t = o.get("text", "")
                    chunks.append("".join(t) if isinstance(t, list) else t)
                elif o.get("output_type") in ("execute_result", "display_data"):
                    t = (o.get("data", {}) or {}).get("text/plain", "")
                    chunks.append("".join(t) if isinstance(t, list) else t)
            stdout = "".join(chunks) or None
        out.append({"kind": kind, "text": src, "stdout": stdout})
    return out


def _load_nbdata_html(raw, path):
    m = re.search(
        r'<script[^>]*id=["\']nbdata["\'][^>]*>(.*?)</script>',
        raw, re.DOTALL | re.IGNORECASE,
    )
    if not m:
        sys.exit(f"error: no <script id=\"nbdata\"> block found in {path}")
    data = json.loads(m.group(1))
    out = []
    for c in data:
        kind = "code" if c.get("t") == "code" else "md"
        out.append({"kind": kind, "text": c.get("s", ""), "stdout": None})
    return out


# ---------------------------------------------------------------- helpers

# Tolerant: these notebooks often omit the space after '#' (e.g. "##Prime").
HEAD_RE = re.compile(r'^(#{1,6})\s*(.*)$')


def heading(text):
    """(level, heading_text, body) for a markdown cell, or (0, '', text)."""
    lines = text.split("\n")
    first = None
    for ln in lines:
        if ln.strip():
            first = ln
            break
    if first is None:
        return (0, "", "")
    m = HEAD_RE.match(first.strip())
    if not m:
        return (0, "", text.strip())
    level = len(m.group(1))
    htext = m.group(2).strip()
    body = "\n".join(lines[lines.index(first) + 1:]).strip()
    return (level, htext, body)


def first_line(s):
    for ln in s.split("\n"):
        if ln.strip():
            return ln.strip()
    return ""


POS = ("success", "passed", "worked", "complete", "solved", "verified")
NEG = ("fail", "can't", "cant", "cannot", "error", "issue", "wrong")
NEGATORS = ("not", "n't", "never")


def grade(marker):
    """True / False / None from a status-marker string."""
    if not marker:
        return None
    t = marker.lower()
    if any(n in t for n in NEG):
        return False
    if any(p in t for p in POS):
        if any(g in t for g in NEGATORS):
            return False
        return True
    return None


def is_stub(code):
    """A code cell with no real content (blank or comment-only)."""
    for ln in code.split("\n"):
        s = ln.strip()
        if s and not s.startswith("#"):
            return False
    return True


def slug(path):
    base = os.path.splitext(os.path.basename(path))[0]
    return re.sub(r'[^a-z0-9]+', '-', base.lower()).strip('-')


# ---------------------------------------------------------------- parsing

class Problem:
    __slots__ = ("title", "prompt", "section", "attempts")

    def __init__(self, title, section):
        self.title = title
        self.prompt = None
        self.section = section
        self.attempts = []   # list of {'code','stdout','passed','marker'}


def detect_structured(cells):
    n = 0
    for c in cells:
        if c["kind"] == "md":
            lvl, ht, _ = heading(c["text"])
            if lvl == 1 and re.search(r'problem\s*\d+', ht, re.I):
                n += 1
    return n >= 3


def parse(cells, keep_stubs):
    return (parse_structured if detect_structured(cells) else parse_freeform)(
        cells, keep_stubs)


def statement_from_body(body):
    """In the structured layout the '# Problem N' line and its '## Problem
    Statement' / actual statement often live in ONE markdown cell. Pull the real
    statement line out of that cell's body."""
    lines = body.split("\n")
    for i, ln in enumerate(lines):
        if re.search(r'problem statement', ln, re.I):
            for nx in lines[i + 1:]:
                if nx.strip():
                    return nx.strip()
    return None


def parse_structured(cells, keep_stubs):
    problems = []
    cur = None
    pending_passed = None
    pending_marker = None
    for c in cells:
        if c["kind"] == "md":
            lvl, ht, body = heading(c["text"])
            if lvl == 1 and re.search(r'problem\s*\d+', ht, re.I):
                cur = Problem(ht, "Imported")
                problems.append(cur)
                pending_passed, pending_marker = None, None
                st = statement_from_body(body)            # title+prompt in same cell
                if st:
                    cur.prompt = st
                    cur.title = st[:120]
            elif cur is not None and re.search(r'problem statement', ht, re.I):
                stmt = body or ""
                if stmt:
                    cur.prompt = first_line(stmt)
                    if cur.title and re.fullmatch(r'.*problem\s*\d+.*', cur.title, re.I):
                        cur.title = first_line(stmt)[:120]
            elif re.search(r'verified|working solution', ht, re.I):
                pending_passed, pending_marker = True, "verified solution"
            elif re.search(r'attempt|raw|fix|refactor', ht, re.I):
                pending_passed, pending_marker = None, ht
        else:  # code
            if cur is None:
                cur = Problem("Untitled", "Imported")
                problems.append(cur)
            if is_stub(c["text"]) and not keep_stubs:
                continue
            cur.attempts.append({
                "code": c["text"], "stdout": c["stdout"],
                "passed": pending_passed, "marker": pending_marker,
            })
            pending_passed, pending_marker = None, None
    return [p for p in problems if p.attempts]


def boundary_level(cells):
    """Auto-pick which heading level starts a new problem: the shallowest level in
    2..4 that occurs at least twice (beginner uses ##, the random page uses ####)."""
    counts = {2: 0, 3: 0, 4: 0}
    for c in cells:
        if c["kind"] == "md":
            lvl, _, _ = heading(c["text"])
            if lvl in counts:
                counts[lvl] += 1
    for lvl in (2, 3, 4):
        if counts[lvl] >= 2:
            return lvl
    return 2


def parse_freeform(cells, keep_stubs):
    B = boundary_level(cells)
    problems = []
    cur = None
    section = None
    pending_marker = None

    def flush_if_empty():
        # drop a heading-only problem that never got code
        if problems and not problems[-1].attempts:
            problems.pop()

    for c in cells:
        if c["kind"] == "md":
            lvl, ht, body = heading(c["text"])
            if lvl == 0:
                continue
            if lvl < B:
                # shallow heading = section label (the 2nd tag)
                section = ht or section
            elif lvl == B:
                flush_if_empty()
                cur = Problem(ht or "Untitled", section)
                problems.append(cur)
                pending_marker = None
            else:  # lvl > B  -> prompt or status marker for the next code cell
                g = grade(ht)
                if g is None:
                    if cur is not None and cur.prompt is None and not cur.attempts:
                        cur.prompt = ht          # a sub-title before any code = prompt
                else:
                    pending_marker = ht          # "failed" / "successful" = status
        else:  # code
            if cur is None:
                cur = Problem(section or "Untitled", section)
                problems.append(cur)
            if is_stub(c["text"]) and not keep_stubs:
                continue
            cur.attempts.append({
                "code": c["text"], "stdout": c["stdout"],
                "passed": grade(pending_marker), "marker": pending_marker,
            })
            pending_marker = None
    flush_if_empty()
    return [p for p in problems if p.attempts]


# ---------------------------------------------------------------- SQL emit

def dollar_tag(*texts):
    """Pick a $tag$ that appears in none of the given texts."""
    for cand in ("$c$", "$cc$", "$ccc$", "$body$", "$q$", "$txt$"):
        if all(cand not in (t or "") for t in texts):
            return cand
    i = 0
    while True:
        cand = f"$g{i}$"
        if all(cand not in (t or "") for t in texts):
            return cand
        i += 1


def lit(s):
    """A safely dollar-quoted SQL literal, or NULL."""
    if s is None:
        return "NULL"
    tag = dollar_tag(s)
    return f"{tag}{s}{tag}"


def arr(items):
    inner = ", ".join(lit(x) for x in items)
    return f"ARRAY[{inner}]::text[]"


def emit(problems, email, tag, subject, language, all_unresolved, bank_all):
    L = []
    w = L.append
    w("-- Generated by nb_to_import_sql.py")
    w(f"-- import tag: {tag}   subject: {subject}   problems: {len(problems)}   "
      f"attempts: {sum(len(p.attempts) for p in problems)}")
    w("-- Resolves user_id from auth.users by login email. Idempotent for this tag.")
    w("")
    w("BEGIN;")
    w("")
    w("DO $IMPORT$")
    w("DECLARE")
    w("  uid    uuid;")
    w("  ex_id  uuid;")
    w("  att_id uuid;")
    w("BEGIN")
    w(f"  SELECT id INTO uid FROM auth.users WHERE email = {lit(email)} LIMIT 1;")
    w("  IF uid IS NULL THEN")
    w(f"    RAISE EXCEPTION 'No auth user for email %', {lit(email)};")
    w("  END IF;")
    w("")
    w("  -- idempotent cleanup: remove prior rows from this import (FK order)")
    w("  DELETE FROM commonplace_mistakes m USING commonplace_exercises e")
    w("   WHERE m.exercise_id = e.id AND e.user_id = uid")
    w(f"     AND e.subject = {lit(subject)} AND e.tags && {arr([tag])};")
    w("  DELETE FROM commonplace_attempts a USING commonplace_exercises e")
    w("   WHERE a.exercise_id = e.id AND e.user_id = uid")
    w(f"     AND e.subject = {lit(subject)} AND e.tags && {arr([tag])};")
    w("  DELETE FROM commonplace_exercises e")
    w("   WHERE e.user_id = uid")
    w(f"     AND e.subject = {lit(subject)} AND e.tags && {arr([tag])};")
    w("")

    for i, p in enumerate(problems):
        passed_later = any(a["passed"] is True for a in p.attempts)
        tags = [tag] + ([p.section] if p.section else [])
        w(f"  -- [{i}] {p.title}  ({len(p.attempts)} attempt(s))")
        w("  INSERT INTO commonplace_exercises "
          "(user_id, subject, title, prompt, difficulty, tags, order_index)")
        w(f"  VALUES (uid, {lit(subject)}, {lit(p.title)}, {lit(p.prompt)}, NULL,")
        w(f"          {arr(tags)}, {i})")
        w("  RETURNING id INTO ex_id;")
        for a in p.attempts:
            passed_sql = ("true" if a["passed"] is True
                          else "false" if a["passed"] is False else "NULL")
            w("  INSERT INTO commonplace_attempts "
              "(user_id, exercise_id, subject, language, code, stdout, passed)")
            w(f"  VALUES (uid, ex_id, {lit(subject)}, {lit(language)}, "
              f"{lit(a['code'])},")
            w(f"          {lit(a['stdout'])}, {passed_sql})")
            w("  RETURNING id INTO att_id;")
            make_mistake = a["passed"] is False or (bank_all and a["passed"] is not True)
            if make_mistake:
                reason = a["marker"] or ("mistake" if a["passed"] is False else "review")
                resolved = "false" if all_unresolved else ("true" if passed_later else "false")
                w("  INSERT INTO commonplace_mistakes "
                  "(user_id, exercise_id, attempt_id, subject, reason, resolved)")
                w(f"  VALUES (uid, ex_id, att_id, {lit(subject)}, "
                  f"{lit(reason)}, {resolved});")
        w("")

    w("END")
    w("$IMPORT$;")
    w("")
    w("COMMIT;")
    w("")
    return "\n".join(L)


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Notebook -> Supabase import SQL")
    ap.add_argument("notebook", help="path to a .ipynb or a practice .html page")
    ap.add_argument("--email", required=True, help="your login email (resolves user_id)")
    ap.add_argument("--tag", default=None, help="import tag (default import:<file-slug>)")
    ap.add_argument("--subject", default="python")
    ap.add_argument("--language", default="python")
    ap.add_argument("--out", default=None, help="output .sql (default: stdout)")
    ap.add_argument("--all-unresolved", action="store_true",
                    help="mark every mistake resolved=false (always show in bank)")
    ap.add_argument("--bank-all", action="store_true",
                    help="also bank non-failed attempts as unresolved mistakes")
    ap.add_argument("--keep-stubs", action="store_true",
                    help="keep placeholder / comment-only code cells")
    args = ap.parse_args()

    tag = args.tag or f"import:{slug(args.notebook)}"
    cells = load_cells(args.notebook)
    problems = parse(cells, args.keep_stubs)
    if not problems:
        sys.exit("error: no problems with code attempts were found")
    sql = emit(problems, args.email, tag, args.subject, args.language,
               args.all_unresolved, args.bank_all)

    if args.out:
        open(args.out, "w", encoding="utf-8").write(sql)
        n_att = sum(len(p.attempts) for p in problems)
        n_mis = sql.count("INSERT INTO commonplace_mistakes")
        print(f"wrote {args.out}: {len(problems)} problems, {n_att} attempts, "
              f"{n_mis} mistakes  (tag={tag})", file=sys.stderr)
    else:
        sys.stdout.write(sql)


if __name__ == "__main__":
    main()
