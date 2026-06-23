// sql-practice-plus.js — adds two things to the SQLZoo "Graded exercises" section,
// without touching the engine, grading, or markup that sqlzoo-lab.js produces:
//   1. A collapsible tap-to-insert token toolbar on every exercise (keywords + that
//      dataset's table/column names) — great on mobile.
//   2. A problem-tab strip: one exercise shown at a time; solved exercises drop out.
// Load AFTER sqlzoo-lab.js (and after sql-highlight.js if used):
//   <script src="sql-practice-plus.js"></script>
(function () {
  "use strict";

  // idempotent: if this file is included twice, the second copy does nothing
  if (window.__sqlPracticePlus) return;
  window.__sqlPracticePlus = true;

  /* ---------- which columns belong to each dataset ---------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
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
      if (isDone(active)) addNextButton(active);   // already-solved cards keep a Next →
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
      muts.forEach(function (m) {
        if (m.type === "attributes" && m.target.classList.contains("ex-card") && isDone(m.target)) {
          // Manual advance only: keep the result + "Correct" state on screen and
          // offer an explicit "Next →" button. No auto-jump, no timer.
          addNextButton(m.target);
          buildStrip();
        }
      });
    });
    cards.forEach(function (c) { mo.observe(c, { attributes: true, attributeFilter: ["class"] }); });
  }

  // Explicit "Next →" on a solved card. On tap: clear this card's result so no
  // stale table lingers, then advance to the next unsolved problem.
  function addNextButton(card) {
    if (card.__ppNext) return;
    card.__ppNext = true;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pp-next";
    btn.textContent = "Next →";
    btn.addEventListener("click", function () {
      var nid = nextUnsolvedAfter(card.id);
      var out = card.querySelector(".ex-out");
      if (out) out.innerHTML = "";           // drop the previous card's result table
      if (nid) { show(nid); }
      else { buildStrip(); }
      window.scrollTo({ top: scrollAnchor(), behavior: "smooth" });
    });
    var out = card.querySelector(".ex-out");
    if (out && out.parentNode) out.parentNode.insertBefore(btn, out.nextSibling);
    else card.appendChild(btn);
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
    .pp-tok-tbl::before{content:"▤";margin-right:6px;opacity:.7;font-size:11px;}

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

    /* attempts log */
    .pp-att{margin-top:16px;border-top:1px dashed var(--rule);padding-top:13px;}
    .pp-att-head{display:flex;align-items:center;gap:9px;font-family:"JetBrains Mono",monospace;
      font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-mute);
      cursor:pointer;user-select:none;}
    .pp-att-head:hover{color:var(--ink-soft);}
    .pp-att-ico{font-size:13px;color:var(--oxblood);}
    .pp-att-count{color:var(--oxblood);}
    .pp-att-head::after{content:"▾";margin-left:auto;font-size:10px;color:var(--ink-mute);transition:transform .15s ease;}
    .pp-att.open .pp-att-head::after{transform:rotate(180deg);}
    .pp-att-list{display:none;flex-direction:column;gap:9px;margin-top:12px;}
    .pp-att.open .pp-att-list{display:flex;}
    .pp-att-empty{font-family:"JetBrains Mono",monospace;font-size:11.5px;color:var(--ink-mute);
      font-style:italic;padding:2px 0 4px;}
    .pp-att-row{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:start;}
    .pp-att-badge{flex:0 0 auto;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;
      font-size:11px;font-weight:800;color:#fff;margin-top:1px;}
    .pp-att-badge.ok{background:var(--ok);}
    .pp-att-badge.bad{background:var(--oxblood);}
    .pp-att-main{min-width:0;}
    .pp-att-q{font-family:"JetBrains Mono",monospace;font-size:12px;line-height:1.45;color:var(--term-w);
      background:var(--term-bg);border:1px solid var(--term-bg-3);border-radius:6px;padding:7px 10px;
      white-space:pre-wrap;word-break:break-word;}
    .pp-att-reason{font-family:"JetBrains Mono",monospace;font-size:10.5px;margin-top:4px;letter-spacing:0.02em;}
    .pp-att-reason.ok{color:var(--ok);}
    .pp-att-reason.bad{color:var(--oxblood);}
    .pp-att-when{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-mute);
      white-space:nowrap;flex:0 0 auto;padding-top:3px;}
    .pp-att-more{background:none;border:none;font-family:"JetBrains Mono",monospace;font-size:11px;
      color:var(--oxblood);cursor:pointer;text-decoration:underline;text-underline-offset:3px;
      padding:2px 0;text-align:left;align-self:flex-start;}
    .pp-att-save{margin-top:7px;font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:600;
      color:#fff;background:var(--oxblood);border:1px solid var(--oxblood);border-radius:6px;
      padding:5px 11px;cursor:pointer;align-self:flex-start;}
    .pp-att-save:hover{filter:brightness(1.08);}
    .pp-att-save.saved,.pp-att-save:disabled{background:var(--paper-3);color:var(--ok);
      border-color:var(--rule-soft);cursor:default;filter:none;}

    /* manual-advance "Next →" on a solved card */
    .pp-next{margin-top:14px;width:100%;justify-content:center;display:inline-flex;align-items:center;gap:8px;
      font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:600;
      background:var(--ok);color:#fff;border:1px solid var(--ok);border-radius:8px;padding:11px 16px;cursor:pointer;}
    .pp-next:hover{filter:brightness(1.07);}
    `;
    var s = document.createElement("style");
    s.id = "pp-style"; s.textContent = css;
    document.head.appendChild(s);
  }

  /* ===========================================================
     ATTEMPTS LOG — remembers every Run & Check per exercise,
     pass or fail, and shows the trail inline on the card.
     Wrong attempts are exactly what the Mistake Drill banks.
     =========================================================== */
  var ATT_KEY = "commonplace_sqlzoo_attempts";
  function loadAttempts() {
    try { return JSON.parse(localStorage.getItem(ATT_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveAttempts(a) {
    try { localStorage.setItem(ATT_KEY, JSON.stringify(a)); } catch (e) {}
  }
  var ATT = loadAttempts();

  function relTime(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return "just now";
    var m = Math.round(s / 60);
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 24) return h + "h ago";
    var d = Math.round(h / 24);
    if (d < 14) return d + "d ago";
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function exIdOf(card) { return card.id.replace(/^card-/, ""); }

  function renderAttempts(card) {
    var panel = card.querySelector(".pp-att");
    if (!panel) return;
    var id = exIdOf(card);
    var list = (ATT[id] || []).slice().reverse();   // newest first
    var body = panel.querySelector(".pp-att-list");
    var countEl = panel.querySelector(".pp-att-count");
    var solved = list.filter(function (a) { return a.ok; }).length;
    var tries = list.length;

    countEl.textContent = tries === 0 ? "none yet"
      : tries + (tries === 1 ? " try" : " tries");

    if (tries === 0) {
      body.innerHTML = '<div class="pp-att-empty">No attempts yet — hit Run &amp; Check and your trail builds here.</div>';
      return;
    }

    var shown = panel.classList.contains("more") ? list : list.slice(0, 4);
    var rows = shown.map(function (a, i) {
      var status = a.ok
        ? '<span class="pp-att-badge ok">✓</span>'
        : '<span class="pp-att-badge bad">✕</span>';
      var meta = a.ok ? "solved" : (a.msg || "wrong result");
      var saveBtn = a.saved
        ? '<button class="pp-att-save saved" type="button" disabled>Saved ✓</button>'
        : '<button class="pp-att-save" type="button" data-i="' + i + '">Save to bank</button>';
      return '<div class="pp-att-row">' +
          status +
          '<div class="pp-att-main">' +
            '<div class="pp-att-q">' + esc(a.q) + "</div>" +
            '<div class="pp-att-reason ' + (a.ok ? "ok" : "bad") + '">' + esc(meta) + "</div>" +
            saveBtn +
          "</div>" +
          '<span class="pp-att-when">' + relTime(a.t) + "</span>" +
        "</div>";
    }).join("");

    var extra = list.length - shown.length;
    if (extra > 0 && !panel.classList.contains("more")) {
      rows += '<button class="pp-att-more" type="button">+ ' + extra + " earlier " +
        (extra === 1 ? "attempt" : "attempts") + "</button>";
    }
    body.innerHTML = rows;

    var moreBtn = body.querySelector(".pp-att-more");
    if (moreBtn) moreBtn.addEventListener("click", function () {
      panel.classList.add("more"); renderAttempts(card);
    });

    // per-attempt opt-in "Save to bank"
    Array.prototype.forEach.call(body.querySelectorAll(".pp-att-save:not([disabled])"), function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-i"), 10);
        saveAttemptToBank(card, shown[i], btn);
      });
    });
  }

  /* exercise-id map (commonplace_exercises rows). Keys are the lowercase
     card/localStorage ids (w1, n3, f2) — no case conversion needed. */
  var SQL_EXERCISE_IDS = {
    w1:"d84d587b-82c6-4636-a18e-2d70a40b34b2", w2:"7f736c6a-f1d5-4947-be60-a878daa6f6cd",
    w3:"8260a723-1a21-4d74-8b9e-e2fdfc57e2c4", w4:"642a7744-0c77-4189-8b24-61d3296f882c",
    w5:"dac23c04-9dbf-4038-bf30-33f9bb1d3fdd", w6:"7c228bed-bbea-43bd-bf7f-67c7f3972858",
    w7:"b2292092-bcde-4a2a-8252-173796788f08", w8:"f57bbb44-87b0-44cb-bb85-c3710020ceca",
    n1:"ff4b8818-39bb-4321-bfa1-9707c129d90c", n2:"4a15b925-1a20-4c44-b9c9-601e02b159ea",
    n3:"9560237e-ebeb-41d6-95e7-95a576fd8884", n4:"9c2c0ed0-fe0d-4a9a-8ddf-2b7df8d33e7a",
    n5:"77241724-d6b3-45d2-9c4e-290dda0dc08d", n6:"517383e0-7195-4d28-8ce6-6ad3328adadc",
    f1:"98e8e367-103d-47a4-a140-4cb2da000bfe", f2:"b3e35982-742e-4ca0-a048-066caa5d76ca",
    f3:"eeb913d6-4015-4b2e-a16e-647a2e3cfca8", f4:"1bc32ddb-1be7-44ca-bbfe-841806273c1f",
    f5:"972f4db8-6956-4290-ae06-3e4aa27f5c72",
  };

  // Insert ONE attempt into the bank. Requires a session (mirrors the C++/Python
  // screens: RLS own_insert checks auth.uid() = user_id). Idempotent via a.saved.
  function saveAttemptToBank(card, a, btn) {
    if (!a || a.saved) return;
    var user = window.currentUser;
    if (!user) {
      // no session — surface sign-in and abort; the user saves again after auth
      if (typeof window.sqlzooRevealSignIn === "function") window.sqlzooRevealSignIn();
      return;
    }
    var sb = window.sb;
    if (!sb) { return; }
    var exId = SQL_EXERCISE_IDS[exIdOf(card)] || null;

    btn.disabled = true; btn.textContent = "Saving…";

    function markSaved() {
      a.saved = true;
      saveAttempts(ATT);     // persist so it can never insert twice, even across reloads
      renderAttempts(card);
    }
    function fail(msg) {
      btn.disabled = false; btn.textContent = "Save to bank";
      alert("Could not save: " + msg);
    }

    sb.from("commonplace_attempts").insert({
      user_id: user.id,
      subject: "sql",
      language: "sql",
      code: a.q,
      passed: a.ok,
      stderr: a.ok ? null : a.msg,
      exercise_id: exId
    }).select("id").single().then(function (res) {
      if (res.error) { fail(res.error.message); return; }
      var attemptId = res.data.id;
      // failures also bank a mistake row; passed attempts get NO mistake row
      if (a.ok === false) {
        return sb.from("commonplace_mistakes").insert({
          user_id: user.id,
          attempt_id: attemptId,
          exercise_id: exId,
          subject: "sql",
          reason: a.msg
        }).then(function (r2) {
          if (r2 && r2.error) { alert("Saved the attempt, but the mistake log failed: " + r2.error.message); }
          markSaved();
        });
      }
      markSaved();
    }).catch(function (e) { fail(e.message); });
  }

  function logAttempt(card) {
    var id = exIdOf(card);
    var ta = card.querySelector("textarea.ex-editor");
    var fb = card.querySelector(".ex-feedback");
    if (!ta) return;
    var q = (ta.value || "").trim();
    if (!q) return;                              // nothing typed
    var ok = !!(fb && fb.classList.contains("ok"));
    var msg = "";
    if (fb) {
      msg = fb.textContent.replace(/^[✓✕]\s*/, "").trim();
      // tighten common phrasings for the compact reason line
      if (/no result set/i.test(msg)) msg = "no rows returned";
      else if (/^SQL error/i.test(msg)) msg = msg.split("—")[0].trim();
    }
    var arr = ATT[id] || (ATT[id] = []);
    var last = arr[arr.length - 1];
    if (last && last.q === q && last.ok === ok) { renderAttempts(card); return; } // dedupe identical consecutive
    arr.push({ q: q, ok: ok, msg: msg, t: Date.now() });
    if (arr.length > 25) arr.shift();
    saveAttempts(ATT);
    renderAttempts(card);
  }

  function attachAttempts(card) {
    if (card.__ppAtt) return;
    var runB = card.querySelector(".btn.run");
    if (!runB) return;
    card.__ppAtt = true;

    var panel = document.createElement("div");
    panel.className = "pp-att";
    panel.innerHTML =
      '<div class="pp-att-head">' +
        '<span class="pp-att-ico">↻</span> Your attempts' +
        '<span class="pp-att-count"></span>' +
      "</div>" +
      '<div class="pp-att-list"></div>';
    card.appendChild(panel);

    if ((ATT[exIdOf(card)] || []).length) panel.classList.add("open");
    panel.querySelector(".pp-att-head").addEventListener("click", function () {
      panel.classList.toggle("open");
    });

    // fires AFTER sqlzoo-lab's own check() handler (registered earlier), so
    // the feedback element is already populated when we read it.
    runB.addEventListener("click", function () { setTimeout(function () { logAttempt(card); }, 0); });
    // also catch ⌘/Ctrl-Enter runs from inside the editor
    var ta = card.querySelector("textarea.ex-editor");
    if (ta) ta.addEventListener("keydown", function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") setTimeout(function () { logAttempt(card); }, 0);
    });

    renderAttempts(card);
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
    cards.forEach(attachAttempts);
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
