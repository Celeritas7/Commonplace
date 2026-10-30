/* Authored quiz bank — Lesson 4.5 · Scope. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 3, ask: "What happens?", code: "count = 0\n\ndef bump():\n    count = count + 1\n\ntry:\n    bump()\nexcept Exception as e:\n    print(type(e).__name__)", options: ["UnboundLocalError", "It prints nothing and count is 1", "NameError", "SyntaxError"], answer: 0, html: false, why: "count is assigned in bump, so Python treats it as local to the whole function — the right side then reads a local that has no value yet." },
  { type: "mcq", sec: 2, ask: "What does this print?", code: "RATE = 0.5\n\ndef total(x):\n    return x + x * RATE\n\nprint(total(10))", options: ["15.0", "10", "NameError", "5.0"], answer: 0, html: false, why: "Reading a global from inside a function is fine; assigning to it is what changes things." },
  { type: "mcq", sec: 2, ask: "In what order does Python look up a name?", options: ["Local, Enclosing, Global, Built-in", "Built-in, Global, Local", "Global, Local, Built-in", "Only Local and Global"], answer: 0, html: false },
  { type: "mcq", sec: 6, ask: "What does this print?", code: "for i in range(3):\n    pass\nprint(i)", options: ["2", "3", "NameError", "0"], answer: 0, html: false, why: "Unlike C, the loop variable survives the loop, holding the last value." },
  { type: "mcq", sec: 6, ask: "What is the better fix for an UnboundLocalError than adding <code>global</code>?", options: ["Pass the value in and return the new one", "Rename the variable", "Wrap it in try/except", "Make it UPPER_CASE"], answer: 0, html: false },
  { type: "fill", sec: 3, ask: "Say you mean the module-level name.", code: "def bump():\n    {{1}} count\n    count = count + 1", blanks: ["global"] },
  { type: "match", sec: 2, ask: "Match each scope to an example", pairs: {"Local": "a parameter or a name assigned in the body", "Enclosing": "an outer function around this one", "Global": "a name at the top of the file", "Built-in": "print, len, sum"} }
];
