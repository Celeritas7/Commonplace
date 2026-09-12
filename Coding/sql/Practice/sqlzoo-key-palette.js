// sqlzoo-key-palette.js — tap-to-type key palette for the SQLZoo practice cards.
// v2: tables and columns are visually distinct (square teal table chips with a ▦ glyph
// and an attached ⤢ schema button; round pale pills for columns).
// Same API as before — sqlzoo-lab.js calls window.SQLZOO_KEYS.build(e.ds, ta).
// The ⤢ button asks window.SQLZOO_SCHEMA (sqlzoo-ui-plus.js) to open the schema sheet;
// if that file isn't loaded the button simply reveals the table's columns instead.
(function () {
  "use strict";

  var KW = ["SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT",
            "DISTINCT", "AS", "JOIN", "ON", "AND", "OR", "LIKE", "IN", "DESC"];
  var FN = ["COUNT(", "SUM(", "AVG(", "MIN(", "MAX("];
  var PUNCT = [";", ",", ".", "(", ")", "*", "=", ">", "<", ">=", "<=", "<>", "''", "%"];

  var TABLES = {
    world: [{ t: "world", cols: ["name", "continent", "area", "population", "gdp", "capital"] }],
    nobel: [{ t: "nobel", cols: ["yr", "subject", "winner"] }],
    football: [
      { t: "game",  cols: ["id", "mdate", "stadium", "team1", "team2"] },
      { t: "goal",  cols: ["matchid", "teamid", "player", "gtime"] },
      { t: "eteam", cols: ["id", "teamname", "coach"] }
    ]
  };

  var DS_COLOR = { world: "#2f7d57", nobel: "#7a4ea0", football: "#b06a1f" };
  var CAP_KW = { fill: "#e5e0f2", line: "#cdc3dd" };
  var CAP_FN = { fill: "#d9e9d1", line: "#bdd3b2" };
  var CAP_PUNCT = { fill: "#fbf8ef", line: "#ddd2bb" };
  var TEAL = "#2f6b5e", TEAL_DEEP = "#1d453c", TEAL_PALE = "#dfe9e4", TEAL_MID = "#c9dbd3";

  // ---------- insertion (space-aware, cursor-aware) ----------
  function insertKey(ta, text, kind) {
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    var before = v.slice(0, s);
    var ins = text;
    if (kind !== "p" && kind !== "pair") {
      if (before && !/[\s(.,']$/.test(before)) ins = " " + ins;
      if (kind === "kw") ins += " ";
    }
    ta.value = before + ins + v.slice(e);
    var pos = s + ins.length;
    if (kind === "pair") pos -= 1;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true })); // keeps progress autosave working
  }

  // ---------- keycap factory (keywords / functions / punctuation) ----------
  function keycap(label, bg, onClick, square) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#211b13;" +
      "background:" + bg.fill + ";border:1px solid " + bg.line + ";border-radius:10px;height:38px;padding:0 13px;" +
      "cursor:pointer;flex:0 0 auto;white-space:nowrap;" +
      (square ? "min-width:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 11px;" : "");
    function up() { b.style.transform = "none"; }
    b.addEventListener("pointerdown", function () { b.style.transform = "translateY(1px)"; });
    b.addEventListener("pointerup", up);
    b.addEventListener("pointerleave", up);
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------- column pill: soft, round, quiet — clearly NOT a table ----------
  function colPill(label, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "zk-col";
    b.textContent = label;
    b.style.cssText =
      "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:400;color:#56503f;" +
      "background:#fbf8ef;border:1px solid #ddd2bb;border-radius:17px;height:34px;padding:0 14px;" +
      "cursor:pointer;flex:0 0 auto;white-space:nowrap;";
    b.addEventListener("click", onClick);
    return b;
  }

  function el(tag, css, html) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ---------- palette ----------
  function build(ds, ta) {
    var host = el("div", "margin:0 0 12px;");
    host.className = "zk-host";
    var state = { open: true, openTable: (TABLES[ds] && TABLES[ds][0]) ? TABLES[ds][0].t : null };
    render();
    return host;

    function render() {
      host.innerHTML = "";
      var card = el("div", "background:#faf6ec;border:1px solid #cdbfa3;border-radius:10px;padding:" +
        (state.open ? "10px 12px 12px" : "6px 8px 6px 12px") + ";");
      host.appendChild(card);

      var head = el("div", "display:flex;align-items:center;gap:10px;");
      head.appendChild(el("span",
        "font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#8a7c63;",
        state.open ? "KEY PALETTE" : "KEYS HIDDEN"));
      head.appendChild(el("span", "flex:1;"));
      head.appendChild(keycap(state.open ? "Hide keys \u2303" : "Show keys \u2304", CAP_PUNCT, function () {
        state.open = !state.open; render();
      }));
      card.appendChild(head);
      if (!state.open) return;

      function row(css) {
        var r = el("div", "display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;" +
          "-webkit-overflow-scrolling:touch;scrollbar-width:none;margin-top:8px;padding-bottom:2px;" +
          "align-items:center;" + (css || ""));
        r.className = "zk-row";
        card.appendChild(r);
        return r;
      }

      var r1 = row();
      KW.forEach(function (k) { r1.appendChild(keycap(k, CAP_KW, function () { insertKey(ta, k, "kw"); })); });

      var r2 = row();
      FN.forEach(function (k) { r2.appendChild(keycap(k, CAP_FN, function () { insertKey(ta, k, "fn"); })); });

      PUNCT.forEach(function (k) {
        r2.appendChild(keycap(k, CAP_PUNCT, function () { insertKey(ta, k, k === "''" ? "pair" : "p"); }, true));
      });

      // ---- tables + the open table's columns ----
      var tables = TABLES[ds] || [];
      if (!tables.length) return;
      card.appendChild(el("div", "border-top:1px dashed #d8ccb2;margin:10px 0 0;"));
      var tr = row();
      tr.appendChild(el("span", "display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;margin-right:3px;",
        '<span style="width:8px;height:8px;border-radius:50%;background:' + (DS_COLOR[ds] || "#564b3a") + ';"></span>' +
        '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#8a7c63;">' +
        ds.toUpperCase() + "</span>"));

      tables.forEach(function (tb) {
        var isOpen = tb.t === state.openTable;
        var pair = el("span", "display:inline-flex;flex:0 0 auto;margin-right:2px;");

        var chip = el("button",
          "display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;" +
          "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;" +
          "color:" + (isOpen ? "#fff" : TEAL_DEEP) + ";background:" + (isOpen ? TEAL : "#e2ebe6") + ";" +
          "border:1px solid " + (isOpen ? TEAL : "#b6cdc3") + ";border-radius:10px 0 0 10px;cursor:pointer;white-space:nowrap;",
          '<span style="font-size:12px;opacity:.8;">\u25A6</span> ' + tb.t +
          ' <span style="font-size:11px;font-weight:400;opacity:.7;">' + tb.cols.length + " cols</span>");
        chip.type = "button";
        chip.className = "zk-table";
        chip.setAttribute("data-table", tb.t);
        chip.title = isOpen ? "Tap to insert \u201C" + tb.t + "\u201D" : "Tap to show " + tb.t + "\u2019s columns";
        chip.addEventListener("click", function () {
          if (isOpen) insertKey(ta, tb.t, "id");
          else { state.openTable = tb.t; render(); }
        });

        var mag = el("button",
          "display:inline-flex;align-items:center;justify-content:center;height:38px;width:34px;font-size:13px;" +
          "color:" + TEAL_DEEP + ";background:#cfded7;border:1px solid #b6cdc3;border-left:0;" +
          "border-radius:0 10px 10px 0;cursor:pointer;", "\u2922");
        mag.type = "button";
        mag.className = "zk-schema";
        mag.setAttribute("data-table", tb.t);
        mag.title = "Schema & first rows";
        mag.addEventListener("click", function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (window.SQLZOO_SCHEMA && window.SQLZOO_SCHEMA.open) window.SQLZOO_SCHEMA.open(tb.t, ta, ds);
          else { state.openTable = tb.t; render(); }
        });

        pair.appendChild(chip); pair.appendChild(mag);
        tr.appendChild(pair);
      });

      var act = null;
      tables.forEach(function (tb) { if (tb.t === state.openTable) act = tb; });
      // columns get their OWN scroll lane, so the table chips never scroll out of
      // reach on a phone — tables stay on the line above, columns below.
      if (act) {
        var cr = row();
        cr.appendChild(el("span",
          "display:inline-flex;align-items:center;flex:0 0 auto;",
          '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#8a7c63;">' +
          act.t.toUpperCase() + ' \u00B7</span>'));
        act.cols.forEach(function (cn) {
          cr.appendChild(colPill(cn, function () { insertKey(ta, cn, "id"); }));
        });
      }
    }
  }

  window.SQLZOO_KEYS = { build: build, insertKey: insertKey, TABLES: TABLES };
})();
