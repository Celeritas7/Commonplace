# Quiz layer — `_lib/quiz/quiz.js`

A **🧠 Quiz** button (bottom-left, next to the ⇅ backup circle) on every reading page. It tests you
on the page you just read with three kinds of question:

| Type | What you do |
|---|---|
| **Multiple choice** | Pick one of four. Keys `1`–`4`. |
| **Fill in the blanks** | Type the missing keyword(s) into the code or sentence. `Tab` moves between blanks, `Enter` checks. |
| **Match the pairs** | Tap a term, then its meaning. One wrong pairing still counts; more is a miss. |

**🔥 Stress mode** (toggle on the start screen): a countdown on every question (15 s / 35 s / 45 s),
three lives, and a streak multiplier (×2 after 3 in a row, ×3 after 6). Time running out counts as
wrong. Your best score per page is kept, and every miss is appended to the mistake bank in
`localStorage['cpq:bank']`, which the ⇅ export backs up with the rest of your progress.

## How it gets onto pages

`_lib/progress-backup.js` loads `quiz/quiz.js` from next to itself, so any page that already has the
⇅ circle gets the quiz too. `make_offline.py` writes `progress-backup.js` from its `BACKUP_JS`
string, which has the same loader, so a re-run keeps it. Hub pages (`index.html`, `shelf.html`)
are skipped. To turn it off on one page, set `window.CP_QUIZ_OFF = true` before the script loads.

## Where the questions come from

1. **An authored bank** next to the page: `<page folder>/quiz/<page name>.js`.
   Example: `Coding/sql/The Modules/quiz/module-01.js` for `module-01.html`. These are asked first.
2. **Drills the page already loaded.** Python lessons with `lib/drills/<id>.js` reuse those
   fill-the-blank and spot-the-bug items.
3. **Generated from the page as it is right now** (so React-rendered modules and open tabs count):
   - code blocks and editors → *fill in the blanks* and *which keyword was here?* (SQL, Python, C/C++, VBA keywords; column names like `length` are left alone)
   - `<strong>Term</strong> — meaning`, small label + sentence cards, `<dl>`, two-column prose tables, and
     section headings with a one-line concept under them → *which term fits?* and *match the pairs*
   - `code   # comment` lines → *match each line of code to what it does*

Generated questions are only as good as the page. Write a bank for the pages you care about most.

## Writing a bank

```js
window.CP_QUIZ_BANK = [
  // multiple choice — `answer` is the index of the right option (options are shuffled on screen)
  { type: 'mcq', ask: 'What does this print?', code: 'a = [1]\nb = a\nb.append(2)\nprint(a)',
    options: ['[1, 2]', '[1]', '[2]', 'NameError'], answer: 0, html: false,
    why: 'Shown after answering. HTML allowed.' },

  // fill in code — {{1}}, {{2}} … are the blanks, in order
  { type: 'fill', ask: 'The five longest films.', code: 'SELECT title FROM film\n{{1}} length {{2}}\nLIMIT 5;',
    blanks: ['ORDER BY', 'DESC'], ci: true },          // ci: case-insensitive (use it for SQL)

  // fill in a sentence — same, with `text` instead of `code`
  { type: 'fill', ask: 'Complete the rule.', text: 'COUNT(column) skips {{1}} values.', blanks: ['NULL'], ci: true },

  // a blank can accept more than one answer
  { type: 'fill', ask: '…', code: 'b = a.{{1}}()', blanks: [{ a: 'copy', alt: ['__copy__'] }] },

  // match pairs — an object (term: meaning) or an array of [term, meaning]; 3–6 pairs works best
  { type: 'match', ask: 'Match the clause to its job',
    pairs: { 'WHERE': 'drops rows that fail a condition', 'LIMIT': 'caps how many rows come back', 'DESC': 'largest first' } }
];
```

`html: false` on an mcq shows the options as plain text (use it when options contain `<` or code).
Without it, options and `ask` are HTML.

Banks shipped so far: SQL modules 1 and 2, Python lesson 1.1.
