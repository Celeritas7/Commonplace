/* Authored quiz bank — Lesson 4.2 · Parameters. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does this print?", code: "def order(part, qty, priority=\"normal\"):\n    print(qty, part, priority)\n\norder(\"bolt\", priority=\"urgent\", qty=5)", options: ["5 bolt urgent", "bolt 5 urgent", "5 bolt normal", "SyntaxError"], answer: 0, html: false, why: "Keyword arguments match by name, so their order in the call does not matter." },
  { type: "mcq", sec: 2, ask: "Which call is a SyntaxError?", options: ["order(qty=40, \"bolt\")", "order(\"bolt\", 40)", "order(\"bolt\", qty=40)", "order(part=\"bolt\", qty=40)"], answer: 0, html: false, why: "Once you use a keyword in a call, everything after it must also be a keyword." },
  { type: "mcq", sec: 5, ask: "What does this print?", code: "def add(item, bag=[]):\n    bag.append(item)\n    return bag\n\nadd(1)\nprint(add(2))", options: ["[1, 2]", "[2]", "[1]", "None"], answer: 0, html: false, why: "The default list is made once, when the function is defined, and shared by every call. Default to <code>None</code> and build the list inside." },
  { type: "mcq", sec: 6, ask: "<code>def f(x=1, y):</code> gives…", options: ["a SyntaxError when the def is read", "an error only when f is called", "y defaults to 1 as well", "nothing — it is fine"], answer: 0, html: false },
  { type: "fill", sec: 5, ask: "The safe way to default to an empty list.", code: "def add(item, bag={{1}}):\n    if bag is None:\n        bag = []\n    bag.append(item)\n    return bag", blanks: ["None"] },
  { type: "fill", sec: 3, ask: "Make precision keyword-only.", code: "def report(values, {{1}}, precision=2):\n    ...", blanks: ["*"], why: "Everything after a bare <code>*</code> must be passed by name." },
  { type: "match", sec: 2, ask: "Match each call style to how it matches parameters", pairs: {"positional": "by position, left to right", "keyword": "by name, any order", "default": "used when the caller leaves it out", "keyword-only": "after a bare * in the def"} }
];
