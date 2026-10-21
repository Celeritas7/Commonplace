/* Authored quiz bank — Lesson 1.7 · Booleans and comparisons. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 2, ask: 'What does this print?', code: 'print(3 and 5, 0 and 5)',
    options: ['5 0', 'True False', '3 0', 'True 0'], answer: 0, html: false,
    why: '<code>and</code> returns an operand, not a bool: the first falsy value, or the last value if none are falsy.' },
  { type: 'mcq', sec: 5, ask: 'What does this print?', code: 'count = 0\nn = count or 10\nprint(n)',
    options: ['10', '0', 'True', 'False'], answer: 0, html: false,
    why: '<code>0</code> is falsy, so <code>or</code> moves on and returns <code>10</code>. If 0 is a legitimate value, use <code>count if count is not None else 10</code>.' },
  { type: 'mcq', sec: 6, ask: 'What does this print?', code: 'a = [1, 2]\nb = [1, 2]\nprint(a == b, a is b)',
    options: ['True False', 'True True', 'False False', 'False True'], answer: 0, html: false,
    why: '<code>==</code> compares values; <code>is</code> asks whether they are the same object. These are two separate lists.' },
  { type: 'mcq', sec: 3, ask: 'What does this print?', code: 'age = 70\nprint(18 <= age < 65)\nprint("Zebra" < "apple")',
    options: ['False then True', 'True then True', 'False then False', 'True then False'], answer: 0, html: false,
    why: 'Chained comparisons mean what they read (in C the first line is always true). Strings compare by character code, and capitals sort before lowercase.' },
  { type: 'fill', sec: 6, ask: 'Guard against an empty list so the index never runs on it.', code: 'items = []\nif {{1}} and items[0] == "x":\n    print("starts with x")',
    blanks: ['items'], why: 'Short-circuit: if <code>items</code> is empty, <code>and</code> stops before <code>items[0]</code>. The protecting test must come first.' },
  { type: 'fill', sec: 8, ask: 'Complete the rule.', text: 'and returns the first {{1}} operand, or the last; or returns the first {{2}} operand, or the last. Only {{3}} always gives True or False.',
    blanks: ['falsy', 'truthy', 'not'] },
  { type: 'match', sec: 2, ask: 'Match each operator to what it does',
    pairs: { '==': 'same value?', 'is': 'same object?', 'or': 'returns the first truthy operand, or the last', '&': 'bitwise AND — not the logical one', 'in': 'membership test' } }
];
