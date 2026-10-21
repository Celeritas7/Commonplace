/* Authored quiz bank — Lesson 0.1 · What Python is. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 5, ask: 'The last line has a typo. What happens when this file runs?', code: 'x = 2\nprint("start")\nprint(x * 5)\nprint(y)',
    options: ['It prints start and 10, then stops with NameError', 'Nothing runs: the file is rejected before it starts, like a C compile error', 'It prints start, 10, then None', 'It prints start, then stops with NameError'], answer: 0, html: false,
    why: 'The interpreter runs line by line. Lines 1 to 3 do their work; only when it reaches line 4 does it find no name <code>y</code> and raise <code>NameError</code>.' },
  { type: 'mcq', sec: 2, ask: 'What happens when this runs? (<code>"total: " + 5</code> is a type mistake.)', code: 'day = "Mon"\nif day == "Sun":\n    print("total: " + 5)\nprint("done")',
    options: ['It prints done', 'It stops with TypeError before printing anything', 'It prints total: 5, then done', 'It prints done, then TypeError'], answer: 0, html: false,
    why: 'Types are checked when a line runs. The <code>if</code> branch never runs on a Monday, so the bug sits there unnoticed and only <code>done</code> prints.' },
  { type: 'mcq', sec: 6, ask: 'What does this print?', code: 'count = 0\nfor n in [1, 2, 3]:\n    count += 1\n    print(count)',
    options: ['1, 2 and 3, each on its own line', 'Just 3', 'Just 1', 'IndentationError'], answer: 0, html: false,
    why: 'The <code>print</code> is indented four spaces, so it is <b>inside</b> the loop and runs every pass. Indentation is the structure, not decoration; move it left and it would print only <code>3</code>.' },
  { type: 'mcq', sec: 1, ask: 'What trade did Python make compared with C?',
    options: ['It gives up some machine speed to save the programmer time', 'It gives up readability to run faster', 'It needs more lines but leaks less memory', 'It runs faster because the source is read each time'], answer: 0,
    why: 'C puts the machine first and is fast; Python is slower but the same job takes a few lines with no memory bookkeeping. The heavy parts (NumPy, pandas) run in C underneath anyway.' },
  { type: 'fill', sec: 3, ask: 'Count the lines in log.txt that mention "error".', code: 'count = 0\n{{1}} open("log.txt") as f:\n    for line {{2}} f:\n        if "error" {{3}} line:\n            count += 1\nprint(count)',
    blanks: ['with', 'in', 'in'] },
  { type: 'fill', sec: 8, ask: 'Complete the recap.', text: 'C is {{1}}: translated to machine code once, then run alone. Python is {{2}}: the source is read and acted on line by line, every run.',
    blanks: ['compiled', 'interpreted'] },
  { type: 'match', sec: 4, ask: 'Match each English sentence to its Python line',
    pairs: { 'If the name is not in the list, add it': 'if name not in names: names.append(name)', 'For every score, print it doubled': 'for score in scores: print(score * 2)', 'Keep asking until the answer is not empty': 'while not answer: answer = input("Name? ")', 'Close the file even if something goes wrong': 'with open("log.txt") as f:' } }
];
