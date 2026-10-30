/* Authored quiz bank — Lesson 4.3 · *args and **kwargs. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does this print?", code: "def f(*args):\n    print(type(args).__name__, len(args))\n\nf(1, 2, 3)", options: ["tuple 3", "list 3", "tuple 1", "int 3"], answer: 0, html: false, why: "In a definition, <code>*args</code> packs the extra positional arguments into a tuple." },
  { type: "mcq", sec: 2, ask: "What does this print?", code: "def tag(**kwargs):\n    print(kwargs)\n\ntag(colour=\"red\")", options: ["{'colour': 'red'}", "('colour', 'red')", "colour=red", "['red']"], answer: 0, html: false, why: "<code>**kwargs</code> packs the extra keyword arguments into a dict." },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "def area(w, h):\n    return w * h\n\ndims = (3, 4)\nprint(area(*dims))", options: ["12", "TypeError", "(3, 4)", "7"], answer: 0, html: false, why: "In a call, <code>*dims</code> spreads the tuple into separate arguments. <code>area(dims)</code> would pass one argument and fail." },
  { type: "mcq", sec: 2, ask: "What is the fixed order of parameters in a def?", options: ["ordinary, *args, keyword-only, **kwargs", "**kwargs, *args, ordinary", "*args, ordinary, **kwargs", "any order"], answer: 0, html: false },
  { type: "mcq", sec: 6, ask: "A wrapper calls <code>fn(args, kwargs)</code>. What goes wrong?", options: ["fn gets a tuple and a dict as two plain arguments — it needs fn(*args, **kwargs)", "Nothing", "args is lost", "It is a SyntaxError"], answer: 0, html: false },
  { type: "fill", sec: 3, ask: "Forward a whole call unchanged.", code: "def logged(fn, *args, **kwargs):\n    return fn({{1}}args, {{2}}kwargs)", blanks: ["*", "**"] },
  { type: "match", sec: 3, ask: "Match the stars to what they do", pairs: {"*args in a def": "packs extra positionals into a tuple", "**kwargs in a def": "packs extra keywords into a dict", "*seq in a call": "spreads a sequence into positionals", "**d in a call": "spreads a dict into keywords"} }
];
