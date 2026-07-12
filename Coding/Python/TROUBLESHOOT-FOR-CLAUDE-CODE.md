# Task: Troubleshoot — Compose Blocks editor not appearing in the Python practice app

## Context
This repo/folder is a static HTML study app ("Commonplace" Python page). We upgraded the
practice code editor from a flat `<textarea>` to a **block-based editor** ("Compose Blocks"),
but the browser still renders the OLD flat editor.

**Tell-tale signs:**
- OLD UI: run button says `▶ Run & Check`, single dark textarea.
- NEW UI: run button says `▶ Assemble & run`, labeled draggable block cards, "+ Add block".

## How the upgrade works (all 3 pieces are already in the folder)
1. `compose-blocks.js` (new file, sits next to `index.html`)
   - Ends with: `window.ComposeBlocks={ enabled:true, makeEditor:makeEditor };`
2. `practice-engine.js` — at the top of its `makeEditor(...)` function there is a delegation:
   ```js
   if(window.ComposeBlocks && window.ComposeBlocks.enabled){
     return window.ComposeBlocks.makeEditor(ex, initialCode, onCodeChange, onCheck, placeholder, { hl: hl, esc: esc });
   }
   ```
   (confirmed present at ~line 126)
3. `index.html` line ~971:
   ```html
   <script src="compose-blocks.js"></script>
   <script src="practice-engine.js"></script>
   ```
   (compose-blocks MUST load before practice-engine)

All three were verified present ON DISK. Yet the rendered page shows the old editor,
even after Cmd/Ctrl+Shift+R.

## Your job: find why the served page ≠ the files on disk, fix it, verify

### Check in this order
1. **How is the app being served/viewed?**
   - If it's a deployed site (GitHub Pages / any host): are the 3 changed files actually
     committed AND pushed AND the deployment rebuilt? `git status`, `git log -1 --stat`,
     compare deployed `practice-engine.js` (curl it) vs local — grep for `ComposeBlocks`.
   - If it's opened as `file://` or via a local server: is the browser opening THIS folder,
     or another copy? (There is a `Temp/` dir with old copies: `Temp/Index_R007/index.html`
     etc. — make sure the user isn't opening one of those.)
2. **Is compose-blocks.js reachable from the served index.html?** (same dir, 200 not 404)
3. **Any JS error in compose-blocks.js at load?** If it throws before the
   `window.ComposeBlocks=` line, the engine silently falls back to the old editor.
   Open DevTools console on load and check. Fix any error found.
4. **Service worker / aggressive caching?** DevTools → Application → Service Workers →
   unregister; also try "Empty Cache and Hard Reload".
5. **Script execution order** — confirm no `defer/async` mismatch that lets
   `practice-engine.js` run before `compose-blocks.js`.

### Acceptance test
Open the app → tab "02 Practice" → expand any problem. You must see:
- block card(s) with a ⠿ drag grip and an editable name
- "+ Add block" dashed button
- run button reading `▶ Assemble & run`
- `window.ComposeBlocks` defined in the console

### Notes
- Editor state persists in localStorage under keys `cb_blocks_<exerciseId>` — do NOT clear
  other localStorage keys (they hold the user's solved state and mistake bank).
- The Mistake Drill page (`fundamentals/mistake-drill.html`) had similar staleness before;
  root cause then was browser cache + an unbusted iframe URL. Same class of issue likely here.
