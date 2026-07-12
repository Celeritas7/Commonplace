# Handoff: Compose Blocks — Python Editor

## Overview
A mobile-first "compose blocks" Python code editor — a component for a coding-practice web app. It replaces a single flat code textarea. Instead of typing one continuous script, the learner writes their program as an ordered stack of small labeled code blocks (e.g. `imports`, a helper function, `main`), drags the blocks to reorder them, then taps one button to concatenate them top-to-bottom and run the whole program.

**Block order is the lesson.** Python executes top-level code in file order, so a call placed above its function definition must produce a `NameError`. The editor surfaces that failure clearly and teaches the fix (reorder the blocks).

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype (real drag, key insertion, and in-browser Python execution) plus a static state-sheet showing every visual state. They demonstrate intended look and behavior; they are **not** production code to paste in directly.

Your task is to **recreate this design in your app's existing environment** (React, Vue, Svelte, SwiftUI, native, etc.) using its established patterns, component library, and state management. The prototype is plain vanilla JS specifically so the logic is transparent and portable — read it as the reference implementation, then re-express it idiomatically in your stack. If your project has no front-end environment yet, choose the most appropriate framework and implement there.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, shadows, and interactions are all specified below and in the prototype. Recreate the UI faithfully using your codebase's libraries. The one thing that is intentionally swappable is the **code runner** (see State Management → Runner).

## Screens / Views
This is a single component with several states rather than multiple screens. Layout, top to bottom:

### 1. Key palette (zero-typing input)
- **Purpose:** insert Python tokens into the focused block without a keyboard — thumb-friendly one-handed use.
- **Layout:** a `--paper` card. Header row (label "KEY PALETTE" + "Hide keys" toggle button), then three key rows:
  1. **Keyword keys** (lavender `#ddd6f3`) — horizontally scrollable: `def for while if elif else: in return import not and or True False None`
  2. **Builtin/function keys** (green `#cfe6c8`) — horizontally scrollable: `print( input( len( int( str( range( sum( sorted(`
  3. **Punctuation keys** (cream `#f7f1e3`) — **wraps, does not scroll**, separated from the rows above by a dashed top border: `: ( ) [ ] { } , . = == %`
- **Components:** each key is a pill — height 38px, 10px radius, 1px ink border, `2px 2px 0` shadow. Keys are **disabled (40% opacity)** when no block is focused. Tapping a key inserts its token at the caret of the focused block's textarea, with smart leading-space insertion.
- **States:** when a block is focused, the palette card gets a **2px vermillion border** and the header reads `KEY PALETTE → <BLOCKLABEL>`. A "Hide keys" toggle collapses the palette to a single "Show keys" bar.

### 2. Block stack
- **Purpose:** the ordered program, one card per block.
- **Layout:** vertical list, 12px gaps. Below it, a dashed ghost **"+ Add block"** button.
- **Each block card** (`--paper`, 1px ink border, 12px radius, `4px 4px 0` shadow):
  - **Header row**, 46px tall: grip/drag-handle `⠿` · block label (mono, 13px/700) · optional "· N lines" meta (shown when collapsed) · flexible spacer · collapse chevron `⌄` (40×46 tap target) · delete `×` (40×46).
  - **Code body:** an auto-growing monospace `<textarea>` (13px/1.6), transparent background, no border. Height re-measured on every render and after fonts load.
- **Seed data** (an "odd or even" exercise), in this order:
  | label | code |
  |---|---|
  | `imports` | `import math` |
  | `def is_odd` | `def is_odd(n):`⏎`    return n % 2 == 1` |
  | `main` | `n = 17`⏎`print("odd" if is_odd(n) else "even")` |

### 3. Action row
- **▶ Assemble & run** — primary button, vermillion `#b8412e`, cream text, 1.5px ink border, `4px 4px 0` shadow, flex-grows to fill width. Label becomes "▶ Run again" after the first run. Disabled while a run is in flight.
- **⤢ Fullscreen** — secondary button, `--paper` background. Toggles a full-viewport layout; label becomes "⤢ Exit full".

### 4. Output area (appears after a run)
- **Assembled program panel** (`--paper`): header "ASSEMBLED PROGRAM" + line count. Body shows the blocks concatenated in current order, split into labeled segments (one per block) with a small provenance tag (e.g. "IMPORTS", "DEF IS_ODD", "MAIN") and continuous 1-based line numbers. Light Python syntax coloring.
- **stdout panel** (the one dark surface, `--ink` background): header "STDOUT" + exit badge. On success, prints captured stdout (e.g. `odd`) with a green "EXIT 0" badge. On error, shows a Python traceback in muted red with a red "EXIT 1" badge, plus a one-line teaching hint.

## Interactions & Behavior

### Key insertion
Tapping a palette key inserts its token into the **focused** block's textarea at `selectionStart`, replacing any selection. Insert a single leading space when the preceding char isn't whitespace/`(`/`[`/`{` and the token doesn't start with `:` `)` `]` `}` `,`. Move the caret to the end of the inserted token, keep the textarea focused, and re-run auto-size. Update the block's `code` in state.

### Drag to reorder (pointer events, touch-friendly)
- Drag starts from the grip `⠿` on `pointerdown`. **Set pointer capture and attach `pointermove`/`pointerup`/`pointercancel` listeners BEFORE any DOM re-render** — otherwise re-rendering detaches the grip node and `setPointerCapture` throws, stranding the drag state. (This was a real bug; the prototype's `attachDrag` shows the correct order.)
- Apply a **5px movement threshold** before entering drag mode, so a tap or a focus-to-type never triggers a drag.
- On real drag start: snapshot each card's vertical midpoint, mark the block as `dragId`, re-render. The grabbed card lifts — stronger `9px 9px 0` offset shadow, `rotate(-2deg)`, follows the finger via `translateY`. All other cards dim to 45% opacity.
- While moving: hit-test the pointer Y against sibling midpoints to compute the drop index; render a **vermillion insertion line** (dot + bar) at that position.
- On `pointerup`: splice the block to the new index (decrement target if it was below the removed slot). Clear drag state, clear any previous run, re-render.

### Collapse / expand
Chevron toggles `collapsed`. Collapsed = header only, chevron rotated −90°, "· N lines" meta shown, code body hidden. Re-measure textarea height when expanding (it measures 0 while hidden).

### Run
Concatenate blocks top-to-bottom (`blocks.map(b => b.code).join("\n")`) and execute (see Runner). Capture stdout/stderr. On completion, **auto-collapse all blocks** to make room for output, clear focus, render the assembled + stdout panels.

### Error mapping (the teaching moment)
- Parse the error type, message, and the failing top-level line number from the traceback.
- Map that global line number back to the owning block (walk the blocks accumulating line counts) to find the **guilty block**.
- The guilty block's header gets a vermillion edge + a rotated **"RAN TOO EARLY"** rubber-stamp tag.
- In the assembled panel, tint that block's segment, mark the failing line with a vermillion `▸`, and label the definition segment "… — TOO LATE".
- In stdout, show the traceback in muted red and a hint: `line N ran before <def block> existed — drag <guilty block> below it ↓`.

### Responsive
- Primary width 380px portrait. Single column holds up to ~700px — blocks just breathe wider; no layout fork.
- One breakpoint at `min-width: 640px`: output panels go **two-up** (assembled | stdout) in a grid; container padding 16→20.
- Fullscreen toggle expands the component to fill the viewport (no bezel).

## State Management
```js
state = {
  blocks: [{ id, label, code, collapsed }],  // ordered — order is meaningful
  focusedId,          // which block the palette targets
  keysHidden,         // palette collapsed toggle
  dragId, dropIndex,  // transient drag state
  run: null | {       // last run result
    ok, assembled:[{label,code}], stdout,
    errType, errMsg, errLine, errLabel
  }
}
```
Derived: `assembleSource()` = join block codes with `\n`; `blockForLine(n)` maps a global line to its block.

### Runner (the one swappable dependency)
The prototype runs Python **client-side via Pyodide** (`v0.26.2` from jsDelivr), loaded lazily on first run (shows a "warming up the Python runtime…" state), redirecting `sys.stdout`/`sys.stderr` to a `StringIO` to capture output. This gives genuine order-sensitivity — `main` above `def is_odd` produces a real `NameError` — with zero backend.

**In your app, decide between:**
- **Pyodide** (client, ~6MB download, cached after first load, no infra) — keep as-is.
- **A sandboxed server runner** — replace the body of `run()` with a POST of `assembleSource()` to your endpoint; keep the same result-shape (`ok`, `stdout`, and a parseable traceback with a line number) so the error-mapping UI keeps working.

### Persistence
The prototype holds blocks in memory only. In your app, seed `state.blocks` from your exercise definition and persist the block array (order + code + collapsed) back to your progress/store on change.

## Design Tokens
```
Color
  --cream      #f7f1e3   page background, punctuation keys
  --paper      #fffdf6   cards, panels
  --ink        #2b2b2b   text, borders, stdout surface
  --vermillion #b8412e   primary actions ONLY + error emphasis
  --key-kw     #ddd6f3   keyword pills (lavender)
  --key-fn     #cfe6c8   builtin pills (green)
  syntax: keyword #6a58b8 · builtin/string #2f6b4f · line-numbers rgba(43,43,43,.35)
  stdout: exit-ok #8fd6a0 · exit-err / traceback #e0917e / #d08a7a

Geometry
  radius   12px cards · 10px pills · 14px frame
  borders  1px cards · 1.5px actions/frame · 2px focused
  shadow   4px 4px 0 rgba(43,43,43,.9)   (solid, NO blur)
  lift     9px 9px 0 rgba(43,43,43,.9) + rotate(-2deg)
  small    2px 2px 0 rgba(43,43,43,.85)  (pills, mini buttons)
  gaps     stack 12px · section 14px · key gap 8px
  tap targets ≥ 44px (header rows 46px, keys 38px in touch rows)

Type
  UI    Inter 600–800 — labels, buttons, headings
  Code  JetBrains Mono — all code 13/1.6, block labels 13/700,
        kickers 10px / 2px letter-spacing / 700
```
**Aesthetic — "Dojo Paper":** flat, tactile, paper + rubber-stamp. Chunky solid offset shadows, thin ink borders, one accent (vermillion) reserved for primary actions and error emphasis. **No gradients, no blur, no glassmorphism.**

## Assets
None. All iconography is Unicode glyphs (`⠿` grip, `⌄` chevron, `×` delete, `▶` run, `⤢` fullscreen, `▸` error marker). Fonts are Google Fonts (Inter, JetBrains Mono). The only external dependency is Pyodide, and only if you keep client-side execution.

## Files
- `compose-blocks-prototype.html` — the working reference implementation (vanilla HTML/CSS/JS). Read `attachDrag`, `insertToken`, `run`, and `finishRun` closely — they encode the tricky bits (drag capture ordering, caret insertion, stdout capture, error-to-block mapping).
- `ComposeBlocks-state-sheet.dc.html` — static "Dojo Paper" state sheet showing every visual state (idle, focused, dragging, collapsed, success, error, 700px) plus a build-tokens spec card. Use as the visual source of truth.
