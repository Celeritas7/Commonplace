/* py-keys.js — Smart key palette for the Python practice editors (phase SK-1).
   Grammar-driven, not magic: reads the current line before the caret plus the
   indentation stack above it, and offers only what can logically come next.

   window.PY_KEYS = { build(ctx, ta), insert(ta, tok, replaceN), predict(before, full), indentFor(line) }
     predict() is pure (no DOM) → node lib/py-keys.test.js  or open lib/_harness.html
     build(ctx, ta) → palette element bound to textarea `ta`, or to ctx.getTarget()
       ctx: { lang, getTarget(), peekTarget(), accepts(el), fullText() }  (all optional)
   Never calls focus(). Load before practice-engine.js / compose-blocks.js; py-kb-fix.js stays last. */
(function (root) {
  "use strict";

  /* ---------------- vocabulary ---------------- */
  var KW_LIST = ["def","for","while","if","elif","else","in","return","import","from","as","not","and","or","class","try","except","finally","break","continue","pass","with","lambda","global","is","del","raise","yield","assert","True","False","None"];
  var KW = {}; KW_LIST.forEach(function (k) { KW[k] = 1; });
  var VAL_KW = { True: 1, False: 1, None: 1 };
  var POOL_KW = ["def","for","while","if","elif","else:","in","return","import","from","not","and","or","class","try:","except","finally:","break","continue","pass","True","False","None"];
  var ALL_KW = POOL_KW.concat(["as","is","with","lambda","global","raise","del"]);
  var BUILTINS = ["print","input","len","int","str","float","list","dict","range","sum","sorted","enumerate","min","max","abs","round","type","bool","set","tuple","zip","reversed","isinstance","open"];
  var BI = {}; BUILTINS.forEach(function (b) { BI[b] = 1; });
  var TYPES = { int: 1, str: 1, float: 1, list: 1, dict: 1, bool: 1, set: 1, tuple: 1 };
  var EXC = ["Exception","ValueError","ZeroDivisionError","TypeError","KeyError","IndexError"];
  var MOD_NAMES = ["math","random","sys","os","time"];
  var MODULES = {
    math: ["sqrt(","pi","floor(","ceil(","pow(","fabs("],
    random: ["randint(","choice(","random(","shuffle(","randrange("],
    sys: ["argv","exit("],
    os: ["getcwd(","listdir(","path"],
    time: ["sleep(","time("]
  };
  var METHODS = {
    list: ["append(","pop(","sort(","insert(","remove(","extend(","index(","count(","reverse(","copy(","clear("],
    str: ["upper(","lower(","split(","strip(","replace(","format(","join(","startswith(","endswith(","find(","count(","isdigit(","title("],
    dict: ["keys(","values(","items(","get(","pop(","update(","setdefault("]
  };
  var ANY_METHODS = ["append(","split(","upper(","lower(","strip(","keys(","items(","get(","pop(","replace("];
  var MEMBER = {};
  (function () {
    var k, i;
    for (k in METHODS) for (i = 0; i < METHODS[k].length; i++) MEMBER[bare(METHODS[k][i])] = 1;
    for (k in MODULES) for (i = 0; i < MODULES[k].length; i++) MEMBER[bare(MODULES[k][i])] = 1;
  })();
  var ARITH = ["+","-","*","/","//","%"], CMP = ["==","!=","<",">","<=",">="];
  var LITERALS = ['""',"[]","{}","True","False","None"];
  var VALUE_FNS = ["input(","int(","len(","range(","str("];
  var LOOP_NAMES = ["i","item","ch","n"], LOOP_NAMES2 = ["j","value","v","idx"];
  var PARAMS = ["name","n","x","items"];
  var HDR = { "if":1, "elif":1, "while":1, "for":1, "def":1, "class":1, "with":1, "except":1, "else":1 };
  var OPEN = { "(": ")", "[": "]", "{": "}" }, CLOSE = { ")": 1, "]": 1, "}": 1 };
  var ASSIGN = { "=":1, "+=":1, "-=":1, "*=":1, "/=":1, "//=":1, "%=":1, "**=":1 };
  var OPSET = { "==":1, "!=":1, "<":1, ">":1, "<=":1, ">=":1, "+":1, "-":1, "*":1, "/":1, "//":1, "%":1, "**":1, "->":1 };
  for (var a in ASSIGN) OPSET[a] = 1;
  var SYMS = ["(",")","[","]",":",","];
  var PAD = ["1","2","3","4","5","6","7","8","9","0","."];
  var ALL_SYMS = ["(",")","[","]","{","}",":",",",".",'""','f""',"=","==","!=","<",">","<=",">=","+","-","*","/","//","%","+=","-=","\\n"];

  /* ---------------- helpers ---------------- */
  function cat() { var o = []; for (var i = 0; i < arguments.length; i++) if (arguments[i]) o = o.concat(arguments[i]); return o; }
  function uniq(a) { var s = {}, o = []; for (var i = 0; i < a.length; i++) if (!s["$" + a[i]]) { s["$" + a[i]] = 1; o.push(a[i]); } return o; }
  function call(n) { return n + "("; }
  function bare(t) { return t.replace(/\($/, ""); }
  function longer(w) { return function (x) { return x.length > w.length && x.indexOf(w) === 0; }; }
  function indentOf(s) { return /^ */.exec(s)[0].length; }
  function firstWord(t) { var m = /^[A-Za-z_]\w*/.exec(t); return m ? m[0] : ""; }
  function isHeader(t) { return /:\s*(#.*)?$/.test(t); }
  function has(toks, v) { for (var i = 0; i < toks.length; i++) if (toks[i].v === v) return true; return false; }
  function res() { return { now: [], then: [], pad: false, hint: "", replace: 0 }; }

  /* ---------------- lexer ---------------- */
  var LEX = /\s*(f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*'|\d+(?:\.\d*)?|[A-Za-z_]\w*|\*\*=?|\/\/=?|->|[=!<>]=|[+\-*\/%]=|\S)/g;
  function tt(v) {
    var c = v.charAt(0), c1 = v.charAt(1), t;
    if (c === '"' || c === "'" || ((c === "f" || c === "F") && (c1 === '"' || c1 === "'"))) t = "str";
    else if (/\d/.test(c)) t = "num";
    else if (/[A-Za-z_]/.test(c)) t = VAL_KW[v] ? "val" : (KW[v] ? "kw" : "name");
    else if (OPEN[v]) t = "open";
    else if (CLOSE[v]) t = "close";
    else if (OPSET[v]) t = "op";
    else t = "punct";
    return { v: v, t: t };
  }
  function lex(s) {
    var out = [], m;
    LEX.lastIndex = 0;
    while ((m = LEX.exec(s)) !== null) out.push(tt(m[1]));
    return out;
  }
  function isVal(tk) { return tk.t === "str" || tk.t === "num" || tk.t === "name" || tk.t === "val" || tk.t === "close"; }
  function stackOf(toks) {
    var st = [];
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      if (tk.t === "open") { var p = toks[i - 1]; st.push({ ch: tk.v, fn: p && p.t === "name" ? p.v : "" }); }
      else if (tk.t === "close") st.pop();
    }
    return st;
  }
  function closersOf(st) { var o = []; for (var i = st.length - 1; i >= 0; i--) o.push(OPEN[st[i].ch]); return o; }
  function hasAssign(toks) {
    var d = 0;
    for (var i = 0; i < toks.length; i++) {
      if (toks[i].t === "open") d++; else if (toks[i].t === "close") d--;
      else if (d === 0 && ASSIGN[toks[i].v]) return true;
    }
    return false;
  }

  /* string / comment state of one line (indent already stripped) */
  function strState(s) {
    var q = null, f = false, brace = 0, bstart = -1, start = -1;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (q) {
        if (c === "\\") { i++; continue; }
        if (f && brace === 0 && c === "{") { if (s.charAt(i + 1) === "{") { i++; continue; } brace = 1; bstart = i + 1; continue; }
        if (f && brace > 0) { if (c === "{") brace++; else if (c === "}") brace--; continue; }
        if (c === q) { q = null; f = false; }
      } else {
        if (c === "#") return { comment: true };
        if (c === '"' || c === "'") {
          q = c; var p = s.charAt(i - 1);
          f = (p === "f" || p === "F") && !/\w/.test(s.charAt(i - 2) || "");
          start = f ? i - 1 : i;
        }
      }
    }
    return q ? { inStr: true, q: q, f: f, brace: brace > 0, braceText: brace > 0 ? s.slice(bstart) : "", start: start } : { inStr: false };
  }

  /* ---------------- scope ---------------- */
  function names(s) {
    return s.split(",").map(function (x) { return x.trim(); }).filter(function (x) { return /^[A-Za-z_]\w*$/.test(x) && !KW[x]; });
  }
  function splitParams(s) {
    return s.split(",").map(function (p) { return p.replace(/[:=].*$/, "").replace(/\*/g, "").trim(); })
      .filter(function (x) { return /^[A-Za-z_]\w*$/.test(x); });
  }
  function inferType(rhs) {
    rhs = rhs.trim();
    if (/^\[|^list\(|\.split\(|^sorted\(/.test(rhs)) return "list";
    if (/^f?["']|^input\(|^str\(|\.(upper|lower|strip|replace|join|format|title)\(/.test(rhs)) return "str";
    if (/^\{|^dict\(/.test(rhs)) return "dict";
    if (/^-?\d+\.\d|^float\(/.test(rhs)) return "float";
    if (/^-?\d+\s*$|^int\(|^len\(|^sum\(/.test(rhs)) return "int";
    if (/^(True|False)\s*$/.test(rhs)) return "bool";
    return "";
  }
  function collect(text) {
    var out = [];
    if (!text) return out;
    var L = text.split("\n");
    for (var i = 0; i < L.length; i++) {
      var line = L[i], m;
      if ((m = /^\s*def\s+([A-Za-z_]\w*)\s*\(([^)]*)/.exec(line))) { out.push({ n: m[1], k: "func", params: splitParams(m[2]) }); continue; }
      if ((m = /^\s*class\s+([A-Za-z_]\w*)/.exec(line))) { out.push({ n: m[1], k: "func" }); continue; }
      if ((m = /^\s*for\s+(.+?)\s+in\s+(.*)$/.exec(line))) {
        var rng = /^\s*range\(/.test(m[2]);
        names(m[1]).forEach(function (n) { out.push({ n: n, k: "var", ty: rng ? "int" : "" }); });
        continue;
      }
      if ((m = /^\s*import\s+(.+)$/.exec(line))) {
        m[1].split(",").forEach(function (p) {
          var q = p.trim().split(/\s+as\s+/), n = (q[1] || q[0]).trim();
          if (/^\w+$/.test(n)) out.push({ n: n, k: "mod", mod: q[0].trim() });
        });
        continue;
      }
      if ((m = /^\s*from\s+(\w+)\s+import\s+(.+)$/.exec(line))) {
        var mem = MODULES[m[1]] || [];
        names(m[2]).forEach(function (n) { out.push({ n: n, k: mem.indexOf(n + "(") >= 0 ? "func" : "var" }); });
        continue;
      }
      if ((m = /^\s*([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*(\+=|-=|\*=|\/=|%=|=)(?!=)\s*(.*)$/.exec(line))) {
        var ns = names(m[1]), ty = m[2] === "=" && ns.length === 1 ? inferType(m[3]) : "";
        ns.forEach(function (n) { out.push({ n: n, k: "var", ty: ty }); });
        continue;
      }
      if ((m = /\bas\s+([A-Za-z_]\w*)\s*:/.exec(line))) out.push({ n: m[1], k: "var" });
    }
    return out;
  }
  /* definitions above the caret (most recent first), then the rest of the file; the caret line is excluded */
  function scopeOf(before, full) {
    var lines = before.split("\n"), head = lines.slice(0, -1).join("\n"), tail = "";
    if (full.indexOf(before) === 0) { var a = full.slice(before.length), k = a.indexOf("\n"); tail = k < 0 ? "" : a.slice(k + 1); }
    else tail = full;
    var sc = { vars: [], funcs: [], mods: [], types: {}, modOf: {}, seen: {} };
    collect(head).reverse().concat(collect(tail)).forEach(function (d) {
      if (d.ty && sc.types[d.n] === undefined) sc.types[d.n] = d.ty;
      if (sc.seen[d.n]) return;
      sc.seen[d.n] = d.k;
      if (d.k === "func") sc.funcs.push(d.n);
      else if (d.k === "mod") { sc.mods.push(d.n); sc.modOf[d.n] = d.mod; }
      else sc.vars.push(d.n);
    });
    return sc;
  }
  /* enclosing block headers for a line at indent `ind` */
  function blockCtx(lines, ind) {
    var hs = [], min = ind;
    for (var i = lines.length - 2; i >= 0 && min > 0; i--) {
      var L = lines[i];
      if (!L.trim()) continue;
      var li = indentOf(L);
      if (li < min) { var t = L.trim(); if (isHeader(t)) hs.push({ kw: firstWord(t), line: t }); min = li; }
    }
    var c = { inDef: false, inLoop: false, inClass: !!(hs[0] && hs[0].kw === "class"), params: [] }, loopOpen = true;
    hs.forEach(function (h) {
      if (h.kw === "def") {
        if (!c.inDef) { c.inDef = true; var m = /^def\s+\w+\s*\(([^)]*)/.exec(h.line); c.params = m ? splitParams(m[1]) : []; }
        loopOpen = false;
      } else if (h.kw === "class") loopOpen = false;
      else if ((h.kw === "for" || h.kw === "while") && loopOpen) c.inLoop = true;
    });
    return c;
  }
  function varsFor(sc, bc) { return uniq(cat(bc.params, sc.vars)); }
  function typed(sc, t) { return sc.vars.filter(function (n) { return sc.types[n] === t; }); }
  function known(w, sc) { return !!(KW[w] || (sc.seen[w] && sc.seen[w] !== "func")); }
  function poolOf(sc, bc) { return cat(varsFor(sc, bc), sc.funcs.map(call), sc.mods, BUILTINS.map(call), POOL_KW); }

  /* ---------------- rules ---------------- */
  function stmtRule(lines, ind, sc, bc) {
    var r = res(), specials = [], pi = -1, bodyKw = "", i;
    for (i = lines.length - 2; i >= 0; i--) if (lines[i].trim()) { pi = i; break; }
    if (pi >= 0) {
      var P = lines[pi], pind = indentOf(P), pt = P.trim();
      if (isHeader(pt) && ind > pind) bodyKw = firstWord(pt);
      if (pind > ind) {
        for (i = pi; i >= 0; i--) {
          var L = lines[i];
          if (!L.trim()) continue;
          var li = indentOf(L);
          if (li > ind) continue;
          if (li === ind) {
            var t = L.trim(), kw = firstWord(t);
            if (isHeader(t)) {
              if (kw === "if" || kw === "elif") specials = ["else:", "elif"];
              else if (kw === "try") specials = ["except", "finally:"];
              else if (kw === "except") specials = ["except", "else:", "finally:"];
              else if (kw === "def" || kw === "class") { var dm = /^(?:def|class)\s+([A-Za-z_]\w*)/.exec(t); if (dm) specials = [dm[1] + "("]; }
            }
          }
          break;
        }
      }
    }
    var vs = varsFor(sc, bc), fs = sc.funcs.map(call), L2 = specials.slice();
    if (bodyKw === "def") L2.push("return");
    if (bodyKw === "class") L2.push("def");
    L2.push("print(");
    L2 = L2.concat(vs.slice(0, 3));
    if (!ind) L2.push("def");
    L2.push("for", "if", "while");
    if (bc.inDef) L2.push("return");
    if (bc.inLoop) L2.push("break", "continue");
    L2 = L2.concat(fs.slice(0, 3), vs.slice(3));
    if (bodyKw) L2.push("pass");
    if (!ind) L2.push("import", "class", "from");
    L2.push("try:");
    r.now = L2;
    return r;
  }

  function defRule(toks, st, bc) {
    var r = res(), n = toks.length, last = toks[n - 1];
    if (n === 1) { r.hint = "type a name ⌨"; r.only = true; r.then = [":"]; return r; }
    if (n === 2 && last.t === "name") { r.now = ["("]; r.then = [":"]; return r; }
    if (st.length) {
      var have = {}, inP = false;
      for (var i = 0; i < toks.length; i++) { if (toks[i].v === "(") inP = true; else if (inP && toks[i].t === "name") have[toks[i].v] = 1; }
      if (last.v === "(" || last.v === ",") {
        var p = (bc.inClass && last.v === "(") ? ["self"] : [];
        p = p.concat(PARAMS).filter(function (x) { return !have[x]; });
        if (last.v === "(") p.push(")");
        r.now = p; r.hint = "or type a param ⌨"; r.only = true; r.then = [":"];
      } else if (last.v === "=") { r.now = LITERALS.slice(); r.pad = true; r.then = [")", ":"]; }
      else { r.now = [")", ",", "="]; r.then = [":"]; }
      return r;
    }
    if (last.v === ")") { r.now = [":"]; r.then = ["↵"]; }
    return r;
  }

  function forRule(toks) {
    var r = res(), n = toks.length, last = toks[n - 1];
    if (n === 1 || last.v === ",") { r.now = (n === 1 ? LOOP_NAMES : LOOP_NAMES2).slice(); r.hint = "or type a name ⌨"; r.only = true; r.then = ["in"]; }
    else { r.now = ["in", ","]; r.then = [":"]; }
    return r;
  }

  function methodRule(tk, sc) {
    var r = res(); r.only = true;
    if (tk.t === "str") r.now = METHODS.str.slice();
    else if (tk.t === "name") {
      var mod = sc.modOf[tk.v] || (MODULES[tk.v] ? tk.v : "");
      if (mod && MODULES[mod]) r.now = MODULES[mod].slice();
      else r.now = (METHODS[sc.types[tk.v]] || ANY_METHODS).slice();
    } else r.now = ANY_METHODS.slice();
    return r;
  }

  function exprRule(toks, st, hdr, sc, bc, brace) {
    var r = res(), n = toks.length, last = toks[n - 1], first = toks[0];
    var top = st.length ? st[st.length - 1] : null, fn = top && top.ch === "(" ? top.fn : "";
    var cond = hdr === "if" || hdr === "elif" || hdr === "while";
    var vs = varsFor(sc, bc), fs = sc.funcs.map(call);
    r.then = closersOf(st);
    if (!brace) { if (HDR[hdr]) r.then.push(":"); else if (!st.length) r.then.push("↵"); }

    if (!isVal(last)) {
      r.pad = true;
      if (fn === "print") r.now = cat(vs.slice(0, 4), ['""', 'f""'], vs.slice(4), fs, ["len(", "str(", "input(", "True", "False"]);
      else if (fn === "range") r.now = cat(typed(sc, "int"), vs, ["len("], fs);
      else if (hdr === "for" && last.v === "in") r.now = cat(["range("], typed(sc, "list"), typed(sc, "str"), typed(sc, "dict"), ["enumerate("], vs, fs);
      else if (cond && last.v !== "not") r.now = cat(vs, ["not"], fs, ["len(", "True", "False", "None", '""', "input("]);
      else if (first.v === "return") r.now = cat(vs, fs, LITERALS, ["len(", "str(", "int("]);
      else r.now = cat(vs, fs, LITERALS, VALUE_FNS);
      return r;
    }
    /* a bare name (or subscript / call) at line start */
    if (!brace && first.t === "name" && !st.length && !hasAssign(toks)) {
      r.then = [];
      if (last.v === ")") r.now = ["↵", "."];
      else if (n === 1 && sc.seen[first.v] === "func") r.now = ["(", "=", ".", "["];
      else r.now = ["=", "+=", "-=", ".", "[", "("];
      return r;
    }
    if (hdr === "for" && !st.length) { r.now = [":", "."]; r.then = ["↵"]; return r; }
    if (fn === "print") r.now = [",", "+", "sep=", "end=", "*", "%"];
    else if (st.length) r.now = [","].concat(ARITH, CMP);
    else if (cond) r.now = CMP.concat(["and", "or", "in"], ARITH);
    else r.now = ARITH.concat(CMP, ["and", "or"]);
    var ty = last.t === "name" ? sc.types[last.v] : "";
    if (ty === "list" || ty === "str" || ty === "dict") r.now.push(".", "[");
    if (last.t === "num") r.pad = true;
    return r;
  }

  function lineRule(toks, sc, bc) {
    var r = res(), n = toks.length, first = toks[0].v, last = toks[n - 1], st = stackOf(toks);
    if (last.v === ":" && !st.length) { r.now = ["↵"]; return r; }
    if (first === "def") return defRule(toks, st, bc);
    if (first === "class") {
      if (n === 1) { r.hint = "type a name ⌨"; r.only = true; r.then = [":"]; }
      else if (last.v === ")") { r.now = [":"]; r.then = ["↵"]; }
      else if (st.length) { r.now = sc.funcs.slice(); r.only = true; r.then = [")", ":"]; }
      else { r.now = [":", "("]; r.then = ["↵"]; }
      return r;
    }
    if (first === "for" && !has(toks, "in")) return forRule(toks);
    if (first === "import") {
      if (last.v === "import" || last.v === ",") { r.now = MOD_NAMES.slice(); r.only = true; }
      else if (last.v === "as") { r.hint = "type a name ⌨"; r.only = true; }
      else r.now = [",", "as"];
      r.then = ["↵"];
      return r;
    }
    if (first === "from") {
      if (n === 1) { r.now = MOD_NAMES.slice(); r.only = true; r.then = ["import"]; }
      else if (n === 2) r.now = ["import"];
      else {
        if (last.v === "import" || last.v === ",") { r.now = (MODULES[toks[1].v] || []).map(bare).concat(["*"]); r.only = true; }
        else r.now = [","];
        r.then = ["↵"];
      }
      return r;
    }
    if (n === 1 && (first === "else" || first === "try" || first === "finally")) { r.now = [":"]; r.then = ["↵"]; return r; }
    if (first === "except") {
      if (n === 1) { r.now = EXC.concat([":"]); r.only = true; r.then = [":"]; return r; }
      if (last.v === "as") { r.now = ["e"]; r.only = true; r.then = [":"]; return r; }
      if (last.t === "name" && !st.length) { r.now = [":", "as"]; r.then = ["↵"]; return r; }
    }
    if (n === 1 && (first === "break" || first === "continue" || first === "pass")) { r.now = ["↵"]; return r; }
    if (last.v === "." && n >= 2) return methodRule(toks[n - 2], sc);
    return exprRule(toks, st, HDR[first] ? first : "", sc, bc, false);
  }

  function _p(before, full) {
    var lines = before.split("\n"), cur = lines[lines.length - 1];
    var ind = indentOf(cur), text = cur.slice(ind);
    var sc = scopeOf(before, full), bc = blockCtx(lines, ind);
    var st = strState(text), r;
    if (st.comment) { r = res(); r.hint = "comment"; return r; }
    if (st.inStr && !st.brace) {
      r = res();
      r.now = [st.q]; if (st.f) r.now.push("{}"); r.now.push("\\n", "␣");
      var pre = lex(text.slice(0, st.start));
      r.then = closersOf(stackOf(pre));
      if (pre.length && HDR[pre[0].v]) r.then.push(":");
      return r;
    }
    /* half-typed word → completions that replace it */
    var m = /[A-Za-z_]\w*$/.exec(text);
    if (m && !/\d/.test(text.charAt(m.index - 1) || "")) {
      var w = m[0], base = _p(before.slice(0, before.length - w.length), full);
      if (base.now.indexOf(w) < 0 && !known(w, sc)) {
        var c = base.now.filter(longer(w));
        if (!base.only) c = c.concat(poolOf(sc, bc).filter(longer(w)));
        c = uniq(c);
        if (c.length) { r = res(); r.now = c.slice(0, 12); r.then = base.then; r.replace = w.length; return r; }
      }
    }
    if (st.inStr && st.brace) {
      var bt = [{ v: "{", t: "open" }].concat(lex(st.braceText));
      return exprRule(bt, stackOf(bt), "", sc, bc, true);
    }
    var toks = lex(text);
    return toks.length ? lineRule(toks, sc, bc) : stmtRule(lines, ind, sc, bc);
  }

  function predict(before, full) {
    before = before == null ? "" : String(before);
    full = full == null ? before : String(full);
    var r = _p(before, full);
    return { now: uniq(r.now), then: uniq(r.then), pad: !!r.pad, hint: r.hint || "", replace: r.replace || 0 };
  }

  function indentFor(line) {
    var i = indentOf(line), t = line.trim();
    if (!t) return i;
    if (isHeader(t)) return i + 4;
    if (/^(return|break|continue|pass|raise)\b/.test(t)) return Math.max(0, i - 4);
    return i;
  }

  /* ---------------- insertion ---------------- */
  var NO_LEAD = { "": 1, " ": 1, "(": 1, "[": 1, "{": 1, ".": 1 };
  var NO_TRAIL = { "pass": 1, "break": 1, "continue": 1 };
  function lsOf(v, s) { return s ? v.lastIndexOf("\n", s - 1) + 1 : 0; }
  function spaces(n) { var s = ""; while (n-- > 0) s += " "; return s; }
  function fire(ta) {
    var ev;
    try { ev = new Event("input", { bubbles: true }); }
    catch (e) { ev = document.createEvent("Event"); ev.initEvent("input", true, false); }
    ta.dispatchEvent(ev);
  }
  function setVal(ta, v, p) {
    ta.value = v;
    try { ta.setSelectionRange(p, p); } catch (e) {}
    fire(ta);
  }

  function insert(ta, tok, replaceN) {
    if (!ta || !tok) return;
    if (tok === "↵") return newline(ta);
    if (tok === "⌫") return backspace(ta);
    if (tok === "⇥") return shift(ta, 1);
    if (tok === "⇤") return shift(ta, -1);
    var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    if (replaceN && s === e) s = Math.max(lsOf(v, s), s - replaceN);
    var before = v.slice(0, s), after = v.slice(e);
    var code = before.slice(lsOf(v, s)).replace(/^ +/, "");
    var ss = strState(code), raw = ss.inStr && !ss.brace;
    var prev = code.length ? code.charAt(code.length - 1) : "";
    var text = tok, back = 0, mode, lead = "", trail = "";
    if (tok === "␣") { text = " "; mode = "raw"; }
    else if (tok === "\\n" || tok === ".") mode = "raw";
    else if (tok === '""' || tok === "''" || tok === 'f""') { back = 1; mode = "id"; }
    else if (tok === "[]" || tok === "{}" || tok === "()") { back = 1; mode = "open"; }
    else if (OPEN[tok]) { text = tok + OPEN[tok]; back = 1; mode = "open"; }
    else if (/^[A-Za-z_]\w*\($/.test(tok)) { text = tok + ")"; back = 1; mode = "id"; }
    else if (CLOSE[tok] || tok === ":" || tok === ",") mode = "close";
    else if (tok === '"' || tok === "'") mode = "quote";
    else if (OPSET[tok] || tok === "and" || tok === "or" || tok === "in" || tok === "is") mode = "op";
    else if (KW[tok.replace(/:$/, "")] && !VAL_KW[tok]) mode = "kw";
    else if (/^\d$/.test(tok)) mode = "num";
    else mode = "id";
    if (raw && mode !== "quote") mode = "raw";

    if (mode === "close") {
      before = before.replace(/([^ \n]) +$/, "$1");
      if (CLOSE[tok] && after.charAt(0) === tok) return setVal(ta, before + after, before.length + 1);
      if (tok === ",") trail = " ";
    } else if (mode === "quote") {
      if (after.charAt(0) === tok) return setVal(ta, before + after, before.length + 1);
    } else if (mode === "op") {
      if (prev !== "" && prev !== " ") lead = " ";
      trail = " ";
    } else if (mode === "kw") {
      if (prev !== "" && prev !== " " && prev !== "(" && prev !== "[") lead = " ";
      if (!/:$/.test(tok) && !NO_TRAIL[tok]) trail = " ";
    } else if (mode === "id") {
      if (!NO_LEAD[prev]) lead = " ";
    } else if (mode === "num") {
      if (!NO_LEAD[prev] && !/[\d.]/.test(prev)) lead = " ";
    } else if (mode === "open") {
      if (!NO_LEAD[prev] && !/[\w)\]"']/.test(prev)) lead = " ";
    }
    if (trail && after.charAt(0) === " ") trail = "";
    var ins = lead + text + trail;
    setVal(ta, before + ins + after, before.length + ins.length - back);
  }

  function newline(ta) {
    var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    var before = v.slice(0, s), after = v.slice(e).replace(/^ +/, ""), ls = lsOf(v, s);
    if (before.slice(ls).trim()) before = before.replace(/ +$/, "");
    var ins = "\n" + spaces(indentFor(before.slice(ls)));
    setVal(ta, before + ins + after, before.length + ins.length);
  }

  function backspace(ta) {
    var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    if (s !== e) return setVal(ta, v.slice(0, s) + v.slice(e), s);
    if (!s) return;
    var before = v.slice(0, s), after = v.slice(s), ls = lsOf(v, s), cur = before.slice(ls), k, m, pairGone = false;
    if (cur === "") k = 1;
    else if (/^ +$/.test(cur)) k = (cur.length % 4) || 4;
    else {
      var t = before.replace(/ +$/, ""), sp = before.length - t.length;
      if ((m = /[A-Za-z_]\w*\($/.exec(t))) k = m[0].length;
      else if ((m = /(?:[A-Za-z_]\w*|\d+(?:\.\d*)?)$/.exec(t))) k = m[0].length;
      else if ((m = /(?:\/\/|\*\*|[=!<>+\-*\/%])=?$/.exec(t))) k = m[0].length;
      else if (/\\n$/.test(t)) k = 2;
      else k = 1;
      var lastCh = t.charAt(t.length - 1);
      if (!sp && ((OPEN[lastCh] && after.charAt(0) === OPEN[lastCh]) || ((lastCh === '"' || lastCh === "'") && after.charAt(0) === lastCh))) pairGone = true;
      k += sp;
    }
    setVal(ta, before.slice(0, s - k) + (pairGone ? after.slice(1) : after), s - k);
  }

  function shift(ta, dir) {
    var v = ta.value, s = ta.selectionStart, ls = lsOf(v, s);
    if (dir > 0) return setVal(ta, v.slice(0, ls) + "    " + v.slice(ls), s + 4);
    var m = /^ {1,4}/.exec(v.slice(ls));
    if (!m) return;
    setVal(ta, v.slice(0, ls) + v.slice(ls + m[0].length), Math.max(ls, s - m[0].length));
  }

  /* ---------------- palette UI ---------------- */
  function kindOf(t) {
    if (t === "↵") return "enter";
    var b = t.replace(/:$/, "");
    if (KW[b]) return "kw";
    if (/^[A-Za-z_]\w*\($/.test(t)) { var n = bare(t); if (TYPES[n]) return "type"; if (BI[n] || MEMBER[n]) return "fn"; return "id"; }
    if (/^[A-Za-z_]\w*$/.test(t)) {
      if (/Error$|^Exception$/.test(t)) return "type";
      if (MODULES[t] || MEMBER[t]) return "fn";
      return "id";
    }
    if (t === "sep=" || t === "end=") return "fn";
    return "sym";
  }
  function labelOf(t) {
    if (t === '""') return '" "';
    if (t === "''") return "' '";
    if (t === 'f""') return 'f" "';
    if (t === '"' || t === "'") return "close " + t;
    return t;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function raf(f) { return root.requestAnimationFrame ? root.requestAnimationFrame.call(root, f) : setTimeout(f, 16); }

  var CSS =
".zk{background:#fbfcf6;border:1px solid #d2dacb;border-radius:12px;box-shadow:0 10px 22px -16px rgba(20,40,30,.5);padding:8px 0;box-sizing:border-box;height:196px;display:flex;flex-direction:column;gap:2px;overflow:hidden;font-family:'JetBrains Mono',ui-monospace,monospace;color:#1a2820;-webkit-user-select:none;user-select:none;touch-action:manipulation}" +
".zk *{box-sizing:border-box}" +
".zk-head{display:flex;align-items:center;gap:8px;height:32px;flex:0 0 32px;padding:0 10px 2px 12px}" +
".zk-kick{font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(26,40,32,.55);white-space:nowrap}" +
".zk-sp{flex:1}" +
".zk-seg{display:flex;border:1px solid #d2dacb;border-radius:8px;overflow:hidden;background:#f4f5ec}" +
".zk-seg button,.zk-btn{font:600 11px 'JetBrains Mono',ui-monospace,monospace;border:0;background:none;padding:0 11px;height:30px;color:rgba(26,40,32,.65);cursor:pointer;-webkit-tap-highlight-color:transparent}" +
".zk-seg button.on{background:#234f3b;color:#eaf2ea}" +
".zk-btn{border:1px solid #d2dacb;border-radius:8px;background:#f4f5ec;color:#1a2820}" +
".zk-lane{display:flex;align-items:center;height:44px;flex:0 0 44px;min-width:0}" +
".zk-lab{flex:0 0 50px;padding-left:12px;font-size:9px;font-weight:700;letter-spacing:1.5px;color:rgba(26,40,32,.45)}" +
".zk-row{display:flex;align-items:center;gap:6px;flex:1;min-width:0;height:44px;overflow-x:auto;overflow-y:hidden;padding-right:12px;scrollbar-width:none;-webkit-overflow-scrolling:touch}" +
".zk-row::-webkit-scrollbar{display:none}" +
".zk-bar{margin-top:4px;border-top:1px dashed rgba(26,40,32,.2);padding-top:2px;height:48px;flex-basis:48px}" +
".zk-fixed{display:flex;gap:4px;padding-left:8px;flex:0 0 auto}" +
".zk-div{flex:0 0 1px;height:26px;background:rgba(26,40,32,.18);margin:0 6px}" +
".zk-k{flex:0 0 auto;height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;padding:0;border:0;background:none;cursor:pointer;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}" +
".zk-k>span{display:flex;align-items:center;justify-content:center;height:38px;padding:0 12px;border:1px solid;border-radius:8px;font-size:14px;font-weight:600;white-space:pre;box-shadow:0 1px 0 rgba(20,40,30,.14)}" +
".zk-k:active>span{transform:translateY(1px);box-shadow:none}" +
".zk-kw>span{background:#e6e2f0;border-color:#cdc6e0;color:#3b3160}" +
".zk-fn>span{background:#dde7dd;border-color:#bccdbf;color:#234f3b}" +
".zk-sym>span{background:#f3ecd8;border-color:#e0d4b4;color:#1a2820;min-width:38px;padding:0 8px;border-radius:6px}" +
".zk-id>span{background:#fbfcf6;border-color:#2f6b4f;color:#16352a;border-radius:19px;padding:0 14px}" +
".zk-type>span{background:#dcebe7;border-color:#b2d2ca;color:#1f5c52;border-radius:4px}" +
".zk-ctl>span{background:#f4f5ec;border-color:#d2dacb;color:#1a2820;min-width:40px;padding:0 8px;border-radius:6px;font-size:16px}" +
".zk-enter>span{background:#234f3b;border-color:#16352a;color:#eaf2ea;min-width:40px;padding:0 10px;border-radius:6px;font-size:16px}" +
".zk-top>span{box-shadow:0 0 0 1px currentColor inset,0 1px 0 rgba(20,40,30,.14)}" +
".zk-dash{color:rgba(26,40,32,.3);font-size:14px;padding-left:4px}" +
".zk-hint{font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:15px;color:rgba(26,40,32,.6);white-space:nowrap;padding:0 4px 0 2px}" +
".zk.zk-off{height:auto;flex-direction:row;align-items:center;justify-content:space-between;padding:6px 8px 6px 12px}";
  function injectCss() {
    if (document.getElementById("zk-css")) return;
    var st = document.createElement("style"); st.id = "zk-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function build(ctx, ta) {
    ctx = ctx || {};
    injectCss();
    var lang = ctx.lang || "py", MK = "zk-mode-" + lang, HK = "zk-hide-" + lang;
    var mode = lsGet(MK) === "all" ? "all" : "smart", hidden = lsGet(HK) === "1";
    var el = document.createElement("div");
    el.className = "zk"; el.setAttribute("data-keypal", lang);
    var cur = res(), queued = false, sig = "";

    function tgt() { return ctx.getTarget ? ctx.getTarget() : ta; }
    function peek() { return ctx.peekTarget ? ctx.peekTarget() : tgt(); }
    function accepts(x) { return ctx.accepts ? ctx.accepts(x) : x === ta; }
    function fullOf(t) { return ctx.fullText ? ctx.fullText() : (t ? t.value : ""); }

    function compute() {
      var t = peek();
      if (!t) { cur = predict("", fullOf(null)); return; }
      var v = t.value, s = t.selectionStart == null ? v.length : t.selectionStart;
      cur = predict(v.slice(0, s), fullOf(t));
    }
    function keys(list, src, top) {
      var h = "";
      for (var i = 0; i < list.length; i++) {
        var t = list[i];
        h += '<button type="button" class="zk-k zk-' + kindOf(t) + (top && i === 0 ? " zk-top" : "") + '" data-tok="' + esc(t) + '" data-src="' + src + '"><span>' + esc(labelOf(t)) + "</span></button>";
      }
      return h;
    }
    function lane(label, inner, empty) {
      return '<div class="zk-lane"><span class="zk-lab">' + label + '</span><div class="zk-row">' + inner + (empty ? '<span class="zk-dash">—</span>' : "") + "</div></div>";
    }
    function ctl(t) {
      return '<button type="button" class="zk-k ' + (t === "↵" ? "zk-enter" : "zk-ctl") + '" data-tok="' + t + '" data-src="bar"><span>' + t + "</span></button>";
    }
    function bar(syms) {
      return '<div class="zk-lane zk-bar"><div class="zk-fixed">' + ctl("⌫") + ctl("↵") + ctl("⇥") + ctl("⇤") + '</div><span class="zk-div"></span><div class="zk-row">' + keys(syms, "bar") + "</div></div>";
    }
    function allFuncs() {
      var t = peek(), v = t ? t.value : "", sc = scopeOf(v + "\n", fullOf(t) + "\n");
      return uniq(cat(sc.vars, sc.funcs.map(call), BUILTINS.map(call)));
    }
    function paint(force) {
      var s = hidden ? "h" : mode + JSON.stringify(cur) + (mode === "all" ? allFuncs().join() : "");
      if (!force && s === sig) return;
      sig = s;
      if (hidden) {
        el.className = "zk zk-off";
        el.innerHTML = '<span class="zk-kick">KEYS HIDDEN</span><button type="button" class="zk-btn" data-act="show">Show keys ⌄</button>';
        return;
      }
      el.className = "zk";
      var h = '<div class="zk-head"><span class="zk-kick">KEY PALETTE</span><span class="zk-sp"></span><div class="zk-seg">' +
        '<button type="button" data-act="smart" class="' + (mode === "smart" ? "on" : "") + '">Smart</button>' +
        '<button type="button" data-act="all" class="' + (mode === "all" ? "on" : "") + '">All</button></div>' +
        '<button type="button" class="zk-btn" data-act="hide">Hide</button></div>';
      if (mode === "smart") {
        h += lane("NEXT", (cur.hint ? '<span class="zk-hint">' + esc(cur.hint) + "</span>" : "") + keys(cur.now, "now", true), !cur.now.length && !cur.hint);
        h += lane("THEN", keys(cur.then, "then"), !cur.then.length);
        h += bar(cur.pad ? PAD : SYMS);
      } else {
        h += lane("KEYS", keys(ALL_KW, "all"));
        h += lane("FUNCS", keys(allFuncs(), "all"));
        h += bar(ALL_SYMS.concat(PAD));
      }
      el.innerHTML = h;
    }
    function schedule() {
      if (queued) return;
      queued = true;
      try { raf(function () { queued = false; compute(); paint(); }); }
      catch (e) { queued = false; compute(); paint(); }
    }

    function hold(e) { if (e.target.closest && e.target.closest("button")) e.preventDefault(); }
    el.addEventListener("pointerdown", hold);
    el.addEventListener("mousedown", hold);
    el.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b || !el.contains(b)) return;
      var act = b.getAttribute("data-act");
      if (act) {
        if (act === "hide" || act === "show") { hidden = act === "hide"; lsSet(HK, hidden ? "1" : "0"); }
        else { mode = act; lsSet(MK, mode); }
        compute(); paint(true);
        return;
      }
      var tok = b.getAttribute("data-tok"), t = tgt();
      if (!tok || !t) return;
      insert(t, tok, b.getAttribute("data-src") === "now" ? cur.replace : 0);
      schedule();
    });

    function onEv(e) { if (e.target && accepts(e.target)) schedule(); }
    ["input", "click", "keyup", "select", "focusin"].forEach(function (n) { document.addEventListener(n, onEv, true); });
    document.addEventListener("selectionchange", function () { var a = document.activeElement; if (a && accepts(a)) schedule(); });

    el.refresh = schedule;
    compute(); paint(true);
    return el;
  }

  var API = { build: build, insert: insert, predict: predict, indentFor: indentFor };
  root.PY_KEYS = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
