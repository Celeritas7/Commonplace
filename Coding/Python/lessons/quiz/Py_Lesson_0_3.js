/* Authored quiz bank — Lesson 0.3 · Script, REPL, notebook. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 6, ask: 'You save this as <code>calc.py</code> and run <code>python calc.py</code>. What appears?', code: '2 + 2\nx = 3\nx * 2',
    options: ['Nothing', '4 and 6', 'Just 6', 'Just 4'], answer: 0, html: false,
    why: 'A script computes each value and throws it away. Only the REPL (and a notebook cell) shows values for free; a script needs <code>print()</code>.' },
  { type: 'mcq', sec: 3, ask: 'In a notebook you run cell 1 once, then cell 2 <b>twice</b>, then cell 3. What does cell 3 print?', code: '[1]  total = 0\n[2]  for n in range(1, 4):\n         total += n\n[3]  print(total)',
    options: ['12', '6', '0', 'NameError'], answer: 0, html: false,
    why: 'The first run of cell 2 leaves <code>total</code> at 6; the second adds 1+2+3 to that, giving 12. The code did not change; the state did.' },
  { type: 'mcq', sec: 5, ask: 'You ran all three cells top to bottom. Then you edit cell 1 to <code>x = 20</code> but do not run it, and re-run only cell 3. What does it print?', code: '[1]  x = 10        # edited to 20, not re-run\n[2]  y = x * 2\n[3]  print(x + y)  # re-run now',
    options: ['30', '60', '40', 'An error, because the cells are out of sync'], answer: 0, html: false,
    why: 'Editing a cell changes the text, not memory. <code>x</code> is still 10 and <code>y</code> is still 20. Restart &amp; Run All before you trust a notebook.' },
  { type: 'mcq', sec: 6, ask: 'Down the page a notebook shows execution counters <code>[7]</code>, <code>[3]</code>, <code>[12]</code>. What does that tell you?',
    options: ['The cells were run out of order, so the outputs may not match a top-to-bottom run', 'The notebook is corrupted', 'The numbers are line counts for each cell', 'Cells 1, 2, 4 to 6 and 8 to 11 were deleted'], answer: 0,
    why: 'The counters record the order cells were <b>run</b>, not the order they appear. Read them: they are the truth about what happened.' },
  { type: 'fill', sec: 2, ask: 'What REPL stands for.', text: 'REPL: {{1}}, evaluate, {{2}}, loop.', blanks: ['read', 'print'] },
  { type: 'fill', sec: 8, ask: 'The reflex before trusting a notebook result.', text: 'Kernel → {{1}} & Run All.', blanks: ['Restart'], ci: true },
  { type: 'match', sec: 2, ask: 'Match each way of running code to what survives',
    pairs: { 'script': 'nothing: every run starts and ends empty', 'REPL': 'everything, until you close the window', 'notebook': 'everything, plus outputs saved into the file', '... prompt in the REPL': 'waiting for the rest of an indented block' } }
];
