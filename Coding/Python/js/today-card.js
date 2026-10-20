/* today-card.js — Commonplace · Python. The "Today" card on the Learn tab and
   the "Due today" card on the Practice tab. VISUAL LAYER ONLY: this file draws
   from whatever data it is given and ships with placeholder rows. The real
   numbers (resume position, drills due, mistakes, today's notebook, Leitner
   boxes) are wired by the engineering side through the two update() calls.

   Load after js/shelf-data.js:
     <script src="js/today-card.js"></script>

   API
     TodayCard.mountLearn(el, data)   draw the Today card into el
     TodayCard.updateLearn(partial)   merge + redraw (any row may be null → hidden)
     TodayCard.mountDue(el, data)     draw the Due-today card into el
     TodayCard.updateDue(partial)

   data for the Learn card — every row optional:
     { resume:   {title, meta, href, pct},          pct 0–100 or null
       drills:   {count, title, meta, href},
       mistakes: {count, title, meta, href},
       notebook: {title, meta, href} }
   data for the Due card:
     { count, items:[{title, box}], href, empty:"text when count is 0" }
   Rows drawn from the built-in placeholders carry data-placeholder="1". */
window.TodayCard = (function () {
  "use strict";
  var CSS = ''
  + '.tdy{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-sm);overflow:hidden;margin:0 0 6px}'
  + '.tdy-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:14px 16px 10px}'
  + '.tdy-k{font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--green)}'
  + '.tdy-d{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink-mute)}'
  + '.tdy-r{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;min-height:66px;padding:11px 16px;border-top:1px solid var(--line-soft);color:var(--ink);text-decoration:none;transition:background .15s}'
  + '.tdy-r:hover{background:var(--paper-2);color:var(--ink)}'
  + '.tdy-r.lead{background:var(--sage-soft)}.tdy-r.lead:hover{background:var(--mint-soft)}'
  + '.tdy-l{font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-mute)}'
  + '.tdy-t{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:21px;line-height:1.15;margin:2px 0 1px;text-wrap:pretty}'
  + '.tdy-m{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink-mute)}'
  + '.tdy-bar{height:4px;background:var(--line);border-radius:2px;margin-top:7px;overflow:hidden;max-width:260px}.tdy-bar i{display:block;height:100%;background:var(--green)}'
  + '.tdy-go{font-family:"JetBrains Mono",monospace;font-size:18px;color:var(--green);width:28px;text-align:right}'
  + '.tdy-n{font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;color:var(--on-deep);background:var(--green-deep);border-radius:12px;padding:3px 9px;min-width:28px;text-align:center}'
  + '.tdy-n.bad{background:var(--bad);color:var(--on-fill)}'
  + '.tdy-r[data-placeholder] .tdy-m::after{content:" · placeholder";color:var(--brass-ink)}'
  + '@media (min-width:900px){.tdy-rows{display:grid;grid-template-columns:1fr 1fr}.tdy-r{border-top:1px solid var(--line-soft)}.tdy-r:nth-child(2n){border-left:1px solid var(--line-soft)}}'
  /* Due today (Practice) */
  + '.due{background:var(--card);border:1.5px solid var(--green);border-radius:14px;padding:16px;margin:4px 0 26px}'
  + '.due-k{font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--green)}'
  + '.due h3{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:26px;line-height:1.05;margin:6px 0 4px;text-wrap:pretty}'
  + '.due-l{display:flex;flex-direction:column;margin:12px 0 14px;border-top:1px solid var(--line-soft)}'
  + '.due-l div{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line-soft);font-size:16px;color:var(--ink)}'
  + '.due-l .bx{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink-mute);white-space:nowrap}'
  + '.due-go{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;border-radius:10px;background:var(--green-deep);color:var(--on-deep);font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;letter-spacing:.3px;text-decoration:none;border:1px solid var(--green-deep)}'
  + '.due-go:hover{background:var(--fill-dk);color:var(--on-deep)}'
  + '.due-empty{font-size:16px;color:var(--ink-soft);margin:8px 0 0;font-style:italic}'
  + '.due[data-placeholder] .due-k::after{content:" · placeholder";color:var(--brass-ink);letter-spacing:0;text-transform:none}';

  function css() { if (document.getElementById("today-card-css")) return; var s = document.createElement("style"); s.id = "today-card-css"; s.textContent = CSS; document.head.appendChild(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function dateStr() { return new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); }

  /* ---------- Learn · Today ---------- */
  var PLACEHOLDER = {
    drills:   { count: 5, title: "Strings and loops", meta: "from 1.3 · 1.4 · 2.1", href: "index.html?tab=practice" },
    mistakes: { count: 3, title: "Mistakes waiting", meta: "oldest 4 days", href: "index.html?tab=bank" },
    notebook: { title: "For loops", meta: "pairs with 2.3 · 14 cells", href: "fundamentals/02_for_loops.html" }
  };
  var learnEl = null, learnData = {};
  function row(label, d, right, cls, ph) {
    if (!d) return "";
    return '<a class="tdy-r' + (cls ? " " + cls : "") + '" href="' + esc(d.href || "#") + '"' + (ph ? ' data-placeholder="1"' : '') + '>'
      + '<span><span class="tdy-l">' + label + '</span><span class="tdy-t" style="display:block">' + d.title + '</span>'
      + (d.meta ? '<span class="tdy-m" style="display:block">' + d.meta + '</span>' : '')
      + (d.pct != null ? '<span class="tdy-bar" style="display:block"><i style="width:' + Math.max(0, Math.min(100, d.pct)) + '%"></i></span>' : '')
      + '</span>' + right + '</a>';
  }
  function drawLearn() {
    if (!learnEl) return; css();
    var D = learnData, ph = D.__placeholder;
    var m = D.mistakes, dr = D.drills;
    learnEl.innerHTML = '<div class="tdy"><div class="tdy-h"><span class="tdy-k">Today</span><span class="tdy-d">' + dateStr() + '</span></div><div class="tdy-rows">'
      + row(D.resume && D.resume.kick || "Resume", D.resume, '<span class="tdy-go">&rarr;</span>', "lead", false)
      + row("Drills due", dr, '<span class="tdy-n">' + (dr ? dr.count : "") + '</span>', "", ph && dr === PLACEHOLDER.drills)
      + row("Re-solve", m, '<span class="tdy-n bad">' + (m ? m.count : "") + '</span>', "", ph && m === PLACEHOLDER.mistakes)
      + row("Notebook", D.notebook, '<span class="tdy-go">&rarr;</span>', "", ph && D.notebook === PLACEHOLDER.notebook)
      + '</div></div>';
  }
  function mountLearn(el, data) {
    learnEl = el; learnData = {};
    var d = data || {};
    learnData.resume = d.resume || null;
    learnData.drills = d.drills !== undefined ? d.drills : PLACEHOLDER.drills;
    learnData.mistakes = d.mistakes !== undefined ? d.mistakes : PLACEHOLDER.mistakes;
    learnData.notebook = d.notebook !== undefined ? d.notebook : PLACEHOLDER.notebook;
    learnData.__placeholder = true;
    drawLearn();
  }
  function updateLearn(p) { p = p || {}; for (var k in p) learnData[k] = p[k]; drawLearn(); }

  /* ---------- Practice · Due today ---------- */
  var dueEl = null, dueData = null;
  var DUE_PH = { count: 5, items: [{ title: "Sum a list with a for loop", box: "Box 2" }, { title: "Slice the last three characters", box: "Box 1" }, { title: "Count vowels in a word", box: "Box 3" }], href: "#", __placeholder: true };
  function drawDue() {
    if (!dueEl) return; css();
    var D = dueData, n = D.count || 0;
    var body;
    if (!n) body = '<h3>Nothing due today</h3><p class="due-empty">' + esc(D.empty || "Solve anything below and it joins the review queue.") + '</p>';
    else body = '<h3>' + n + ' card' + (n === 1 ? ' is' : 's are') + ' ready for review</h3>'
      + '<div class="due-l">' + (D.items || []).slice(0, 4).map(function (i) { return '<div><span>' + esc(i.title) + '</span><span class="bx">' + esc(i.box || "") + '</span></div>'; }).join("") + '</div>'
      + '<a class="due-go" href="' + esc(D.href || "#") + '">Review ' + n + ' card' + (n === 1 ? '' : 's') + ' &rarr;</a>';
    dueEl.innerHTML = '<div class="due"' + (D.__placeholder ? ' data-placeholder="1"' : '') + '><span class="due-k">Due today &middot; ' + n + '</span>' + body + '</div>';
  }
  function mountDue(el, data) { dueEl = el; dueData = data || DUE_PH; drawDue(); }
  function updateDue(p) { dueData = dueData && !dueData.__placeholder ? dueData : {}; for (var k in (p || {})) dueData[k] = p[k]; delete dueData.__placeholder; drawDue(); }

  return { mountLearn: mountLearn, updateLearn: updateLearn, mountDue: mountDue, updateDue: updateDue };
})();
