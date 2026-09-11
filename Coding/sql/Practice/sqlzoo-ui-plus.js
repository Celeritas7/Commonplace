/* sqlzoo-ui-plus.js — three UI upgrades for the SQLZoo practice cards.
   Load LAST, after sqlzoo-lab.js / sql-practice-plus.js / sql-highlight.js:

     <script src="sqlzoo-ui-plus.js"></script>

   1. Key palette moves BELOW the query editor.
   2. Each card gets a Fullscreen toggle (Esc exits).
   3. Tapping a table chip opens a schema sheet above the page:
      every column with its type, plus the table's first five rows.
   Nothing in sqlzoo-lab.js, the grading, or the seed data is touched. */
(function () {
  "use strict";
  if (window.__sqlzooUiPlus) return;
  window.__sqlzooUiPlus = true;
  window.SQLZOO_SCHEMA = { open: function (table, ta, ds) { openSheet(table, ta, ds); }, close: function () { closeSheet(); } };

  /* How should tapping a table chip behave?
       "split"      – chip keeps its normal behaviour; a small ⤢ button opens the schema  (default)
       "first-time" – chip opens the schema once per table, then behaves normally; ⤢ always reopens
       "always"     – every chip tap opens the schema                                            */
  var SCHEMA_TAP = window.SQLZOO_SCHEMA_TAP || "split";
  var seen = {};

  var PAPER = "#faf6ec", RULE = "#ddd2bb", RULE_2 = "#e9e0cc", INK = "#211b13", MUTE = "#8c8169", SOFT = "#56503f", GREEN = "#2f7d57";
  var MONO = "'JetBrains Mono',monospace";

  var style = document.createElement("style");
  style.textContent = [
    ".zp-ovl{position:fixed;inset:0;z-index:900;background:rgba(33,27,19,.52);display:flex;align-items:center;justify-content:center;padding:24px}",
    ".zp-sheet{width:100%;max-width:920px;max-height:88vh;overflow:auto;background:" + PAPER + ";border:1px solid " + INK + ";border-radius:14px;box-shadow:0 24px 60px rgba(33,27,19,.35);animation:zpUp .18s ease-out}",
    "@keyframes zpUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}",
    ".zp-sheet table{border-collapse:collapse;width:100%;font-family:" + MONO + ";font-size:11.5px;white-space:nowrap}",
    ".zp-sheet thead th{text-align:left;background:#f6f0e2;color:" + INK + ";border-bottom:2px solid #cdbfa3;padding:8px 12px;font-weight:700}",
    ".zp-sheet tbody td{border-bottom:1px solid " + RULE_2 + ";padding:7px 12px;color:" + SOFT + "}",
    ".zp-colrow{display:grid;grid-template-columns:1.1fr .7fr 1.4fr;gap:10px;width:100%;text-align:left;align-items:baseline;padding:7px 2px;border:0;border-bottom:1px solid " + RULE_2 + ";background:transparent;cursor:pointer;font-family:" + MONO + ";font-size:12.5px;color:" + INK + "}",
    ".zp-colrow:hover{background:#f4efe3}",
    ".zp-btn{font-family:" + MONO + ";font-size:12px;font-weight:600;color:" + SOFT + ";background:#fbf8ef;border:1px solid " + RULE + ";border-radius:8px;height:32px;padding:0 12px;cursor:pointer;white-space:nowrap;flex:0 0 auto}",
    ".zp-btn:hover{color:" + INK + ";border-color:#cdbfa3}",
    ".ex-card.zp-full{position:fixed;inset:0;z-index:800;margin:0;border-radius:0;border:0;overflow:auto;padding:22px clamp(16px,5vw,80px) 44px;background:" + PAPER + "}",
    "body.zp-locked{overflow:hidden}",
    /* --- typographic rebalance: one step between levels, breathing room on phones --- */
    "#ex-list .ex-card{padding:16px 18px;display:flex;flex-direction:column;gap:13px;border-radius:12px}",
    "#ex-list .ex-head{flex-wrap:wrap;gap:9px;align-items:center}",
    "#ex-list .ex-title{font-size:19px;line-height:1.3;flex:1 1 100%;order:3;text-wrap:pretty}",
    "#ex-list .ex-id{font-size:10px;letter-spacing:1px;padding:3px 7px;color:#6b5d45;background:transparent;border:1px solid #cdbfa3;border-radius:6px}",
    "#ex-list .ex-card.done .ex-id{color:#fff;background:#1f8a4e;border-color:#1f8a4e}",
    "#ex-list .zp-full-btn{margin-left:auto}",
    "#ex-list .ex-prompt{margin:0;font-size:16.5px;line-height:1.55}",
    "#ex-list .ex-editor{min-height:110px;font-size:13px;line-height:1.6;padding:12px 14px;border-radius:11px;background:#fff;color:" + INK + ";border:1px solid #cdbfa3}",
    "#ex-list .ex-actions{margin:0;gap:10px}",
    "#ex-list .ex-actions .btn{font-size:13px;padding:13px 16px;border-radius:11px}",
    "#ex-list .ex-actions .btn.run{flex:1;min-width:180px;font-size:14px;padding:13px}",
    "#ex-list .ex-hint,#ex-list .ex-feedback,#ex-list .ex-reveal{margin:0}",
    "#ex-list .ex-hint{font-size:16px;line-height:1.55;border-radius:10px;padding:11px 14px}",
    "#ex-list .zk-host{margin:0!important}"
  ].join("");
  document.head.appendChild(style);

  /* ---------- a private read-only DB for the preview rows ---------- */
  var dbPromise = null;
  function previewDb() {
    if (dbPromise) return dbPromise;
    dbPromise = (typeof initSqlJs === "function"
      ? initSqlJs({ locateFile: function (f) {
          var s = document.querySelector('script[src*="sql-wasm"]');
          return (s ? s.src.slice(0, s.src.lastIndexOf("/") + 1) : "") + f;
        } })
      : Promise.reject(new Error("sql.js not loaded"))
    ).then(function (SQL) {
      var db = new SQL.Database();
      db.run(window.SQLZOO_SEED || "");
      return db;
    });
    return dbPromise;
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fmt(v) {
    if (v === null || v === undefined) return "null";
    return typeof v === "number" ? v.toLocaleString("en-US") : String(v);
  }
  // ids are identifiers, not quantities — never add thousands separators
  function fmtCol(name, v) {
    if (/(^|_)id$/i.test(name || "")) return v === null || v === undefined ? "null" : String(v);
    return fmt(v);
  }

  /* ---------- schema sheet ---------- */
  var ovl = null, sheetTa = null, sheetDs = null;

  // foreign keys worth showing when a dataset spans several tables
  var JOINS = {
    football: ["game.team1 = eteam.id", "game.team2 = eteam.id", "goal.matchid = game.id", "goal.teamid = eteam.id"]
  };

  function datasetOf(table) {
    var T = (window.SQLZOO_KEYS && window.SQLZOO_KEYS.TABLES) || {};
    for (var ds in T) if (T[ds].some(function (t) { return t.t === table; })) return ds;
    return null;
  }
  function tablesOf(ds) {
    var T = (window.SQLZOO_KEYS && window.SQLZOO_KEYS.TABLES) || {};
    return (T[ds] || []).map(function (t) { return t.t; });
  }

  function closeSheet() { if (ovl) { ovl.remove(); ovl = null; document.body.classList.remove("zp-locked"); } }

  function openSheet(table, ta, ds) {
    closeSheet();
    sheetTa = ta;
    sheetDs = ds || datasetOf(table);
    var siblings = tablesOf(sheetDs);
    var tabsHtml = siblings.length < 2 ? "" : siblings.map(function (t) {
      var on = t === table;
      return '<button type="button" class="zp-tab" data-table="' + esc(t) + '" style="font-family:' + MONO + ';font-size:12.5px;font-weight:' + (on ? "700" : "600") +
        ';color:' + (on ? "#fff" : SOFT) + ';background:' + (on ? GREEN : "#fbf8ef") + ';border:1px solid ' + (on ? INK : RULE) +
        ';border-radius:7px;height:30px;padding:0 12px;cursor:pointer">' + esc(t) + "</button>";
    }).join("");
    var joins = (JOINS[sheetDs] || []);
    var joinsHtml = !joins.length ? "" :
      '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:12px 20px 0">' +
        '<span style="font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:' + MUTE + '">Joins on</span>' +
        joins.map(function (j) {
          return '<span style="font-family:' + MONO + ';font-size:11.5px;color:' + GREEN + ';background:#eef3ee;border:1px solid #cfdcd4;border-radius:6px;padding:3px 8px">' + esc(j) + "</span>";
        }).join("") +
      "</div>";
    ovl = document.createElement("div");
    ovl.className = "zp-ovl";
    ovl.innerHTML =
      '<div class="zp-sheet">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:14px 20px;border-bottom:1px solid ' + RULE + ';background:#f6f0e2;border-radius:13px 13px 0 0;flex-wrap:wrap">' +
          (sheetDs ? '<span style="font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:' + MUTE + ';margin-right:4px">' + esc(sheetDs) + "</span>" : "") +
          (tabsHtml || '<span style="font-family:' + MONO + ';font-size:14px;font-weight:700">' + esc(table) + "</span>") +
          '<span class="zp-count" style="font-family:' + MONO + ';font-size:11px;color:' + MUTE + '"></span>' +
          '<span style="flex:1"></span>' +
          '<button type="button" class="zp-btn zp-close">Close ✕</button>' +
        "</div>" + joinsHtml +
        '<div class="zp-body" style="padding:6px 20px 4px">' +
          '<div style="font-family:' + MONO + ';font-size:11.5px;color:' + MUTE + ';padding:14px 2px">reading schema…</div>' +
        "</div>" +
        '<div style="display:flex;gap:10px;align-items:center;padding:14px 20px 18px;flex-wrap:wrap">' +
          '<button type="button" class="zp-btn zp-insert" style="color:#fff;background:' + GREEN + ';border-color:' + INK + ';font-weight:700;height:34px;box-shadow:2px 2px 0 rgba(33,27,19,.5)">Insert &ldquo;' + esc(table) + '&rdquo;</button>' +
          '<span style="font-size:15px;color:' + MUTE + '">Tap any column row to drop it into your query.</span>' +
        "</div>" +
      "</div>";
    document.body.appendChild(ovl);
    document.body.classList.add("zp-locked");

    ovl.addEventListener("click", function (e) { if (e.target === ovl) closeSheet(); });
    ovl.querySelector(".zp-close").addEventListener("click", closeSheet);
    ovl.querySelector(".zp-insert").addEventListener("click", function () { insert(table); });
    ovl.querySelectorAll(".zp-tab").forEach(function (b) {
      b.addEventListener("click", function () { openSheet(b.getAttribute("data-table"), ta, sheetDs); });
    });

    previewDb().then(function (db) {
      var info = db.exec("PRAGMA table_info(" + table + ")");
      var cols = info.length ? info[0].values.map(function (r) { return { name: r[1], type: r[2] || "" }; }) : [];
      var rows = [], head = [];
      try {
        var res = db.exec("SELECT * FROM " + table + " LIMIT 5");
        if (res.length) { head = res[0].columns; rows = res[0].values; }
      } catch (err) { /* preview is optional */ }
      if (!ovl) return;
      ovl.querySelector(".zp-count").textContent = cols.length + " cols";

      var colHtml =
        '<div style="display:grid;grid-template-columns:1.1fr .7fr 1.4fr;gap:10px;padding:10px 2px 8px;border-bottom:1px solid ' + RULE + ';font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:' + MUTE + '">' +
        "<span>Column</span><span>Type</span><span>First row</span></div>" +
        cols.map(function (c, i) {
          var sample = rows.length ? fmtCol(c.name, rows[0][head.indexOf(c.name)]) : "";
          return '<button type="button" class="zp-colrow" data-col="' + esc(c.name) + '">' +
            '<span style="font-weight:600">' + esc(c.name) + "</span>" +
            '<span style="color:' + GREEN + ';font-size:11px">' + esc(c.type) + "</span>" +
            '<span style="color:' + MUTE + ';font-size:11.5px">' + esc(sample) + "</span></button>";
        }).join("");

      var rowsHtml = !rows.length ? "" :
        '<div style="padding:16px 0 0">' +
          '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px">' +
            '<span style="font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:' + MUTE + '">First 5 rows</span>' +
            '<span style="font-size:14.5px;color:' + MUTE + '">swipe sideways</span>' +
          "</div>" +
          '<div style="overflow-x:auto;border:1px solid ' + RULE + ';border-radius:9px;background:#fff">' +
            "<table><thead><tr>" + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
            rows.map(function (r) { return "<tr>" + r.map(function (v, i) { return "<td>" + esc(fmtCol(head[i], v)) + "</td>"; }).join("") + "</tr>"; }).join("") +
            "</tbody></table>" +
          "</div>" +
        "</div>";

      var body = ovl.querySelector(".zp-body");
      body.innerHTML = colHtml + rowsHtml;
      body.addEventListener("click", function (e) {
        var b = e.target.closest(".zp-colrow");
        if (b) insert(b.getAttribute("data-col"));
      });
    }).catch(function (e) {
      if (ovl) ovl.querySelector(".zp-body").innerHTML =
        '<div style="font-family:' + MONO + ';font-size:12px;color:#a23b2b;padding:16px 2px">Could not read the schema — ' + esc(e.message) + "</div>";
    });
  }

  function insert(text) {
    if (!sheetTa) return;
    if (window.SQLZOO_KEYS && window.SQLZOO_KEYS.insertKey) window.SQLZOO_KEYS.insertKey(sheetTa, text, "id");
    else { sheetTa.value += " " + text; sheetTa.dispatchEvent(new Event("input", { bubbles: true })); }
  }

  /* ---------- fullscreen ---------- */
  function addFullscreen(card) {
    var head = card.querySelector(".ex-head");
    if (!head || head.querySelector(".zp-full-btn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "zp-btn zp-full-btn";
    b.style.marginLeft = "6px";
    b.innerHTML = "⤢ Fullscreen";
    b.addEventListener("click", function () {
      var on = card.classList.toggle("zp-full");
      document.body.classList.toggle("zp-locked", on);
      b.innerHTML = on ? "⤡ Exit" : "⤢ Fullscreen";
      if (on) card.scrollTop = 0;
    });
    head.appendChild(b);
  }

  function exitFullscreen() {
    var c = document.querySelector(".ex-card.zp-full");
    if (!c) return false;
    c.classList.remove("zp-full");
    document.body.classList.remove("zp-locked");
    var b = c.querySelector(".zp-full-btn");
    if (b) b.innerHTML = "⤢ Fullscreen";
    return true;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (ovl) { closeSheet(); return; }
    exitFullscreen();
  });

  /* ---------- palette below the editor + table-chip interception ---------- */
  function isTableChip(btn) {
    return /\b\d+\s*cols\b/i.test(btn.textContent || "");
  }

  function upgrade(card) {
    var ta = card.querySelector("textarea.ex-editor");
    if (!ta) return;
    addFullscreen(card);

    // the palette host is the node sqlzoo-lab.js inserts just before the editor
    var anchor = ta.closest(".shl-wrap") || ta;
    var host = anchor.previousElementSibling;
    if (host && !host.__zpMoved && host.querySelector && host.textContent.indexOf("KEY") === 0) {
      host.__zpMoved = true;
      anchor.parentNode.insertBefore(host, anchor.nextSibling);
      host.style.marginTop = "12px";
      host.style.marginBottom = "0";
    } else if (host && !host.__zpMoved && /KEY PALETTE|KEYS HIDDEN/.test(host.textContent || "")) {
      host.__zpMoved = true;
      anchor.parentNode.insertBefore(host, anchor.nextSibling);
      host.style.marginTop = "12px";
      host.style.marginBottom = "0";
    }
  }

  // capture-phase so the palette's own handler never fires when we take the tap
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || !isTableChip(btn)) return;
    var card = btn.closest(".ex-card");
    if (!card) return;
    var ta = card.querySelector("textarea.ex-editor");
    if (!ta) return;
    var table = (btn.textContent || "").trim().split(/\s+/)[0];
    if (SCHEMA_TAP === "split") return;                       // chip keeps its own behaviour
    if (SCHEMA_TAP === "first-time" && seen[table]) return;    // already learnt this one
    seen[table] = true;
    e.preventDefault(); e.stopPropagation();
    openSheet(table, ta);
  }, true);

  // the always-available ⤢ affordance, welded onto each table chip
  function addSchemaButtons(card) {
    var ta = card.querySelector("textarea.ex-editor");
    if (!ta) return;
    card.querySelectorAll("button").forEach(function (btn) {
      if (!isTableChip(btn) || btn.__zpPaired) return;
      btn.__zpPaired = true;
      // v2 palette already ships its own ⤢ button — don't add a second one
      if (btn.nextElementSibling && btn.nextElementSibling.classList.contains("zk-schema")) return;
      btn.style.borderRadius = "7px 0 0 7px";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "zp-schema-btn";
      b.title = "Schema & first rows";
      b.textContent = "⤢";
      b.style.cssText = "display:inline-flex;align-items:center;justify-content:center;height:30px;width:28px;" +
        "font-size:12px;color:#fff;background:" + GREEN + ";opacity:.82;border:1px solid " + INK + ";border-left:0;" +
        "border-radius:0 7px 7px 0;cursor:pointer;box-shadow:2px 2px 0 rgba(33,27,19,.5);flex:0 0 auto;margin-left:-5px";
      b.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        seen[(btn.textContent || "").trim().split(/\s+/)[0]] = true;
        openSheet((btn.textContent || "").trim().split(/\s+/)[0], ta);
      });
      btn.parentNode.insertBefore(b, btn.nextSibling);
    });
  }

  function scan() { document.querySelectorAll("#ex-list .ex-card").forEach(function (c) { upgrade(c); addSchemaButtons(c); }); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
