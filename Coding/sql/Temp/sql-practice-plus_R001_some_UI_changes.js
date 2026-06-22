// sql-practice-plus.js — adds two things to the SQLZoo "Graded exercises" section,
// without touching the engine, grading, or markup that sqlzoo-lab.js produces:
//   1. A collapsible tap-to-insert token toolbar on every exercise (keywords + that
//      dataset's table/column names) — great on mobile.
//   2. A problem-tab strip: one exercise shown at a time; solved exercises drop out.
// Load AFTER sqlzoo-lab.js (and after sql-highlight.js if used):
//   <script src="sql-practice-plus.js"></script>
(function () {
  "use strict";

  /* ---------- which columns belong to each dataset ---------- */
  var SCHEMA = window.SQLZOO_SCHEMA || [];
  var EX = window.SQLZOO_EXERCISES || [];
  var BY_TABLE = {};
  SCHEMA.forEach(function (t) { BY_TABLE[t.name] = (t.cols || []).slice(); });
  var DS_TABLES = { world: ["world"], nobel: ["nobel"], football: ["eteam", "game", "goal"] };

  // Which tables does this exercise actually touch? Parse its solution SQL
  // (FROM / JOIN), then union with the rest of its dataset so in-dataset joins
  // are reachable. Falls back to every table if nothing is detected.
  function tablesForEx(ex) {
    var found = [];
    if (ex && ex.sol) {
      var re = /\b(?:from|join)\s+("?[a-z_][a-z0-9_]*"?)/gi, m;
      while ((m = re.exec(ex.sol)) !== null) {
        var t = m[1].replace(/"/g, "").toLowerCase();
        if (BY_TABLE[t] && found.indexOf(t) < 0) found.push(t);
      }
    }
    var dsTables = DS_TABLES[ex && ex.ds] || [];
    dsTables.forEach(function (t) { if (found.indexOf(t) < 0) found.push(t); });
    if (!found.length) found = Object.keys(BY_TABLE);
    return found;
  }
  function exOf(card) {
    return EX.find(function (x) { return ("card-" + x.id) === card.id || x.id === card.id; }) || null;
  }

  var KW_TOKENS = ["SELECT", "DISTINCT", "FROM", "WHERE", "AND", "OR", "ORDER BY", "DESC",
    "GROUP BY", "HAVING", "LIMIT", "JOIN", "ON", "COUNT(", "SUM(", "AVG(", "LIKE", "IN (",
    "BETWEEN", "=", "*", ",", "'  '"];

  /* ---------- insert text at a textarea's caret + notify listeners ---------- */
  function insertAtCursor(ta, raw) {
    var token = raw, back = 0;
    if (token === "'  '") { token = "''"; back = 1; }
    else if (/[(]$/.test(token)) { /* leave caret right after "(" */ }
    else token = token + " ";
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    var before = v.slice(0, s);
    var needSpace = before.length && !/\s$/.test(before) && !/[(,]$/.test(before) && !/^[,)]/.test(token);
    var ins = (needSpace ? " " : "") + token;
    ta.value = before + ins + v.slice(e);
    var pos = s + ins.length - back;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    // let the highlighter + the app's progress-saver react
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* ---------- build the toolbar for one card ---------- */
  function addToolbar(card) {
    if (card.__plusBar) return;
    var ta = card.querySelector("textarea.ex-editor");
    if (!ta) return;
    card.__plusBar = true;
    var ex = exOf(card);

    var wrap = document.createElement("div");
    wrap.className = "pp-toolwrap";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pp-keys-toggle";
    toggle.innerHTML = '<span class="pp-ico">\u2328</span><span class="pp-kt-label">Insert keywords &amp; columns</span><span class="pp-caret">\u2304</span>';

    var tray = document.createElement("div");
    tray.className = "pp-tray";

    var rowK = document.createElement("div"); rowK.className = "pp-row";
    KW_TOKENS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "pp-tok pp-tok-kw";
      b.textContent = (t === "'  '") ? "' '" : t;
      b.addEventListener("click", function () { insertAtCursor(ta, t); });
      rowK.appendChild(b);
    });

    var rowC = document.createElement("div"); rowC.className = "pp-row";
    // group columns under their table — the table name is itself a tappable chip
    tablesForEx(ex).forEach(function (tn) {
      var tb = document.createElement("button");
      tb.type = "button"; tb.className = "pp-tok pp-tok-tbl";
      tb.textContent = tn;
      tb.title = "table";
      tb.addEventListener("click", function () { insertAtCursor(ta, tn); });
      rowC.appendChild(tb);
      (BY_TABLE[tn] || []).forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "pp-tok pp-tok-id";
        b.textContent = c;
        b.addEventListener("click", function () { insertAtCursor(ta, c); });
        rowC.appendChild(b);
      });
    });

    tray.appendChild(rowK); tray.appendChild(rowC);

    toggle.addEventListener("click", function () {
      var open = wrap.classList.toggle("open");
      toggle.querySelector(".pp-kt-label").textContent = open ? "Hide keys" : "Insert keywords & columns";
      toggle.querySelector(".pp-caret").textContent = open ? "\u2303" : "\u2304";
    });

    wrap.appendChild(toggle);
    wrap.appendChild(tray);
    // place the toolbar just above the editor (or its highlight wrapper)
    var anchor = ta.closest(".shl-wrap") || ta;
    anchor.parentNode.insertBefore(wrap, anchor);
  }

  /* ---------- problem tabs ---------- */
  var DS_COLOR = { world: "#2f7d57", nobel: "#7a4ea0", football: "#b06a1f" };
  var host, strip, track, cards = [], activeId = null;

  function collectCards() {
    cards = Array.prototype.slice.call(document.querySelectorAll("#ex-list .ex-card"));
  }
  function isDone(card) { return card.classList.contains("done"); }

  function buildStrip() {
    if (!host) return;
    if (!strip) {
      strip = document.createElement("div");
      strip.className = "pp-tabs";
      strip.innerHTML = '<span class="pp-tabs-label"></span><div class="pp-tabs-track"></div>';
      host.parentNode.insertBefore(strip, host);
      track = strip.querySelector(".pp-tabs-track");
    }
    var remaining = cards.filter(function (c) { return !isDone(c) || c.id === activeId; });
    var allDone = cards.length && cards.every(isDone);
    strip.querySelector(".pp-tabs-label").textContent = allDone ? "all solved" : "remaining";

    track.innerHTML = "";
    if (allDone) {
      // once everything's solved, show all tabs again so they can revisit
      remaining = cards;
    }
    remaining.forEach(function (c) {
      var ex = EX.find(function (x) { return ("card-" + x.id) === c.id; }) || {};
      var ds = ex.ds || "world";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pp-tab" + (c.id === activeId ? " active" : "") + (isDone(c) ? " done" : "");
      b.style.setProperty("--dc", DS_COLOR[ds] || "#888");
      b.innerHTML = '<span class="pp-tab-id">' + (ex.id ? ex.id.toUpperCase() : "") + "</span>" +
        '<span class="pp-tab-t">' + (ex.title || "") + "</span>" +
        (isDone(c) ? '<span class="pp-tab-chk">\u2713</span>' : "");
      b.addEventListener("click", function () { show(c.id); });
      track.appendChild(b);
    });
  }

  function show(id) {
    activeId = id;
    cards.forEach(function (c) { c.style.display = (c.id === id) ? "" : "none"; });
    // hide the dataset group headers — tabs replace that grouping
    document.querySelectorAll("#ex-list .ex-group-head").forEach(function (h) { h.style.display = "none"; });
    // un-hide empty groups' spacing
    document.querySelectorAll("#ex-list .ex-group").forEach(function (g) {
      var has = g.querySelector('.ex-card[style=""]') || g.querySelector('.ex-card:not([style*="none"])');
      g.style.margin = "0";
    });
    buildStrip();
    var active = document.getElementById(id);
    if (active) {
      var t = track && track.querySelector(".pp-tab.active");
      if (t && t.scrollIntoView) t.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }

  function nextUnsolvedAfter(id) {
    var idx = cards.findIndex(function (c) { return c.id === id; });
    for (var k = 1; k <= cards.length; k++) {
      var c = cards[(idx + k) % cards.length];
      if (!isDone(c)) return c.id;
    }
    return null;
  }

  function watchSolves() {
    var mo = new MutationObserver(function (muts) {
      var advanced = false;
      muts.forEach(function (m) {
        if (m.type === "attributes" && m.target.classList.contains("ex-card") && isDone(m.target)) {
          if (m.target.id === activeId && !advanced) {
            advanced = true;
            var nid = nextUnsolvedAfter(activeId);
            // small delay so the user sees the ✓ feedback before the card switches
            setTimeout(function () {
              if (nid) { show(nid); window.scrollTo({ top: scrollAnchor(), behavior: "smooth" }); }
              else buildStrip();
            }, 900);
          } else {
            buildStrip();
          }
        }
      });
    });
    cards.forEach(function (c) { mo.observe(c, { attributes: true, attributeFilter: ["class"] }); });
  }

  function scrollAnchor() {
    var s = strip ? strip.getBoundingClientRect().top + window.scrollY - 8 : 0;
    return s;
  }

  /* ---------- CSS (reuses the page's own palette vars) ---------- */
  function injectCss() {
    if (document.getElementById("pp-style")) return;
    var css = `
    .pp-toolwrap{margin:10px 0;}
    .pp-keys-toggle{display:inline-flex;align-items:center;gap:8px;font-family:"JetBrains Mono",monospace;
      font-size:12px;color:var(--ink-soft);background:var(--paper-2);border:1px solid var(--rule-soft);
      border-radius:8px;padding:8px 13px;cursor:pointer;min-height:38px;}
    .pp-keys-toggle:hover{border-color:var(--oxblood);color:var(--ink);}
    .pp-toolwrap.open .pp-keys-toggle{background:var(--paper);border-color:var(--oxblood);color:var(--ink);}
    .pp-ico{font-size:14px;} .pp-caret{color:var(--ink-mute);font-size:11px;}
    .pp-tray{display:none;flex-direction:column;gap:7px;margin-top:9px;}
    .pp-toolwrap.open .pp-tray{display:flex;}
    .pp-row{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin;
      scrollbar-color:var(--rule) transparent;
      -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent);
      mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent);}
    .pp-row::-webkit-scrollbar{height:5px;}
    .pp-row::-webkit-scrollbar-thumb{background:var(--rule);border-radius:99px;}
    .pp-tok{flex:0 0 auto;font-family:"JetBrains Mono",monospace;font-size:13px;padding:8px 12px;
      border-radius:8px;cursor:pointer;border:1px solid;min-height:38px;display:inline-flex;align-items:center;
      user-select:none;}
    .pp-tok:active{transform:translateY(1px);}
    .pp-tok-kw{background:#fbe6f1;border-color:#f3c2dd;color:#b03a78;font-weight:600;}
    .pp-tok-id{background:#e3f0fb;border-color:#bcdcf3;color:#1f6fa6;}
    .pp-tok-tbl{background:#e4f3ea;border-color:#bcdfca;color:#1f7a4d;font-weight:700;}
    .pp-tok-tbl::before{content:"\\25A4";margin-right:6px;opacity:.7;font-size:11px;}

    .pp-tabs{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;
      background:color-mix(in oklab, var(--paper) 92%, transparent);backdrop-filter:blur(8px);
      border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);margin:0 0 18px;}
    .pp-tabs-label{flex:0 0 auto;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:1.6px;
      text-transform:uppercase;color:var(--ink-mute);}
    .pp-tabs-track{display:flex;gap:8px;overflow-x:auto;padding:9px 0;scrollbar-width:thin;
      -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 26px),transparent);
      mask-image:linear-gradient(to right,#000 calc(100% - 26px),transparent);}
    .pp-tabs-track::-webkit-scrollbar{height:5px;}
    .pp-tabs-track::-webkit-scrollbar-thumb{background:var(--rule);border-radius:99px;}
    .pp-tab{--dc:#888;flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:8px 13px;
      border-radius:20px;cursor:pointer;border:1px solid var(--rule);background:var(--paper-3);
      font-family:"JetBrains Mono",monospace;max-width:230px;}
    .pp-tab:hover{border-color:var(--dc);}
    .pp-tab-id{font-size:11px;font-weight:700;color:var(--dc);flex:0 0 auto;}
    .pp-tab-t{font-size:12.5px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .pp-tab.active{background:var(--ink);border-color:var(--ink);}
    .pp-tab.active .pp-tab-id{color:#fff;} .pp-tab.active .pp-tab-t{color:var(--paper);}
    .pp-tab-chk{color:var(--ok);font-size:11px;flex:0 0 auto;} .pp-tab.active .pp-tab-chk{color:#8fe0b0;}
    @media (max-width:680px){ .pp-tabs-label{display:none;} }
    `;
    var s = document.createElement("style");
    s.id = "pp-style"; s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- boot ---------- */
  var started = false;
  function tryStart() {
    host = document.getElementById("ex-list");
    if (!host) return;
    collectCards();
    if (!cards.length) return;      // exercises not built yet
    if (started) return;
    started = true;

    injectCss();
    cards.forEach(addToolbar);
    // pick the first unsolved as the opening tab
    var firstUnsolved = cards.find(function (c) { return !isDone(c); });
    activeId = (firstUnsolved || cards[0]).id;
    buildStrip();
    show(activeId);
    watchSolves();
  }

  // exercises are built asynchronously (after the wasm engine loads) — watch for them
  var poll = setInterval(function () { tryStart(); if (started) clearInterval(poll); }, 200);
  if (document.readyState !== "loading") tryStart();
  else document.addEventListener("DOMContentLoaded", tryStart);
})();
