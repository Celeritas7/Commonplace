# Session notes — Tolerance stack-up in DesignBench (7–8 Oct 2026)

## 1. What was decided

**Question:** does a tolerance stack-up need its own app, or should it stay in the machine design tool?

**Answer: keep it in the machine design tool.**
- It is a calculator like the other modules, and it needs the same ISO 286 tables the Fits module uses.
- It does **not** belong in Route Studio (`Celeritas7/Coordinate_support`), which is for hose / cable / pipe routing.
- It would only deserve a separate app if it grows into **2D/3D stacks with GD&T**, **reads dimensions from Creo / STEP**, or becomes a **shared team library of stacks**.

**Where the tool lives:** `Celeritas7/Commonplace` → `Mechanical/Machine_Design/index.html` (the "DesignBench — Machine Design Toolkit", 13 modules). It already had a basic "02 Tolerance Stack" (worst case + RSS), which was extended.

**Other findings**
- `Commonplace` itself is the study/notes hub; the `Mechanical` folder holds the engineering apps (Machine_Design, Calc_Console, Hose_routing, Motion_lab, Harness, GD&T, …).
- `Mechanical/Calc_Console` also has a tolerance stack-up entry, so the two overlap. Merging overlapping tools is better than creating more apps.
- Could DesignBench be split into separate apps? Technically 13, one per module, but recommended **keep it as one**. Split only Tolerance Stack, and only if it grows as above.
- **Works offline:** yes. React and the fonts are embedded in the single HTML file. Tested with internet blocked, both from a local server and opened from disk.

## 2. What was built (all in Module 02 — Tolerance Stack)

| Phase | Feature |
|---|---|
| 1. Calculation | **Tol from** column: ISO 286 (js / H / h, IT6–IT14, standard table values up to 500 mm) or ISO 2768 f/m/c/v. One-sided H/h bands shift the *mean* gap. Per-row **distribution** (Normal / Uniform / Triangular) and **Cpk**. Gap **min/max** spec → PASS/FAIL and predicted reject rate. **Share of σ²** per row (which part to tighten). |
| 2. Monte Carlo | 5 000 / 20 000 / 100 000 simulated builds, fixed seed (results repeat), histogram with out-of-spec bars in red and the worst-case band. |
| 3. Saving and reports | Named chains saved in the browser; current chain kept between visits; **Import / Export .json**; **Open report** (print to PDF) / **Report .html**; **Results .csv**. |

Formulas used: WC = Σ tᵢ · RSS = 3·√(Σσᵢ²) with σ = t/(3·Cpk) Normal, t/√3 Uniform, t/√6 Triangular. With all rows Normal at Cpk 1 this equals the old √(Σt²).

**Practice set**, built into the app under **Practice examples** and in `samples/`:
1. Gearbox shaft end-float (warm-up, passes)
2. Bearing pack with circlip (fails worst case; no nominal can fix it)
3. Clevis and lug, ISO 2768 general tolerances
4. Ø25 H7 / h6 fit (matches the Fits & Limits tab: 0–34 µm)
5. Truck frame: hose to frame-flange clearance (uniform frame holes)
6. Six-part stack with a weak supplier at Cpk 0.5 (fails)

## 3. Files (repo `Celeritas7/Commonplace`, branch `claude/tolerance-stack-up-app-bjcmwk`)

| File | Purpose |
|---|---|
| `Mechanical/Machine_Design/index.html` | The app (single offline file) |
| `Mechanical/Machine_Design/dev/template.html` | Editable source of the app (the bundle stores it as one encoded string) |
| `Mechanical/Machine_Design/dev/bundle_template.py` | `extract` → edit `template.html` → `pack`; `check` confirms they match |
| `Mechanical/Machine_Design/dev/stack_engine.test.js` | 16 tests: `node dev/stack_engine.test.js` |
| `Mechanical/Machine_Design/samples/stack-up-practice.md` | Six problems + "what if" questions + worked answers |
| `Mechanical/Machine_Design/samples/stack-up-practice.json` | The six chains, for **Import .json** |

Commits (pushed, **not merged into `main`**):
- `8fc078c` extend tolerance stack-up
- `fa2269c` practice set
- `cfb5644` review fixes

## 4. Review (done after building) — all fixed in `cfb5644`
- Worst-case pass at an exact limit failed from round-off at large nominals → tolerance guard now scales with the chain.
- Row with no direction: sign disagreed between calculation and import → both now "opens the gap".
- Import: blank names and silent overwrite → default name, confirm before replacing. Export no longer duplicates a name with a trailing space.
- ISO code that can't apply (e.g. H7 at 600 mm) now says "not applied" in the CSV and report.
- Browser storage only touched while the stack tab is open.
- Bundler escapes `<!--` so an HTML comment can't break the page.
- Test now checks the sample JSON matches the built-in examples; P5 answer corrected to 0.2 ppm.

## 5. Things to remember
- **Saved chains are per browser and per address.** `localhost:8137` (study server) and opening the file from disk keep separate lists. Move them with Export/Import .json, or the Commonplace ⇅ progress backup.
- **Editing the app:** never hand-edit the big `index.html`. Use `python dev/bundle_template.py extract`, edit `dev/template.html`, `pack`, then run the tests.
- If DesignBench is ever re-exported from the original design tool, the stack-up changes must be redone there (or re-applied from `dev/template.html`).

## 6. Open next steps (not started)
- Open a pull request to merge the branch into `main`.
- Optional stack-up ideas: asymmetric tolerances entered directly (+a / −b), mean shift (Cp vs Cpk), 2D / GD&T stacks, picking dimensions from Creo.
- Consider merging the Calc_Console stack-up entry with DesignBench.
