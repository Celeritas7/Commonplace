/* book-ui.js — view layer for the SQL book redesign.
   Draws states; holds NO grading, storage or sync logic. Claude Code calls these hooks
   (see HOOKS.md) and listens for the `sqlbook:*` events it dispatches.
   Load LAST at the end of <body>, after the page's inline playground script, playground-enhancements.js and module-check.js. */
(function () {
  var D = document, H = D.documentElement;
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function emit(name, detail) { D.dispatchEvent(new CustomEvent("sqlbook:" + name, { detail: detail || {} })); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
  function sess(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} }

  /* ---------- theme + text size ---------- */
  function applyTheme(t) {
    var dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    H.setAttribute("data-theme", dark ? "dark" : "light");
    H.setAttribute("data-theme-pref", t);
    $$("[data-set-theme]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.setTheme === t)); });
  }
  var theme = {
    get: function () { return H.getAttribute("data-theme-lock") || store("cp_theme") || "auto"; },
    set: function (t) { store("cp_theme", t); applyTheme(t); emit("theme", { theme: t }); }
  };
  function applySize(s) { if (s === "m") H.removeAttribute("data-text-size"); else H.setAttribute("data-text-size", s); $$("[data-set-size]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.setSize === s)); }); }
  var textSize = {
    get: function () { return store("cp_text_size") || "m"; },
    set: function (s) { store("cp_text_size", s); applySize(s); }
  };

  /* ---------- sheets ---------- */
  var scrim, lastTrigger;
  var sheet = {
    open: function (id, trigger) {
      var el = D.getElementById(id); if (!el) return;
      sheet.close();
      if (!scrim) { scrim = D.createElement("div"); scrim.className = "bk-scrim"; scrim.onclick = function () { sheet.close(); }; D.body.appendChild(scrim); }
      scrim.hidden = false; el.hidden = false; lastTrigger = trigger || null;
      if (trigger) trigger.setAttribute("aria-expanded", "true");
      var f = el.querySelector("[autofocus],button,a,input"); if (f) f.focus({ preventScroll: true });
    },
    close: function () {
      $$(".bk-sheet").forEach(function (s) { s.hidden = true; });
      if (scrim) scrim.hidden = true;
      if (lastTrigger) { lastTrigger.setAttribute("aria-expanded", "false"); lastTrigger = null; }
    }
  };

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg, opt) {
    opt = opt || {}; var t = $(".bk-toast"); if (t) t.remove();
    t = D.createElement("div"); t.className = "bk-toast"; t.setAttribute("role", "status");
    t.innerHTML = "<span>" + esc(msg) + "</span>" + (opt.action ? (opt.action.href ? '<a href="' + esc(opt.action.href) + '">' + esc(opt.action.label) + "</a>" : "<button>" + esc(opt.action.label) + "</button>") : "");
    if (opt.action && opt.action.onClick) t.querySelector("button").onclick = opt.action.onClick;
    D.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function () { t.remove(); }, opt.ms || 4200);
  }

  /* ---------- horizontal overflow cues ---------- */
  function cue(wrap, scroller) {
    var f = function () {
      var o = [];
      if (scroller.scrollLeft > 2) o.push("start");
      if (scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2) o.push("end");
      wrap.setAttribute("data-overflow", o.join(" "));
    };
    if (!scroller.__cue) { scroller.addEventListener("scroll", f, { passive: true }); scroller.__cue = 1; }
    f.wrap = wrap; f(); return f;
  }
  var cuers = [];
  function fades(root) {
    $$(".pg-scrollwrap", root).forEach(function (w) { var s = w.querySelector(".pg-scroll"); if (s) cuers.push(cue(w, s)); });
    $$(".bk-tabs", root).forEach(function (w) { var s = w.querySelector(".bk-tabs__track"); if (!s) return; cuers.push(cue(w, s)); var cur = s.querySelector('[aria-current="page"]'); if (cur && !s.__centred) { s.scrollLeft = cur.offsetLeft - 40; s.__centred = 1; } });
  }
  addEventListener("resize", function () { cuers = cuers.filter(function (f) { return f.wrap.isConnected; }); cuers.forEach(function (f) { f(); }); });

  /* ---------- tables ---------- */
  function cell(v, x) { var k = (v === null || v === undefined) ? "null" : typeof v === "number" ? "num" : ""; k = (k + (x ? " is-diff" : "")).trim(); return "<td" + (k ? ' class="' + k + '"' : "") + ">" + (k.indexOf("null") === 0 ? "NULL" : esc(v)) + "</td>"; }
  function table(cols, rows, o) {
    o = o || {}; var max = o.max || rows.length, dc = o.diffCells || {}, hc = o.diffCols || [], rc = o.rowClass || {};
    var h = '<div class="pg-scrollwrap"><div class="pg-scroll"><table><thead><tr>' + cols.map(function (c, i) { return "<th" + (hc.indexOf(i) > -1 ? ' class="is-diff"' : "") + ">" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.slice(0, max).forEach(function (r, ri) {
      h += "<tr" + (rc[ri] ? ' class="' + rc[ri] + '"' : "") + ">" + r.map(function (v, ci) { return cell(v, dc[ri + ":" + ci]); }).join("") + "</tr>";
    });
    h += "</tbody></table></div></div>";
    if (rows.length > max) h += '<div class="ch-diff__more">+ ' + (rows.length - max) + " more row" + (rows.length - max === 1 ? "" : "s") + "</div>";
    return h;
  }

  /* ---------- playground states ---------- */
  var PG_LABEL = { idle: "not run", running: "running…", ok: "", error: "error", dirty: "data changed" };
  var pg = {
    set: function (el, state, d) {
      d = d || {}; el.setAttribute("data-state", state);
      var out = el.querySelector(".pg-result"), head = el.querySelector(".pg-header"), st = head.querySelector(".pg-state");
      if (!st) { st = D.createElement("span"); st.className = "pg-state"; var hint = head.querySelector(".hint"); head.insertBefore(st, hint || null); }
      var led = head.querySelector(".led"); if (led) led.classList.remove("loading", "err");
      var n = d.rows ? d.rows.length : 0;
      st.textContent = state === "ok" ? n + " row" + (n === 1 ? "" : "s") : PG_LABEL[state] || "";
      if (state === "idle") { out.innerHTML = ""; return; }
      if (state === "running") { out.innerHTML = '<div class="pg-msg pg-msg--run">Running…</div>'; return; }
      if (state === "error") { out.innerHTML = '<div class="pg-error"><b>Error</b><code>' + esc(d.message) + "</code>" + (d.tip ? '<span class="tip">' + esc(d.tip) + "</span>" : "") + "</div>"; return; }
      var h = "";
      if (state === "dirty") h += '<div class="pg-dirty"><span>Data changed · ' + esc(d.changed || "this query modified the shared database") + '</span>' + (el.querySelector('.pg-actions [data-action="reset-data"]') ? "" : '<button class="btn" data-action="reset-data">Reset data</button>') + "</div>";
      if (d.columns && d.columns.length) {
        h += table(d.columns, d.rows || []) + '<div class="pg-foot"><span class="ok">' + n + " row" + (n === 1 ? "" : "s") + "</span>" + (d.ms != null ? "<span>" + esc(d.ms) + " ms</span>" : "") + '<span class="pg-more">scroll →</span></div>';
      } else h += '<div class="pg-msg">' + esc(d.message || "Statement executed") + "</div>";
      out.innerHTML = h; fades(out);
    }
  };

  /* ---------- challenges ---------- */
  function keyFromId(id) {
    var m = id.match(/^challenge-(\d+)/); if (!m) return null; var d = m[1];
    return d.slice(0, 2) === "10" ? "ex_10_" + d[2] + "_" + d[3] : "ex_" + d[0] + "_" + d[1] + "_" + d[2];
  }
  var CH = {};
  function badgeText(s, a) { return { untried: "Not tried", wrong: "Not yet · try " + ((a || 1) + 1), right: "Solved ✓", revealed: "Revealed", done: "Done ✓", todo: "To do" }[s] || s; }
  function decorate(root) {
    $$('h4[id^="challenge-"],h4[data-ch-key]', root || D).forEach(function (h4) {
      if (h4.closest(".ch")) return;
      var key = h4.getAttribute("data-ch-key") || keyFromId(h4.id), box = D.createElement("div"), head = D.createElement("div");
      box.className = "ch"; head.className = "ch__head";
      var parts = [], n = h4.nextElementSibling;
      while (n && !/^H[234]$/.test(n.tagName)) { parts.push(n); n = n.nextElementSibling; }
      h4.parentNode.insertBefore(box, h4); head.appendChild(h4); box.appendChild(head);
      parts.forEach(function (p) { box.appendChild(p); });
      var play = box.querySelector(".playground"), ro = H.hasAttribute("data-module-readonly");
      var kind = play && !ro ? "auto" : "text";
      box.setAttribute("data-ch", key); box.setAttribute("data-kind", kind);
      var badge = D.createElement("span"); badge.className = "ch-badge"; head.appendChild(badge);
      var c = CH[key] = { el: box, key: key, kind: kind, state: kind === "auto" ? "untried" : "todo", attempt: 0, hint: 0, hints: [], solution: "" };
      if (kind === "auto") {
        var run = play.querySelector('[data-action="run"]'); if (run) run.innerHTML = "Run &amp; check →";
        var hb = play.querySelector('[data-action="hint"]'), sb = play.querySelector('[data-action="solution"]');
        if (hb) { c.hints = [hb.dataset.hint, hb.dataset.hint2].filter(Boolean); var nh = hb.cloneNode(false); hb.replaceWith(nh); hb = nh; hb.onclick = function () { stepHint(c); }; }
        if (sb) { c.solution = sb.dataset.solution || ""; var ns = sb.cloneNode(false); ns.textContent = "Solution"; sb.replaceWith(ns); ns.onclick = function () { askSolution(c); }; c.solBtn = ns; }
        c.hintBtn = hb;
        var ol = D.createElement("ol"); ol.className = "ch-hints"; ol.hidden = true; box.appendChild(ol); c.hintList = ol;
        var g = D.createElement("div"); g.className = "ch-guard"; g.hidden = true;
        g.innerHTML = "<p><b>Try one query first.</b> The solution opens after you have run something, or after the last hint.</p><div class=\"bk-row\"><button class=\"bk-btn\" data-g=\"keep\">Keep trying</button><button class=\"bk-btn bk-btn--ghost\" data-g=\"show\">Show anyway</button></div>";
        g.querySelector('[data-g="keep"]').onclick = function () { g.hidden = true; var ta = play.querySelector("textarea"); if (ta) ta.focus(); };
        g.querySelector('[data-g="show"]').onclick = function () { g.hidden = true; reveal(c, true); };
        box.appendChild(g); c.guard = g;
        var v = D.createElement("div"); v.className = "ch-verdict"; v.setAttribute("aria-live", "polite"); box.appendChild(v); c.verdict = v;
        renderHintBtn(c);
      } else {
        var t = D.createElement("div"); t.className = "ch-text";
        var sol = D.getElementById(h4.id.replace(/^challenge-(\d+).*/, "solution-$1"));
        t.innerHTML = '<span class="note">' + (ro ? "Run this in pgAdmin or Python, then compare." : "Work it out first, then compare with the answer.") + "</span>" + (sol ? '<a class="bk-btn" href="#' + sol.id + '">Show answer ↓</a>' : "") + '<button class="bk-btn" data-mark>Mark as done</button>';
        t.querySelector("[data-mark]").onclick = function () { challenge.set(key, { state: c.state === "done" ? "todo" : "done" }); emit("markdone", { key: key, done: c.state === "done" }); };
        box.appendChild(t); c.text = t;
      }
      paint(c);
    });
  }
  function renderHintBtn(c) {
    if (!c.hintBtn) return; var n = c.hints.length;
    if (!n) { c.hintBtn.hidden = true; return; }
    c.hintBtn.innerHTML = c.hint < n ? "Hint " + (c.hint + 1) + ' <span class="step">of ' + n + "</span>" : "Hints shown";
    c.hintBtn.setAttribute("aria-disabled", String(c.hint >= n));
  }
  function stepHint(c) {
    if (c.hint >= c.hints.length) return;
    c.hint++; c.hintList.hidden = false;
    c.hintList.innerHTML = c.hints.slice(0, c.hint).map(function (h, i) { return "<li><b>Hint " + (i + 1) + "</b><span>" + esc(h) + "</span></li>"; }).join("");
    renderHintBtn(c); emit("hint", { key: c.key, step: c.hint });
  }
  function askSolution(c) {
    if (c.state === "right" || c.state === "revealed") return reveal(c, false);
    if (c.attempt < 1 && c.hint < c.hints.length) { c.guard.hidden = false; return; }
    reveal(c, false);
  }
  function reveal(c, forced) { emit("solution", { key: c.key, attempts: c.attempt, forced: !!forced }); challenge.set(c.key, { state: "revealed" }); }
  function paint(c) {
    c.el.setAttribute("data-state", c.state);
    c.el.querySelector(".ch-badge").textContent = badgeText(c.state, c.attempt);
    if (c.text) { var b = c.text.querySelector("[data-mark]"); b.textContent = c.state === "done" ? "Done ✓ · undo" : "Mark as done"; b.className = "bk-btn" + (c.state === "done" ? "" : " bk-btn--primary"); }
  }
  function diffHtml(v) {
    var y = v.yours || { columns: [], rows: [] }, x = v.expected || { columns: [], rows: [] }, d = v.diff || {}, dc = {}, yr = {}, xr = {};
    (d.cells || []).forEach(function (p) { dc[p[0] + ":" + p[1]] = 1; });
    (d.extra || []).forEach(function (r) { yr[r] = "is-extra"; });
    (d.missing || []).forEach(function (r) { xr[r] = "is-missing"; });
    return '<div class="ch-diff" data-view="yours"><div class="bk-seg ch-diff__switch" role="group"><button aria-pressed="true" data-v="yours">Your rows · ' + y.rows.length + '</button><button aria-pressed="false" data-v="expected">Expected · ' + x.rows.length + "</button></div>" +
      '<div class="ch-diff__grid"><figure class="ch-diff__side ch-yours"><figcaption><span>Your rows</span><span>' + y.rows.length + " × " + y.columns.length + "</span></figcaption>" + table(y.columns, y.rows, { max: 8, diffCells: dc, diffCols: d.cols || [], rowClass: yr }) + "</figure>" +
      '<figure class="ch-diff__side ch-expected"><figcaption><span>Expected</span><span>' + x.rows.length + " × " + x.columns.length + "</span></figcaption>" + table(x.columns, x.rows, { max: 8, rowClass: xr }) + "</figure></div></div>";
  }
  var challenge = {
    decorate: decorate,
    get: function (key) { return CH[key]; },
    /* set(key, {state, attempt, verdict:{reason, detail, yours, expected, diff}, rows, next:{href,label}, banked}) */
    set: function (key, o) {
      var c = typeof key === "string" ? CH[key] : CH[key.getAttribute("data-ch")]; if (!c) return;
      o = o || {}; if (o.attempt != null) c.attempt = o.attempt; if (o.state) c.state = o.state; paint(c);
      if (!c.verdict) return;
      if (c.guard) c.guard.hidden = true;
      var v = o.verdict || {}, h = "";
      if (c.state === "untried") { c.verdict.innerHTML = ""; c.verdict.removeAttribute("data-verdict"); return; }
      if (c.state === "wrong") {
        h = '<div class="ch-verdict__head"><b>× Not yet.</b><span class="ch-reason">' + esc(v.reason || "Result differs") + "</span></div>" + (v.detail ? "<p>" + esc(v.detail) + "</p>" : "") + diffHtml(v) +
          '<div class="bk-row">' + (c.hint < c.hints.length ? '<button class="bk-btn" data-do="hint">Hint ' + (c.hint + 1) + "</button>" : "") + '<span class="bk-meta">' + (o.banked ? "Saved to your Mistake Bank" : "") + "</span></div>";
      } else if (c.state === "right") {
        h = '<div class="ch-verdict__head"><b>✓ Solved.</b><span>' + esc(v.detail || ("Matches all " + (o.rows != null ? o.rows + " " : "") + "rows.")) + "</span></div>" + (o.next ? '<div class="bk-row"><a class="bk-btn" href="' + esc(o.next.href) + '">' + esc(o.next.label) + " ↓</a></div>" : "");
      } else if (c.state === "revealed") {
        h = '<div class="ch-verdict__head"><b>Solution revealed.</b><span>' + (o.banked === false ? "" : "Added to your Mistake Bank — re-solve it today.") + "</span></div><pre class=\"bk-code\"><code>" + esc(c.solution) + '</code></pre><div class="bk-row"><button class="bk-btn" data-do="copy">Put it in the editor</button></div>';
      }
      c.verdict.setAttribute("data-verdict", c.state); c.verdict.innerHTML = h; fades(c.verdict);
      $$(".ch-diff__switch button", c.verdict).forEach(function (b) { b.onclick = function () { var dv = c.verdict.querySelector(".ch-diff"); dv.setAttribute("data-view", b.dataset.v); $$(".ch-diff__switch button", c.verdict).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); fades(dv); }; });
      var hb = c.verdict.querySelector('[data-do="hint"]'); if (hb) hb.onclick = function () { stepHint(c); hb.remove(); };
      var cp = c.verdict.querySelector('[data-do="copy"]'); if (cp) cp.onclick = function () { var ta = c.el.querySelector(".playground textarea"); if (ta) { ta.value = c.solution; ta.dispatchEvent(new Event("input")); } };
    }
  };

  /* ---------- end-of-module check + soft gate ---------- */
  var check = {
    /* set({state:'untaken'|'partial'|'passed', score, total, date, weak}) */
    set: function (o, target) {
      var el = target || $(".bk-check"); if (!el) return; o = o || {}; var t = o.total || 5, s = o.score || 0;
      el.setAttribute("data-state", o.state); if (!target) H.setAttribute("data-checked", String(o.state === "passed"));
      var dots = '<span class="bk-dots" aria-hidden="true">' + Array.apply(null, Array(t)).map(function (_, i) { return '<i class="' + (i < s ? "on" : "") + '"></i>'; }).join("") + "</span>";
      var mod = el.dataset.next || "the next module";
      var h = '<span class="bk-k bk-k--accent">Check yourself · ' + t + " questions</span>";
      if (o.state === "untaken") h += "<h3>Before " + esc(mod) + "</h3><p>" + t + " quick questions on this module. About three minutes; retake it any time.</p><div class=\"bk-row\"><button class=\"bk-btn bk-btn--primary\" data-check>Start the check</button></div>";
      if (o.state === "partial") h += "<h3>Last try " + s + " / " + t + '</h3><div class="bk-check__score">' + dots + "<span>" + esc(o.date || "") + "</span></div><p>" + (o.weak ? "Worth another look: " + esc(o.weak) + "." : "Re-read the lessons you missed, then try again.") + '</p><div class="bk-row"><button class="bk-btn bk-btn--primary" data-check>Try again</button></div>';
      if (o.state === "passed") h += '<h3>Checked</h3><div class="bk-check__score">' + dots + "<span>✓ " + s + " / " + t + (o.date ? " · " + esc(o.date) : "") + '</span></div><div class="bk-row"><button class="bk-btn bk-btn--ghost" data-check>Retake</button></div>';
      if (o.state === "unavailable") h += "<h3>Check not available here</h3><p>The question bank didn't load on this page, so Next goes straight on.</p>";
      if (!target) H.toggleAttribute("data-check-unavailable", o.state === "unavailable");
      el.innerHTML = h; var b = el.querySelector("[data-check]"); if (b) b.onclick = function () { emit("check-start", {}); };
      $$(".bk-mhead [data-check-mark]").forEach(function (m) { m.className = o.state === "passed" ? "bk-checked" : "bk-unchecked"; m.textContent = o.state === "passed" ? "✓ Checked " + s + "/" + t : o.state === "partial" ? "Check · last " + s + "/" + t : "Not checked yet"; });
    }
  };
  function bindGate() {
    D.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-gate]"); if (!a) return;
      var mod = (location.pathname.match(/module-(\d+)/) || [])[1] || "x";
      if (H.getAttribute("data-checked") === "true" || H.hasAttribute("data-check-unavailable") || window.CP_QUIZ_OFF || sess("cp_gate_" + mod) || !D.getElementById("bk-gate")) return;
      e.preventDefault(); var g = D.getElementById("bk-gate"); g.dataset.href = a.href; sheet.open("bk-gate", a);
    });
    var g = D.getElementById("bk-gate"); if (!g) return;
    g.querySelector("[data-gate-check]").onclick = function () { sheet.close(); var c = $(".bk-check"); if (c) scrollTo({ top: c.getBoundingClientRect().top + scrollY - 70, behavior: "smooth" }); emit("gate", { choice: "check" }); emit("check-start", {}); };
    g.querySelector("[data-gate-go]").onclick = function () { var mod = (location.pathname.match(/module-(\d+)/) || [])[1] || "x"; sess("cp_gate_" + mod, "1"); emit("gate", { choice: "continue" }); location.href = g.dataset.href; };
  }

  /* ---------- home: Today card, module cards ---------- */
  var today = {
    /* render({state:'fresh'|'active', resume:{href,title,sub}, rows:[{tone:'due'|'ok'|'', mark, label, sub, value, href}]}) */
    render: function (o) {
      var el = D.getElementById("today"); if (!el) return; o = o || {};
      el.setAttribute("data-state", o.state || "active");
      var r = o.resume || { href: "The Modules/module-01.html", title: "Start with Module 1", sub: "Retrieving data · about 60 min" };
      el.innerHTML = '<div class="hm-today__head"><span class="bk-k bk-k--accent">' + (o.state === "fresh" ? "Begin" : "Today") + '</span><span class="bk-meta">' + esc(o.date || "") + "</span></div>" +
        '<a class="hm-today__resume" href="' + esc(r.href) + '"><span class="t">' + esc(r.title) + '</span><span class="s">' + esc(r.sub || "") + '</span><span class="bk-btn bk-btn--primary">' + (o.state === "fresh" ? "Start" : "Continue") + " →</span></a>" +
        '<div class="hm-today__rows">' + (o.rows || []).map(function (x) { return '<a class="hm-today__row" href="' + esc(x.href || "#") + '" data-tone="' + esc(x.tone || "") + '"><span class="m">' + esc(x.mark || "›") + '</span><span class="l"><b>' + esc(x.label) + "</b>" + (x.sub ? "<span>" + esc(x.sub) + "</span>" : "") + '</span><span class="v">' + esc(x.value || "→") + "</span></a>"; }).join("") + "</div>";
    }
  };
  var modules = {
    /* render(container, [{n,title,blurb,href,done,total,checked,state:'current'|'done'|'readonly'|''}]) */
    render: function (box, list) {
      box = typeof box === "string" ? D.getElementById(box) : box; if (!box) return; box.classList.add("hm-mods");
      box.innerHTML = list.map(function (m) {
        var ro = m.state === "readonly", pct = m.total ? Math.round(100 * m.done / m.total) : 0, nn = (m.n < 10 ? "0" : "") + m.n;
        return '<a class="hm-mod" id="mod-' + nn + '" href="' + esc(m.href) + '" data-state="' + esc(m.state || "") + '"><div><div class="hm-mod__top"><span class="hm-mod__n">№ ' + nn + "</span>" + (m.checked ? '<span class="hm-mod__check">✓ checked</span>' : m.state === "current" ? '<span class="bk-k bk-k--accent">reading</span>' : "") + "</div><h3>" + esc(m.title) + "</h3>" + (m.blurb ? "<p>" + esc(m.blurb) + "</p>" : "") + "</div><span></span>" +
          '<div class="hm-mod__foot">' + (ro ? '<div class="bk-pbar"></div><span class="hm-mod__ro"><b>Read-only</b> · run in pgAdmin / Python</span>' : '<div class="bk-pbar"><i style="width:' + pct + '%"></i></div><span class="bk-progress__meta">' + m.done + " / " + m.total + " challenges</span>") + "</div></a>";
      }).join("");
    }
  };

  /* ---------- Mistake Bank ---------- */
  var bank = {
    /* render(container, {state:'due'|'empty'|'none'|'fixed', signedIn, counts:{due,later,fixed}, items:[{id,src,srcLabel,title,why,peek,due,state,href}], later:[...], nextDue}) */
    render: function (box, o) {
      box = typeof box === "string" ? D.getElementById(box) : box; if (!box) return; o = o || {}; var c = o.counts || {}, h = "";
      if (o.state !== "empty") h += '<div class="bank-sum"><div class="due"><b>' + (c.due || 0) + '</b><span class="bk-meta">due today</span></div><div><b>' + (c.later || 0) + '</b><span class="bk-meta">later</span></div><div class="ok"><b>' + (c.fixed || 0) + '</b><span class="bk-meta">fixed</span></div></div>';
      if (!o.signedIn) h += '<div class="bank-note"><span>Saved on this device only. Sign in to keep the bank on every device.</span><button class="bk-btn" data-sheet="bk-signin">Sign in</button></div>';
      function item(x) { return '<article class="bank-item" data-state="' + esc(x.state || "") + '" data-due="' + (x.due === "today" ? "today" : "later") + '" data-id="' + esc(x.id) + '"><div class="bank-item__top"><span class="bank-src" data-src="' + esc(x.src) + '">' + esc(x.srcLabel) + '</span><span class="bank-when">' + esc(x.state === "fixed" ? "Fixed ✓ · next in " + (x.next || "3 days") : x.due === "today" ? "Due today" : "Due " + x.due) + "</span></div><h3>" + esc(x.title) + "</h3>" + (x.why ? '<p class="why">Last time: <b>' + esc(x.why) + "</b></p>" : "") + (x.state === "fixed" ? "" : '<a class="bk-btn' + (x.due === "today" ? " bk-btn--primary" : "") + '" href="' + esc(x.href || "#") + '" data-resolve="' + esc(x.id) + '">Re-solve</a>') + (x.peek ? '<div class="peek">' + esc(x.peek) + "</div>" : "") + "</article>"; }
      if (o.state === "empty") h += '<div class="bank-empty"><span class="bk-k">Mistake Bank · empty</span><h2>Nothing to re-solve.</h2><p>Wrong answers and revealed solutions from the modules and SQLZoo land here, then come back on a schedule until you get them right.</p><div class="bk-row"><a class="bk-btn bk-btn--primary" href="sqlzoo.html">Practise on SQLZoo</a><a class="bk-btn" href="../index.html#modules-top">Back to the modules</a></div></div>';
      else if (o.state === "none") h += '<div class="bank-empty"><span class="bk-k">Nothing due today</span><h2>All caught up.</h2><p>Next one comes back ' + esc(o.nextDue || "in 2 days") + '. Re-solving early does not count towards the schedule.</p></div>';
      else h += '<div class="bank-filter" role="group"><button class="bk-chip" aria-pressed="true" data-filter="">All</button><button class="bk-chip" aria-pressed="false" data-filter="module">Modules</button><button class="bk-chip" aria-pressed="false" data-filter="sqlzoo">SQLZoo</button></div><div class="bank-list">' + (o.items || []).map(item).join("") + "</div>";
      if (o.later && o.later.length) h += '<details class="bank-later"' + (o.state === "none" ? " open" : "") + "><summary>Coming up · " + o.later.length + '</summary><div class="bank-list">' + o.later.map(item).join("") + "</div></details>";
      box.innerHTML = h;
      $$("[data-filter]", box).forEach(function (b) { b.onclick = function () { $$("[data-filter]", box).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); $$(".bank-item", box).forEach(function (it) { it.hidden = !!b.dataset.filter && it.querySelector(".bank-src").dataset.src !== b.dataset.filter; }); }; });
      $$("[data-resolve]", box).forEach(function (a) { a.addEventListener("click", function (e) { emit("resolve", { id: a.dataset.resolve, event: e }); }); });
    }
  };

  /* ---------- sign-in chip ---------- */
  var auth = {
    /* set('out'|'sent'|'syncing'|'in', email) */
    set: function (s, email) {
      $$(".bk-auth").forEach(function (b) { b.setAttribute("data-auth", s); b.innerHTML = '<span class="dot"></span><span class="em">' + esc(s === "in" ? (email || "Signed in") : s === "syncing" ? "Syncing…" : s === "sent" ? "Link sent · check mail" : "Sign in") + "</span>"; });
      var f = D.getElementById("bk-signin"); if (!f) return;
      f.setAttribute("data-auth", s);
      $$("[data-auth-show]", f).forEach(function (x) { x.hidden = x.dataset.authShow.split(" ").indexOf(s) < 0; });
      var em = f.querySelector("[data-auth-email]"); if (em) em.textContent = email || "";
    }
  };

  /* ---------- wiring ---------- */
  function tocSpy() {
    var links = $$('.bk-toc a[href^="#"]'); if (!links.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; links.forEach(function (l) { l.setAttribute("aria-current", String(l.getAttribute("href") === "#" + e.target.id)); }); }); }, { rootMargin: "-50px 0px -70% 0px" });
    links.forEach(function (l) { var t = D.getElementById(l.getAttribute("href").slice(1)); if (t) io.observe(t); });
  }
  function init() {
    applyTheme(theme.get()); applySize(textSize.get());
    D.addEventListener("click", function (e) {
      var t = e.target.closest("[data-sheet]"); if (t) { e.preventDefault(); sheet.open(t.dataset.sheet, t); return; }
      if (e.target.closest("[data-sheet-close]")) { sheet.close(); return; }
      var th = e.target.closest("[data-set-theme]"); if (th) theme.set(th.dataset.setTheme);
      var sz = e.target.closest("[data-set-size]"); if (sz) textSize.set(sz.dataset.setSize);
      var ab = e.target.closest(".bk-auth"); if (ab && D.getElementById("bk-signin")) { sheet.open("bk-signin", ab); emit("auth", { action: "open" }); }
      var sl = e.target.closest(".bk-sheet a[href^='#']"); if (sl) sheet.close();
      var snd = e.target.closest("[data-auth-send]"); if (snd) { var i = D.getElementById("bk-email"); emit("auth", { action: "send", email: i ? i.value.trim() : "" }); }
      var so = e.target.closest("[data-auth-signout]"); if (so) emit("auth", { action: "signout" });
      var rd = e.target.closest('[data-action="reset-data"]'); if (rd) emit("reset-data", { pg: rd.closest(".playground") });
    });
    D.addEventListener("keydown", function (e) { if (e.key === "Escape") sheet.close(); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (theme.get() === "auto") applyTheme("auto"); });
    decorate(D); $$(".playground:not([data-state])").forEach(function (p) { if (p.querySelector(".pg-header")) pg.set(p, "idle"); });
    $$(".playground textarea").forEach(function (ta) { var f = function () { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; }; ta.addEventListener("input", f); f(); });
    fades(D); bindGate(); tocSpy();
    emit("ready", {});
  }
  window.SQLBook = { theme: theme, textSize: textSize, sheet: sheet, toast: toast, pg: pg, table: table, challenge: challenge, check: check, today: today, modules: modules, bank: bank, auth: auth, fades: fades, init: init };
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();
})();

/* Load the SQL offline entry on every book page without changing generated lessons. */
(()=>{const me=document.currentScript; if(!me)return; const s=document.createElement("script");s.src=new URL("offline-entry.js",me.src);document.body.appendChild(s);})();
