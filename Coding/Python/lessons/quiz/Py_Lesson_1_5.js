/* Authored quiz bank — Lesson 1.5 · f-strings and formatting. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 5, ask: 'What does this print?', code: 'score = 9\nprint("score: {score}")',
    options: ['score: {score}', 'score: 9', "NameError: name 'score' is not defined", 'score: '], answer: 0, html: false,
    why: 'There is no <code>f</code> before the quote, so the braces are just characters. No error, just the wrong output.' },
  { type: 'mcq', sec: 3, ask: 'What does this print?', code: 'value = 1234.5678\nprint(f"{value:,.2f}")',
    options: ['1,234.57', '1234.57', '1,234.5678', '1,234.56'], answer: 0, html: false,
    why: '<code>,</code> adds thousands separators and <code>.2f</code> shows two decimals, rounded for display.' },
  { type: 'mcq', sec: 6, ask: 'What does this print?', code: 'x = 2.346\nprint(f"{x:.1f}")\nprint(x)',
    options: ['2.3 then 2.346', '2.3 then 2.3', '2.4 then 2.346', '2.346 then 2.346'], answer: 0, html: false,
    why: 'A format spec changes the display only; <code>x</code> itself is untouched. Use <code>round(x, 1)</code> if you need the value rounded.' },
  { type: 'mcq', sec: 2, ask: 'What does this print?', code: 'rate = 0.0825\nprint(f"{rate = }")',
    options: ['rate = 0.0825', '0.0825', '{rate = }', 'True'], answer: 0, html: false,
    why: 'The <code>=</code> form (3.8+) prints the expression text and its value — a quick debug print.' },
  { type: 'fill', sec: 4, ask: 'Show 0.0825 as a percentage with two decimals.', code: 'print(f"{0.0825:{{1}}}")   # 8.25%',
    blanks: ['.2%'], why: '<code>%</code> multiplies by 100 and adds the sign; <code>.2</code> sets the decimals.' },
  { type: 'fill', sec: 3, ask: 'Right-align the word in a width of 8.', code: 'label = "bolt"\nprint(f"[{label:{{1}}}]")   # [    bolt]',
    blanks: ['>8'], why: '<code>&gt;</code> right-aligns, the number is the width. Text defaults to left-aligned.' },
  { type: 'match', sec: 8, ask: 'Match each format spec to what it does',
    pairs: { '.2f': 'two decimal places', ',': 'thousands separator', '.1%': 'a percentage with one decimal', '<10': 'left-align in 10 characters', '^10': 'centre in 10 characters' } }
];
