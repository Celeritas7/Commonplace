/* py-keys.test.js — headless table for PY_KEYS.predict / indentFor.
   node lib/py-keys.test.js   (exit code 1 on any failure)   or open lib/_harness.html
   `now` = expected FIRST items of NEXT, in order. `then` = exact THEN lane. */
(function (root) {
  var CASES = [
    { before: "", now: ["print(", "def", "for", "if", "while"], then: [] },
    { before: "total = 0\n", now: ["print(", "total", "def", "for"], then: [] },
    { before: "total", now: ["=", "+=", "-=", ".", "[", "("], then: [] },
    { before: "total = 0\ntotal ", now: ["=", "+=", "-="], then: [] },
    { before: "x = ", now: ['""', "[]", "{}", "True"], then: ["↵"], pad: true },
    { before: "n = 5\nx = n ", now: ["+", "-", "*", "/"], then: ["↵"] },
    { before: "n = 5\nif ", now: ["n", "not"], then: [":"], pad: true },
    { before: "n = 5\nif n ", now: ["==", "!=", "<", ">"], then: [":"] },
    { before: "if n > 3", now: ["=="], then: [":"], pad: true },
    { before: "x = 1\nwhile ", now: ["x", "not"], then: [":"] },
    { before: "for ", now: ["i", "item", "ch"], then: ["in"], hint: true },
    { before: "for i", now: ["in", ","], then: [":"] },
    { before: "for i in ", now: ["range("], then: [":"] },
    { before: "word = \"hi\"\nfor ch in ", now: ["range(", "word", "enumerate("], then: [":"] },
    { before: "for i in range(", now: ["len("], then: [")", ":"], pad: true },
    { before: "for i in range(10", now: [",", "+"], then: [")", ":"], pad: true },
    { before: "for i in range(3):\n    ", now: ["print(", "i", "for", "if", "while", "break", "continue"], then: [] },
    { before: "def ", now: [], then: [":"], hint: true },
    { before: "def greet", now: ["("], then: [":"] },
    { before: "def greet(", now: ["name", "n", "x", "items", ")"], then: [":"] },
    { before: "class Dog:\n    def speak(", now: ["self", "name"], then: [":"] },
    { before: "def greet(name)", now: [":"], then: ["↵"] },
    { before: "def greet(name):", now: ["↵"], then: [] },
    { before: "def greet(name):\n    ", now: ["return", "print(", "name"], then: [] },
    { before: "def greet(name):\n    print(name)\n", now: ["greet(", "print("], then: [] },
    { before: "x = 3\nif x > 1:\n    print(x)\n", now: ["else:", "elif", "print("], then: [] },
    { before: "x = 3\nif x > 1:\n    print(x)\nel", now: ["else:", "elif"], replace: 2 },
    { before: "try:\n    n = int(input())\n", now: ["except", "finally:"], then: [] },
    { before: "except ", now: ["Exception", "ValueError"], then: [":"] },
    { before: "nums = []\nnums.", now: ["append(", "pop(", "sort("], then: [] },
    { before: "nums = []\nnums.ap", now: ["append("], replace: 2 },
    { before: "s = input()\ns.", now: ["upper(", "lower(", "split(", "strip("], then: [] },
    { before: "d = {}\nd.", now: ["keys(", "values(", "items(", "get("], then: [] },
    { before: "import math\nmath.", now: ["sqrt(", "pi"], then: [] },
    { before: "pri", now: ["print("], replace: 3 },
    { before: "total = 0\nx = to", now: ["total"], replace: 2 },
    { before: "print(", now: ['""', 'f""'], then: [")"], pad: true },
    { before: "name = \"a\"\nprint(", now: ["name", '""', 'f""'], then: [")"] },
    { before: "name = \"a\"\nprint(name", now: [",", "+", "sep=", "end="], then: [")"] },
    { before: "print(\"Hi", now: ['"', "\\n", "␣"], then: [")"] },
    { before: "print(f\"Hi ", now: ['"', "{}", "\\n", "␣"], then: [")"] },
    { before: "x = 1\nprint(f\"{", now: ["x"], then: ["}"] },
    { before: "x = [1, 2", now: [","], then: ["]"], pad: true },
    { before: "print(\"hi\")", now: ["↵"], then: [] },
    { before: "import ", now: ["math", "random", "sys", "os", "time"], then: ["↵"] },
    { before: "from random ", now: ["import"], then: [] },
    { before: "from math import ", now: ["sqrt", "pi", "floor"], then: ["↵"] },
    { before: "else", now: [":"], then: ["↵"] },
    { before: "def f(a):\n    return ", now: ["a"], then: ["↵"], pad: true },
    { before: "# a note", now: [], then: [], hint: true }
  ];
  var INDENT = [
    { line: "if x > 1:", n: 4 },
    { line: "    for i in range(3):", n: 8 },
    { line: "    return x", n: 0 },
    { line: "        break", n: 4 },
    { line: "    pass", n: 0 },
    { line: "    x = 1", n: 4 },
    { line: "print(x)", n: 0 }
  ];

  function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function run(K) {
    var rows = [], pass = 0, fail = 0;
    CASES.forEach(function (c) {
      var got = K.predict(c.before, c.full), why = [];
      if (!eq(got.now.slice(0, c.now.length), c.now)) why.push("now");
      if (c.now.length === 0 && got.now.length) why.push("now≠[]");
      if (c.then && !eq(got.then, c.then)) why.push("then");
      if (c.pad !== undefined && got.pad !== c.pad) why.push("pad");
      if (c.replace !== undefined && got.replace !== c.replace) why.push("replace");
      if (c.hint && !got.hint) why.push("hint");
      var ok = !why.length; ok ? pass++ : fail++;
      rows.push({ kind: "predict", input: c.before, ok: ok, why: why.join(","), want: c, got: got });
    });
    INDENT.forEach(function (c) {
      var n = K.indentFor(c.line), ok = n === c.n; ok ? pass++ : fail++;
      rows.push({ kind: "indent", input: c.line, ok: ok, why: ok ? "" : "indent", want: { n: c.n }, got: { n: n } });
    });
    return { pass: pass, fail: fail, rows: rows };
  }

  var T = { CASES: CASES, INDENT: INDENT, run: run };
  root.PY_KEYS_TESTS = T;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = T;
    if (typeof require !== "undefined" && require.main === module) {
      var out = run(require("./py-keys.js"));
      out.rows.forEach(function (r) {
        console.log((r.ok ? "PASS " : "FAIL ") + JSON.stringify(r.input) + (r.ok ? "" : "  [" + r.why + "] got " + JSON.stringify(r.got)));
      });
      console.log("\n" + out.pass + " passed, " + out.fail + " failed");
      process.exitCode = out.fail ? 1 : 0;
    }
  }
})(typeof window !== "undefined" ? window : this);
