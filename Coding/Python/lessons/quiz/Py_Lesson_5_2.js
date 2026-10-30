/* Authored quiz bank — Lesson 5.2 · Raising exceptions. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 2, ask: "What does this print?", code: "try:\n    {}[\"x\"]\nexcept LookupError:\n    print(\"caught\")", options: ["caught", "KeyError", "nothing", "LookupError"], answer: 0, html: false, why: "KeyError is a child of LookupError, and catching a parent catches its children." },
  { type: "mcq", sec: 3, ask: "qty is <code>-5</code>. Which exception should <code>set_quantity</code> raise?", options: ["ValueError — right type, wrong value", "TypeError", "KeyError", "Exception"], answer: 0, html: false },
  { type: "mcq", sec: 3, ask: "Which message is most useful?", options: ["raise ValueError(f\"qty cannot be negative, got {qty}\")", "raise ValueError(\"invalid input\")", "raise Exception(\"error\")", "return -1"], answer: 0, html: false, why: "Include the offending value: it ends the investigation instead of starting one." },
  { type: "mcq", sec: 6, ask: "What does this print?", code: "try:\n    1 / 0\nexcept Exception:\n    print(\"general\")\nexcept ZeroDivisionError:\n    print(\"specific\")", options: ["general", "specific", "general\nspecific", "ZeroDivisionError"], answer: 0, html: false, why: "The first matching clause wins. General before specific makes the specific one unreachable — narrowest first." },
  { type: "mcq", sec: 2, ask: "Which is <b>not</b> caught by <code>except Exception:</code>?", options: ["KeyboardInterrupt", "ValueError", "ZeroDivisionError", "KeyError"], answer: 0, html: false, why: "KeyboardInterrupt sits under BaseException, not Exception." },
  { type: "fill", sec: 3, ask: "Define your own exception type.", code: "class OutOfStockError({{1}}):\n    \"\"\"Raised when an order exceeds stock.\"\"\"", blanks: ["Exception"] },
  { type: "match", sec: 3, ask: "Match each failure to the exception to raise", pairs: {"right type, wrong value": "ValueError", "wrong type entirely": "TypeError", "key not found": "KeyError", "a failure specific to your program": "your own Exception subclass"} }
];
