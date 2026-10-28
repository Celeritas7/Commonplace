# HOOKS.md — notebook player ⇄ Python worker

For Claude Code. The player (`lib/notebook-player.js`) owns **all UI**: the queue,
Run all, the status pill, the strip, and the restart flow. The worker engine only
loads Python, runs code, and kills or restarts itself. One seam: `NotebookPlayer.engine`.

No notebook HTML page changes. Load the engine after the player and before `mount()`:

```html
<script src="../lib/notebook-player.js"></script>
<script src="../lib/py-worker-engine.js"></script>   <!-- new, yours: sets NotebookPlayer.engine -->
```

If `NotebookPlayer.engine` is null, the built-in in-page Pyodide engine runs. It works,
but it has no `stop()`, so Stop shows "Stopping…" until the code ends by itself.

---

## 1. The engine you write

```js
NotebookPlayer.engine = {
  load(report)            -> Promise          // start the worker and Pyodide
  run(cellIndex, code, io) -> Promise<Result> // run one cell in the shared session
  stop(cellIndex)         -> Promise          // kill the worker, start a fresh one
};
```

### `load(report)`
- Called once, when Python is first needed (auto-start about 0.6s after page load, a tap on
  the pill, or a Run). It is called again when you tap **Retry**.
- `report` is `NotebookPlayer.setStatus`. Call it while loading:
  - `report("downloading", { loaded: bytes, total: bytes })`: the pill shows `34%` and the
    strip shows "3.4 of 10.0 MB" with a bar. Leave out `loaded` and the bar is indeterminate.
  - `report("starting")`: the download is done and Pyodide is initialising.
- Resolve when the session is ready. The player then sets `ready` itself.
- On failure, reject. The player shows `offline` if `navigator.onLine === false`, and `failed`
  otherwise. To show your own text, reject with `err.userMessage = "…"`.

### `run(cellIndex, code, io)`
- `code` has already had its IPython magics removed. `cellIndex` is 0-based (`In [n]` is `cellIndex + 1`).
- `io.out(text)` / `io.err(text)`: stream output. Call them as often as you like; the player batches to one frame.
- `io.input(prompt) -> Promise<string>`: shows the inline field in the cell. Python's `input()`
  must block on this. In a worker that usually means SharedArrayBuffer + Atomics.wait, or
  Pyodide's `setStdin` with a sync channel. The player echoes `prompt + answer` into the output itself.
- Resolve with `Result = { repr?: string, figures?: [base64png | dataURL] }`:
  - `repr`: the repr of the last expression (omit it for `None`).
  - `figures`: matplotlib PNGs. Capture them in the worker, as `FIGCODE` does in the built-in engine.
- Reject on a Python error with `err.traceback = "<full traceback text>"`. The player parses it
  into the compact error block.
- If the run ends because of `stop()`, reject with `err.stopped = true`, or simply never settle.
  The player aborts the run itself.

### `stop(cellIndex)`
- Called when **■ Stop** is pressed on a cell, or the strip's Stop during Run all, Re-run or a long run.
- Terminate the worker (`worker.terminate()`), start a new one, and load Pyodide again
  (it comes from the cache this time).
- **Resolve once the fresh session is ready.** The player then runs the restart flow (§3).
- Reject if the new worker can't start. The player shows `failed` with "Python did not restart. Reload the page."

### If the worker dies on its own (out of memory, crash)
Call `NotebookPlayer.sessionRestarted({ cell: n, reason: "crashed" })` once the new session is
up. The banner then reads "Python stopped unexpectedly and restarted."

---

## 2. Calls the player exposes

| Call | What it does |
|---|---|
| `NotebookPlayer.setStatus(state, detail)` | Sets the pill and strip. States in §4. |
| `NotebookPlayer.sessionRestarted({cell, secs?, reason?})` | Runs the restart flow: aborts the running cell, clears the queue, marks cells cleared, shows the banner, sets `ready`. `reason`: `"stopped"` (default) or `"crashed"`. |
| `NotebookPlayer.askInput(cellIndex, prompt)` → `Promise<string>` | The same field as `io.input`, for engines that prefer a global. |
| `NotebookPlayer.runCell(n)` / `stopCell(n)` | The same as tapping Run or Stop on `In [n+1]`. |
| `NotebookPlayer.runAll()` / `stopAll()` | Run all, and Stop (whatever is running or queued). |
| `NotebookPlayer.rerunAbove(k)` | Runs cells `0 … k-1` as a batch ("Re-run 1–k"). |
| `NotebookPlayer.load()` | Starts Python now. |
| `NotebookPlayer.state()` | `{ status, running, queued:[n], batch:{kind,at,done,total}, sessionRan:[n], cells:[state] }` |
| `NotebookPlayer.onStop = fn(n)` | *Optional notification* (the Step 4 hook, kept). It is called before `engine.stop(n)`. If you use only this and no `engine.stop`, call `sessionRestarted()` yourself. |
| `NotebookPlayer.onRetry = fn()` | *Optional notification* before Retry calls `engine.load()` again. |

### Events (on `document`, `CustomEvent.detail`)

| Event | detail |
|---|---|
| `np:status` | `{ state, detail }` |
| `np:cell` | `{ cell, state, secs }`: every cell state change |
| `np:runall` | `{ state: "running" \| "done" \| "error" \| "stopped", kind: "all" \| "rerun", at, done, total, cell? }` |
| `np:restart` | `{ cell, secs, reason }` |

**Run all progress is computed by the player.** It is one batch on the same queue. Listen to
`np:runall` if you need it; you don't need to report progress.

---

## 3. Stop → restart sequence (what the player does)

1. Tap **■ Stop** on `In [5]`. Everything queued goes back to its previous state. Any Run all or
   Re-run batch is cancelled. Cell → `data-state="stopping"` ("Stopping…"). Pill → `restarting`.
2. `onStop(4)` is called if set, then `engine.stop(4)`.
3. `engine.stop` resolves, and then:
   - the running cell → `stopped`, with `np-cstat` showing **"■ Stopped after 12s"**. Its partial output is kept, and
     `.np-stopnote` reads "Python restarted here — variables from earlier cells are gone."
   - every cell that ran in this session: `.ran` → `.cleared` (dashed amber pip, "· cleared"). Its old "✓ 0.1s" is cleared too.
   - strip `data-kind="restart"` (a one-time banner, closed with ×): **"Python restarted.** Variables from
     earlier cells are gone — re-run the cells above." with **↻ Re-run 1–4**.
   - pill → `ready`.
4. **Re-run 1–4** starts a batch: strip `batch` "Re-running 1–4 · 2 / 4" + **■ Stop**. When it ends: `done`
   "✓ Re-ran 1–4 · 0.8s", which hides itself after 4s.

Running a later cell by hand also works. With `prereqs` on (fundamentals and libraries), the
cells above run quietly first, and the cell's status shows "Cells above · 2/4".
Cells above are skipped if they are `stopped`, or if a Stop came while they were running as a cell above (`rec.skipPre`;
the stop note names that cell). So an infinite-loop cell can't hang later runs. A successful run of that cell clears the skip.
`NotebookPlayer.runCell(n, { noPre: true })` runs one cell without the cells above.

---

## 4. Status pill — `#np-led[data-state]`

`<button class="np-led" id="np-led" data-state="…">` holds `.dot`, `.t-s` (phone label) and `.t-l` (label at 640px and wider).

| state | phone | desktop | strip | tap |
|---|---|---|---|---|
| `idle` | Load | Python not loaded | — | loads Python |
| `downloading` | 34% | Downloading 34% | `download`: "Downloading Python · 3.4 of 10.0 MB", bar *(first run only)* | — |
| `starting` | Starting | Starting Python | `download`: "Starting Python · almost ready" *(first run only)* | — |
| `ready` | Ready | Python ready | — | — |
| `busy` | Busy / Input | Running In [5] / Waiting for input | — | — |
| `restarting` | Restarting | Restarting Python | — | — |
| `failed` | Retry | Python failed · Retry | `failed` + **↻ Retry** | retries |
| `offline` | Offline | Offline · Retry | `failed` "You're offline…" + **↻ Retry** | retries (and retries itself on the `online` event) |

"First run" means the localStorage key `cp-py-pyodide-seen` is not yet set. The player sets it after the first successful load.
During downloading, the pill's `--p` (0–100) drives a ring on `.dot`.

## 5. Strip — `#np-strip[data-kind]` (sticky, inside `.np-bar`)

Only one message shows at a time. A message from the player (batch, restart, …) takes priority over a status message (download, failed).

| kind | when | actions (`[data-act]`) |
|---|---|---|
| `download` | first-run download / start | — |
| `failed` | `failed` / `offline` | `retry` |
| `running` | a single cell runs and its Stop is off screen or under the floating buttons | `goto` (Show), `stopall` (■ Stop) |
| `batch` | Run all / Re-run: "Running all · 3 / 10" + bar | `stopall` |
| `batch-error` | the batch hit an error: "Run all stopped at In [9] · NameError"; the page scrolls to that cell | `goto`, `close` |
| `restart` | after a Stop or a crash | `rerun` (`data-n` = k), `close` |
| `done` | the batch finished (hides itself after 4s) | `close` |

Markup: `.np-strip-in` > `p.np-strip-msg` (`b` + text, optional `span.np-strip-sub`), `span.np-strip-acts`,
`span.np-strip-bar` > `i` (width %; `.ind` = indeterminate). Close button: `button.np-x`.
`--np-head` on `<html>` is the live header height (the rail and `scroll-margin` use it).

## 6. Code cell — `section.np-cell#np-c{n+1}[data-state]`

```
section.np-cell[data-state] (.ran | .cleared)
  div.top
    span.pip  span.lbl "In [n]"  span.np-cstat  button.np-mini (Reset; .w label hidden ≤400px)  button.np-run
  textarea.np-ta → CodeMirror (wraps at ≤640px)
  div.np-outw[data-ix] (.long .open .live .quiet)
    pre.np-out  div.np-figs > figure.np-fig > img + figcaption
    button.np-outmore   form.np-ask > .np-ask-k .np-ask-p .np-ask-row > input.np-ask-in + button.np-run
    p.np-stopnote
  div.np-err  (.k .msg .ptr .hint details.more)
```

| data-state | `.np-run` | `.np-cstat` | look |
|---|---|---|---|
| `idle` | ▶ Run | — | outlined while another cell runs (`body.np-busy`): a tap queues it |
| `queued` | `.queued` "Queued ×" (tap to remove from the queue) | "Waiting for Python" / "Up next" / "Queued · 3rd" | dim green frame |
| `running` | `.stop` ■ Stop | "Running", then "Running · 4s" after 2s; "Cells above · 2/4" during prereqs | mint frame + sweep line |
| `waiting` | `.stop` ■ Stop | "Waiting for input" | amber frame, `form.np-ask` shown and focused, page scrolled so it is clear of the floating buttons |
| `stopping` | `.stopping` "Stopping" (disabled) | "Stopping…" | red frame |
| `done` | ▶ Run | "✓ 0.12s" | `.ran` |
| `error` | ▶ Run | "✕ NameError" | `.np-err` block |
| `stopped` | ▶ Run | "■ Stopped after 12s" | `.np-stopnote` |

Output states (`.np-outw`): text; `.long` (more than 20 lines: the first 20 are shown, or the last 20 while live, and
`.np-outmore` reads "▾ Show all 240 lines"; `.open` shows everything in a 70vh scroll); `.quiet` "(ran — no output)";
figures; `form.np-ask`. The output keeps at most 5,000 lines ("[… N earlier lines not kept]").

Header row 2 (scrolls away): `#np-runall` (`.go` "▶ Run all" ⇄ `.stop` "■ Stop · 3 / 10"), `#np-resetall`
(disabled while busy), `.np-jump` > `.np-selw` > `select#np-sel`, `.np-prog`.

## 7. Floating buttons

Nothing in the player is fixed to the bottom of the screen. Every control that must stay reachable lives in the sticky header.
`--np-fab-clear` (200px on phones, 120px from 821px) is the bottom padding of the page, so the last cell and the colophon can scroll clear
of 🔖 ★ ☰ / 🧠 ⇅. `keepVisible()` uses the same value for the input field. If the real button stack is taller, raise the variable;
nothing else changes.
