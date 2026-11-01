# How to put the redesign into the live SQL book

Do it in four passes. After each pass, push, open the page on your phone and check it,
then go on to the next. Each pass can be handed to Claude Code as it stands, with the
download folder attached.

## Pass 0 · Copy the files in (2 minutes, nothing changes yet)
Copy these from the download into your repo:

| From the download | To the repo |
|---|---|
| `sql/lib/tokens.css`, `book.css`, `home.css`, `practice.css`, `book-ui.js` | `Coding/sql/lib/` |
| `HOOKS.md`, `FIXES-PR19-20.md` | `Coding/sql/` (notes for Claude Code) |

Don't copy `_demo/`, `Mockups.html`, `_states.html` or the `*.template.html` files. The
templates are references for the next passes.

The live site doesn't change yet, because no page links the new files.

## Pass 1 · One module page (Module 4)
Prompt for Claude Code:

> In `Coding/sql/The Modules/module-04.html`, apply the redesign from
> `module-template.html` and `HOOKS.md` §1–5:
> 1. Replace the inline `<style>` with links to `../lib/tokens.css` and `../lib/book.css`.
>    Add the theme snippet from HOOKS.md to `<head>`.
> 2. Replace `.topbar` and `.rail` with `.bk-bar` and `.bk-tabs`, and the sidebar and head
>    with `.bk-side` and `.bk-mhead`. Keep `#toc`, `#mod-pbar`, `#mod-pbar-label` and
>    `#spec-challenges`. Add the four sheets, `.bk-dock`, `.bk-pager`, and
>    `<section class="bk-check" id="check">` above `.module-nav`. Add `data-gate` to the
>    Next links.
> 3. In the inline script, make `runQuery` call `SQLBook.pg.set` (running / ok / error /
>    dirty, using `changesData` from FIXES §3), and remove the alert hint and solution
>    handlers.
> 4. Grade challenge runs against `data-solution`, using the column-permutation rule from
>    FIXES §1. Call `SQLBook.challenge.set(...)` with the verdict, and write `done` to
>    `commonplace_module_exercises_progress` when the answer is right.
> 5. Make `module-check.js` listen for `sqlbook:check-start` and call `SQLBook.check.set(...)`
>    from `cp_sql_check`. Use the quick fallback from FIXES §5.
> 6. Lift the floating buttons by `var(--dock-h)` on phones.
> 7. Load `../lib/book-ui.js` last. Don't change the lesson text or sw.js.

On your phone, check:
- there's one bar at the top
- "Module 4 of 10 ▾" opens the module list
- the dock at the bottom doesn't cover the floating buttons
- a challenge shows Wrong (with the diff), Right, and Revealed
- Next asks you to take the check first

## Pass 2 · The other nine modules
> Apply the same changes to module-01…03 and 05…10. Module 9 gets
> `<html data-module-readonly>`. Then delete the inline CSS copies.

## Pass 3 · Home
> Apply `index.template.html` and HOOKS.md §6–7 to `Coding/sql/index.html`. Link
> `lib/home.css`, render `#mods` with `SQLBook.modules.render` (Module 9 `state:"readonly"`),
> fill `#today` with `SQLBook.today.render` from progress, the bank and `cp_sql_check`, and
> wire the sign-in chip to Supabase through the `sqlbook:auth` events. Do fix 2 in
> FIXES-PR19-20.md (the funnel tap).

## Pass 4 · Practice pages
> Apply `sqlzoo.template.html` and `mistake-drill.template.html` (HOOKS.md §4, §7, §8).
> Render the SQLZoo exercises as `h4[data-ch-key] + p + .playground` and call
> `SQLBook.challenge.decorate`. Move sign-in into the chip. Build the bank in localStorage
> (`cp_sql_bank`), feed it from module and SQLZoo wrong answers and reveals, sync it to
> Supabase when signed in, and render it with `SQLBook.bank.render`.

## Also
- Do fixes 1, 4 and 5 from `FIXES-PR19-20.md` in pass 1 or pass 4; they're independent.
- Bump the `?v=` on the script and CSS links each pass, so phones don't keep the old copies.
- If anything looks wrong, open `_states.html` from the download next to the live page to
  compare against the intended look.
