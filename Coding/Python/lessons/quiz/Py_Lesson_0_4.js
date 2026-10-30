/* Authored quiz bank — Lesson 0.4 · Reading a traceback. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 2, ask: 'Which line of this traceback should you read first?', code: 'Traceback (most recent call last):\n  File "area.py", line 12, in <module>\n    print(width * heigth)\nNameError: name \'heigth\' is not defined',
    options: ["NameError: name 'heigth' is not defined", 'Traceback (most recent call last):', 'File "area.py", line 12, in <module>', 'print(width * heigth)'], answer: 0, html: false,
    why: 'Read bottom-up. The last line says <b>what</b> broke (type: detail); the lines above say where and how it got there.' },
  { type: 'mcq', sec: 3, ask: 'In this traceback, where did the real bug most likely <b>start</b>?', code: 'Traceback (most recent call last):\n  File "stats.py", line 8, in <module>\n    main()\n  File "stats.py", line 6, in main\n    print(mean(readings))\n  File "stats.py", line 2, in mean\n    return sum(values) / len(values)\nZeroDivisionError: division by zero',
    options: ['Line 6: mean was called with an empty readings', 'Line 2: the division itself is the bug', 'Line 8: main() should not be called', 'Inside Python: sum() is broken'], answer: 0, html: false,
    why: 'Line 2 is where it <b>surfaced</b> (<code>len(values)</code> was 0). The middle frame shows <code>readings</code> was already empty when line 6 passed it in; that is where to look.' },
  { type: 'mcq', sec: 5, ask: 'You left a bracket open on line 4. What does Python 3.10 or newer report?',
    options: ["Line 4: SyntaxError: '(' was never closed", 'Line 5: SyntaxError: invalid syntax', 'Line 1, because syntax is checked top-down', 'Nothing until that line runs'], answer: 0, html: false,
    why: 'Modern Python names the open bracket and the line it opened on. Older Python reported the next line with only <code>invalid syntax</code> — if you ever see that on a line that looks fine, check the line above.' },
  { type: 'mcq', sec: 6, ask: 'Your script stops with this. What is the quickest first move?', code: "KeyError: 'custmer_id'",
    options: ["Read the detail: the key is misspelled, it should be 'customer_id'", 'Re-read the whole script from the top', 'Wrap the line in try/except', 'Reinstall pandas'], answer: 0, html: false,
    why: 'The part after the colon names the exact culprit. People re-read code for ten minutes to find what the message already said.' },
  { type: 'fill', sec: 2, ask: 'The header line of every traceback.', code: 'Traceback (most {{1}} call {{2}}):', blanks: ['recent', 'last'] },
  { type: 'fill', sec: 8, ask: 'Complete the recap.', text: 'The last line is {{1}}: detail. In a frame, <module> means the {{2}} level of the file, outside any function.',
    blanks: [{ a: 'type', alt: ['error type'] }, 'top'] },
  { type: 'match', sec: 4, ask: 'Match each mistake to the error it raises',
    pairs: { 'Typing widht instead of width': "NameError: name 'widht' is not defined", '"3" + 4': 'TypeError: can only concatenate str (not "int") to str', 'if x > 5   (no colon)': "SyntaxError: expected ':'", 'sum(values) / len(values) with an empty list': 'ZeroDivisionError: division by zero' } }
];
