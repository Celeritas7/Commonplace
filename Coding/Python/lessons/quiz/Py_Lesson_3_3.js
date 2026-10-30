/* Authored quiz bank — Lesson 3.3 · Tuples and unpacking. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does this print?", code: "t = (3)\nprint(type(t).__name__)", options: ["int", "tuple", "list", "SyntaxError"], answer: 0, html: false, why: "The comma makes a tuple, not the brackets. A one-item tuple is <code>(3,)</code>." },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "first, *rest = [1, 2, 3, 4]\nprint(rest)", options: ["[2, 3, 4]", "(2, 3, 4)", "4", "[1, 2, 3]"], answer: 0, html: false, why: "<code>*rest</code> collects whatever is left into a <b>list</b>." },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "a, b = 1, 2\na, b = b, a\nprint(a, b)", options: ["2 1", "1 2", "2 2", "1 1"], answer: 0, html: false, why: "The right side builds the tuple <code>(b, a)</code> first, then unpacks it — no temporary variable needed." },
  { type: "mcq", sec: 6, ask: "What happens?", code: "t = ([1, 2], 3)\nt[0].append(9)\nprint(t)", options: ["([1, 2, 9], 3)", "TypeError — tuples are immutable", "([1, 2], 3)", "([9], 3)"], answer: 0, html: false, why: "The tuple's slots cannot be re-pointed, but the list inside one can still change. Immutable is not the same as frozen." },
  { type: "mcq", sec: 6, ask: "<code>x, y = (1, 2, 3)</code> raises which error?", options: ["ValueError: too many values to unpack", "TypeError", "IndexError", "Nothing — y gets (2, 3)"], answer: 0, html: false, why: "The shapes must match. Use <code>x, *y = …</code> when the count varies." },
  { type: "fill", sec: 3, ask: "Return two values and unpack them.", code: "def min_max(values):\n    return min(values), max(values)\n\nlo, {{1}} = min_max([4, 9, 2])", blanks: ["hi"], why: "A function “returning two values” returns one tuple, which you unpack." },
  { type: "match", sec: 2, ask: "Match each value to its type", pairs: {"(3, 4)": "a tuple of two", "3, 4": "also a tuple of two", "(3,)": "a tuple of one", "(3)": "just the int 3", "()": "an empty tuple"} }
];
