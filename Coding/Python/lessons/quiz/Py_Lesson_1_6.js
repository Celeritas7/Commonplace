/* Authored quiz bank — Lesson 1.6 · Input and type conversion. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 1, ask: 'The user types <b>4</b> and presses Enter. What does the second line print?', code: 'n = input("Pick a number: ")\nprint(n * 2)',
    options: ['44', '8', 'TypeError', '4 4'], answer: 0, html: false,
    why: '<code>input()</code> always returns a string. <code>"4" * 2</code> repeats it: <code>"44"</code>. No crash, just a wrong answer.' },
  { type: 'mcq', sec: 5, ask: 'The user types <b>4</b> and presses Enter. What happens on the second line?', code: 'n = input("Pick a number: ")\nprint(n + 1)',
    options: ['TypeError: can only concatenate str (not "int") to str', '5', '41', 'ValueError: invalid literal for int()'], answer: 0, html: false,
    why: '<code>n</code> is the string <code>"4"</code>, and <code>str + int</code> is not allowed. Convert at the boundary: <code>n = int(input(...))</code>.' },
  { type: 'mcq', sec: 6, ask: 'What happens when this runs?', code: 'print(int("3.0"))',
    options: ["ValueError: invalid literal for int() with base 10: '3.0'", '3', '3.0', 'TypeError'], answer: 0, html: false,
    why: '<code>int()</code> parses integer text only, and <code>"3.0"</code> is not an integer literal. Use <code>int(float(s))</code> to accept both.' },
  { type: 'mcq', sec: 6, ask: 'What does this print?', code: 'print(int(-3.9), round(3.9), -7 // 2)',
    options: ['-3 4 -4', '-4 4 -4', '-3 3 -3', '-4 4 -3'], answer: 0, html: false,
    why: 'Three different roundings: <code>int()</code> truncates toward zero, <code>round()</code> rounds, <code>//</code> floors.' },
  { type: 'fill', sec: 2, ask: 'Convert once, at the boundary.', code: 'raw = input("How many parts? ")\ncount = {{1}}(raw)\nprint(count * 2)   # typed 21 -> 42',
    blanks: ['int'] },
  { type: 'fill', sec: 3, ask: 'Keep asking until the user types a whole number.', code: 'while True:\n    try:\n        count = int(input("How many parts? "))\n        break\n    except {{1}}:\n        print("Please type a whole number.")',
    blanks: ['ValueError'], why: '<code>int()</code> raises <code>ValueError</code> on text it cannot parse.' },
  { type: 'match', sec: 8, ask: 'Match each conversion to its result',
    pairs: { 'int(" 25 ")': '25 — surrounding spaces are fine', 'int("25.0")': 'ValueError', 'float("1e6")': '1000000.0', 'int(3.9)': '3 — truncated, not rounded', 'str(25)': "'25'" } }
];
