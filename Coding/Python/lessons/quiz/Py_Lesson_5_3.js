/* Authored quiz bank — Lesson 5.3 · The debugging routine. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What is step 1 of the routine?", options: ["Describe: what you expected and what happened", "Open the debugger", "Add print everywhere", "Rewrite the function"], answer: 0, html: false, why: "Stating the expectation exposes half of bugs on its own — and gives you a test for when you are done." },
  { type: "mcq", sec: 3, ask: "Play computer. What does this print?", code: "def total_to(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total\n\nprint(total_to(5))", options: ["10", "15", "5", "4"], answer: 0, html: false, why: "range(5) is 0–4, so 5 is never added: 0+1+2+3+4 = 10. The fix is range(1, n + 1)." },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "raw = \"  25 \"\nprint(f\"{raw = }\")", options: ["raw = '  25 '", "raw =   25", "25", "raw"], answer: 0, html: false, why: "The <code>=</code> form prints the name and the repr, so stray spaces show up." },
  { type: "mcq", sec: 6, ask: "You changed two things and the test now passes. What do you know?", options: ["Not which change mattered — change one thing at a time", "Both changes were needed", "The bug is gone for good", "The test is wrong"], answer: 0, html: false },
  { type: "mcq", sec: 2, ask: "Why reproduce with the smallest input?", options: ["So you can show the bug every time, with nothing else in the way", "It makes the code faster", "The debugger needs it", "It hides the error"], answer: 0, html: false },
  { type: "fill", sec: 3, ask: "The fix for the trace above.", code: "for i in range(1, {{1}}):\n    total += i", blanks: [{"a": "n + 1", "alt": ["n+1"]}] },
  { type: "match", sec: 2, ask: "Match each step to what it rules out", pairs: {"Describe": "vagueness", "Reproduce": "chasing something intermittent", "Play computer": "your assumption about what the code does", "Read the error": "guessing when you were told", "Print": "where the data first goes wrong"} }
];
