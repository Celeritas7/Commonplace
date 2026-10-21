/* Authored quiz bank — Lesson 2.5 · break, continue, patterns. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 5, ask: 'What does this print?', code: 'for n in [3, 8, 1]:\n    if n > 5:\n        print("big", n)\n        break\nelse:\n    print("none big")',
    options: ['big 8', 'big 8\nnone big', 'none big', 'none big\nbig 8\nnone big'], answer: 0, html: false,
    why: 'The <code>else</code> belongs to the <code>for</code>, and <code>break</code> skips it. 8 triggers the break, so "none big" never prints and 1 is never checked.' },
  { type: 'mcq', sec: 7, ask: 'What is total after the loop?', code: 'total = 0\nfor n in range(1, 13):\n    if n % 3:\n        continue\n    total += n\nprint(total)',
    options: ['30', '48', '18', '78'], answer: 0, html: false,
    why: '<code>n % 3</code> is truthy for anything not divisible by 3, so those are skipped. Only 3, 6, 9, 12 are added: 30. (48 is the sum of the skipped ones.)' },
  { type: 'mcq', sec: 6, ask: 'What does this print?', code: 'for i in range(3):\n    for j in range(3):\n        if j == 1:\n            break\n        print(i, j)',
    options: ['0 0\n1 0\n2 0', '0 0', '0 0\n0 1', '0 0\n1 0\n1 1\n2 0'], answer: 0, html: false,
    why: '<code>break</code> leaves only the innermost loop. The outer loop carries on, so each row prints once before the inner loop is cut short.' },
  { type: 'mcq', sec: 8, ask: 'What happens when this runs?', code: 'n = 0\nwhile n < 5:\n    if n == 2:\n        continue\n    print(n)\n    n += 1',
    options: ['It prints 0 and 1, then hangs', 'It prints 0 1 3 4', 'It prints 0 1 2 3 4', 'It prints 0 and 1, then stops'], answer: 0, html: false,
    why: 'When n is 2, <code>continue</code> jumps back to the test and skips <code>n += 1</code>, so n stays 2 forever. In a while loop, continue before the update hangs it.' },
  { type: 'fill', sec: 3, ask: 'Print a right-angle triangle: 1 star, then 2, then 3.', code: 'for row in range(1, 4):\n    for col in range({{1}}):\n        print("*", end={{2}})\n    print()',
    blanks: ['row', { a: '""', alt: ["''"] }] },
  { type: 'fill', sec: 4, ask: 'Ignore blank lines but process all the others.', code: 'for line in lines:\n    if not line:\n        {{1}}\n    print(line)',
    blanks: ['continue'] },
  { type: 'match', sec: 2, ask: 'Match each keyword or rule to what it does',
    pairs: { 'break': 'leave the loop entirely, now', 'continue': 'skip the rest of this pass, start the next', 'for ... else': 'runs only if the loop finished without a break', 'nested inner loop': 'runs to completion on every outer pass', 'print(x, end="")': 'prints without adding a newline' } }
];
