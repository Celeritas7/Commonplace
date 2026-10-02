# Commonplace Maths — UI kit

Click-through recreation of the three Maths surfaces, composed from the design-system components.

- **HubScreen.jsx** — `Maths/index.html`: grain page, hub Crumb, Masthead + Seal, § The Branches, four BranchCards (Statistics → worksheet, Algebra & Trig → note; Calculus/Linear Algebra planned), Colophon.
- **NoteScreen.jsx** — `Maths/_build/A1-exponents-powers.src.html` (abbreviated): Style/Theme toggles (persisted under `cp-maths:*`, same keys as the source), KaTeX maths, power-ladder Widget, callouts, law table, worked examples, tick-to-score problems (persisted), recall cards, checklist.
- **WorksheetScreen.jsx** — `Maths/Statistics/statistics_practice.html` (partial): header, topic pills, study-progress, quick-reference card, Normal Distribution banner, floating Z ↔ P tables tool. Problem cards could not be read from the packed source and are marked as such.
- **Maths.jsx** — `<M>` KaTeX helper (`<M d>` for display).

Back to hub: the "← Mathematics" link in the note colophon / worksheet header.

## Standalone copy
Paste this `_kit` folder into `Maths/` (next to `_build` and `_shared`) and open `_kit/index.html`. It carries its own `lib/` (tokens, stylesheet, component bundle) and `assets/figures`. Fonts, KaTeX, React load from the web.
