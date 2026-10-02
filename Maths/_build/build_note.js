// build_note.js — bake KaTeX maths into a Commonplace Maths note so it works offline.
//
//   node build_note.js <note>.src.html <output>.html
//
// Writes $…$ (inline) and $$…$$ (display) between <!--MATH-START--> and
// <!--MATH-END--> as pre-rendered KaTeX HTML. The page then needs only
// _lib/katex/katex.min.css (no JavaScript, no internet) to show the maths.
// Needs: npm i katex@0.16.11   (once, in this folder)

const fs = require('fs');
const katex = require('katex');

const [, , src, out] = process.argv;
if (!src || !out) { console.error('usage: node build_note.js in.src.html out.html'); process.exit(1); }

const text = fs.readFileSync(src, 'utf8');
const a = text.indexOf('<!--MATH-START-->'), b = text.indexOf('<!--MATH-END-->');
if (a < 0 || b < a) { console.error('MATH-START / MATH-END markers missing'); process.exit(1); }

let n = 0;
const render = (tex, display) => {
  n++;
  // HTML entities that sneak into TeX from the source file
  tex = tex.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return katex.renderToString(tex, { displayMode: display, throwOnError: true, output: 'html' });
};

let body = text.slice(a, b)
  .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => render(t, true))
  .replace(/\$([^$\n]+?)\$([.,;:!?)]*)/g, (_, t, punct) =>
    // keep trailing punctuation glued to the formula so it never wraps alone
    punct ? `<span style="white-space:nowrap">${render(t, false)}${punct}</span>` : render(t, false));

if (body.includes('$')) { console.error('Unmatched $ left in the maths region'); process.exit(1); }

fs.writeFileSync(out, text.slice(0, a) + body + text.slice(b));
console.log(`${out}: ${n} formulas rendered`);
