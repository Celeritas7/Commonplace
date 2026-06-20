// sql-highlight.js — drop-in live syntax coloring for the SQLZoo practice page.
// Non-destructive: it overlays a colored <pre> behind each plain <textarea>
// (#editor and every .ex-editor). No engine, grading, or markup changes.
// Load it AFTER sqlzoo-lab.js:   <script src="sql-highlight.js"></script>
(function () {
  "use strict";

  /* ---------- token vocabularies ---------- */
  var KW = ["select","distinct","from","where","group","by","order","having","limit","offset",
    "and","or","not","null","is","in","like","as","asc","desc","between","on","using",
    "join","inner","left","right","full","outer","cross","union","all","exists","case",
    "when","then","else","end","insert","into","values","update","set","delete","create",
    "table","view","drop","alter","add","primary","key","foreign","references","default",
    "with","over","partition"];
  var FN = ["count","sum","avg","min","max","round","abs","length","lower","upper","trim",
    "coalesce","cast","substr","replace","now","date","strftime","ifnull","nullif","group_concat"];

  var KWSET = new Set(KW), FNSET = new Set(FN);

  // identifiers (table + column names) — pulled live from the page's schema
  var IDSET = new Set();
  (function buildIds() {
    var sch = window.SQLZOO_SCHEMA || [];
    sch.forEach(function (t) {
      if (t.name) IDSET.add(String(t.name).toLowerCase());
      (t.cols || []).forEach(function (c) { IDSET.add(String(c).toLowerCase()); });
    });
  })();

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // tokenizer → colored spans
  var RE = /('(?:[^']|'')*'|"(?:[^"]|"")*"|\b\d+\.?\d*\b|[A-Za-z_][A-Za-z0-9_]*|--[^\n]*|\*|[(),.;]|[=<>!+\-\/%|]+|\s+|[^\s])/g;
  function highlight(code) {
    var out = "", m;
    RE.lastIndex = 0;
    while ((m = RE.exec(code)) !== null) {
      var t = m[0];
      if (/^\s+$/.test(t)) { out += t; continue; }
      if (t.charAt(0) === "'" || t.charAt(0) === '"') { out += span("str", t); continue; }
      if (t.slice(0, 2) === "--") { out += span("cmt", t); continue; }
      if (/^\d/.test(t)) { out += span("num", t); continue; }
      if (t === "*") { out += span("star", t); continue; }
      if (/^[(),.;]$/.test(t)) { out += span("punc", t); continue; }
      if (/^[=<>!+\-\/%|]+$/.test(t)) { out += span("op", t); continue; }
      var low = t.toLowerCase();
      if (KWSET.has(low)) { out += span("kw", t); continue; }
      if (FNSET.has(low)) { out += span("fn", t); continue; }
      if (IDSET.has(low)) { out += span("id", t); continue; }
      out += esc(t);
    }
    return out;
  }
  function span(cls, t) { return '<span class="shl-' + cls + '">' + esc(t) + "</span>"; }

  /* ---------- one-time CSS ---------- */
  function injectCss() {
    if (document.getElementById("shl-style")) return;
    var css = [
      ".shl-wrap{position:relative;}",
      ".shl-pre{position:absolute;top:0;left:0;right:0;bottom:0;margin:0;",
        "overflow:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:anywhere;",
        "word-break:break-word;box-sizing:border-box;color:#e6e1d6;}",
      "textarea.shl-on{position:relative;background:transparent!important;",
        "color:transparent!important;-webkit-text-fill-color:transparent;caret-color:#ffd9ec;}",
      // palette (tuned for the #0e1116 terminal background)
      ".shl-kw{color:#ff7ab6;font-weight:600;}",   // keywords  → pink
      ".shl-fn{color:#c9a3ff;}",                    // functions → violet
      ".shl-id{color:#63d3e3;}",                    // tables/cols → cyan
      ".shl-num{color:#e9b657;}",                   // numbers   → amber
      ".shl-str{color:#74e0a0;}",                   // strings   → green
      ".shl-star{color:#ff8aa8;}",                  // *         → rose
      ".shl-op{color:#b6c0cf;}",                    // operators
      ".shl-punc{color:#7f8a9c;}",                  // punctuation
      ".shl-cmt{color:#5d6675;font-style:italic;}", // comments
    ].join("");
    var s = document.createElement("style");
    s.id = "shl-style"; s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- enhance a textarea ---------- */
  var COPY = ["fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing",
    "paddingTop","paddingRight","paddingBottom","paddingLeft",
    "borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth",
    "textIndent","tabSize"];

  function enhance(ta) {
    if (!ta || ta.__shl) return;
    ta.__shl = true;

    var wrap = document.createElement("div");
    wrap.className = "shl-wrap";
    ta.parentNode.insertBefore(wrap, ta);
    wrap.appendChild(ta);

    var pre = document.createElement("pre");
    pre.className = "shl-pre";
    var code = document.createElement("code");
    pre.appendChild(code);
    wrap.insertBefore(pre, ta);

    ta.classList.add("shl-on");

    function syncStyle() {
      var cs = getComputedStyle(ta);
      COPY.forEach(function (p) { pre.style[p] = cs[p]; });
      // mirror the textarea's border as a transparent border so text origin lines up
      pre.style.borderStyle = "solid";
      pre.style.borderColor = "transparent";
      // match the wrap to the textarea's outer box
      wrap.style.borderRadius = cs.borderRadius;
    }
    function render() {
      code.innerHTML = highlight(ta.value + "\n");
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
    function syncScroll() { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; }

    syncStyle();
    render();

    ta.addEventListener("input", render);
    ta.addEventListener("scroll", syncScroll);
    window.addEventListener("resize", syncStyle);

    // catch programmatic value changes (chips, column-insert, clear, restored code)
    var last = ta.value;
    setInterval(function () {
      if (ta.value !== last) { last = ta.value; render(); }
    }, 150);
  }

  /* ---------- boot + watch for dynamically-added exercise editors ---------- */
  function sweep() {
    var ed = document.getElementById("editor");
    if (ed) enhance(ed);
    document.querySelectorAll("textarea.ex-editor").forEach(enhance);
  }

  function start() {
    injectCss();
    sweep();
    var host = document.getElementById("ex-list") || document.body;
    var mo = new MutationObserver(function () { sweep(); });
    mo.observe(host, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
