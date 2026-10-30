/* Authored quiz bank — Lesson 3.5 · Sets. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does this print?", code: "tools = {\"drill\", \"saw\", \"drill\"}\nprint(len(tools))", options: ["2", "3", "1", "TypeError"], answer: 0, html: false, why: "Sets keep each item once; adding a duplicate does nothing." },
  { type: "mcq", sec: 2, ask: "What does this print?", code: "empty = {}\nprint(type(empty).__name__)", options: ["dict", "set", "list", "tuple"], answer: 0, html: false, why: "<code>{}</code> is an empty dict. An empty set is <code>set()</code>." },
  { type: "mcq", sec: 3, ask: "What does this print?", code: "have = {\"bolt\", \"nut\"}\nneeded = {\"nut\", \"pin\"}\nprint(needed - have)", options: ["{'pin'}", "{'bolt'}", "{'nut'}", "{'bolt', 'pin'}"], answer: 0, html: false, why: "<code>needed - have</code> is what you still need: in needed but not in have." },
  { type: "mcq", sec: 6, ask: "<code>tools[0]</code> on a set raises…", options: ["TypeError: 'set' object is not subscriptable", "IndexError", "KeyError", "Nothing — it gives the first item"], answer: 0, html: false, why: "Sets are unordered: there is no first item. If you need positions, you wanted a list." },
  { type: "mcq", sec: 6, ask: "Remove duplicates from a list but keep the first-seen order.", options: ["list(dict.fromkeys(items))", "list(set(items))", "set(items).sort()", "items.unique()"], answer: 0, html: false, why: "<code>list(set(x))</code> may come back in any order. <code>dict.fromkeys</code> keeps the order things were first seen." },
  { type: "fill", sec: 2, ask: "Remove an item, with no error if it is missing.", code: "tools.{{1}}(\"saw\")", blanks: ["discard"], why: "<code>.remove()</code> raises KeyError if the item is absent; <code>.discard()</code> does not." },
  { type: "match", sec: 3, ask: "Match each set operator to its meaning", pairs: {"a & b": "in both", "a | b": "in either", "a - b": "in a but not b", "a ^ b": "in one but not both"} }
];
