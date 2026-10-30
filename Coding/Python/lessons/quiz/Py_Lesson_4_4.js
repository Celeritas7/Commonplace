/* Authored quiz bank — Lesson 4.4 · Return values. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does this print?", code: "def stats(v):\n    return min(v), max(v)\n\nr = stats([4, 9, 2])\nprint(r)", options: ["(2, 9)", "[2, 9]", "2 9", "2"], answer: 0, html: false, why: "Returning several values really returns one tuple." },
  { type: "mcq", sec: 6, ask: "What does this print?", code: "def f():\n    return 1\n    print(\"after\")\n\nprint(f())", options: ["1", "after\n1", "1\nafter", "None"], answer: 0, html: false, why: "<code>return</code> ends the function at once; the line below never runs, and Python gives no warning." },
  { type: "mcq", sec: 6, ask: "A function prints the total but never returns it. What does <code>t = add(2, 3)</code> leave in t?", options: ["None", "5", "the printed text", "an error"], answer: 0, html: false },
  { type: "mcq", sec: 2, ask: "Why use an early return?", options: ["Handle the awkward cases at the top, so the main logic is not nested", "It runs faster", "It is required by Python", "It avoids needing a docstring"], answer: 0, html: false },
  { type: "mcq", sec: 6, ask: "One branch returns <code>0</code>, another returns <code>\"error\"</code>. Why is that a problem?", options: ["Every caller must check the type before using the result", "Python rejects it", "It only returns the first one", "Strings cannot be returned"], answer: 0, html: false, why: "Prefer None for “no result”, or raise an exception for a real failure." },
  { type: "fill", sec: 3, ask: "Print a function's docstring.", code: "{{1}}(average)", blanks: ["help"] },
  { type: "match", sec: 3, ask: "Match each piece to its job", pairs: {"return x": "hands x back and ends the function", "no return": "the function gives None", "\"\"\"Return the mean…\"\"\"": "the docstring", "help(f)": "prints the docstring"} }
];
