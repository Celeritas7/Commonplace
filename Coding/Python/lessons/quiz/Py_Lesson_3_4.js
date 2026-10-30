/* Authored quiz bank — Lesson 3.4 · Dictionaries. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 3, ask: "What does this print?", code: "stock = {\"bolt\": 40}\nprint(stock.get(\"pin\", 0))", options: ["0", "None", "KeyError", "40"], answer: 0, html: false, why: "<code>.get(key, default)</code> returns the default when the key is absent — no exception." },
  { type: "mcq", sec: 6, ask: "What does this print?", code: "city = {\"name\": \"Tokyo\"}\nprint(\"Tokyo\" in city)", options: ["False", "True", "KeyError", "None"], answer: 0, html: false, why: "<code>in</code> tests <b>keys</b>, never values. Use <code>\"Tokyo\" in city.values()</code>." },
  { type: "mcq", sec: 2, ask: "Which one is <b>not</b> allowed as a dict key?", options: ["[1, 2]", "(1, 2)", "'code'", "42"], answer: 0, html: false, why: "Keys must be hashable. A list can change, so it cannot be a key: <code>TypeError: unhashable type: 'list'</code>. Use <code>tuple(my_list)</code>." },
  { type: "mcq", sec: 3, ask: "Which loop gives you both key and value?", options: ["for k, v in d.items():", "for k, v in d:", "for k, v in d.keys():", "for k in d.values():"], answer: 0, html: false },
  { type: "mcq", sec: 6, ask: "Deleting keys from a dict while looping over it raises…", options: ["RuntimeError: dictionary changed size during iteration", "Nothing — it works", "KeyError", "It silently skips keys"], answer: 0, html: false, why: "Loop over <code>list(d.keys())</code> if you must delete as you go." },
  { type: "fill", sec: 2, ask: "Add a new key, then remove it.", code: "part[\"supplier\"] = \"X\"\n{{1}} part[\"supplier\"]", blanks: ["del"] },
  { type: "match", sec: 3, ask: "Match each dict operation to what it does", pairs: {"d[\"k\"]": "the value, or KeyError if absent", "d.get(\"k\")": "the value, or None if absent", "\"k\" in d": "is k a key?", "d.items()": "(key, value) pairs", "d.values()": "just the values"} }
];
