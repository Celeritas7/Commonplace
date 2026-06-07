/* vba-playground.js
   A self-contained, beginner-friendly Visual Basic Editor simulation.
   - Edit/choose a macro, then Run (F5) or Step (F8).
   - A small VBA interpreter executes a curated subset against a live Excel grid.
   - Supports: Sub, Dim, Range("A1")/Cells(r,c) reads & writes, .Value,
     .Interior.Color, .Font.Bold, .Font.Color, For..Next, If/Else/End If,
     MsgBox, Debug.Print, arithmetic, Mod, &, comparisons, RGB(), vb* colors.
   Execution is compiled to an ordered list of "effects", then played back
   (animated for Run, one statement per click for Step) — so loops are bounded
   and stepping is trivial. */
(function () {
  "use strict";

  /* ----------------------------- presets ----------------------------- */
  var PRESETS = [
    { name: "1 · Hello, worksheet", code:
`Sub HelloGrid()
    ' Write straight into cells — the heart of every macro
    Range("A1").Value = "Item"
    Range("B1").Value = "Qty"
    Range("A2").Value = "Pens"
    Range("B2").Value = 12
    Range("A3").Value = "Notebooks"
    Range("B3").Value = 5
    Range("A1").Font.Bold = True
    Range("B1").Font.Bold = True
    MsgBox "Data written. Welcome to VBA!"
End Sub` },
    { name: "2 · A For loop", code:
`Sub NumberRows()
    Dim i As Integer
    Cells(1, 1).Value = "n"
    Cells(1, 2).Value = "n squared"
    Cells(1, 1).Font.Bold = True
    Cells(1, 2).Font.Bold = True
    For i = 1 To 8
        Cells(i + 1, 1).Value = i
        Cells(i + 1, 2).Value = i * i
    Next i
End Sub` },
    { name: "3 · If / Else — colour the evens", code:
`Sub HighlightEvens()
    Dim i As Integer
    For i = 1 To 10
        Cells(i, 1).Value = i
        If i Mod 2 = 0 Then
            Cells(i, 1).Interior.Color = vbGreen
        Else
            Cells(i, 1).Interior.Color = vbYellow
        End If
    Next i
End Sub` },
    { name: "4 · Sum a column", code:
`Sub SumColumn()
    Dim i As Integer
    Dim total As Double
    total = 0
    For i = 1 To 5
        Cells(i, 1).Value = i * 10
        total = total + Cells(i, 1).Value
    Next i
    Cells(6, 1).Value = total
    Cells(6, 1).Font.Bold = True
    Cells(6, 1).Interior.Color = RGB(255, 235, 156)
    Debug.Print "The total is " & total
End Sub` }
  ];

  var COLORS = {
    vbblack: "#000000", vbwhite: "#ffffff", vbred: "#ff5555", vbgreen: "#9fe0a0",
    vbyellow: "#ffe680", vbblue: "#7db3ff", vbcyan: "#9fe6e6", vbmagenta: "#e6a0e6"
  };

  var ROWS = 12, COLS = 6; // A–F, 1–12

  /* --------------------------- small helpers --------------------------- */
  function colLetter(n) { return String.fromCharCode(64 + n); }
  function colIndex(L) { return L.toUpperCase().charCodeAt(0) - 64; }
  function isColor(v) { return v && typeof v === "object" && "color" in v; }
  function toNum(v) {
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (isColor(v)) return 0;
    var n = parseFloat(v); return isNaN(n) ? 0 : n;
  }
  function toStr(v) {
    if (typeof v === "boolean") return v ? "True" : "False";
    if (isColor(v)) return "";
    if (typeof v === "number") return String(v);
    return v == null ? "" : String(v);
  }
  function toBool(v) {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v !== "";
    return false;
  }
  function toHex(v) { return isColor(v) ? v.color : (typeof v === "string" && v[0] === "#" ? v : "#ffffff"); }

  /* ------------------------- comment stripping ------------------------- */
  function stripComment(line) {
    var inStr = false, out = "";
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') inStr = !inStr;
      if (c === "'" && !inStr) break;
      out += c;
    }
    return out.replace(/\s+$/, "");
  }

  /* ----------------------- expression tokenizer ------------------------ */
  function tokenize(s) {
    var t = [], i = 0, n = s.length;
    var two = ["<=", ">=", "<>"];
    while (i < n) {
      var c = s[i];
      if (c === " " || c === "\t") { i++; continue; }
      if (c === '"') {
        var j = i + 1, str = "";
        while (j < n && s[j] !== '"') { str += s[j]; j++; }
        t.push({ k: "str", v: str }); i = j + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] || ""))) {
        var num = ""; while (i < n && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
        t.push({ k: "num", v: parseFloat(num) }); continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var id = ""; while (i < n && /[A-Za-z0-9_]/.test(s[i])) { id += s[i]; i++; }
        t.push({ k: "id", v: id }); continue;
      }
      var pair = s.substr(i, 2);
      if (two.indexOf(pair) >= 0) { t.push({ k: "op", v: pair }); i += 2; continue; }
      if ("+-*/&=<>".indexOf(c) >= 0) { t.push({ k: "op", v: c }); i++; continue; }
      if (c === "(") { t.push({ k: "lp" }); i++; continue; }
      if (c === ")") { t.push({ k: "rp" }); i++; continue; }
      if (c === ",") { t.push({ k: "cm" }); i++; continue; }
      if (c === ".") { t.push({ k: "dot" }); i++; continue; }
      throw new Error("Unexpected character '" + c + "'");
    }
    return t;
  }

  /* ------------------------- expression parser ------------------------- */
  var LEVEL = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "mod": 4, "*": 5, "/": 5 };

  function Parser(tokens) { this.t = tokens; this.i = 0; }
  Parser.prototype.peek = function () { return this.t[this.i]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.expect = function (k) {
    var tok = this.next();
    if (!tok || tok.k !== k) throw new Error("Expected " + k);
    return tok;
  };
  Parser.prototype.opLevel = function () {
    var tok = this.peek();
    if (!tok) return null;
    if (tok.k === "op" && LEVEL[tok.v] != null) return { op: tok.v, lv: LEVEL[tok.v] };
    if (tok.k === "id" && tok.v.toLowerCase() === "mod") return { op: "mod", lv: LEVEL.mod };
    return null;
  };
  Parser.prototype.parse = function () { var e = this.parseBin(1); return e; };
  Parser.prototype.parseBin = function (min) {
    var left = this.parseUnary();
    while (true) {
      var o = this.opLevel();
      if (!o || o.lv < min) break;
      this.next();
      var right = this.parseBin(o.lv + 1);
      left = { k: "bin", op: o.op, l: left, r: right };
    }
    return left;
  };
  Parser.prototype.parseUnary = function () {
    var tok = this.peek();
    if (tok && tok.k === "op" && tok.v === "-") { this.next(); return { k: "neg", e: this.parseUnary() }; }
    return this.parsePrimary();
  };
  Parser.prototype.parseArgs = function () {
    var args = []; this.expect("lp");
    if (this.peek() && this.peek().k === "rp") { this.next(); return args; }
    args.push(this.parseBin(1));
    while (this.peek() && this.peek().k === "cm") { this.next(); args.push(this.parseBin(1)); }
    this.expect("rp"); return args;
  };
  Parser.prototype.skipMembers = function () {
    while (this.peek() && this.peek().k === "dot") { this.next(); this.expect("id"); }
  };
  Parser.prototype.parsePrimary = function () {
    var tok = this.next();
    if (!tok) throw new Error("Unexpected end of expression");
    if (tok.k === "num") return { k: "num", v: tok.v };
    if (tok.k === "str") return { k: "str", v: tok.v };
    if (tok.k === "lp") { var e = this.parseBin(1); this.expect("rp"); return e; }
    if (tok.k === "id") {
      var name = tok.v, lower = name.toLowerCase();
      if (COLORS[lower]) return { k: "color", hex: COLORS[lower] };
      if (lower === "true") return { k: "bool", v: true };
      if (lower === "false") return { k: "bool", v: false };
      if (this.peek() && this.peek().k === "lp") {
        var args = this.parseArgs();
        if (lower === "cells") { this.skipMembers(); return { k: "cellsRef", r: args[0], c: args[1] }; }
        if (lower === "range") { this.skipMembers(); return { k: "rangeRef", addr: args[0] }; }
        if (lower === "rgb") return { k: "rgb", a: args[0], b: args[1], c: args[2] };
        if (lower === "ucase") return { k: "fn", fn: "ucase", a: args[0] };
        if (lower === "lcase") return { k: "fn", fn: "lcase", a: args[0] };
        throw new Error("Unknown function '" + name + "'");
      }
      return { k: "var", name: name };
    }
    throw new Error("Unexpected token in expression");
  };

  function parseExpr(str) { return new Parser(tokenize(str)).parse(); }

  /* ----------------------------- evaluator ----------------------------- */
  function evalNode(node, ctx) {
    switch (node.k) {
      case "num": return node.v;
      case "str": return node.v;
      case "bool": return node.v;
      case "color": return { color: node.hex };
      case "neg": return -toNum(evalNode(node.e, ctx));
      case "var": return ctx.env.hasOwnProperty(node.name.toLowerCase()) ? ctx.env[node.name.toLowerCase()] : 0;
      case "rgb": {
        var r = toNum(evalNode(node.a, ctx)), g = toNum(evalNode(node.b, ctx)), b = toNum(evalNode(node.c, ctx));
        var hx = function (x) { x = Math.max(0, Math.min(255, Math.round(x))).toString(16); return x.length < 2 ? "0" + x : x; };
        return { color: "#" + hx(r) + hx(g) + hx(b) };
      }
      case "fn": {
        var v = toStr(evalNode(node.a, ctx));
        return node.fn === "ucase" ? v.toUpperCase() : v.toLowerCase();
      }
      case "cellsRef": return ctx.read(colLetter(toNum(evalNode(node.c, ctx))) + toNum(evalNode(node.r, ctx)));
      case "rangeRef": return ctx.read(String(evalNode(node.addr, ctx)).toUpperCase());
      case "bin": {
        var l = evalNode(node.l, ctx), r = evalNode(node.r, ctx), op = node.op;
        if (op === "&") return toStr(l) + toStr(r);
        if (op === "+") {
          if (typeof l === "string" || typeof r === "string") return toStr(l) + toStr(r);
          return toNum(l) + toNum(r);
        }
        if (op === "-") return toNum(l) - toNum(r);
        if (op === "*") return toNum(l) * toNum(r);
        if (op === "/") return toNum(l) / toNum(r);
        if (op === "mod") return toNum(l) % toNum(r);
        // comparisons
        var a = l, b = r, cmp;
        if (typeof a === "string" || typeof b === "string") { a = toStr(a); b = toStr(b); cmp = a < b ? -1 : a > b ? 1 : 0; }
        else { a = toNum(a); b = toNum(b); cmp = a < b ? -1 : a > b ? 1 : 0; }
        switch (op) {
          case "=": return cmp === 0;
          case "<>": return cmp !== 0;
          case "<": return cmp < 0;
          case ">": return cmp > 0;
          case "<=": return cmp <= 0;
          case ">=": return cmp >= 0;
        }
      }
    }
    throw new Error("Cannot evaluate expression");
  }

  /* ------------------------- statement parser -------------------------- */
  var STOP = /^(next|else|elseif|end\s+if|end\s+sub|end\s+function|wend|loop)\b/i;

  function parseRef(str) {
    var m = /^Range\s*\(\s*(.+)\s*\)$/i.exec(str);
    if (m) return { type: "range", addr: parseExpr(m[1]) };
    m = /^Cells\s*\(([\s\S]*)\)$/i.exec(str);
    if (m) { var parts = splitArgs(m[1]); return { type: "cells", r: parseExpr(parts[0]), c: parseExpr(parts[1]) }; }
    throw new Error("Unrecognised cell reference: " + str);
  }
  function splitArgs(s) {
    var out = [], depth = 0, cur = "", inStr = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '"') inStr = !inStr;
      if (!inStr && c === "(") depth++;
      if (!inStr && c === ")") depth--;
      if (!inStr && c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur); return out;
  }

  // Parse a block of statements. `lines` are {ln, text}. Returns {nodes, i, stop}.
  function parseBlock(lines, i) {
    var nodes = [];
    while (i < lines.length) {
      var L = lines[i], text = L.text;
      if (STOP.test(text)) return { nodes: nodes, i: i, stop: text };
      // For loop
      var m = /^For\s+(\w+)\s*=\s*(.+?)\s+To\s+(.+?)(?:\s+Step\s+(.+))?$/i.exec(text);
      if (m) {
        var inner = parseBlock(lines, i + 1);
        nodes.push({ k: "for", ln: L.ln, v: m[1], from: parseExpr(m[2]), to: parseExpr(m[3]),
          step: m[4] ? parseExpr(m[4]) : null, body: inner.nodes, lnNext: lines[inner.i] ? lines[inner.i].ln : L.ln });
        i = inner.i + 1; continue;
      }
      // single-line If
      m = /^If\s+(.+?)\s+Then\s+(.+)$/i.exec(text);
      if (m) {
        var single = parseBlock([{ ln: L.ln, text: m[2] }], 0);
        nodes.push({ k: "if", ln: L.ln, cond: parseExpr(m[1]), then: single.nodes, els: [] });
        i++; continue;
      }
      // block If
      m = /^If\s+(.+?)\s+Then$/i.exec(text);
      if (m) {
        var thenB = parseBlock(lines, i + 1), elsB = { nodes: [] }, j = thenB.i;
        if (thenB.stop && /^else/i.test(thenB.stop)) { elsB = parseBlock(lines, thenB.i + 1); j = elsB.i; }
        nodes.push({ k: "if", ln: L.ln, cond: parseExpr(m[1]), then: thenB.nodes, els: elsB.nodes });
        i = j + 1; continue;
      }
      if (/^Dim\b/i.test(text)) { i++; continue; }
      m = /^MsgBox\s+(.+)$/i.exec(text);
      if (m) { nodes.push({ k: "msgbox", ln: L.ln, e: parseExpr(m[1]) }); i++; continue; }
      m = /^Debug\.Print\s+(.+)$/i.exec(text);
      if (m) { nodes.push({ k: "print", ln: L.ln, e: parseExpr(m[1]) }); i++; continue; }
      // cell assignment
      m = /^((?:Range\s*\(\s*.+?\s*\))|(?:Cells\s*\([^)]*\)))((?:\.\w+)*)\s*=\s*(.+)$/i.exec(text);
      if (m) {
        nodes.push({ k: "setCell", ln: L.ln, ref: parseRef(m[1]), path: (m[2] || "").toLowerCase(), e: parseExpr(m[3]) });
        i++; continue;
      }
      // variable assignment
      m = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(text);
      if (m) { nodes.push({ k: "setVar", ln: L.ln, name: m[1], e: parseExpr(m[2]) }); i++; continue; }
      throw new Error("Line " + (L.ln + 1) + ": can't understand “" + text + "”");
    }
    return { nodes: nodes, i: i, stop: null };
  }

  function parseProgram(src) {
    var raw = src.split("\n");
    var lines = [];
    for (var k = 0; k < raw.length; k++) {
      var t = stripComment(raw[k]).trim();
      if (t === "") continue;
      lines.push({ ln: k, text: t });
    }
    // find Sub
    var start = -1;
    for (var a = 0; a < lines.length; a++) { if (/^Sub\s+\w+\s*\(/i.test(lines[a].text)) { start = a; break; } }
    if (start === -1) throw new Error("No Sub procedure found. Start with: Sub MyMacro()");
    var body = lines.slice(start + 1);
    var res = parseBlock(body, 0);
    return res.nodes;
  }

  /* --------------------------- compile to effects --------------------------- */
  function compile(nodes) {
    var fx = [], cap = 9000;
    var ctx = {
      env: {}, vals: {},
      read: function (addr) { return ctx.vals[addr] != null ? ctx.vals[addr] : ""; }
    };
    function emit(e) { fx.push(e); if (fx.length > cap) throw new Error("Stopped — macro produced too many steps (infinite loop?)."); }
    function setCellAddr(ref) {
      if (ref.type === "range") return String(evalNode(ref.addr, ctx)).toUpperCase();
      return colLetter(toNum(evalNode(ref.c, ctx))) + toNum(evalNode(ref.r, ctx));
    }
    function exec(list) {
      for (var i = 0; i < list.length; i++) {
        var nd = list[i];
        emit({ t: "line", ln: nd.ln });
        if (nd.k === "setVar") { ctx.env[nd.name.toLowerCase()] = evalNode(nd.e, ctx); }
        else if (nd.k === "setCell") {
          var addr = setCellAddr(nd.ref), val = evalNode(nd.e, ctx), p = nd.path;
          emit({ t: "select", addr: addr });
          if (p === "" || p === ".value") { ctx.vals[addr] = val; emit({ t: "cell", addr: addr, v: toStr(val) }); }
          else if (p === ".interior.color") emit({ t: "style", addr: addr, prop: "bg", v: toHex(val) });
          else if (p === ".font.bold") emit({ t: "style", addr: addr, prop: "bold", v: toBool(val) });
          else if (p === ".font.color") emit({ t: "style", addr: addr, prop: "fg", v: toHex(val) });
          else throw new Error("Unsupported property “" + p + "”");
        }
        else if (nd.k === "msgbox") emit({ t: "msgbox", v: toStr(evalNode(nd.e, ctx)) });
        else if (nd.k === "print") emit({ t: "print", v: toStr(evalNode(nd.e, ctx)) });
        else if (nd.k === "if") { if (toBool(evalNode(nd.cond, ctx))) exec(nd.then); else exec(nd.els); }
        else if (nd.k === "for") {
          var from = toNum(evalNode(nd.from, ctx)), to = toNum(evalNode(nd.to, ctx)),
              st = nd.step ? toNum(evalNode(nd.step, ctx)) : 1;
          if (st === 0) throw new Error("For loop Step cannot be 0");
          for (var v = from; st > 0 ? v <= to : v >= to; v += st) {
            ctx.env[nd.v.toLowerCase()] = v;
            emit({ t: "line", ln: nd.ln });
            exec(nd.body);
          }
        }
      }
    }
    exec(nodes);
    emit({ t: "done" });
    return fx;
  }

  /* ============================= UI ============================= */
  var mount = document.getElementById("vba-playground-mount");
  if (!mount) return;

  mount.innerHTML =
    '<div class="vbe">' +
      '<div class="vbe-title"><span class="vt-ic">Ⓥ</span><span class="vt-name">Microsoft Visual Basic for Applications — Section1.xlsm</span>' +
        '<span class="vt-win"><i></i><i></i><i class="x"></i></span></div>' +
      '<div class="vbe-menu"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Debug</span><span>Run</span><span>Tools</span><span>Help</span></div>' +
      '<div class="vbe-toolbar">' +
        '<button class="vbtn run" id="vbe-run" title="Run (F5)"><b>▶</b> Run <span class="k">F5</span></button>' +
        '<button class="vbtn step" id="vbe-step" title="Step Into (F8)"><b>↴</b> Step <span class="k">F8</span></button>' +
        '<button class="vbtn stop" id="vbe-reset" title="Reset"><b>■</b> Reset</button>' +
        '<span class="vbe-sep"></span>' +
        '<span class="vbe-presetlbl">Macro:</span>' +
        '<select id="vbe-preset"></select>' +
        '<span class="vbe-state" id="vbe-state">Ready</span>' +
      '</div>' +
      '<div class="vbe-main">' +
        '<div class="vbe-proj">' +
          '<div class="proj-head">Project — VBAProject</div>' +
          '<div class="proj-tree">' +
            '<div class="pt l0">▾ <b>VBAProject</b> (Section1.xlsm)</div>' +
            '<div class="pt l1">▾ Microsoft Excel Objects</div>' +
            '<div class="pt l2">Sheet1 (Study)</div>' +
            '<div class="pt l2">ThisWorkbook</div>' +
            '<div class="pt l1">▾ Modules</div>' +
            '<div class="pt l2 sel">Module1</div>' +
          '</div>' +
        '</div>' +
        '<div class="vbe-code">' +
          '<div class="code-head"><select class="ch-sel"><option>(General)</option></select><select class="ch-sel"><option>(Declarations)</option></select></div>' +
          '<div class="code-area">' +
            '<div class="code-hl" id="vbe-hl"></div>' +
            '<textarea id="vbe-editor" spellcheck="false" wrap="off"></textarea>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="vbe-lower">' +
      '<div class="xl">' +
        '<div class="xl-bar"><span class="xl-ic">▦</span> Sheet1 — Study <span class="xl-cell" id="xl-active">A1</span></div>' +
        '<div class="xl-scroll"><table class="xl-grid" id="xl-grid"></table></div>' +
      '</div>' +
      '<div class="imm">' +
        '<div class="imm-bar">Immediate <span class="imm-hint">Debug.Print output</span></div>' +
        '<div class="imm-body" id="imm-body"><div class="imm-empty">Run a macro to see output…</div></div>' +
      '</div>' +
    '</div>' +
    '<div class="vbe-dialog-overlay" id="vbe-dialog"><div class="vbe-dialog">' +
      '<div class="vd-title">Microsoft Excel</div>' +
      '<div class="vd-body"><span class="vd-ic">ℹ</span><span id="vd-msg"></span></div>' +
      '<div class="vd-foot"><button class="vd-ok" id="vd-ok">OK</button></div>' +
    '</div></div>';

  // build grid
  var grid = document.getElementById("xl-grid");
  var head = "<tr><th class='corner'></th>";
  for (var c = 1; c <= COLS; c++) head += "<th>" + colLetter(c) + "</th>";
  head += "</tr>";
  var bodyHtml = "";
  for (var r = 1; r <= ROWS; r++) {
    bodyHtml += "<tr><th class='rownum'>" + r + "</th>";
    for (var cc = 1; cc <= COLS; cc++) bodyHtml += "<td id='cell-" + colLetter(cc) + r + "'></td>";
    bodyHtml += "</tr>";
  }
  grid.innerHTML = head + bodyHtml;

  var editor = document.getElementById("vbe-editor");
  var hl = document.getElementById("vbe-hl");
  var stateEl = document.getElementById("vbe-state");
  var immBody = document.getElementById("imm-body");
  var activeEl = document.getElementById("xl-active");
  var presetSel = document.getElementById("vbe-preset");

  PRESETS.forEach(function (p, i) {
    var o = document.createElement("option"); o.value = i; o.textContent = p.name; presetSel.appendChild(o);
  });
  function loadPreset(i) { editor.value = PRESETS[i].code; fullReset(); }
  presetSel.addEventListener("change", function () { loadPreset(+presetSel.value); });
  editor.value = PRESETS[0].code;

  /* playback state */
  var steps = null, idx = 0, preparedFor = null, running = false, dialogResolve = null;

  function setState(txt, cls) { stateEl.textContent = txt; stateEl.className = "vbe-state" + (cls ? " " + cls : ""); }

  function clearGridDisplay() {
    for (var rr = 1; rr <= ROWS; rr++) for (var c2 = 1; c2 <= COLS; c2++) {
      var el = document.getElementById("cell-" + colLetter(c2) + rr);
      el.textContent = ""; el.style.background = ""; el.style.fontWeight = ""; el.style.color = "";
      el.classList.remove("active");
    }
    activeEl.textContent = "A1";
  }
  function clearImm() { immBody.innerHTML = '<div class="imm-empty">Run a macro to see output…</div>'; }
  function highlight(ln) {
    var lineH = 21, padTop = 12;
    hl.style.display = "block";
    hl.style.transform = "translateY(" + (padTop + ln * lineH - editor.scrollTop) + "px)";
  }
  editor.addEventListener("scroll", function () { if (hl.style.display === "block" && lastLn != null) highlight(lastLn); });
  var lastLn = null;

  function applyEffect(e) {
    if (e.t === "cell") { document.getElementById("cell-" + e.addr) && (document.getElementById("cell-" + e.addr).textContent = e.v); }
    else if (e.t === "style") {
      var el = document.getElementById("cell-" + e.addr); if (!el) return;
      if (e.prop === "bg") el.style.background = e.v;
      if (e.prop === "bold") el.style.fontWeight = e.v ? "700" : "";
      if (e.prop === "fg") el.style.color = e.v;
    }
    else if (e.t === "select") {
      var prev = grid.querySelector("td.active"); if (prev) prev.classList.remove("active");
      var cur = document.getElementById("cell-" + e.addr); if (cur) cur.classList.add("active");
      activeEl.textContent = e.addr;
    }
    else if (e.t === "print") { addImm(e.v, "print"); }
    else if (e.t === "msgbox") { /* handled by caller (async) */ }
  }
  function addImm(text, cls) {
    var empty = immBody.querySelector(".imm-empty"); if (empty) empty.remove();
    var d = document.createElement("div"); d.className = "imm-line " + (cls || ""); d.textContent = text;
    immBody.appendChild(d); immBody.scrollTop = immBody.scrollHeight;
  }

  function showDialog(msg) {
    document.getElementById("vd-msg").textContent = msg;
    document.getElementById("vbe-dialog").classList.add("show");
    return new Promise(function (res) { dialogResolve = res; });
  }
  document.getElementById("vd-ok").addEventListener("click", function () {
    document.getElementById("vbe-dialog").classList.remove("show");
    if (dialogResolve) { var r = dialogResolve; dialogResolve = null; r(); }
  });

  function prepare() {
    clearImm(); clearGridDisplay();
    try {
      var ast = parseProgram(editor.value);
      steps = compile(ast);
      idx = 0; preparedFor = editor.value;
      return true;
    } catch (err) {
      steps = null; preparedFor = null;
      addImm("✕ " + err.message, "err");
      setState("Compile error", "err");
      hl.style.display = "none";
      return false;
    }
  }
  function ensurePrepared() {
    if (steps && preparedFor === editor.value) return true;
    return prepare();
  }

  function finish() {
    running = false; hl.style.display = "none";
    var prev = grid.querySelector("td.active"); if (prev) prev.classList.remove("active");
    setState("Macro finished ✓", "ok");
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function run() {
    if (running) { running = false; return; }   // toggle stop
    if (!prepare()) return;                       // always fresh
    running = true; setState("Running…", "busy");
    while (running && idx < steps.length) {
      var e = steps[idx++];
      if (e.t === "line") { lastLn = e.ln; highlight(e.ln); await sleep(95); }
      else if (e.t === "msgbox") { await showDialog(e.v); }
      else if (e.t === "done") { finish(); return; }
      else { applyEffect(e); await sleep(50); }
    }
    if (running) finish(); else setState("Stopped", "err");
  }

  async function stepOnce() {
    if (running) return;
    if (!ensurePrepared()) return;
    if (idx >= steps.length) { setState("Macro finished ✓ — Reset to run again", "ok"); return; }
    // execute exactly one statement: the line marker + following effects up to next line/done
    var e = steps[idx];
    if (e.t === "line") { lastLn = e.ln; highlight(e.ln); idx++; }
    setState("Stepping — line " + ((lastLn || 0) + 1), "busy");
    while (idx < steps.length && steps[idx].t !== "line") {
      var ef = steps[idx++];
      if (ef.t === "done") { finish(); return; }
      if (ef.t === "msgbox") { await showDialog(ef.v); }
      else applyEffect(ef);
    }
    if (idx < steps.length && steps[idx].t === "done") { idx++; finish(); }
  }

  function fullReset() {
    running = false; steps = null; preparedFor = null; idx = 0; lastLn = null;
    hl.style.display = "none"; clearGridDisplay(); clearImm(); setState("Ready");
  }

  document.getElementById("vbe-run").addEventListener("click", run);
  document.getElementById("vbe-step").addEventListener("click", stepOnce);
  document.getElementById("vbe-reset").addEventListener("click", fullReset);
  editor.addEventListener("keydown", function (e) {
    if (e.key === "F5") { e.preventDefault(); run(); }
    else if (e.key === "F8") { e.preventDefault(); stepOnce(); }
    else if (e.key === "Escape") { running = false; }
  });
})();
