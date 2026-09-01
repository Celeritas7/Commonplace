/* ============================================================================
 * cpp-practice-sections.js · Commonplace · C++ Practice Lab  (v2, interactive)
 *
 * Load AFTER cpp-practice-plus.js:
 *     <script src="cpp-practice-plus.js"></script>
 *     <script src="cpp-practice-sections.js"></script>
 *   </body>
 *
 * v2 — ports the compose-blocks interaction model from the Python page:
 *   • SLOT CARDS    — includes / helpers / main as real block cards:
 *                     syntax-highlighted auto-growing bodies, collapse ⌄,
 *                     line counts, focus ring.
 *   • TARGETED KEYS — the key palette inserts into WHICHEVER slot is focused
 *                     ("KEYS INSERT HERE" stamp), not always the main editor.
 *   • ASSEMBLED VIEW— live "view assembled" pane with INCLUDES/HELPERS/MAIN
 *                     segment tags and line numbers.
 *   • GUILTY STAMP  — a failed compile stamps the slot whose line the error
 *                     points at ("ERROR HERE · LINE N").
 *   • SECTION FIX   — sections fall back to title/order matching when the
 *                     page's exercise rows carry no tags; Today's focus only
 *                     picks sections that actually have unsolved problems.
 * ========================================================================== */
(function () {
  "use strict";
  if (window.__cppPracticeSections) { console.warn("cpp-practice-sections loaded twice"); return; }
  window.__cppPracticeSections = true;

  var LS_MODE = "commonplace_cpp_editor_mode";
  var LS_HIDE = "commonplace_cpp_hide_solved";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  /* ------------------------------------------------- C++ syntax highlighter */
  var KW = /\b(int|double|float|long|char|bool|void|string|auto|const|unsigned|signed|short|if|else|for|while|do|switch|case|break|continue|return|class|struct|public|private|protected|new|delete|this|namespace|using|true|false|nullptr|template|typename|virtual|override|static|enum|try|catch|throw)\b/g;
  function hlCpp(src) {
    var out = "", rest = String(src || "");
    var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|^\s*#\w+[^\n]*)/m;
    while (rest.length) {
      var m = re.exec(rest);
      if (!m) { out += plain(rest); break; }
      out += plain(rest.slice(0, m.index));
      var t = m[0];
      if (t[0] === '"' || t[0] === "'") out += '<span style="color:#f1fa8c">' + esc(t) + "</span>";
      else if (t.indexOf("//") === 0 || t.indexOf("/*") === 0) out += '<span style="color:#6272a4">' + esc(t) + "</span>";
      else out += '<span style="color:#ff79c6">' + esc(t) + "</span>";
      rest = rest.slice(m.index + t.length);
    }
    return out;
    function plain(s) {
      return esc(s)
        .replace(KW, '<span style="color:#ff79c6">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#bd93f9">$1</span>')
        .replace(/\b(cout|cin|endl|getline|printf|main|vector|map|max_element|reverse|tolower|isPrime|factorial|gcd|swapVals)\b/g, '<span style="color:#8be9fd">$1</span>');
    }
  }

  /* ------------------------------------------------------------- sections */
  var SECTIONS = [
    { key: "s1", roman: "I",   name: "Basics & IO",           parts: ["part-1", "part-2"], lo: 0,   hi: 59 },
    { key: "s2", roman: "II",  name: "Control Flow",          parts: ["part-3"],           lo: 60,  hi: 99 },
    { key: "s3", roman: "III", name: "Functions & Recursion", parts: ["part-4"],           lo: 100, hi: 129 },
    { key: "s4", roman: "IV",  name: "STL & Strings",         parts: ["part-5"],           lo: 130, hi: 159 },
    { key: "s5", roman: "V",   name: "Classes & Memory",      parts: ["part-6", "part-7"], lo: 160, hi: 999 }
  ];
  var TITLE_SEC = {
    "greet by name": "s1", "add two numbers": "s1", "celsius to fahrenheit": "s1",
    "the integer-division trap": "s1", "swap without a temp variable": "s1",
    "fizzbuzz to 15": "s2", "sum the even numbers to 100": "s2",
    "multiplication triangle": "s2", "count the vowels": "s2",
    "is it prime?": "s3", "factorial, recursively": "s3", "euclid’s gcd": "s3", "euclid's gcd": "s3",
    "largest in a vector": "s4", "reverse a word": "s4", "word frequency count": "s4",
    "a rectangle class": "s5", "bank account with guards": "s5", "a node that frees itself": "s5"
  };
  function secOf(ex, idx, total) {
    var tags = ex.tags;
    if (typeof tags === "string") { try { tags = JSON.parse(tags); } catch (e) { tags = tags.replace(/[{}"]/g, "").split(","); } }
    if (Array.isArray(tags) && tags.length) {
      for (var i = 0; i < SECTIONS.length; i++) {
        if (SECTIONS[i].parts.some(function (p) { return tags.indexOf(p) >= 0; })) return SECTIONS[i];
      }
    }
    var byTitle = TITLE_SEC[String(ex.title || "").trim().toLowerCase()];
    if (byTitle) return SECTIONS.filter(function (s) { return s.key === byTitle; })[0];
    if (ex.order_index != null) {
      for (var j = 0; j < SECTIONS.length; j++) {
        if (ex.order_index >= SECTIONS[j].lo && ex.order_index <= SECTIONS[j].hi) return SECTIONS[j];
      }
    }
    return SECTIONS[Math.min(4, Math.floor((idx / Math.max(1, total)) * 5))];   // spread evenly as last resort
  }

  var curTab = "focus";
  var hideSolved = localStorage.getItem(LS_HIDE) === "1";
  var solved = {};

  function focusKeys(list) {
    var withUnsolved = SECTIONS.filter(function (s) {
      return list.some(function (ex, i) { return secOf(ex, i, list.length).key === s.key && !solved[ex.id]; });
    }).map(function (s) { return s.key; });
    if (!withUnsolved.length) return [];
    var day = Math.floor(Date.now() / 864e5);
    var a = withUnsolved[day % withUnsolved.length];
    var b = withUnsolved[(day + 1) % withUnsolved.length];
    return a === b ? [a] : [a, b];
  }

  /* -------------------------------------------------------- problem strip */
  function buildStrip() {
    var panel = $("ex-panel");
    if (!panel) return;
    if (!$("cpx2-strip")) {
      var wrap = el("div", "cpx2-strip");
      wrap.id = "cpx2-strip";
      var head = panel.querySelector(".panel-head");
      head.parentNode.insertBefore(wrap, head.nextSibling);
      if (window.setExCollapsed) window.setExCollapsed(true);
    }
    renderStrip();
  }

  function renderStrip() {
    var wrap = $("cpx2-strip");
    if (!wrap) return;
    var list = window.exercises || [];
    if (!list.length) { wrap.innerHTML = ""; return; }
    var FOCUS = focusKeys(list);
    if (curTab === "focus" && !FOCUS.length) curTab = "all";

    var nSolved = list.filter(function (ex) { return solved[ex.id]; }).length;
    var counts = {};
    list.forEach(function (ex, i) { var k = secOf(ex, i, list.length).key; counts[k] = (counts[k] || 0) + 1; });

    var tabs = (FOCUS.length ? [{ key: "focus", label: "★ Today's focus" }] : [])
      .concat(SECTIONS.filter(function (s) { return counts[s.key]; }).map(function (s) {
        return { key: s.key, label: s.roman + " · " + s.name + " (" + counts[s.key] + ")", today: FOCUS.indexOf(s.key) >= 0 };
      }))
      .concat([{ key: "all", label: "All" }]);

    var visible = list.filter(function (ex, i) {
      var sk = secOf(ex, i, list.length).key;
      if (curTab === "focus") { if (FOCUS.indexOf(sk) < 0) return false; }
      else if (curTab !== "all" && sk !== curTab) return false;
      if (hideSolved && solved[ex.id]) return false;
      return true;
    });
    var num = {}; list.forEach(function (ex, i) { num[ex.id] = i + 1; });

    wrap.innerHTML =
      '<div class="cpx2-tabs">' +
        tabs.map(function (t) {
          return '<button type="button" class="cpx2-tab' + (curTab === t.key ? " on" : "") + '" data-tab="' + t.key + '">' +
            esc(t.label) + (t.today ? '<i class="cpx2-dot"></i>' : "") + "</button>";
        }).join("") +
        '<span class="cpx-sp"></span>' +
        '<button type="button" class="cpx2-hide' + (hideSolved ? " on" : "") + '">' + (hideSolved ? "☑" : "☐") + " hide solved</button>" +
        '<span class="cpx2-progress">' + nSolved + " / " + list.length + " solved</span>" +
      "</div>" +
      '<div class="cpx2-pills">' +
        (visible.length ? visible.map(function (ex) {
          var isActive = window.activeExercise && window.activeExercise.id === ex.id;
          var isSolved = !!solved[ex.id];
          return '<button type="button" class="cpx2-pill' + (isActive ? " on" : "") + (isSolved ? " ok" : "") + '" data-ex="' + esc(ex.id) + '">' +
            "<b>P" + num[ex.id] + "</b> " + esc(ex.title || "Untitled") + (isSolved ? " ✓" : "") + "</button>";
        }).join("") : '<span class="cpx2-none">Nothing left here — nice. Pick another section.</span>') +
      "</div>";

    Array.prototype.forEach.call(wrap.querySelectorAll(".cpx2-tab"), function (b) {
      b.addEventListener("click", function () { curTab = b.getAttribute("data-tab"); renderStrip(); });
    });
    wrap.querySelector(".cpx2-hide").addEventListener("click", function () {
      hideSolved = !hideSolved;
      localStorage.setItem(LS_HIDE, hideSolved ? "1" : "0");
      renderStrip();
    });
    Array.prototype.forEach.call(wrap.querySelectorAll(".cpx2-pill"), function (b) {
      b.addEventListener("click", function () {
        var ex = (window.exercises || []).filter(function (e) { return e.id === b.getAttribute("data-ex"); })[0];
        if (!ex || !window.loadIntoEditor) return;
        /* park the in-progress draft under the item we're leaving before the swap;
           loadIntoEditor restores this problem's own draft on arrival, so the pill
           strip can be walked freely without a confirm and without losing edits */
        if (window.__draftFlush) window.__draftFlush();
        window.loadIntoEditor(ex);
      });
    });
  }

  function fetchSolved() {
    if (!window.currentUser || !window.sb) return;
    window.sb.from("commonplace_attempts")
      .select("exercise_id").eq("subject", "cpp").eq("passed", true).not("exercise_id", "is", null)
      .then(function (res) {
        if (res.error) return;
        solved = {};
        (res.data || []).forEach(function (r) { solved[r.exercise_id] = true; });
        renderStrip();
      });
  }

  /* ------------------------------------------------------------ slot cards */
  var slotMode = localStorage.getItem(LS_MODE) !== "classic";
  var focusedSlot = null;                 // "inc" | "fn" | "main" | null
  var SLOT_META = {
    inc: { n: 1, name: "includes", note: "headers & using" },
    fn:  { n: 2, name: "helpers",  note: "functions & classes · optional" }
  };

  function parseSource(src) {
    var lines = String(src || "").replace(/\r/g, "").split("\n");
    var i = 0, inc = [];
    while (i < lines.length && /^\s*(#include|using\s|$)/.test(lines[i])) { inc.push(lines[i]); i++; }
    var mi = -1;
    for (var j = i; j < lines.length; j++) { if (/int\s+main\s*\(/.test(lines[j])) { mi = j; break; } }
    if (mi < 0) return null;
    var last = lines.length - 1;
    while (last > mi && lines[last].trim() !== "}") last--;
    if (last <= mi) return null;
    return { inc: inc.join("\n").replace(/\s+$/, ""), helpers: lines.slice(i, mi).join("\n").trim(), body: lines.slice(mi + 1, last).join("\n").replace(/\s+$/, "") };
  }

  function composeFrom(body) {
    var inc = ($("cpx2-inc") ? $("cpx2-inc").value : "").replace(/\s+$/, "");
    var helpers = ($("cpx2-fn") ? $("cpx2-fn").value : "").trim();
    var ret = /(^|\n)\s*return\s/.test(body) ? "" : "\n    return 0;";
    return inc + "\n\n" + (helpers ? helpers + "\n\n" : "") + "int main() {\n" + body + ret + "\n}\n";
  }

  function segStarts() {                   // 1-based line where each segment begins in the assembly
    var inc = ($("cpx2-inc") || {}).value || "", fn = (($("cpx2-fn") || {}).value || "").trim();
    var incN = inc.replace(/\s+$/, "").split("\n").length;
    var fnStart = incN + 2;
    var fnN = fn ? fn.split("\n").length : 0;
    var mainStart = fn ? fnStart + fnN + 1 : fnStart;
    return { inc: 1, fn: fn ? fnStart : -1, main: mainStart + 1 };   // +1 skips "int main() {"
  }

  function slotCard(key) {
    var meta = SLOT_META[key];
    var card = el("div", "cpx2-card");
    card.id = "cpx2-card-" + key;
    card.innerHTML =
      '<div class="cpx2-chead">' +
        '<span class="cpx2-cnum cpx2-cnum-' + key + '">' + meta.n + "</span>" +
        '<span class="cpx2-cname">' + meta.name + "</span>" +
        '<span class="cpx2-cnote">' + meta.note + "</span>" +
        '<span class="cpx2-stampslot"></span>' +
        '<span class="cpx-sp"></span>' +
        '<span class="cpx2-clines"></span>' +
        '<button type="button" class="cpx2-chev" title="Collapse">⌄</button>' +
      "</div>" +
      '<div class="cpx2-cbody"><pre class="cpx2-hl" aria-hidden="true"></pre>' +
      '<textarea id="cpx2-' + key + '" class="cpx2-ta" spellcheck="false" wrap="off"></textarea></div>';
    var ta = card.querySelector("textarea"), pre = card.querySelector(".cpx2-hl");
    function paint() {
      pre.innerHTML = ta.value
        ? hlCpp(ta.value) + "\n"
        : '<span class="cpx2-ph">' + (key === "fn" ? "// e.g. bool isPrime(int n) { … }" : "…") + "</span>";
      ta.style.height = pre.offsetHeight + "px";
      card.querySelector(".cpx2-clines").textContent =
        ta.value.trim() ? "· " + ta.value.split("\n").length + " line" + (ta.value.split("\n").length === 1 ? "" : "s") : "· empty";
    }
    ta.addEventListener("input", function () { clearGuilty(); paint(); refreshAsm(); });
    ta.addEventListener("scroll", function () { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; });
    ta.addEventListener("focus", function () { setSlotFocus(key); });
    ta.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runAssembled(); }
      if (e.key === "Tab") { e.preventDefault(); insertAtCaret(ta, "    "); }
    });
    card.querySelector(".cpx2-chev").addEventListener("click", function () {
      card.classList.toggle("cpx2-closed");
      if (card.classList.contains("cpx2-closed") && focusedSlot === key) setSlotFocus(null);
    });
    card.__paint = paint;
    return card;
  }

  function setSlotFocus(key) {
    focusedSlot = key;
    ["inc", "fn", "main"].forEach(function (k) {
      var card = $("cpx2-card-" + k);
      if (!card) return;
      card.classList.toggle("cpx2-focus", k === key);
      var slot = card.querySelector(".cpx2-stampslot");
      if (slot) slot.innerHTML = (k === key) ? '<span class="cpx2-stamp">KEYS INSERT HERE</span>' : "";
    });
  }

  function clearGuilty() {
    ["inc", "fn", "main"].forEach(function (k) {
      var card = $("cpx2-card-" + k);
      if (!card) return;
      card.classList.remove("cpx2-guilty");
      var s = card.querySelector(".cpx2-stampslot .cpx2-stamp-err");
      if (s) s.parentNode.innerHTML = "";
    });
  }

  function stampGuilty(line) {             // line = 1-based line in the assembled program
    var st = segStarts(), key = "main";
    if (st.fn > 0 && line >= st.fn && line < st.main - 1) key = "fn";
    else if (line < (st.fn > 0 ? st.fn : st.main - 1)) key = "inc";
    var card = $("cpx2-card-" + key);
    if (!card) return;
    card.classList.add("cpx2-guilty");
    card.classList.remove("cpx2-closed");
    var slot = card.querySelector(".cpx2-stampslot");
    slot.innerHTML = '<span class="cpx2-stamp cpx2-stamp-err">ERROR HERE · LINE ' + line + "</span>";
  }

  function insertAtCaret(ta, raw) {
    var token = raw, back = 0;
    if (token === "()" || token === '""') back = 1;
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    ta.value = v.slice(0, s) + token + v.slice(e);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.focus();
    var p = s + token.length - back;
    ta.setSelectionRange(p, p);
  }

  /* --------------------------------------------------- assembled program view */
  var asmOpen = false;
  function refreshAsm() {
    var box = $("cpx2-asm");
    if (!box || !asmOpen) return;
    var body = window.cm ? window.cm.getValue() : "";
    var full = composeFrom(body), st = segStarts();
    var rows = full.replace(/\s+$/, "").split("\n").map(function (l, i) {
      var n = i + 1, tag = "";
      if (n === st.inc) tag = "INCLUDES";
      else if (n === st.fn) tag = "HELPERS";
      else if (n === st.main - 1) tag = "MAIN";
      return '<div class="cpx2-asmrow">' +
        '<span class="cpx2-asmln">' + n + "</span><span class=\"cpx2-asmcode\">" + (hlCpp(l) || "&nbsp;") + "</span>" +
        (tag ? '<span class="cpx2-asmtag">' + tag + "</span>" : "") + "</div>";
    }).join("");
    box.querySelector(".cpx2-asmbody").innerHTML = rows;
    box.querySelector(".cpx2-asmcount").textContent = "№ " + full.replace(/\s+$/, "").split("\n").length + " LINES";
  }

  function runAssembled() {
    if (slotMode) injectFull();
    if (window.runCode) window.runCode();
  }

  /* ------------------------------------------------- build the editor block */
  function buildSlots() {
    var panel = $("editor-panel");
    if (!panel || $("cpx2-slots")) return;
    var cmEl = panel.querySelector(".CodeMirror");
    if (!cmEl) return;

    var wrap = el("div", "cpx2-slots");
    wrap.id = "cpx2-slots";
    var kick = el("div", "cpx2-kickrow",
      '<span class="cpx2-kick">COMPOSE · C++</span><span class="cpx-sp"></span>' +
      '<button type="button" class="cpx2-asmbtn">▤ View assembled</button>');
    wrap.appendChild(kick);
    var incCard = slotCard("inc"), fnCard = slotCard("fn");
    wrap.appendChild(incCard);
    wrap.appendChild(fnCard);

    // main card wraps the page's existing CodeMirror
    var mainCard = el("div", "cpx2-card cpx2-card-main");
    mainCard.id = "cpx2-card-main";
    mainCard.innerHTML =
      '<div class="cpx2-chead">' +
        '<span class="cpx2-cnum cpx2-cnum-main">3</span>' +
        '<span class="cpx2-cname">main</span>' +
        '<span class="cpx2-cnote">runs inside <code>int main() { … }</code></span>' +
        '<span class="cpx2-stampslot"></span>' +
        '<span class="cpx-sp"></span><span class="cpx2-clines"></span>' +
      "</div>" +
      '<div class="cpx2-cbody cpx2-cbody-main"></div>';
    wrap.appendChild(mainCard);

    // assembled view
    var asm = el("div", "cpx2-asm");
    asm.id = "cpx2-asm";
    asm.hidden = true;
    asm.innerHTML = '<div class="cpx2-asmhead"><span class="cpx2-kick">ASSEMBLED PROGRAM — what actually runs</span>' +
      '<span class="cpx2-kick cpx2-asmcount"></span></div><div class="cpx2-asmbody"></div>';
    wrap.appendChild(asm);

    cmEl.parentNode.insertBefore(wrap, cmEl);
    mainCard.querySelector(".cpx2-cbody-main").appendChild(cmEl);

    kick.querySelector(".cpx2-asmbtn").addEventListener("click", function () {
      asmOpen = !asmOpen;
      asm.hidden = !asmOpen;
      this.textContent = asmOpen ? "▤ Hide assembled" : "▤ View assembled";
      refreshAsm();
    });

    // mode toggle in panel header
    var head = panel.querySelector(".panel-head");
    var btn = el("button", "btn btn-ghost btn-sm");
    btn.id = "cpx2-mode";
    btn.type = "button";
    head.insertBefore(btn, $("reset-btn"));
    btn.addEventListener("click", function () { setSlotMode(!slotMode, true); });

    // CodeMirror focus = main slot focus; count its lines live
    if (window.cm) {
      window.cm.on("focus", function () { setSlotFocus("main"); });
      window.cm.on("change", function () {
        clearGuilty();
        var n = window.cm.lineCount();
        mainCard.querySelector(".cpx2-clines").textContent = "· " + n + " line" + (n === 1 ? "" : "s");
        refreshAsm();
      });
    }
    paintMode();
  }

  function paintMode() {
    var btn = $("cpx2-mode");
    if (btn) btn.textContent = slotMode ? "▤ Classic mode" : "⧉ Slot mode";
    var wrap = $("cpx2-slots");
    var panel = $("editor-panel");
    if (!wrap || !panel) return;
    var cmEl = panel.querySelector(".CodeMirror");
    if (slotMode) {
      wrap.style.display = "";
      var mainBody = wrap.querySelector(".cpx2-cbody-main");
      if (cmEl && cmEl.parentNode !== mainBody) mainBody.appendChild(cmEl);
    } else {
      wrap.style.display = "none";
      if (cmEl && cmEl.parentNode !== wrap.parentNode) wrap.parentNode.insertBefore(cmEl, wrap.nextSibling);
    }
    if (window.cm) window.cm.refresh();
  }

  function fillSlots(parsed) {
    $("cpx2-inc").value = parsed.inc;
    $("cpx2-fn").value = parsed.helpers;
    $("cpx2-card-inc").__paint();
    $("cpx2-card-fn").__paint();
    window.cm.setValue(parsed.body);
    window.lastTemplate = parsed.body;
    clearGuilty();
    refreshAsm();
  }

  function setSlotMode(on, announce) {
    if (on) {
      var parsed = parseSource(window.cm.getValue());
      if (!parsed) {
        if (announce && window.toast) window.toast("Couldn't split this code into slots — staying in classic");
        slotMode = false;
      } else { slotMode = true; paintMode(); fillSlots(parsed); }
    } else {
      var full = composeFrom(window.cm.getValue());
      slotMode = false;
      paintMode();
      window.cm.setValue(full);
      window.lastTemplate = full;
    }
    localStorage.setItem(LS_MODE, slotMode ? "slots" : "classic");
    paintMode();
  }

  /* ------------------------- palette targeting (capture before plus.js fires) */
  var PAL_RAW = {};
  [
    "#include <iostream>\n", "using namespace std;\n", "int main() {\n    \n}\n", "return 0;",
    "for (", "while (", "if (", "else ", "class ", "struct ",
    "cout << ", "cin >> ", " << endl;", "getline(cin, ", "int ", "double ", "bool ",
    "string ", "vector<int> ", "map<string, int> ",
    "{", "}", "()", ";", "\"\"", "<<", "&&", "%", "++", "->"
  ].forEach(function (k) {
    PAL_RAW[k.replace(/\n/g, "⏎").replace(/ +$/, " ").replace("    ⏎", "")] = k;
  });
  document.addEventListener("pointerdown", function (e) {
    if (slotMode && e.target && e.target.closest && e.target.closest(".cpx-pill") &&
        (focusedSlot === "inc" || focusedSlot === "fn")) e.preventDefault();   // keep slot focus
  }, true);
  document.addEventListener("click", function (e) {
    if (!slotMode || !e.target || !e.target.closest) return;
    var pill = e.target.closest(".cpx-pill");
    if (!pill || (focusedSlot !== "inc" && focusedSlot !== "fn")) return;
    var raw = PAL_RAW[pill.textContent] || pill.textContent;
    e.stopPropagation();
    insertAtCaret($("cpx2-" + focusedSlot), raw);
  }, true);

  /* ---------------------------------------------- run interception + guilt */
  function injectFull() {
    var body = window.cm.getValue();
    window.cm.setValue(composeFrom(body));
    setTimeout(function () { window.cm.setValue(body); }, 0);
  }
  document.addEventListener("click", function (e) {
    if (!slotMode || !e.target || !e.target.closest) return;
    if (e.target.closest("#run-btn") || e.target.closest("#mistake-btn")) injectFull();
    if (e.target.closest("#reset-btn")) {
      setTimeout(function () {
        var parsed = parseSource(window.cm.getValue());
        if (parsed) fillSlots(parsed);
      }, 0);
    }
  }, true);

  function watchVerdict() {
    var btn = $("run-btn"), status = $("status"), term = $("term");
    if (!btn || !status || !term) return;
    var was = !!btn.disabled;
    new MutationObserver(function () {
      var now = !!btn.disabled;
      if (was && !now) {
        setTimeout(fetchSolved, 900);
        if (slotMode && !status.classList.contains("chip-ok")) {
          var m = /:(\d+):\d+:\s*(?:fatal )?error/.exec(term.textContent || "") || /:(\d+):/.exec(term.textContent || "");
          if (m) stampGuilty(parseInt(m[1], 10));
        }
      }
      was = now;
    }).observe(btn, { attributes: true, attributeFilter: ["disabled"] });
  }

  /* ------------------------------------------------------------ page hooks */
  function hookPage() {
    var _load = window.loadIntoEditor;
    if (typeof _load === "function") {
      window.loadIntoEditor = function (ex) {
        var r = _load.apply(this, arguments);
        if (slotMode) {
          var parsed = parseSource(window.cm.getValue());
          if (parsed) fillSlots(parsed);
        }
        renderStrip();
        return r;
      };
    }
    var _setActive = window.setActive;
    if (typeof _setActive === "function") {
      window.setActive = function () {
        var r = _setActive.apply(this, arguments);
        document.body.classList.toggle("cpx-focus", !!window.activeExercise);
        renderStrip();
        return r;
      };
    }
    var _renderEx = window.renderExercises;
    if (typeof _renderEx === "function") {
      window.renderExercises = function () {
        var r = _renderEx.apply(this, arguments);
        buildStrip();
        fetchSolved();
        return r;
      };
    }
    if (window.cm) {
      window.cm.setOption("extraKeys", { "Cmd-Enter": runAssembled, "Ctrl-Enter": runAssembled });
    }
  }

  /* ------------------------------------------------------------ injected css */
  function injectCss() {
    if ($("cpx2-style")) return;
    var s = document.createElement("style");
    s.id = "cpx2-style";
    s.textContent = [
      /* strip */
      ".cpx2-strip{padding:12px 18px 13px;border-bottom:1px solid #ece7f6;background:#faf7ff;}",
      ".cpx2-tabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;}",
      ".cpx2-tab{position:relative;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid #ece7f6;border-radius:11px;padding:6px 11px;background:var(--card,#fff);color:var(--ink-dim,#718096);}",
      ".cpx2-tab.on{background:var(--purple-deep,#6d28d9);border-color:var(--purple-deep,#6d28d9);color:#fff;}",
      ".cpx2-dot{position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--amber,#f59e0b);border:2px solid #faf7ff;}",
      ".cpx2-hide{font:inherit;font-size:12px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--ink-dim,#718096);}",
      ".cpx2-hide.on{color:var(--purple-deep,#6d28d9);}",
      ".cpx2-progress{font-size:12px;font-weight:700;color:var(--purple-deep,#6d28d9);background:#efe7fd;border-radius:10px;padding:4px 10px;}",
      ".cpx2-pills{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin;}",
      ".cpx2-pill{flex:0 0 auto;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;border:1.5px solid #ece7f6;border-radius:20px;padding:7px 14px;background:var(--card,#fff);color:var(--ink-soft,#4a5568);white-space:nowrap;max-width:230px;overflow:hidden;text-overflow:ellipsis;}",
      ".cpx2-pill b{color:var(--purple-deep,#6d28d9);margin-right:2px;}",
      ".cpx2-pill.on{background:var(--purple-deep,#6d28d9);border-color:var(--purple-deep,#6d28d9);color:#fff;}",
      ".cpx2-pill.on b{color:#fff;}",
      ".cpx2-pill.ok{border-color:rgba(34,197,94,.5);background:rgba(34,197,94,.08);color:#15803d;}",
      ".cpx2-pill.ok b{color:#15803d;}",
      ".cpx2-pill.on.ok{background:#15803d;border-color:#15803d;color:#fff;}",
      ".cpx2-pill.on.ok b{color:#fff;}",
      ".cpx2-none{font-size:13px;color:var(--ink-dim,#718096);padding:4px 2px;}",
      /* slot cards */
      ".cpx2-slots{display:flex;flex-direction:column;gap:11px;padding:13px 18px 16px;background:#faf7ff;border-bottom:1px solid #ece7f6;}",
      ".cpx2-kickrow{display:flex;align-items:center;gap:10px;}",
      ".cpx2-kick{font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:var(--purple-deep,#6d28d9);white-space:nowrap;}",
      ".cpx2-asmbtn{font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:2px solid #ece7f6;border-radius:10px;padding:5px 11px;background:var(--card,#fff);color:var(--ink-soft,#4a5568);}",
      ".cpx2-card{background:var(--card,#fff);border:1.5px solid #ece7f6;border-radius:14px;overflow:hidden;box-shadow:0 2px 4px rgba(109,40,217,.06);transition:border-color .15s,box-shadow .15s;}",
      ".cpx2-card.cpx2-focus{border-color:var(--purple,#8b5cf6);box-shadow:0 4px 14px rgba(109,40,217,.16);}",
      ".cpx2-card.cpx2-guilty{border-color:var(--red,#ef4444);box-shadow:0 4px 14px rgba(239,68,68,.2);}",
      ".cpx2-card-main{border-color:var(--purple-light,#c4b5fd);}",
      ".cpx2-chead{display:flex;align-items:center;gap:9px;height:40px;padding:0 13px;}",
      ".cpx2-cnum{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-family:var(--mono,'JetBrains Mono',monospace);font-size:11px;font-weight:700;flex:none;}",
      ".cpx2-cnum-inc{background:#efe7fd;color:var(--purple-deep,#6d28d9);}",
      ".cpx2-cnum-fn{background:#e3f6fb;color:#0e7490;}",
      ".cpx2-cnum-main{background:var(--purple-deep,#6d28d9);color:#fff;}",
      ".cpx2-cname{font-family:var(--mono,'JetBrains Mono',monospace);font-size:12.5px;font-weight:700;color:var(--ink,#1a202c);white-space:nowrap;}",
      ".cpx2-cnote{font-size:11.5px;color:#a0aec0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto;}",
      ".cpx2-cnote code{font-family:var(--mono,'JetBrains Mono',monospace);font-size:10.5px;background:#efe7fd;border-radius:6px;padding:1px 6px;color:var(--purple-deep,#6d28d9);white-space:nowrap;}",
      ".cpx2-clines{font-family:var(--mono,'JetBrains Mono',monospace);font-size:11px;color:#a0aec0;white-space:nowrap;flex:none;}",
      ".cpx2-stamp{display:inline-block;font-family:var(--mono,'JetBrains Mono',monospace);font-size:9px;font-weight:700;letter-spacing:1px;color:var(--purple-deep,#6d28d9);border:1px solid var(--purple-light,#c4b5fd);background:rgba(139,92,246,.08);padding:3px 6px;border-radius:6px;transform:rotate(-1.5deg);white-space:nowrap;}",
      ".cpx2-stamp-err{color:#b91c1c;border-color:#f3b4ad;background:rgba(239,68,68,.07);}",
      ".cpx2-chev{width:34px;height:40px;display:flex;align-items:center;justify-content:center;color:var(--ink-dim,#718096);background:none;border:none;cursor:pointer;font-size:15px;padding:0;transition:transform .15s;flex:none;}",
      ".cpx2-card.cpx2-closed .cpx2-chev{transform:rotate(-90deg);}",
      ".cpx2-card.cpx2-closed .cpx2-cbody{display:none;}",
      ".cpx2-cbody{position:relative;background:#282a36;}",
      ".cpx2-cbody-main{background:transparent;}",
      ".cpx2-cbody-main .CodeMirror{border-radius:0;}",
      ".cpx2-hl,.cpx2-ta{margin:0;padding:11px 14px;font-family:var(--mono,'JetBrains Mono',monospace);font-size:13px;line-height:1.6;white-space:pre;box-sizing:border-box;}",
      ".cpx2-hl{pointer-events:none;min-height:46px;color:#f8f8f2;overflow:hidden;}",
      ".cpx2-ph{color:rgba(248,248,242,.35);}",
      ".cpx2-ta{position:absolute;inset:0;width:100%;height:100%;resize:none;border:none;outline:none;background:transparent;color:transparent;caret-color:#f8f8f2;overflow:auto;display:block;}",
      /* assembled view */
      ".cpx2-asm{background:#1e1b4b;border-radius:14px;overflow:hidden;}",
      ".cpx2-asmhead{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-bottom:1px solid rgba(224,231,255,.14);}",
      ".cpx2-asmhead .cpx2-kick{color:#a5b4fc;}",
      ".cpx2-asmbody{padding:10px 0;max-height:280px;overflow:auto;}",
      ".cpx2-asmrow{display:flex;align-items:baseline;gap:12px;padding:0 14px;font-family:var(--mono,'JetBrains Mono',monospace);font-size:12.5px;line-height:1.65;}",
      ".cpx2-asmln{width:22px;text-align:right;color:rgba(165,180,252,.4);flex:none;}",
      ".cpx2-asmcode{white-space:pre;color:#e0e7ff;flex:1;overflow-x:auto;}",
      ".cpx2-asmtag{font-size:9px;font-weight:700;letter-spacing:1.2px;color:#a5b4fc;flex:none;}",
      /* focus mode */
      "body.cpx-focus .hero{display:none;}",
      "body.cpx-focus .CodeMirror,body.cpx-focus .CodeMirror-scroll{min-height:170px;}",
      "body.cpx-focus pre.term{max-height:150px;overflow:auto;}",
      "@media (max-width:640px){.cpx2-cnote{display:none;}}"
    ].join("");
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------- boot */
  function boot() {
    if (!$("editor-panel") || !window.cm) { setTimeout(boot, 120); return; }
    injectCss();
    buildSlots();
    hookPage();
    watchVerdict();
    if (slotMode) setSlotMode(true);
    buildStrip();
    fetchSolved();
    if ($("cpx2-inc")) { $("cpx2-card-inc").__paint(); $("cpx2-card-fn").__paint(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
