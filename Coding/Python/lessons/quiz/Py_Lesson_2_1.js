/* Authored quiz bank — Lesson 2.1 · if / elif / else. Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { type: 'mcq', sec: 5, ask: 'What does this print?', code: 'temp = 30\nif temp > 10:\n    print("warm")\nelif temp > 25:\n    print("hot")\nelse:\n    print("cold")',
    options: ['warm', 'hot', 'warm\nhot', 'cold'], answer: 0, html: false,
    why: 'The first true branch wins. <code>temp > 10</code> is true, so the chain stops; the <code>&gt; 25</code> branch can never run. Put the most specific test first.' },
  { type: 'mcq', sec: 3, ask: 'What does this print?', code: 'score = 120\nif 0 <= score <= 100:\n    if score >= 90:\n        print("A")\n    print("graded")\nelse:\n    print("out of range")\nprint("done")',
    options: ['out of range\ndone', 'out of range', 'graded\ndone', 'A\ngraded\ndone'], answer: 0, html: false,
    why: 'The range check fails, so the outer <code>else</code> runs. <code>print("done")</code> has zero indent, so it is outside every block and always runs.' },
  { type: 'mcq', sec: 2, ask: 'Two separate <code>if</code>s, not an elif chain. What does this print?', code: 'x = 95\nif x >= 50:\n    print("pass")\nif x >= 90:\n    print("distinction")',
    options: ['pass\ndistinction', 'pass', 'distinction', 'SyntaxError'], answer: 0, html: false,
    why: '"Exactly one branch runs" is true only inside one <code>if/elif/else</code> chain. Two separate <code>if</code> statements are two separate tests, and both are true here.' },
  { type: 'mcq', sec: 6, ask: 'What happens when Python reaches this?', code: 'x = 3\nif x = 5:\n    print("five")',
    options: ['SyntaxError, before anything runs', 'x becomes 5 and "five" prints, as in C', 'Nothing prints, because 3 is not 5', 'TypeError at runtime'], answer: 0, html: false,
    why: 'Python does not allow assignment inside an <code>if</code> condition, so the classic C bug cannot happen. You need <code>==</code> to compare.' },
  { type: 'fill', sec: 2, ask: 'Complete the three-way choice.', code: 'if temp > 40{{1}}\n    print("too hot")\n{{2}} temp < 5:\n    print("too cold")\nelse:\n    print("fine")',
    blanks: [':', 'elif'] },
  { type: 'fill', sec: 7, ask: 'Write the range check as one chained comparison, so the grade code sits one level shallower.', code: 'if 0 {{1}} score {{2}} 100:\n    print("valid")',
    blanks: ['<=', '<='] },
  { type: 'match', sec: 6, ask: 'Match the problem to what Python does',
    pairs: { 'Tabs and spaces mixed in one block': 'TabError: inconsistent use of tabs and spaces', 'No colon after the condition': "SyntaxError: expected ':'", 'if x = 5:': 'SyntaxError: no assignment in a condition', 'A broad elif placed above a narrow one': 'no error; the narrow branch silently never runs' } }
];
