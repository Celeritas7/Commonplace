/* Authored quiz bank — Lesson 4.6 · Lambdas. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does this print?", code: "parts = [(\"bolt\", 40), (\"nut\", 12), (\"pin\", 7)]\nprint(max(parts, key=lambda p: p[1]))", options: ["('bolt', 40)", "('pin', 7)", "40", "('nut', 12)"], answer: 0, html: false },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "names = [\"Zebra\", \"apple\", \"Mango\"]\nprint(sorted(names, key=str.lower))", options: ["['apple', 'Mango', 'Zebra']", "['Mango', 'Zebra', 'apple']", "['Zebra', 'Mango', 'apple']", "['apple', 'mango', 'zebra']"], answer: 0, html: false, why: "The key lower-cases each name for comparing only; the names themselves are unchanged." },
  { type: "mcq", sec: 6, ask: "What does this print?", code: "fs = [lambda: i for i in range(3)]\nprint([f() for f in fs])", options: ["[2, 2, 2]", "[0, 1, 2]", "[0, 0, 0]", "[3, 3, 3]"], answer: 0, html: false, why: "Each lambda captures the variable i, not its value at the time. Fix: <code>lambda i=i: i</code>." },
  { type: "mcq", sec: 2, ask: "Which can a lambda <b>not</b> contain?", options: ["a for loop or an assignment", "an arithmetic expression", "a conditional expression (x if c else y)", "a function call"], answer: 0, html: false },
  { type: "mcq", sec: 3, ask: "What does <code>key=</code> receive?", options: ["One item, and it returns the value to sort by", "Two items to compare, like C's qsort", "The whole list", "The index of each item"], answer: 0, html: false },
  { type: "fill", sec: 3, ask: "Sort by quantity, highest first.", code: "top = sorted(stock, key=lambda d: d[\"qty\"], {{1}}=True)", blanks: ["reverse"] },
  { type: "match", sec: 6, ask: "Match each situation to the better choice", pairs: {"a one-off sort key": "an inline lambda", "a function you will name": "a def", "str.lower already exists": "pass the function by name", "nested ternaries in a lambda": "a small def above it"} }
];
