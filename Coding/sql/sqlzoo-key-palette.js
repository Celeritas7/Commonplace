// sqlzoo-key-palette.js — tap-to-type key palette for the SQLZoo practice cards.
// Load BEFORE sqlzoo-lab.js, then in buildCard() add ONE line before card.appendChild(ta):
//
//   card.appendChild(window.SQLZOO_KEYS.build(e.ds, ta));
//
// No CSS file needed — styles are inline and match the Commonplace palette.
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

  // ---------- insertion (space-aware, cursor-aware) ----------
  // kind: "kw" = keyword (space before + after), "id"/"fn" = space before only,
  //       "p" = raw punctuation, "pair" = '' with cursor placed inside
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
    ta.dispatchEvent(new Event("input", { bubbles: true })); // keeps your progress autosave working
  }

  // ---------- keycap factory ----------
  function keycap(label, bg, onClick, square) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:600;color:#211b13;" +
      "background:" + bg + ";border:1px solid #211b13;border-radius:7px;height:30px;padding:0 10px;" +
      "cursor:pointer;box-shadow:2px 2px 0 rgba(33,27,19,0.5);" +
      (square ? "min-width:30px;display:inline-flex;align-items:center;justify-content:center;padding:0 8px;" : "");
    function up() { b.style.transform = "none"; b.style.boxShadow = "2px 2px 0 rgba(33,27,19,0.5)"; }
    b.addEventListener("pointerdown", function () { b.style.transform = "translate(2px,2px)"; b.style.boxShadow = "none"; });
    b.addEventListener("pointerup", up);
    b.addEventListener("pointerleave", up);
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
  // build(ds, ta) -> DOM node. Per-card open/close + open-table state lives in the closure.
  function build(ds, ta) {
    var host = el("div", "margin:0 0 12px;");
    var state = { open: true, openTable: (TABLES[ds] && TABLES[ds][0]) ? TABLES[ds][0].t : null };
    render();
    return host;

    function render() {
      host.innerHTML = "";
      var color = DS_COLOR[ds] || "#564b3a";
      var card = el("div", "background:#faf6ec;border:1px solid #cdbfa3;border-radius:10px;padding:" +
        (state.open ? "10px 12px 12px" : "6px 8px 6px 12px") + ";");
      host.appendChild(card);

      // header + toggle
      var head = el("div", "display:flex;align-items:center;gap:10px;");
      head.appendChild(el("span",
        "font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#8a7c63;",
        state.open ? "KEY PALETTE" : "KEYS HIDDEN"));
      head.appendChild(el("span", "flex:1;"));
      var tog = keycap(state.open ? "Hide keys \u2303" : "Show keys \u2304", "#fbf8ef", function () {
        state.open = !state.open; render();
      });
      head.appendChild(tog);
      card.appendChild(head);
      if (!state.open) return;

      function row(css) {
        var r = el("div", "display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;align-items:center;" + (css || ""));
        card.appendChild(r);
        return r;
      }

      // keywords
      var r1 = row();
      KW.forEach(function (k) { r1.appendChild(keycap(k, "#ded6f0", function () { insertKey(ta, k, "kw"); })); });

      // functions + punctuation on one row, dashed divider between
      var r2 = row();
      FN.forEach(function (k) { r2.appendChild(keycap(k, "#cfe4c4", function () { insertKey(ta, k, "fn"); })); });
      r2.appendChild(el("span", "width:1px;height:20px;border-left:1px dashed #d8ccb2;margin:0 5px;flex:0 0 auto;"));
      PUNCT.forEach(function (k) {
        r2.appendChild(keycap(k, "#fbf8ef", function () { insertKey(ta, k, k === "''" ? "pair" : "p"); }, true));
      });

      // tables + columns of the open table, one flowing row
      var tables = TABLES[ds] || [];
      if (!tables.length) return;
      card.appendChild(el("div", "border-top:1px dashed #d8ccb2;margin:10px 0 0;"));
      var tr = row();
      tr.appendChild(el("span", "display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;margin-right:3px;",
        '<span style="width:8px;height:8px;border-radius:50%;background:' + color + ';"></span>' +
        '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#8a7c63;">' +
        ds.toUpperCase() + "</span>"));
      tables.forEach(function (tb) {
        var isOpen = tb.t === state.openTable;
        var chip = el("button",
          "display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px;" +
          "font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;" +
          "color:" + (isOpen ? "#fff" : "#211b13") + ";background:" + (isOpen ? color : "#fff") +
          ";border:1px solid #211b13;border-radius:7px;cursor:pointer;box-shadow:2px 2px 0 rgba(33,27,19,0.5);",
          tb.t + ' <span style="font-size:10px;font-weight:400;opacity:.75;">' + tb.cols.length + " cols</span>");
        chip.type = "button";
        chip.title = isOpen ? "Tap to insert \u201C" + tb.t + "\u201D" : "Tap to show " + tb.t + "\u2019s columns";
        chip.addEventListener("click", function () {
          if (isOpen) insertKey(ta, tb.t, "id");           // second tap types the table name
          else { state.openTable = tb.t; render(); }        // first tap just reveals columns
        });
        tr.appendChild(chip);
      });
      var act = null;
      tables.forEach(function (tb) { if (tb.t === state.openTable) act = tb; });
      if (act) {
        tr.appendChild(el("span", "width:1px;height:20px;border-left:2px solid " + color + ";margin:0 5px;flex:0 0 auto;"));
        act.cols.forEach(function (cn) {
          tr.appendChild(keycap(cn, "#fff", function () { insertKey(ta, cn, "id"); }));
        });
      }
    }
  }

  window.SQLZOO_KEYS = { build: build, insertKey: insertKey, TABLES: TABLES };
})();
