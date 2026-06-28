# Practice → Supabase importer

Turn your runnable practice notebooks (the `*.html` pages under
`Python/practice/…`, or real `.ipynb` files) into **idempotent SQL** that loads
your attempts into the Commonplace tables — so every attempt is **linked to its
problem** and every failed attempt lands in your **Mistake Bank / Drill**.

It mirrors the existing hand-built `import_beginner.sql`:

| notebook cell            | becomes a row in        | linked by        |
|--------------------------|-------------------------|------------------|
| a problem (e.g. "Prime") | `commonplace_exercises` | —                |
| each code cell / attempt | `commonplace_attempts`  | `exercise_id`    |
| each **failed** attempt  | `commonplace_mistakes`  | `exercise_id` + `attempt_id` |

All four prime-number tries share one `exercise_id` → they stay attached to the
prime-number question, exactly as you asked.

---

## The one thing that made the Bank empty before

A `.sql` file does nothing until you **run it in Supabase**, and the rows only
show up for the account you sign into the app as (RLS: `auth.uid() = user_id`).
The old `import_beginner.sql` hard-coded a `user_id` that may not be your login.

This importer fixes that: it resolves your `user_id` **from your login email**
(`SELECT id FROM auth.users WHERE email = …`), so the rows can never land under
the wrong account. If the email has no user, it raises a clear error instead of
silently inserting orphan rows.

---

## Use it

```bash
python nb_to_import_sql.py  <notebook>  --email you@example.com  [--tag import:foo]  [--out file.sql]
```

Then: **Supabase → SQL Editor → paste the generated file → Run.** It's
idempotent — re-running replaces that import's rows, never duplicates.

### Options
- `--email EMAIL`     (required) your magic-link login email → resolves `user_id`
- `--tag TAG`         import marker tag (default `import:<filename-slug>`)
- `--out FILE`        write SQL to a file (default: prints to screen)
- `--all-unresolved`  mark **every** mistake `resolved=false` so it always shows
                      in the Bank (the Bank hides resolved ones — this is likely
                      why "Nothing banked yet" even after a load)
- `--bank-all`        also bank passing/ungraded attempts as mistakes (useful for
                      the structured notebook, where raw attempts aren't marked
                      "failed" but you still want them in the drill)
- `--keep-stubs`      keep placeholder cells like `# Try fixing here`
- `--subject` / `--language`  default `python`

---

## IMPORTANT — which page actually shows the import

Your app has **two different "Mistake Banks" that do not share data**:

- The **§III "Mistake Bank" tab** on the Python practice page (the one with the
  "CPYTHON IDLE" pill) is mounted by `practice-engine.js` and reads from your
  **browser localStorage only** — its own footer says *"saved on this device
  (localStorage)."* A SQL import can **never** appear here; it only fills when you
  click *Save to bank* while practising in that browser. This is why it still
  says "Nothing banked yet" after a successful import.
- **`Python/fundamentals/mistake-drill.html`** is the page that reads Supabase
  `commonplace_mistakes` (scoped to your login). **Open that page** (signed in as
  the same email) to see everything you import here.
  It only shows mistakes with `resolved = false`, which is why these files are
  generated **all-unresolved**.

(To make the §III tab itself read Supabase, it has to be rewired per the
`design_handoff_practice_mistake_bank` brief — that's a code change to the app,
separate from this import.)

---

## Ready-made outputs (email already baked in)

Generated from your current notebooks, with `mangaonkaraniket@gmail.com` resolved
as the user and **every mistake left unresolved** so it shows in the drill. Just
paste-and-run — no editing.

| file | from | problems | attempts | mistakes (shown in drill) |
|------|------|---------:|---------:|---------:|
| `beginner.import.sql`               | Self practice beginner    | 60 | 120 | 28 (the failed attempts) |
| `intermediate.import.sql`           | Intermediate (freeform)   | 4  | 13  | 13 (every attempt) |
| `intermediate_structured.import.sql`| Intermediate (structured) | 12 | 13  | 13 (every attempt) |
| `random_module_practice.import.sql` | Random Module Practice    | 10 | 12  | 12 (every attempt) |

`beginner` banks only its genuinely failed attempts (it has explicit
failed/successful markers). The other three have no such markers, so they were
generated with `--bank-all` — every attempt is queued for drilling, linked to its
problem. Re-run the generator without `--bank-all` if you only want failures.

---

## How it reads a notebook (auto-detected)

- **Structured** layout (`# … Problem N` repeated): each `# Problem N` is a
  problem; `## Problem Statement` supplies title + prompt; `## Verified` marks the
  next code cell passed; `## Attempt / Fix` mark it ungraded.
- **Freeform** layout (beginner / random pages): a shallow `#` heading is the
  section tag; the importer picks the problem-boundary heading level
  automatically (`##` for beginner, `####` for the random page); a `#####failed` /
  `#####successful` marker before a code cell sets pass/fail (and banks failures).

Grading from a marker (case-insensitive): *success/passed/worked/solved* → pass;
*fail/can't/error/issue/wrong* → fail (a `not`/`never` flips a positive); else
ungraded.
