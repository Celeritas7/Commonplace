/* Authored quiz bank — Lesson 1.4 · String methods. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 2, ask: 'What does this print?', code: 'name = "  aniket  "\nname.strip()\nprint("[" + name + "]")',
    options: ['[  aniket  ]', '[aniket]', '[aniket  ]', '[None]'], answer: 0, html: false,
    why: 'String methods never change the string; they return a new one. The result of <code>strip()</code> was not assigned, so it was thrown away.' },
  { type: 'mcq', sec: 5, ask: 'What does this print?', code: 'print("test.txt".strip(".txt"))',
    options: ['es', 'test', 'test.', 'tes'], answer: 0, html: false,
    why: 'The argument is a <b>set of characters</b>, not a suffix. It strips any of <code>. t x</code> from both ends, eating the leading <code>t</code> too. Use <code>.removesuffix(".txt")</code>.' },
  { type: 'mcq', sec: 3, ask: 'What does this print?', code: 'print("a,,b".split(","))\nprint(" a  b ".split())',
    options: ["['a', '', 'b'] then ['a', 'b']", "['a', 'b'] then ['a', 'b']", "['a', '', 'b'] then ['', 'a', '', 'b', '']", "['a', 'b'] then ['a', '', 'b']"], answer: 0, html: false,
    why: 'With a separator, <code>split</code> splits on exactly that and keeps empties. With no argument it splits on any run of whitespace and drops empties.' },
  { type: 'mcq', sec: 6, ask: 'Spot the bug. What does this print?', code: 's = "hello"\nif s.find("h"):\n    print("found")\nelse:\n    print("missing")',
    options: ['missing', 'found', '-1', 'ValueError: substring not found'], answer: 0, html: false,
    why: '<code>find</code> returns the index <code>0</code>, which is falsy. Write <code>if "h" in s:</code> for a yes/no test.' },
  { type: 'fill', sec: 3, ask: 'Join the list with dashes.', code: 'parts = ["a", "b", "c"]\nout = {{1}}.join(parts)\nprint(out)   # a-b-c',
    blanks: [{ a: '"-"', alt: ["'-'"] }], why: 'The separator owns <code>join</code>: "join these with this".' },
  { type: 'fill', sec: 4, ask: 'Clean a line read from a file, then break it into fields.', code: 'line = "Aniket,Tokyo\\n"\nline = line.{{1}}()\nfields = line.{{2}}(",")\nprint(fields)   # [\'Aniket\', \'Tokyo\']',
    blanks: [{ a: 'rstrip', alt: ['strip'] }, 'split'] },
  { type: 'match', sec: 8, ask: 'Match each call to what it does',
    pairs: { '.find(x) when x is absent': 'returns -1', '.index(x) when x is absent': 'raises ValueError', '.replace(a, b)': 'changes every occurrence of a', '.strip("ab")': 'removes any a or b characters from both ends', '" ".join(words)': 'one string with spaces between the words' } }
];
