/* Authored quiz bank — Lesson 2.3 · for loops and range. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 5, ask: 'Removing items from the list you are looping over. What does this print?', code: 'nums = [2, 4, 6, 7]\nfor n in nums:\n    if n % 2 == 0:\n        nums.remove(n)\nprint(nums)',
    options: ['[4, 7]', '[7]', '[4, 6, 7]', 'IndexError'], answer: 0, html: false,
    why: 'Removing 2 shifts 4 into the spot the loop just left, so 4 is skipped. The loop then removes 6, and runs out. No error, just a wrong answer. Build a new list instead.' },
  { type: 'mcq', sec: 2, ask: 'How many times does the body of <code>for i in range(2, 10, 3):</code> run?',
    options: ['3', '4', '2', '8'], answer: 0,
    why: 'It gives 2, 5, 8. The next value would be 11, and the stop value 10 is never reached or included.' },
  { type: 'mcq', sec: 3, ask: 'The lists have different lengths. What does this print?', code: 'names = ["bolt", "washer", "nut"]\nqty = [10, 50]\nfor n, q in zip(names, qty):\n    print(n, q)',
    options: ['bolt 10\nwasher 50', 'bolt 10\nwasher 50\nnut None', 'ValueError', 'IndexError'], answer: 0, html: false,
    why: '<code>zip</code> stops at the shortest sequence, so "nut" has no partner and is simply never reached.' },
  { type: 'mcq', sec: 6, ask: 'What is total after the loop?', code: 'total = 0\nfor i in range(1, 5):\n    total += i\nprint(total)',
    options: ['10', '15', '14', '6'], answer: 0, html: false,
    why: '<code>range(1, 5)</code> is 1, 2, 3, 4: the stop is excluded. For 1 to 5 inclusive, write <code>range(1, 6)</code> (which would give 15).' },
  { type: 'fill', sec: 4, ask: 'Number the parts from 1, not 0.', code: 'names = ["bolt", "washer", "nut"]\nfor i, n in {{1}}(names, {{2}}=1):\n    print(i, n)   # 1 bolt / 2 washer / 3 nut',
    blanks: ['enumerate', 'start'] },
  { type: 'fill', sec: 7, ask: 'Print numbered lines like "1. bolt x4" with no index arithmetic.', code: 'parts = ["bolt", "nut", "washer"]\ncounts = [4, 4, 8]\nfor i, (p, c) in {{1}}({{2}}(parts, counts), start=1):\n    print(f"{i}. {p} x{c}")',
    blanks: ['enumerate', 'zip'] },
  { type: 'match', sec: 8, ask: 'Match each loop header to what it is for',
    pairs: { 'for n in names:': 'walk the items; the default', 'for i, n in enumerate(names):': 'you also need the position', 'for n, q in zip(names, qty):': 'two lists in step, stopping at the shorter', 'for _ in range(3):': 'repeat a fixed number of times, item unused' } }
];
