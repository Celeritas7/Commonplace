/* Authored quiz bank — Lesson 1.2 · Numbers and arithmetic. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 2, ask: 'What does this print?', code: 'print(9 / 3, 9 // 3)',
    options: ['3.0 3', '3 3', '3.0 3.0', '3 3.0'], answer: 0, html: false,
    why: '<code>/</code> always returns a float, even when it divides evenly. <code>//</code> floors and keeps two ints as an int.' },
  { type: 'mcq', sec: 6, ask: 'What does this print?', code: 'print(-7 // 2, -7 % 2)',
    options: ['-4 1', '-3 -1', '-4 -1', '-3 1'], answer: 0, html: false,
    why: 'Python floors toward minus infinity, so <code>-7 // 2</code> is <code>-4</code>, and the remainder takes the sign of the divisor: <code>1</code>. C would give <code>-3</code> and <code>-1</code>.' },
  { type: 'mcq', sec: 6, ask: 'What happens when this runs?', code: "items = ['a', 'b', 'c', 'd', 'e']\nmid = len(items) / 2\nprint(items[mid])",
    options: ['TypeError: list indices must be integers or slices, not float', 'c', 'b', 'IndexError: list index out of range'], answer: 0, html: false,
    why: '<code>5 / 2</code> is the float <code>2.5</code>, and a list cannot be indexed by a float. C would silently truncate; in Python you want <code>//</code>.' },
  { type: 'mcq', sec: 5, ask: 'What does this print?', code: 'import math\ntotal = 0.1 + 0.2\nprint(total == 0.3, math.isclose(total, 0.3))',
    options: ['False True', 'True True', 'False False', 'True False'], answer: 0, html: false,
    why: '<code>0.1 + 0.2</code> is <code>0.30000000000000004</code>, so <code>==</code> fails. <code>math.isclose</code> compares within a tolerance, which is how floats should be compared.' },
  { type: 'fill', sec: 4, ask: '100 items, boxes of 12: whole boxes and what is left over.', code: 'items = 100\nboxes = items {{1}} 12   # 8\nleft = items {{2}} 12    # 4',
    blanks: ['//', '%'], why: '<code>//</code> gives whole boxes, <code>%</code> gives the remainder.' },
  { type: 'fill', sec: 8, ask: 'Complete the recap.', text: 'Python ints never {{1}}, so 2 ** 1000 is exact. For money, use integer minor units or decimal.{{2}}.',
    blanks: [{ a: 'overflow', alt: ['overflow.'] }, 'Decimal'] },
  { type: 'match', sec: 3, ask: 'Match each expression to its result',
    pairs: { '7 / 2': '3.5', '7 // 2': '3', '7 % 2': '1', '7 ** 2': '49', '-7 // 2': '-4' } }
];
