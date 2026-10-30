/* Authored quiz bank — Lesson 4.1 · Defining functions. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 3, ask: "What does this print?", code: "def log(msg):\n    print(\"[log]\", msg)\n\nresult = log(\"start\")\nprint(result)", options: ["[log] start\nNone", "[log] start", "None", "start\nstart"], answer: 0, html: false, why: "A function with no <code>return</code> gives back <code>None</code>." },
  { type: "mcq", sec: 6, ask: "<code>print(result)</code> shows <code>&lt;function greet at 0x…&gt;</code>. What went wrong?", options: ["result = greet — the call is missing its ()", "greet has no return", "greet raised an error", "print cannot show strings"], answer: 0, html: false },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "def area(w, h):\n    print(\"computing\")\n    return w * h\n\nprint(\"defined\")", options: ["defined", "computing\ndefined", "defined\ncomputing", "computing"], answer: 0, html: false, why: "Defining a function runs nothing inside it. The body runs only when the function is called." },
  { type: "mcq", sec: 6, ask: "What is wrong with <code>def sum(values): …</code> in your script?", options: ["It hides the built-in sum for the rest of the file", "Nothing", "sum is a keyword, so it is a SyntaxError", "Functions cannot take lists"], answer: 0, html: false },
  { type: "mcq", sec: 2, ask: "What does this print?", code: "def greet(name):\n    return \"Hi \" + name\n\nsay = greet\nprint(say(\"Ana\"))", options: ["Hi Ana", "None", "TypeError", "<function greet>"], answer: 0, html: false, why: "<code>say = greet</code> (no parentheses) gives the function a second name. Functions are objects." },
  { type: "fill", sec: 2, ask: "Define a function that hands back its result.", code: "{{1}} double(n):\n    {{2}} n * 2", blanks: ["def", "return"] },
  { type: "match", sec: 3, ask: "Match each name to the convention it follows", pairs: {"calculate_total": "a verb, lowercase with underscores", "is_valid": "answers yes or no", "has_stock": "also answers yes or no", "RATE": "a constant at module level"} }
];
