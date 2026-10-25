/* Authored quiz bank — Lesson 1.3 · Strings. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 3, ask: 'What does this print?', code: "s = 'PYTHON'\nprint(s[0:3], s[-1])",
    options: ['PYT N', 'PYTH N', 'PY N', 'PYT O'], answer: 0, html: false,
    why: 'The stop index is excluded, so <code>s[0:3]</code> is positions 0, 1, 2. <code>s[-1]</code> is the last character.' },
  { type: 'mcq', sec: 5, ask: 'What does this print?', code: "s = 'PYTHON'\nprint(s[4:100])",
    options: ['ON', 'IndexError: string index out of range', 'N', '(an empty line)'], answer: 0, html: false,
    why: 'Slicing is forgiving: Python returns whatever part of the range exists. Only indexing a single position past the end, like <code>s[100]</code>, raises.' },
  { type: 'mcq', sec: 6, ask: 'What happens when this runs?', code: "s = 'cat'\ns[0] = 'b'\nprint(s)",
    options: ["TypeError: 'str' object does not support item assignment", 'bat', 'bcat', 'IndexError: string index out of range'], answer: 0, html: false,
    why: 'Strings are immutable. Build a new one instead: <code>\'b\' + s[1:]</code>.' },
  { type: 'mcq', sec: 2, ask: 'What does this print?', code: "s = 'PYTHON'\nprint(s[:2] + s[2:] == s, len(s[1:4]))",
    options: ['True 3', 'True 4', 'False 3', 'False 4'], answer: 0, html: false,
    why: 'Because stop is excluded, <code>s[:n] + s[n:]</code> is always the whole string, and <code>len(s[a:b])</code> is just <code>b - a</code>.' },
  { type: 'fill', sec: 7, ask: 'Test whether a word is a palindrome with one slice.', code: "word = 'level'\nprint(word == word[{{1}}])   # True",
    blanks: [{ a: '::-1' }], why: 'A step of -1 walks backwards, giving the reversed string.' },
  { type: 'fill', sec: 6, ask: "You can't change a character in place. Build the new string instead.", code: "s = 'Python'\ns = {{1}} + s[1:]\nprint(s)   # Jython",
    blanks: [{ a: "'J'", alt: ['"J"'] }] },
  { type: 'match', sec: 8, ask: "Match each expression (s = 'PYTHON') to what it gives",
    pairs: { 's[-1]': 'the last character', 's[:3]': 'the first three characters', 's[3:]': 'everything from index 3 to the end', 's[::-1]': 'the whole string reversed', "'TH' in s": 'True — a substring test' } }
];
