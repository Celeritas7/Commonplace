/* Authored quiz bank — Lesson 5.4 · The Mistake Bank. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does a Mistake Bank entry leave out, on purpose?", options: ["The fix — kept folded away, so you can re-solve it", "The trigger", "What you expected", "The category"], answer: 0, html: false, why: "Recognising an old fix feels like learning and is not. Re-solving from the problem is." },
  { type: "mcq", sec: 2, ask: "When is a mistake actually learned?", options: ["When you re-solve it from scratch, later, without looking", "When you read the fix", "When you bank it", "When the code runs"], answer: 0, html: false },
  { type: "mcq", sec: 3, ask: "<code>sum(r[\"qty\"] for r in rows)</code> fails because the values came from a file as strings. Which category is it?", options: ["type confusion", "off-by-one", "aliasing", "scope"], answer: 0, html: false },
  { type: "mcq", sec: 6, ask: "Which mistake is <b>not</b> worth banking?", options: ["A typo in a variable name", "Thinking b = a copies a list", "A valid 0 treated as missing", "range(5) missing the 5"], answer: 0, html: false, why: "Bank only mistakes from a wrong model: “I thought X, and actually Y”." },
  { type: "mcq", sec: 6, ask: "When should you write the entry?", options: ["While still stuck, before the fix", "After fixing it", "At the end of the week", "Only if it happens twice"], answer: 0, html: false, why: "Afterwards you have lost what you believed at the time, and the entry becomes a description of the fix." },
  { type: "mcq", sec: 6, ask: "When do you retire an entry?", options: ["After re-solving it cleanly twice", "Never", "After a week", "When the bank has 50 entries"], answer: 0, html: false },
  { type: "match", sec: 3, ask: "Match each mistake to its category", pairs: {"\"5\" * 3 giving 555": "type confusion", "range(5) missing the 5": "off-by-one", "b = a not copying": "aliasing", "a valid 0 treated as missing": "truthiness", "UnboundLocalError": "scope"} }
];
