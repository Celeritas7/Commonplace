/* cpp-error-phrasebook.js — v4 Phase 2
   Turns a g++ dump into one plain-language sentence, one rule, and a one-line fix.
   Pure data + string work: no DOM, no network, no dependencies. The panel asks it
   one question — explain(raw, code) — and renders whatever comes back.

   Ten shapes are in the book. Anything else comes back matched:false so the caller
   can show the raw text and queue the signature for a phrasebook entry later. */
(function (root) {
  "use strict";

  var STD = {
    cout: "iostream", cin: "iostream", cerr: "iostream", endl: "iostream",
    string: "string", getline: "string",
    vector: "vector", array: "array", map: "map", set: "set",
    sort: "algorithm", max: "algorithm", min: "algorithm", swap: "algorithm",
    printf: "cstdio", scanf: "cstdio", sqrt: "cmath", pow: "cmath", abs: "cmath",
    setprecision: "iomanip", fixed: "iomanip", stringstream: "sstream"
  };

  function lines(s) { return String(s || "").split(/\r?\n/); }
  function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }

  /* first real diagnostic: prefer "error:", fall back to the first non-empty line */
  function firstError(raw) {
    var ls = lines(raw), i, m;
    for (i = 0; i < ls.length; i++) {
      if (/\berror\b\s*:/i.test(ls[i])) {
        m = /:(\d+):(\d+)?:/.exec(ls[i]);
        return { text: ls[i], line: m ? parseInt(m[1], 10) : null, col: m && m[2] ? parseInt(m[2], 10) : null };
      }
    }
    for (i = 0; i < ls.length; i++) if (trim(ls[i])) return { text: ls[i], line: null, col: null };
    return { text: "", line: null, col: null };
  }

  /* One row per error SHAPE: paths, line/column numbers and the reader's own
     identifiers all collapse, so the same mistake in two files is one signature. */
  function normalise(raw) {
    var t = firstError(raw).text || String(raw || "");
    return trim(t)
      .replace(/^[^\s:]*[\/\\]?[\w.+-]*\.(cpp|cc|cxx|c|h|hpp)\b/i, "<file>")
      .replace(/:\d+:\d+:/g, ":")
      .replace(/:\d+:/g, ":")
      .replace(/[\u2018\u2019']([^\u2018\u2019']{0,80})[\u2018\u2019']/g, "'X'")
      .replace(/"[^"]{0,80}"/g, "'X'")
      .replace(/\b\d+\b/g, "N")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .slice(0, 180);
  }

  /* quoted names, in order — g++ quotes with curly quotes in most locales */
  function quoted(text) {
    var out = [], re = /[\u2018\u2019'`]([^\u2018\u2019'`]{1,80})[\u2018\u2019'`]/g, m;
    while ((m = re.exec(text))) out.push(m[1]);
    return out;
  }

  function codeLine(code, n) {
    if (!code || !n) return "";
    var ls = lines(code);
    return n >= 1 && n <= ls.length ? ls[n - 1] : "";
  }

  var BOOK = [
    {
      /* The app's own commonest shape: the slot editor hands you the inside of
         main(), and a classic-mode run compiles it bare. g++ reads the first
         statement as a declaration and reports the stream name as a type. */
      id: "outside_main",
      test: function (t) {
        return /does not name a type/.test(t) ||
               /expected unqualified-id before/.test(t) ||
               /expected constructor, destructor, or type conversion before/.test(t);
      },
      headline: "This code is outside main().",
      rule: "Statements have to sit inside a function. At the top level of a file the compiler expects declarations only, so it reads the first word as a type name it has never heard of.",
      fix: function (c) {
        var src = trim(c.lineText);
        if (!src) return null;
        return { before: src, after: "int main() { " + src + " return 0; }" };
      },
      hint: "or switch to slot mode and it assembles this for you"
    },
    {
      id: "missing_semicolon",
      test: function (t) { return /expected\s+[\u2018'"`;]*;/.test(t) || /expected\s+';'/.test(t); },
      headline: "A statement is missing its semicolon.",
      rule: "Every statement ends in a semicolon — without it the compiler keeps reading the next line as part of this one, so it complains one line late.",
      fix: function (c) {
        var src = trim(c.lineText) || trim(c.prevText);
        if (!src) return null;
        return { before: src, after: src.replace(/\s*$/, "") + ";" };
      },
      /* g++ points at the line AFTER the one that needs the semicolon */
      lineShift: -1
    },
    {
      id: "missing_include",
      test: function (t, c) {
        if (!/was not declared in this scope|undeclared identifier|has not been declared/.test(t)) return false;
        return !!(c.name && STD[c.name]);
      },
      headline: function (c) { return "`" + c.name + "` needs its header included."; },
      rule: function (c) {
        return "`" + c.name + "` lives in the standard library — the file has to say `#include <" + STD[c.name] + ">` before it can be used.";
      },
      fix: function (c) { return { before: "(top of file)", after: "#include <" + STD[c.name] + ">" }; }
    },
    {
      id: "undeclared_identifier",
      test: function (t) { return /was not declared in this scope|undeclared identifier|has not been declared/.test(t); },
      headline: function (c) { return "`" + (c.name || "That name") + "` isn't declared yet."; },
      rule: "A name has to be declared before it is used, and spelling and capitalisation must match exactly — `Count` and `count` are two different variables.",
      fix: function (c) {
        if (!c.name) return null;
        return { before: trim(c.lineText) || ("… " + c.name + " …"), after: "int " + c.name + " = 0;   // declare it above, or fix the spelling" };
      }
    },
    {
      id: "unmatched_brace",
      test: function (t) { return /at end of input|expected\s+[\u2018'"`}]*}|expected declaration or statement at end of input/.test(t); },
      headline: "A brace was opened and never closed.",
      rule: "Every `{` needs its `}`. The compiler only notices at the end of the file, so the reported line is the last line, not the guilty one.",
      fix: function () { return { before: "(end of file)", after: "}" }; }
    },
    {
      id: "stream_operator",
      test: function (t) { return /no match for\s*[\u2018\u2019'"`]*operator\s*(<<|>>)|invalid operands to binary\s*(<<|>>)/.test(t); },
      headline: "cout and cin are being used the wrong way round.",
      rule: "Output flows out with `cout <<` and input flows in with `cin >>` — the arrows point the way the data travels.",
      fix: function (c) {
        var src = trim(c.lineText);
        if (!src) return null;
        var out = /cin\s*<</.test(src) ? src.replace(/cin\s*<</, "cin >>")
                : /cout\s*>>/.test(src) ? src.replace(/cout\s*>>/, "cout <<") : null;
        return out ? { before: src, after: out } : null;
      }
    },
    {
      id: "char_vs_string",
      test: function (t) {
        return /from\s*[\u2018\u2019'"`]const char\s*\*[\u2018\u2019'"`]\s*to\s*[\u2018\u2019'"`]char[\u2018\u2019'"`]/.test(t) ||
               /from\s*[\u2018\u2019'"`]char[\u2018\u2019'"`]\s*to\s*[\u2018\u2019'"`]const char\s*\*/.test(t) ||
               /multi-character character constant|empty character constant/.test(t);
      },
      headline: "Single and double quotes are swapped.",
      rule: "`'a'` is one character; `\"a\"` is a string. Anything longer than one letter needs double quotes.",
      fix: function (c) {
        var src = trim(c.lineText);
        if (!src) return null;
        var out = src.replace(/'([^']{2,})'/, '"$1"');
        return out !== src ? { before: src, after: out } : { before: src, after: src + "   // use \"double quotes\" for text" };
      }
    },
    {
      id: "type_mismatch",
      test: function (t) { return /cannot convert|invalid conversion|incompatible types|no viable conversion/.test(t); },
      headline: function (c) {
        return c.types ? ("A " + c.types[0] + " is being put where a " + c.types[1] + " belongs.") : "A value of the wrong type is being assigned.";
      },
      rule: "C++ checks types at compile time: the value on the right has to be the type the left-hand side declares, or be converted deliberately.",
      fix: function (c) {
        var src = trim(c.lineText);
        return src ? { before: src, after: src + "   // convert, or change the declared type" } : null;
      }
    },
    {
      id: "argument_count",
      test: function (t) { return /too few arguments to function|too many arguments to function|no matching function for call/.test(t); },
      headline: function (c) { return "The call to `" + (c.name || "that function") + "` has the wrong arguments."; },
      rule: "A call has to match the declaration exactly — same number of arguments, in the same order, with matching types.",
      fix: function (c) {
        var src = trim(c.lineText);
        return src ? { before: src, after: src + "   // match the parameter list above" } : null;
      }
    },
    {
      id: "uninitialised",
      test: function (t) { return /is used uninitialized|may be used uninitialized/.test(t); },
      headline: function (c) { return "`" + (c.name || "A variable") + "` is read before it is given a value."; },
      rule: "A plain local variable starts as whatever was in that memory — read it before assigning and the result is garbage that changes run to run.",
      fix: function (c) {
        var src = trim(c.lineText);
        var decl = /^(\w[\w:<>\s*&]*?)\s+(\w+)\s*;$/.exec(src);
        if (decl) return { before: src, after: decl[1] + " " + decl[2] + " = 0;" };
        return c.name ? { before: "… " + c.name + " …", after: "initialise " + c.name + " where it is declared" } : null;
      }
    },
    {
      id: "out_of_bounds",
      test: function (t) { return /array subscript .* is (above|below) array bounds|index \d+ out of bounds|stack-buffer-overflow|subscript is outside/.test(t); },
      headline: "An array is being read past its last element.",
      rule: "An array of n elements is indexed 0 to n−1, so the loop condition is `i < n`, never `i <= n`.",
      fix: function (c) {
        var src = trim(c.lineText);
        if (!src) return null;
        var out = src.replace(/<=\s*(\w+)/, "< $1");
        return out !== src ? { before: src, after: out } : { before: src, after: src + "   // last valid index is n-1" };
      }
    }
  ];

  /* compiled clean but died at run time: no diagnostic text to translate, so this
     is orientation only — the deep read belongs to the analysis panel. */
  var RUNTIME = {
    id: "runtime_crash",
    headline: "It compiled, then stopped while running.",
    rule: "The syntax is fine, so the fault is in what the code does: an index past the end of an array, a read of an uninitialised value, a divide by zero, or a pointer that leads nowhere.",
    fix: null
  };

  function val(v, ctx) { return typeof v === "function" ? v(ctx) : v; }

  function explain(raw, code, opts) {
    opts = opts || {};
    var first = firstError(raw), text = first.text || "";
    var sig = normalise(raw);
    var names = quoted(text);
    var conv = /(?:from|convert)\s*[\u2018\u2019'"`]([^\u2018\u2019'"`]+)[\u2018\u2019'"`]\s*to\s*[\u2018\u2019'"`]([^\u2018\u2019'"`]+)[\u2018\u2019'"`]/.exec(text);

    var ctx = {
      raw: String(raw || ""), text: text, line: first.line, col: first.col,
      name: names[0] || "", names: names, types: conv ? [conv[1], conv[2]] : null,
      code: code || "",
      lineText: codeLine(code, first.line),
      prevText: codeLine(code, first.line ? first.line - 1 : 0)
    };

    if (!trim(ctx.raw) && opts.runtime) {
      return { matched: true, id: RUNTIME.id, headline: RUNTIME.headline, rule: RUNTIME.rule, diff: null, signature: "runtime:" + (opts.status || "error"), line: null, raw: "" };
    }

    for (var i = 0; i < BOOK.length; i++) {
      var e = BOOK[i];
      if (!e.test(text, ctx)) continue;
      var ln = first.line;
      if (e.lineShift && ln) {
        var shifted = ln + e.lineShift;
        if (trim(codeLine(code, shifted))) { ctx.lineText = codeLine(code, shifted); ln = shifted; }
      }
      var diff = null;
      try { diff = e.fix ? e.fix(ctx) : null; } catch (err) { diff = null; }
      return {
        matched: true, id: e.id,
        headline: val(e.headline, ctx), rule: val(e.rule, ctx),
        diff: diff, hint: val(e.hint, ctx) || null,
        signature: sig, line: ln, raw: ctx.raw
      };
    }

    return {
      matched: false, id: null,
      headline: "Not in the phrasebook yet.",
      rule: "This error shape has not been written up — the raw compiler text is below, and the shape is queued so it can be added.",
      diff: null, signature: sig, line: first.line, raw: ctx.raw
    };
  }

  root.CppErrorPhrasebook = {
    version: 1,
    entries: BOOK,
    runtime: RUNTIME,
    stdHeaders: STD,
    firstError: firstError,
    normalise: normalise,
    explain: explain
  };
})(typeof window !== "undefined" ? window : this);
