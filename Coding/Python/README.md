# Steps 4 + 6 — Notebook pages (one download)

Based on main @ 63238d5 (Step 4 was never pushed). Copy the contents of this folder into `Python/` at the
same paths. **No notebook page (`fundamentals/*.html`, `libraries/*.html`, `practice/*.html`) changes.**
Every page is drawn by the player.

## Files

| File | Step 4 | Step 6 | Action |
|---|---|---|---|
| `lib/notebook-player.js` | replaced | replaced again (this copy has both) | **replace** |
| `lib/notebook-player.css` | replaced | replaced again (this copy has both) | **replace** |
| `sw.js` | VERSION cp-py-v24 | VERSION **cp-py-v26** (the CORE list is unchanged from your v25) | **replace** |
| `HOOKS.md` | — | new: element/class names and hooks for Claude Code | add (docs only; place it where you like, e.g. `lib/HOOKS.md`) |

Needs `lib/tokens.css` (Step 1), which is already in your folder.

## What each step does

**Step 4**
- One header (sticky: back · title · status pill) replaces the dark bar, breadcrumb and masthead.
- A second row scrolls away: Run all · Reset all · jump · progress.
- Cell Run → Stop with a timer.
- Compact error block (type · line, last line big, traceback behind a toggle).
- Dark mode on notebook pages.

**Step 6**
- ⌂ Home is back in the header.
- Status pill has 8 states: `idle` (tap to load), `downloading` (with %), `starting`, `ready`, `busy`, `restarting`, `failed`, `offline`, with Retry for the last two.
- On the first run, the strip under the header shows the download size and progress.
- One queue for the shared session. Tapping Run while another cell runs queues the cell ("Queued · 2nd"; tap × to remove it).
- The timer appears after 2s ("Running · 4s"). The running cell gets a mint frame. If its Stop scrolls out of view, ■ Stop appears in the sticky strip.
- Run all: the button becomes "■ Stop · 3 / 10", and the strip shows "Running all · 3 / 10" with a bar. It stops at the first error, scrolls to that cell and offers Go to cell.
- After a Stop:
  - the cell shows "■ Stopped after 12s";
  - earlier cells change from "· ran" to "· cleared";
  - a one-time banner reads "Python restarted. Variables from earlier cells are gone…" and offers **↻ Re-run 1–4**.
- Output:
  - more than 20 lines collapses, with "Show all 240 lines";
  - figures sit on a white card with a caption;
  - "(ran — no output)";
  - `input()` gets an inline field (16px so iOS doesn't zoom; Enter is 44px).
- The jump `<select>` is restyled (§ mark, chevron).
- The page keeps `--np-fab-clear` free at the bottom for the floating buttons.
- `engine` seam: `NotebookPlayer.engine = { load, run, stop }`. Without it, the built-in in-page Pyodide is used (unchanged behaviour, but Stop can't interrupt).

## Commit

```
python notebooks: one header, Run/Stop, queue, Run all, status, restart flow

- notebook-player.js: Step 4 header + error block; Step 6 engine seam
  (NotebookPlayer.engine), queue, Run all/Re-run batches, 8-state Python
  status + sticky strip, Stop → restart flow, output states, input() field,
  hooks + np:* events (HOOKS.md)
- notebook-player.css: tokens only; all new states; 44px targets
- sw.js: VERSION cp-py-v26
```

## Test at 390px (with the built-in engine)

1. Open `fundamentals/02_for_loops.html`. The pill reads 34% / Starting / Ready. On the first visit, the strip shows the MB.
2. Run In [1], then tap Run on In [3] at once. In [3] reads "Queued".
3. Run all → "■ Stop · n / 10" and the strip shows progress. Add a typo to a cell and Run all again: it stops at that cell and scrolls to it.
4. Airplane mode + a hard reload: offline pill and Retry.
5. Stop needs the worker engine (HOOKS.md §1). Until then, Stop shows "Stopping…".

States preview: `Notebook States.html` (phone 390, the Stop flow, desktop 1366). Every frame is this player, driven by a fake engine.
