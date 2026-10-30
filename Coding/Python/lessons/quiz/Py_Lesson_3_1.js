/* Authored quiz bank — Lesson 3.1 · Lists. Format: _lib/quiz/README.md
   sec = the lesson section a question comes from (#s1…#s8), used by the lesson check. */
window.CP_QUIZ_BANK = [
  { type: "mcq", sec: 3, ask: "What does this print?", code: "a = [1, 2]\na.append([3, 4])\nprint(len(a))", options: ["3", "4", "2", "TypeError"], answer: 0, html: false, why: "<code>append</code> adds its argument as <b>one</b> item, so the list becomes <code>[1, 2, [3, 4]]</code>. <code>extend([3, 4])</code> would give 4." },
  { type: "mcq", sec: 5, ask: "What does this print?", code: "nums = [3, 1, 2]\nresult = nums.sort()\nprint(result)", options: ["None", "[1, 2, 3]", "[3, 1, 2]", "True"], answer: 0, html: false, why: "<code>.sort()</code> sorts in place and returns <code>None</code>. Use <code>sorted(nums)</code> when you want the sorted list back." },
  { type: "mcq", sec: 6, ask: "What does this print?", code: "grid = [[0] * 2] * 2\ngrid[0][0] = 1\nprint(grid)", options: ["[[1, 0], [1, 0]]", "[[1, 0], [0, 0]]", "[[1, 1], [0, 0]]", "[[0, 0], [0, 0]]"], answer: 0, html: false, why: "<code>* 2</code> repeats the <b>reference</b>, so both rows are the same inner list. Build it with <code>[[0] * 2 for _ in range(2)]</code>." },
  { type: "mcq", sec: 6, ask: "What does this print?", code: "a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)", options: ["[1, 2, 3, 4]", "[1, 2, 3]", "[4]", "None"], answer: 0, html: false, why: "<code>b = a</code> gives the same list a second name. Copy with <code>a.copy()</code> or <code>a[:]</code>." },
  { type: "fill", sec: 3, ask: "Remove and keep the last item.", code: "parts = [\"bolt\", \"nut\", \"pin\"]\nlast = parts.{{1}}()", blanks: ["pop"] },
  { type: "fill", sec: 3, ask: "Add several items at the end in one call.", code: "parts = [\"bolt\"]\nparts.{{1}}([\"nut\", \"pin\"])", blanks: ["extend"] },
  { type: "match", sec: 2, ask: "Match each list operation to what it does", pairs: {".append(x)": "adds x as one item, in place", ".remove(x)": "deletes the first x by value", ".pop(i)": "removes and returns the item at i", "sorted(a)": "returns a new sorted list", "a + b": "builds a new list"} }
];
