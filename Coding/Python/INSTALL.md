# My Scripts on the phone — install

Five steps. Paths are relative to `Commonplace\Coding\Python\`.

## 1. Copy two files
Copy `lib\my-scripts.js` and `lib\my-scripts-data.js` into `Python\lib\`.

## 2. Add the tab button — `index.html`
Find this line (about line 428):

    <button class="mode" type="button" data-mode="bank"><span class="mode-n">03</span> Mistake Bank <span class="mode-chip" id="bank-total" hidden>0</span></button>

Paste this line directly below it:

    <button class="mode" type="button" data-mode="scripts"><span class="mode-n">04</span> My Scripts <span class="mode-chip" id="ms-due" hidden>0</span></button>

## 3. Add the tab pane — `index.html`
Find this comment (about line 614):

    <!-- ===== IMPORTED PRACTICE: folded into §III (100 Days), grouped by section ===== -->

Paste this directly above it:

    <!-- ===================== MODE · MY SCRIPTS ===================== -->
    <div class="mode-pane" data-pane="scripts" hidden><div id="ms-root"></div></div>

## 4. Load the scripts — `index.html`
Find this line (about line 1079):

    <script src="lib/game-layer.js"></script>

Paste these two lines directly below it:

    <script src="lib/my-scripts-data.js?v=1"></script>
    <script src="lib/my-scripts.js?v=1"></script>

Optional cleanup: delete the old `<section class="sec">` block titled "My Scripts" in the Learn pane (about lines 449–460). It links to the PC page this replaces.

## 5. Create the save table (once)
Open Supabase → SQL editor, paste `sql\py_my_scripts.sql`, and run it.
Until you do, progress still saves on the device; the tab shows "Sync failed … run sql/py_my_scripts.sql once".

Then reload the Python page (Ctrl+Shift+R on PC; on the phone, close and reopen the tab).

## Not needed any more
- The `shelf_fix` download from earlier — skip it.
- `my_scripts\index.html`, `_bundle.js`, `build_bundle.py`, `refresh.bat` (the PC page). Keep `original.py` and `notes.md` in each folder; the new tab doesn't read them, but they're your record.

## Adding scripts 02–04 later
Each one is a new entry in `lib\my-scripts-data.js` (original text, block line ranges, test folder, gap lines, check lines). Ask Claude to add the next one.
