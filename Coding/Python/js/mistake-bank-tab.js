/* mistake-bank-tab.js — Commonplace · Python. The Mistake Bank tab on the
   Python page, drawn natively (no iframe). VISUAL LAYER ONLY: it ships with
   placeholder data; the merged local + cloud store is wired by Claude Code.

   Load in index.html after shelf-data.js:
     <script src="js/mistake-bank-tab.js"></script>

   API
     MistakeBankTab.mount(el, data?)   draw into el (placeholder data if omitted)
     MistakeBankTab.update(partial)    merge + redraw
   data:
     { signedIn: bool,                 // false → sign-in panel above the list
       email: "you@…" | null,
       items: [{ id, title, source, date, kind: "runtime"|"wrong"|"self",
                 snippet?: "your line", fix?: "…", href }],   // to re-solve
       resolved: number,               // count of re-solved mistakes
       onSignIn(email), onResolve(id), onShowAnswer(id), onDrillAll() }  // optional hooks
   States: list (items) · empty (no items) · signed-out (either, plus panel). */
window.MistakeBankTab = (function () {
  "use strict";
  var CSS = ''
  + '.mbt{padding:4px 0 24px}'
  + '.mbt-k{font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--green)}'
  + '.mbt h2{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:30px;line-height:1.02;letter-spacing:-.3px;margin:6px 0 4px;color:var(--ink);text-wrap:balance}'
  + '.mbt-sub{font-size:16px;color:var(--ink-soft);margin:0 0 14px;text-wrap:pretty}'
  + '.mbt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 14px}'
  + '.mbt-st{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;box-shadow:var(--shadow-sm)}'
  + '.mbt-st b{display:block;font-family:"Cormorant Garamond",serif;font-weight:600;font-size:30px;line-height:1;color:var(--ink)}'
  + '.mbt-st span{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink-mute)}'
  + '.mbt-so{background:var(--sage-soft);border:1px solid var(--sage);border-radius:14px;padding:16px;margin:0 0 18px}'
  + '.mbt-so h3{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:22px;line-height:1.1;margin:4px 0 6px;color:var(--ink)}'
  + '.mbt-so p{margin:0 0 12px;font-size:16px;line-height:1.45;color:var(--ink)}'
  + '.mbt-so form{display:flex;flex-direction:column;gap:8px;margin:0}'
  + '.mbt-in{box-sizing:border-box;width:100%;min-height:48px;border-radius:10px;border:1px solid var(--line);background:var(--card);padding:0 14px;font-family:"EB Garamond",serif;font-size:17px;color:var(--ink)}'
  + '.mbt-in:focus{outline:none;border-color:var(--green)}'
  + '.mbt-sent{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--green);margin:2px 0 0}'
  + '.mbt-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border-radius:10px;font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;letter-spacing:.3px;cursor:pointer;text-decoration:none;white-space:nowrap;border:1px solid var(--green-deep);background:var(--green-deep);color:var(--on-deep);box-sizing:border-box}'
  + '.mbt-btn:hover{background:var(--fill-dk);color:var(--on-deep)}'
  + '.mbt-btn.ghost{background:var(--card);color:var(--green);border-color:var(--line)}'
  + '.mbt-btn.ghost:hover{background:var(--sage-soft)}'
  + '.mbt-btn.w{width:100%}'
  + '.mbt-lh{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:4px 0 10px}'
  + '.mbt-who{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink-mute)}'
  + '.mbt-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin:0 0 10px;box-shadow:var(--shadow-sm)}'
  + '.mbt-ch{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 4px}'
  + '.mbt-tag{font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:2px 8px;border-radius:4px;background:var(--bad-soft);color:var(--bad)}'
  + '.mbt-tag.self{background:var(--brass-soft);color:var(--brass-ink)}'
  + '.mbt-tag.wrong{background:var(--kw-soft);color:var(--kw)}'
  + '.mbt-meta{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink-mute);margin-left:auto}'
  + '.mbt-t{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:21px;line-height:1.15;color:var(--ink);margin:2px 0 0;text-wrap:pretty}'
  + '.mbt-snip{margin:10px 0 0;background:var(--code-bg);color:var(--code-ink);border-radius:8px;padding:8px 10px;font-family:"JetBrains Mono",monospace;font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.mbt-snip em{font-style:normal;color:var(--code-dim)}'
  + '.mbt-ans{margin:10px 0 0;background:var(--brass-soft);border:1px solid var(--brass-line);border-radius:10px;padding:10px 12px;font-size:16px;line-height:1.45;color:var(--ink)}'
  + '.mbt-ans .mbt-k{color:var(--brass-ink);display:block;margin-bottom:2px}'
  + '.mbt-acts{display:flex;gap:8px;margin-top:12px}'
  + '.mbt-acts .mbt-btn:first-child{flex:1}'
  + '.mbt-empty{text-align:center;background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:28px 18px}'
  + '.mbt-empty .mbt-mark{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:44px;line-height:1;color:var(--green)}'
  + '.mbt-empty h3{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:24px;line-height:1.1;margin:8px 0 6px;color:var(--ink)}'
  + '.mbt-empty p{margin:0 auto 14px;font-size:16px;line-height:1.45;color:var(--ink-soft);max-width:34ch}'
  + '.mbt-ph{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--brass-ink);margin:12px 0 0}'
  + '@media (min-width:760px){.mbt-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mbt-card{margin:0}.mbt-so form{flex-direction:row}.mbt-so .mbt-btn{flex:none}}';

  var PH = {
    signedIn: false, email: null, resolved: 11, __placeholder: true,
    items: [
      { id: "p1", kind: "runtime", title: "Sum a list with a for loop", source: "Fundamentals", date: "16 Oct", snippet: "<em># your line 4</em>\ntotal += totl", fix: "The loop adds to <code>total</code>; <code>totl</code> was never defined.", href: "#" },
      { id: "p2", kind: "self", title: "range(1, 10, 2) — what prints?", source: "2.3 drill", date: "18 Oct", fix: "1 3 5 7 9 — it stops before 10.", href: "#" },
      { id: "p3", kind: "wrong", title: "Reverse words in a sentence", source: "Fundamentals", date: "19 Oct", snippet: "<em># expected</em>\nworld hello\n<em># got</em>\ndlrow olleh", fix: "Split into words first: <code>' '.join(s.split()[::-1])</code>.", href: "#" }
    ]
  };
  var KIND = { runtime: ["Runtime", ""], wrong: ["Wrong output", "wrong"], self: ["Self-marked", "self"] };
  var host = null, D = null, open = {};

  function css() { if (document.getElementById("mbt-css")) return; var s = document.createElement("style"); s.id = "mbt-css"; s.textContent = CSS; document.head.appendChild(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function oldest(items) { return items.length ? (items.length > 2 ? "4d" : "2d") : "—"; }

  function signedOutPanel() {
    var n = D.items.length;
    return '<div class="mbt-so"><span class="mbt-k">Signed out &middot; saved on this phone</span>'
      + '<h3>Sign in to keep these on every device</h3>'
      + '<p>' + (n ? 'Your ' + n + ' mistake' + (n === 1 ? ' is' : 's are') + ' stored here. When you sign in they merge into one bank.' : 'Mistakes you make here are kept on this phone. Sign in to sync them with your other devices.') + '</p>'
      + '<form data-act="signin"><input class="mbt-in" type="email" name="email" placeholder="you@example.com" autocomplete="email" required aria-label="Email address">'
      + '<button class="mbt-btn" type="submit">Email me a sign-in link</button></form>'
      + (D.__sent ? '<p class="mbt-sent">&#10003; Link sent to ' + esc(D.__sent) + '</p>' : '')
      + '</div>';
  }
  function card(it) {
    var k = KIND[it.kind] || KIND.runtime, isOpen = !!open[it.id];
    return '<article class="mbt-card"><div class="mbt-ch"><span class="mbt-tag ' + k[1] + '">' + k[0] + '</span><span class="mbt-meta">' + esc(it.date) + ' &middot; ' + esc(it.source) + '</span></div>'
      + '<h3 class="mbt-t">' + esc(it.title) + '</h3>'
      + (it.snippet ? '<div class="mbt-snip">' + it.snippet + '</div>' : '')
      + (isOpen && it.fix ? '<div class="mbt-ans"><span class="mbt-k">Answer</span>' + it.fix + '</div>' : '')
      + '<div class="mbt-acts"><a class="mbt-btn" href="' + esc(it.href || "#") + '" data-act="resolve" data-id="' + esc(it.id) + '">Re-solve &rarr;</a>'
      + '<button class="mbt-btn ghost" type="button" data-act="answer" data-id="' + esc(it.id) + '" aria-expanded="' + isOpen + '">' + (isOpen ? 'Hide answer' : 'Show answer') + '</button></div></article>';
  }
  function draw() {
    if (!host) return; css();
    var n = D.items.length;
    var h = '<div class="mbt">'
      + '<span class="mbt-k">&sect; Mistake bank</span><h2>Every miss, kept until re-solved</h2>'
      + '<p class="mbt-sub">From practice cards, lesson drills and notebooks. Re-solve one and it leaves the bank.</p>'
      + '<div class="mbt-stats"><div class="mbt-st"><b>' + n + '</b><span>to re-solve</span></div><div class="mbt-st"><b>' + (D.resolved || 0) + '</b><span>resolved</span></div><div class="mbt-st"><b>' + oldest(D.items) + '</b><span>oldest</span></div></div>'
      + (D.signedIn ? '' : signedOutPanel());
    if (!n) {
      h += '<div class="mbt-empty"><div class="mbt-mark">&#10003;</div><h3>Nothing to re-solve</h3>'
        + '<p>' + (D.resolved ? 'All ' + D.resolved + ' past mistakes are re-solved. New misses from practice land here.' : 'When a practice answer is wrong, it is kept here until you solve it again.') + '</p>'
        + '<a class="mbt-btn ghost" href="#practice" data-act="practice">Go to Practice &rarr;</a></div>';
    } else {
      h += '<div class="mbt-lh"><span class="mbt-k">To re-solve &middot; ' + n + '</span>' + (D.signedIn && D.email ? '<span class="mbt-who">' + esc(D.email) + '</span>' : '') + '</div>'
        + '<div class="mbt-list">' + D.items.map(card).join("") + '</div>'
        + '<button class="mbt-btn ghost w" type="button" data-act="drill" style="margin-top:10px">Drill all ' + n + ' in a row</button>';
    }
    if (D.__placeholder) h += '<p class="mbt-ph">Placeholder data &middot; not connected to the store yet</p>';
    host.innerHTML = h + '</div>';
    var chip = document.getElementById("bank-total");
    if (chip) { chip.textContent = n; chip.hidden = !n; }
  }
  function onClick(e) {
    var a = e.target.closest("[data-act]"); if (!a || !host.contains(a)) return;
    var act = a.getAttribute("data-act"), id = a.getAttribute("data-id");
    if (act === "answer") { open[id] = !open[id]; draw(); if (D.onShowAnswer && open[id]) D.onShowAnswer(id); }
    else if (act === "resolve" && D.onResolve) { e.preventDefault(); D.onResolve(id); }
    else if (act === "drill" && D.onDrillAll) D.onDrillAll();
    else if (act === "practice") { var b = document.querySelector('.mode[data-mode="practice"]'); if (b) { e.preventDefault(); b.click(); } }
  }
  function onSubmit(e) {
    var f = e.target.closest('form[data-act="signin"]'); if (!f) return;
    e.preventDefault();
    var em = (f.email.value || "").trim(); if (!em) return;
    if (D.onSignIn) D.onSignIn(em); D.__sent = em; draw();
  }
  function mount(el, data) {
    host = el; D = data || JSON.parse(JSON.stringify(PH));
    if (!data) D.__placeholder = true;
    el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit);
    draw();
  }
  function update(p) { p = p || {}; delete D.__placeholder; for (var k in p) D[k] = p[k]; draw(); }
  return { mount: mount, update: update, render: draw };
})();
