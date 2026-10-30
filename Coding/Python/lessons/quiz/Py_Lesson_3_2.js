/* Authored quiz bank — Lesson 3.2 · Indexing and slicing. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 3, ask: "What does this print?", code: "a = [\"a\", \"b\", \"c\", \"d\", \"e\"]\nprint(a[1:3])", options: ["['b', 'c']", "['b', 'c', 'd']", "['a', 'b', 'c']", "['c', 'd']"], answer: 0, html: false, why: "Indices label the gaps between items: <code>a[1:3]</code> is everything between cut 1 and cut 3, so 3 − 1 = 2 items." },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "a = [10, 20, 30, 40, 50]\nprint(a[-2:])", options: ["[40, 50]", "[50]", "[10, 20]", "[30, 40, 50]"], answer: 0, html: false, why: "<code>a[-2:]</code> means “the last two” — no length needed." },
  { type: "mcq", sec: 5, ask: "What does this print?", code: "a = [1, 2, 3]\nb = a[:]\nb[0] = 9\nprint(a[0])", options: ["1", "9", "[9, 2, 3]", "None"], answer: 0, html: false, why: "A slice is a new list, so <code>b = a[:]</code> is a copy. Changing b leaves a alone." },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "a = [\"a\", \"b\", \"c\", \"d\"]\na[1:3] = [\"X\"]\nprint(a)", options: ["['a', 'X', 'd']", "['a', 'X', 'c', 'd']", "['X', 'd']", "TypeError"], answer: 0, html: false, why: "Slice assignment replaces a whole region, and the replacement need not be the same length. The list shrinks." },
  { type: "fill", sec: 3, ask: "A reversed copy of the list.", code: "backwards = a[{{1}}]", blanks: ["::-1"] },
  { type: "fill", sec: 6, ask: "Everything except the last item.", code: "most = a[{{1}}]", blanks: [{"a": ":-1", "alt": ["0:-1"]}], why: "The stop is already exclusive, so <code>a[:-1]</code> drops exactly one. <code>a[:len(a)-1]</code> works too but is the off-by-one habit to avoid." },
  { type: "match", sec: 2, ask: "Match each slice to what it gives", pairs: {"a[:2]": "the first two items", "a[2:]": "everything from index 2 on", "a[::2]": "every second item", "a[:]": "a shallow copy of the whole list", "a[i:i]": "an empty list"} }
];
