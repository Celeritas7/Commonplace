# HOOKS — SQL book redesign

For Claude Code. The design files only **draw** states. Grading, localStorage, Supabase and
the quiz stay in your scripts. You call `window.SQLBook.*` to paint a state, and you listen
for `sqlbook:*` events to know what the reader did.

## Load order (every module page)

```html
<head>
  <!-- 1 · stops a flash of the wrong theme -->
  <script>try{var t=localStorage.getItem('cp_theme')||'auto';if(t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');var s=localStorage.getItem('cp_text_size');if(s&&s!=='m')document.documentElement.setAttribute('data-text-size',s)}catch(e){}</script>
  <link href="../../../_lib/fonts/gf-….css" rel="stylesheet">   <!-- needs Cormorant Garamond 600, Newsreader, JetBrains Mono -->
  <link rel="stylesheet" href="../lib/tokens.css">
  <link rel="stylesheet" href="../lib/book.css">                  <!-- replaces the inline <style> -->
</head>
<body>
  … page …
  <script> /* existing inline SEED_SQL / runQuery script */ </script>
  <script src="playground-enhancements.js"></script>
  <script src="module-check.js"></script>
  <script src="reading-sync.js"></script>
  <script src="../lib/sql-kb-fix.js"></script>
  <script src="../lib/book-ui.js"></script>                        <!-- last -->
</body>
```

Home adds `lib/home.css`. SQLZoo and Mistake Bank add `../lib/practice.css`.
`book-ui.js` runs on `DOMContentLoaded`, so it always runs after the scripts above it. It
dispatches `sqlbook:ready` when it's done; make your first hook calls after that event.

`module-template.html`, `index.template.html` and the two `Practice/*.template.html` files
are the target markup. Merge them into the real pages and keep your scripts and the lesson
text. Everything under `_demo/`, every `window.DEMO` block and the `.mock-fab` elements are
for the mock-ups only. Don't deploy them.

---

## 1 · Page chrome

| Element | Class / id | Notes |
|---|---|---|
| Top bar (one bar, 47px) | `header.bk-bar > .bk-bar__in` | Replaces `.topbar` and `.rail`. The height comes from `--bar-h`. |
| Breadcrumb | `.bk-crumbs`, with `.bk-crumbs__long` hidden on phones | |
| Module picker | `button.bk-picker[data-sheet="bk-modules"]` | Shows "Module 4 of 10 ▾" on phones and "04 · JOINs ▾" on wide screens. |
| Tab strip (wide only) | `nav.bk-tabs > .bk-tabs__track > a.bk-tab[aria-current="page"]` | `data-overflow="start end"` sets the edge fades. book-ui keeps it updated. Add `<span class="ok">✓</span>` to a tab once that module is checked. |
| Side TOC (≥1100px) | `aside.bk-side > nav.bk-toc#toc` | Your TOC builder can keep writing `<a class="toc-link">` into `#toc`. book-ui adds `aria-current="true"` to the link for the section being read. A link can contain `<span class="s">4.1</span>` and `<span class="r">✓ read</span>`. |
| Sections sheet | `.bk-sheet#bk-sections` containing `nav.bk-toc` | Fill it from the same data as `#toc`. |
| Reading sheet | `.bk-sheet#bk-reading` | Buttons `[data-set-size="s|m|l|xl"]` and `[data-set-theme="light|dark|auto"]`. |
| Phone dock | `nav.bk-dock` with `a.prev`, `button.mid[data-sheet="bk-sections"]`, `a.next[data-gate]` | Phones only. Its height is `--dock-h` (58px). |
| Desktop pager pill | `nav.bk-pager` with `a`, `.pos`, `a.next[data-gate]` | Fixed bottom-right, `--fab-col` (72px) in from the right edge. |
| Gate dialog | `.bk-sheet.bk-sheet--dialog#bk-gate` with `[data-gate-check]` and `[data-gate-go]` | |

**Floating buttons (🔖 ★ ☰ / 🧠 ▶ ⇅).** On phones, lift them above the dock. Add
`var(--dock-h)` to their `bottom`, for example
`bottom: calc(16px + var(--dock-h) + env(safe-area-inset-bottom))`. `--dock-h` is 0 on
desktop, so nothing moves there. If the right-hand column is wider than 72px, set
`--fab-col` on `:root` so the pager pill doesn't overlap it.

## 2 · Module head

| Element | Hook |
|---|---|
| `#mod-pbar` (now an `<i>` inside `.bk-pbar`) | Keeps working with your existing `style.width = pct + "%"`. |
| `#mod-pbar-label` | e.g. `5 / 13 challenges` |
| `#spec-challenges` | the challenge count |
| `[data-check-mark]` | Painted by `SQLBook.check.set()`. Shows "✓ Checked 5/5", "Check · last 2/5" or "Not checked yet". |

## 3 · Playground

The markup stays the same: `.playground[data-pg-idx]`, `.pg-header .led`, `textarea`,
`.pg-actions`, `[data-action="run|reset|hint|solution"]`, `.pg-result`.

```js
SQLBook.pg.set(pgEl, state, data)
```

| `state` | `data` | What it draws |
|---|---|---|
| `"idle"` | — | Empty result. The header says "not run". book-ui sets this on load. |
| `"running"` | — | Amber pulsing LED and a running bar. |
| `"ok"` | `{columns, rows, ms}` | Table inside `.pg-scrollwrap > .pg-scroll`, then `.pg-foot` ("14 rows · 2 ms"). When the table is wider than the panel you get an edge fade and a "scroll →" hint. NULL cells get `td.null`; numbers get `td.num`. |
| `"ok"` with no columns | `{message}` | e.g. "Statement executed · 3 rows changed" |
| `"error"` | `{message, tip?}` | `.pg-error` with a red "Error" label. |
| `"dirty"` | `{changed, columns?, rows?, ms?}` | Amber `.pg-dirty` banner, "Data changed · DELETE removed 4 rows", plus a Reset data button unless the panel already has one. |

**What changes in the inline script.** In `runQuery()`, call `pg.set(pg,"running")` before
`db.exec`, then `"ok"` or `"error"`. Use `"dirty"` when `changesData(sql)` is true. That
function is in `FIXES-PR19-20.md` §3. It strips comments and strings, then checks the first
keyword of each statement, plus `WITH … INSERT|UPDATE|DELETE`. Don't use a multiline
`/^(INSERT|…)/m` regex. `renderResult()` and the alert-based hint and
solution handlers can then be deleted. book-ui clones the hint and solution buttons, which
drops any old listeners on them.

**Event:** `sqlbook:reset-data` `{pg}` fires on any `[data-action="reset-data"]` click.
Re-seed the database, then call `pg.set(pg,"idle")` on any panel that was in `"dirty"`.

## 4 · Challenge (auto-checked)

On load, book-ui wraps every `h4[id^="challenge-"]` (and every `h4[data-ch-key]`) together
with the following siblings, up to the next h2, h3 or h4, into:

```html
<div class="ch" data-ch="ex_4_1_1" data-kind="auto|text" data-state="untried|wrong|right|revealed|todo|done">
  <div class="ch__head"><h4 id="challenge-411-…">…</h4><span class="ch-badge">Not tried</span></div>
  <p>…prompt…</p>
  <div class="playground">… [data-action="run"] now reads "Run & check →" …</div>
  <ol class="ch-hints" hidden></ol>      <!-- stepped hints -->
  <div class="ch-guard" hidden></div>    <!-- "Try one query first" -->
  <div class="ch-verdict" aria-live="polite" data-verdict="wrong|right|revealed"></div>
</div>
```

`data-ch` uses the same `ex_M_L_C` key as `playground-enhancements.js`. That script runs
first, so its `findChallengeMap()` still works.

```js
SQLBook.challenge.set("ex_4_1_1", {
  state: "untried" | "wrong" | "right" | "revealed",
  attempt: 2,                         // runs so far: the badge says "Not yet · try 3", and the guard opens once this is ≥1
  banked: true,                       // wrong/revealed: prints "Saved to your Mistake Bank"
  rows: 14,                           // right: "Matches all 14 rows"
  next: { href: "#challenge-412-…", label: "Next · Challenge 4.1.2" },   // right
  verdict: {                          // wrong
    reason: "Column count differs" | "Wrong row order" | "Values differ" | "Row count differs" | "Columns in the wrong order",   // the last one only when ONE column permutation fixes every row (FIXES-PR19-20.md §1)
    detail: "You returned 3 columns; the answer has 2.",
    yours:    { columns: [...], rows: [[...]] },
    expected: { columns: [...], rows: [[...]] },
    diff: {
      cols:    [2],               // column indexes to flag in "yours"
      cells:   [[rowIdx, colIdx]],// cells to flag in "yours"
      extra:   [rowIdx],          // rows in yours that aren't in expected
      missing: [rowIdx]           // rows in expected that are missing from yours
    }
  }
});
```

- Each side of the diff shows up to 8 rows, then "+ N more rows". On phones the two sides
  become a "Your rows / Expected" switch.
- The badge reads: Not tried · Not yet · try N · Solved ✓ · Revealed.
- **Hints.** `data-hint` is hint 1. The new optional `data-hint2` is hint 2. The hint button
  steps "Hint 1 of 2" → "Hint 2 of 2" → "Hints shown".
- **Try-first guard.** Tapping Solution with `attempt < 1` before the last hint opens
  `.ch-guard`, with Keep trying and Show anyway.
- **Revealed** shows `data-solution` in a dark `.bk-code` block, with "Put it in the editor".

**Events**

| Event | Detail | Expected action |
|---|---|---|
| `sqlbook:hint` | `{key, step}` | Optional: log the hint use. |
| `sqlbook:solution` | `{key, attempts, forced}` | Add the challenge to the Mistake Bank with reason "revealed". book-ui has already painted the revealed state. |
| `sqlbook:markdone` | `{key, done}` | Text-only challenge: write `"done"` (or remove it) in `commonplace_module_exercises_progress`. |

**Run & check flow (yours):** run the query → `pg.set(pg,"ok",…)` → grade it against the
reference → `challenge.set(key,{state:"right"|"wrong", attempt, verdict, banked})`. On right,
write `"done"` to `commonplace_module_exercises_progress[key]`, update `#mod-pbar`, and
resolve any Mistake Bank item for that key. On wrong, add the challenge to the bank.

**Text-only challenges.** A challenge has `data-kind="text"` when its block has no
playground (bug spotting, code review), or when `<html data-module-readonly>` is set
(Module 9). It gets a `.ch-text` row with "Show answer ↓" (links to `#solution-411`, if that
h4 exists) and **Mark as done**. Restore the saved state with
`challenge.set(key,{state:"done"})`.

**SQLZoo.** Have `sqlzoo-exercises.js` emit `h4[data-ch-key="sqlzoo_7"] + p + .playground`
for each exercise, then call `SQLBook.challenge.decorate(listEl)`. Use the same `set()` calls.

## 5 · End-of-module check

Markup:
`<section class="bk-check" id="check" data-next="Module 5"></section>`, placed above
`.module-nav`.

```js
SQLBook.check.set({ state: "untaken" });
SQLBook.check.set({ state: "partial", score: 2, total: 5, date: "29 Oct", weak: "LEFT JOIN, UNION column counts" });
SQLBook.check.set({ state: "passed",  score: 5, total: 5, date: "30 Oct" });
```

- This sets `html[data-checked="true|false"]`, which the soft gate reads.
- `SQLBook.check.set({ state: "unavailable" })` covers the case where the quiz layer is off or
  missing (`window.CP_QUIZ_OFF`, or progress-backup.js not loaded). It removes the Start
  button and the gate never fires, so Next works straight away.
- **Event:** `sqlbook:check-start` fires from Start, Try again, Retake, or the gate's "Take
  the check". `module-check.js` should open its five questions when it sees it, save the
  result to `cp_sql_check`, and call `check.set()` again.
- **Soft gate.** Any `a[data-gate]` (module-nav Next, dock next, pager next) opens `#bk-gate`
  unless the module is checked or the reader has already chosen "Continue anyway" this
  session (`sessionStorage cp_gate_<NN>`). "Continue anyway" always works. The event
  `sqlbook:gate` `{choice:"check"|"continue"}` is there if you want to log it.

## 6 · Home

| Element | Hook |
|---|---|
| `section.hm-today#today` | `SQLBook.today.render({date, resume:{href,title,sub}, rows:[{tone:"due"\|"ok"\|"", mark, label, sub, value, href}]})` |
| First visit | `SQLBook.today.render({state:"fresh"})`, which shows "Start with Module 1". |
| Suggested rows | mistakes due (tone `due`, mark = count) · next unfinished challenge · module checks "3 of 10" (tone `ok`) |
| `#mods` | `SQLBook.modules.render("mods", [{n,title,blurb,href,done,total,checked,state}])`. `state` is `"current"`, `"done"`, `"readonly"` (Module 9 shows "Read-only · run in pgAdmin / Python" with no count) or `""`. `checked:true` adds "✓ checked". |
| `#overall-prog` | Plain text: "36 / 125 challenges · 3 of 10 checked" |
| Lab console | Same `.playground` look. Keeps `#editor #run-btn #clear-btn #results #chips #schema-tables`. Use `pg.set(document.getElementById("lab-console"), …)`. **Note:** `#schema-tables` now contains a `.hm-schema__t` title row; have the schema builder append `<button>` elements after it rather than replacing `innerHTML`, or move the title outside. |

## 7 · Sign-in chip (home, SQLZoo, Mistake Bank)

- Markup: `button.bk-auth` in the bar, plus `.bk-sheet#bk-signin`. Children with
  `[data-auth-show="out|sent|in syncing"]` show or hide by state.
- `SQLBook.auth.set("out" | "sent" | "syncing" | "in", email)`
- **Event:** `sqlbook:auth` `{action:"open"|"send"|"signout", email}`. On `send`, call
  `sb.auth.signInWithOtp(...)` and then `auth.set("sent")`. When a session arrives, call
  `auth.set("in", user.email)`; use `"syncing"` while you push and pull.
- This replaces the sign-in form at the bottom of SQLZoo (`#sqlzoo-auth`), and
  `window.sqlzooRevealSignIn` can call `SQLBook.sheet.open("bk-signin")`.

## 8 · Mistake Bank (Practice/mistake-drill.html)

My call: keep the URL and have the page draw the bank.

```js
SQLBook.bank.render("bank", {
  state: "due" | "none" | "empty",
  signedIn: false,                          // shows "Saved on this device only · Sign in"
  counts: { due: 3, later: 2, fixed: 7 },
  items: [{ id, src: "module"|"sqlzoo", srcLabel: "Module 4 · 4.1.1", title, why: "wrong row order",
            peek: "SELECT …", due: "today"|"in 2 days", state: ""|"fixed", next: "3 days", href }],
  later: [ …same shape, state:"later" ],
  nextDue: "in 2 days (Sun)"                // state "none"
});
```

- **Filter chips** (All / Modules / SQLZoo) are handled by book-ui; they hide items by `src`.
- **Just fixed.** Re-render with that item's `state:"fixed"`, then call
  `SQLBook.toast("Fixed · back in 3 days", {action:{label:"Undo", onClick}})`.
- **Event:** `sqlbook:resolve` `{id}` fires when Re-solve is tapped. Open the drill: show
  `#drill`, fill in its h4, prompt, last wrong query and `data-solution`, then call
  `SQLBook.challenge.decorate(drillEl)` and grade it the same way as a module challenge.
- **Storage (proposal).** One list in `localStorage cp_sql_bank`:
  `{id, src, title, prompt, sql_wrong, reason, added, due, step}`. Merge it with Supabase
  when signed in. The view doesn't depend on that shape.

## 9 · Theme and text size

`SQLBook.theme.set("light"|"dark"|"auto")` stores `cp_theme`. `SQLBook.textSize.set("s"|"m"|"l"|"xl")`
stores `cp_text_size`. Dark mode is `html[data-theme="dark"]`. The terminal tokens
(`--term-*`) don't change between themes, so query panels stay dark in both.

## Other calls

`SQLBook.sheet.open(id)` / `.close()` · `SQLBook.toast(msg, {action, ms})` ·
`SQLBook.fades(root)` (call it after you inject a wide table yourself) ·
`SQLBook.table(cols, rows, opts)` returns the table HTML.

---

## Changes to things you asked me to keep

1. **Challenge markup.** The h4, prompt and playground are wrapped in `div.ch` **at runtime**.
   The HTML files don't change and the ids are the same. Your code finds a challenge with
   `.ch[data-ch="ex_4_1_1"]`, or with `h4.closest(".ch")`.
2. **Run label.** In challenge playgrounds, `[data-action="run"]` now reads "Run & check →".
3. **Hint and solution buttons.** book-ui clones both, which removes the `alert()`
   listeners, and relabels Solution. They keep `data-hint` and `data-solution`, and gain the
   optional `data-hint2`.
4. **New action.** `data-action="reset-data"` is new. It's an event only; book-ui doesn't
   change the data.
5. **Hidden elements.** `.pg-done-btn` and `.module-progress-pill` (both injected by
   playground-enhancements.js) are hidden by CSS. Their jobs move to `.ch-badge` / `.ch-text`
   and `.bk-progress`. playground-enhancements.js itself is unchanged.
6. **Old layout classes.** `.topbar`, `.rail`, `.sidebar`, `.mhead`, `.spec` are replaced by
   `.bk-bar`, `.bk-tabs`, `.bk-side`, `.bk-mhead`, and the meta line. `#toc`, `#mod-pbar`,
   `#mod-pbar-label` and `#spec-challenges` keep their ids.
7. **Gate links.** `.module-nav a[rel="next"]` gains `data-gate`.
8. **Token aliases.** tokens.css maps the old names (`--oxblood`, `--wine`, `--ink-soft`,
   `--ink-mute`, `--ink-faint`, `--term-w`) onto the new tokens, so injected inline styles
   still resolve.
9. **New storage keys.** `cp_theme`, `cp_text_size`, `cp_sql_bank` (proposed), and
   `sessionStorage cp_gate_<NN>`. `commonplace_module_exercises_progress`, the `ex_M_L_C`
   keys and `cp_sql_check` don't change.
10. **Not touched.** sw.js, the lesson text, sql-kb-fix.js, reading-sync.js. The "Mark read"
    pills from reading-sync.js aren't restyled because I don't have their class names; give
    them `.bk-chip` if they look off.
