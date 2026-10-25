/* Authored quiz bank — Lesson 2.4 · while loops. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 5, ask: 'The update comes before the print. What does this print?', code: 'n = 10\nwhile n > 7:\n    n -= 1\n    print(n)',
    options: ['9\n8\n7', '10\n9\n8', '9\n8', '10\n9\n8\n7'], answer: 0, html: false,
    why: 'Each pass changes n first and then prints the new value. The last pass takes n from 8 to 7 and prints 7; then <code>7 &gt; 7</code> is false and the loop stops.' },
  { type: 'mcq', sec: 6, ask: 'Spot the bug. What happens when this runs?', code: 'i, j, n = 0, 0, 3\nwhile i < n:\n    print(i)\n    j += 1',
    options: ['It prints 0 forever', 'It prints 0, 1, 2', 'It prints nothing', 'NameError'], answer: 0, html: false,
    why: 'The test uses <code>i</code> but the update changes <code>j</code>, so <code>i &lt; n</code> is true forever. The test and the update must involve the same name.' },
  { type: 'mcq', sec: 3, ask: 'An accumulator. What is total after the loop?', code: 'total, n = 0, 1\nwhile n <= 10:\n    total += n\n    n += 2\nprint(total)',
    options: ['25', '30', '55', '36'], answer: 0, html: false,
    why: 'n takes the values 1, 3, 5, 7, 9 (11 fails the test), and 1+3+5+7+9 = 25.' },
  { type: 'mcq', sec: 7, ask: 'Keep halving until below 1, counting the steps. What does this print?', code: 'n = 1000\nsteps = 0\nwhile n >= 1:\n    n = n / 2\n    steps += 1\nprint(steps)',
    options: ['10', '9', '11', '500'], answer: 0, html: false,
    why: 'After 9 halvings n is about 1.95; the 10th takes it to about 0.98, below 1. 2<sup>10</sup> = 1024 is the first power of two above 1000, which is why this matches <code>math.log2(1000)</code> rounded up.' },
  { type: 'fill', sec: 8, ask: 'The idiomatic input loop: test in the middle, so input() is written once.', code: 'while {{1}}:\n    line = input("> ")\n    if line == "quit":\n        {{2}}\n    print(f"you said {line}")',
    blanks: ['True', 'break'] },
  { type: 'fill', sec: 2, ask: 'Name the three parts of a correct while loop.', text: 'Every while needs a set {{1}} before the loop, a {{2}} checked before every pass, and an {{3}} that moves toward the test failing. Leave out the last one and the loop never ends.',
    blanks: ['up', 'test', 'update'] },
  { type: 'match', sec: 2, ask: 'Match each pattern or tool to what it does',
    pairs: { 'Accumulator': 'builds a total or list across passes', 'Sentinel': 'loops until a signal value such as "quit" appears', 'while True + break': 'tests in the middle, so the read is not duplicated', 'Ctrl-C': 'stops a runaway loop' } }
];
