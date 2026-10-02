# Maths notes — how they're built

- `*.src.html` — the note you edit. Write maths as `$…$` (inline) or `$$…$$` (display)
  between `<!--MATH-START-->` and `<!--MATH-END-->`.
- `build_note.js` — bakes the maths into the page so it works offline:
  `node build_note.js A1-exponents-powers.src.html ..\Algebra_Trigonometry\A1-exponents-powers.html`
  (needs `npm i katex@0.16.11` once in this folder).
- `..\_shared\note.css` / `note.js` — look and behaviour for every note:
  Paper / Clean style and Day / Night theme (one switch for all notes),
  tick-to-score problems, recall cards, checklist. Change these once, every note follows.
- Maths fonts: `..\..\_lib\katex\` · text fonts: `..\..\_lib\fonts\`.
