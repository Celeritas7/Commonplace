/* Authored quiz bank — Lesson 2.2 · Truthiness and the ternary. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 8, ask: 'Which of these values is <b>falsy</b>?',
    options: ['""', '"0"', '[0]', '-1'], answer: 0, html: false,
    why: 'Only the empty string is falsy. <code>"0"</code> is a one-character string, <code>[0]</code> is a list with one item, and <code>-1</code> is a non-zero number, so all three are true.' },
  { type: 'mcq', sec: 2, ask: 'What does this print?', code: 'items = []\nstatus = "active" if items else "idle"\nprint(status)',
    options: ['idle', 'active', '[]', 'SyntaxError'], answer: 0, html: false,
    why: 'The ternary reads in order: <code>a if cond else b</code>. An empty list is falsy, so you get the value after <code>else</code>.' },
  { type: 'mcq', sec: 3, ask: 'What does this print?', code: 'record = {"name": "Aniket", "city": "Tokyo"}\nprint("Tokyo" in record, "city" in record)',
    options: ['False True', 'True True', 'True False', 'False False'], answer: 0, html: false,
    why: '<code>in</code> on a dict checks the <b>keys</b>. "city" is a key; "Tokyo" is only a value, so you would need <code>"Tokyo" in record.values()</code>.' },
  { type: 'mcq', sec: 6, ask: 'What does this print?', code: 'x = 2\nif x == True:\n    print("yes")\nelse:\n    print("no")',
    options: ['no', 'yes', 'TypeError', 'Nothing'], answer: 0, html: false,
    why: '<code>True</code> equals 1, and <code>2 == True</code> is False. Writing <code>if x:</code> would accept 2 because it is truthy. Never compare to <code>True</code>.' },
  { type: 'fill', sec: 4, ask: 'Give n the value 10 when flag is true, else 0.', code: 'n = 10 {{1}} flag {{2}} 0',
    blanks: ['if', 'else'] },
  { type: 'fill', sec: 5, ask: 'A reading of 0 is a real measurement. Write the test so 0 counts as "got a reading" and only a missing value does not.', code: 'reading = 0\nif reading {{1}} {{2}} None:\n    print("got a reading")',
    blanks: ['is', 'not'] },
  { type: 'match', sec: 7, ask: 'Match each C-style condition to its idiomatic Python version',
    pairs: { 'if len(s) != 0:': 'if s:', 'if flag == True:': 'if flag:', 'if len(items) == 0:': 'if not items:', 'if reading: (when 0 is a valid value)': 'if reading is not None:' } }
];
