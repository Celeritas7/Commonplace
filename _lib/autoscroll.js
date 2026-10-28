/* Commonplace - auto-scroll reading pacer (loaded by _lib/progress-backup.js on every page that has it)
   - Python lessons: a "▶ Scroll" button joins the lesson-reader toolbar. Everywhere else: a pill next to 🧠 Quiz.
   - While it runs, a strip offers pause, − / + and history. Speed is shown in words per minute for this page
     and is remembered per device (localStorage cpa:pxs). Below SLOW_WPM the label warns that the mind may wander.
   - Tap the page to pause, tap again to resume. Esc stops.
   - It slows down over code, tables, maths and diagrams, and waits (never fights) while you scroll yourself,
     select text, type, or have the quiz / bookmark panel open.
   - It stops at the end-of-lesson block ("Check yourself") or the bottom of the page.
   - Every session of 30 s or more is logged (localStorage cpa:log, exported with ⇅): pace, focus, pauses,
     tab switches, scroll-backs, and the quiz score if you take the quiz afterwards (quiz.js fires cpq:result).
     A verdict says whether the pace was too fast, too slow or right, and suggests the next speed.
   Opt out on a page with window.CP_AUTOSCROLL_OFF = true. */
(function () {
  if (window.__cpAuto || window.CP_AUTOSCROLL_OFF) return; window.__cpAuto = 1;

  /* px per second, ~15% apart so you can fine-tune; middle-click's slowest is far above the low end */
  var SPEEDS = [6, 7, 8, 9, 10.5, 12, 14, 16, 18.5, 21, 24, 28, 32, 37, 42, 48, 55, 63, 72, 83, 95, 110, 125];
  var KEY = 'cpa:pxs', LOG = 'cpa:log', LOG_MAX = 300;
  var SLOW_WPM = 120;       // below this the mind has room to wander
  var SLOW = 0.45;          // speed factor over code / diagrams
  var USER_WAIT = 2200;     // ms to wait after you scroll yourself
  var MIN_SESSION = 30;     // seconds of reading before a session is logged
  var SLOW_SEL = 'pre,code,.CodeMirror,.cm-editor,.monaco-editor,table,svg,img,canvas,figure,.katex-display,.mermaid';
  var STOP_SEL = '#eol,.eol,[data-autoscroll-stop]';
  var MINE = '#cpa-pill,#cpa-hbtn,#cpa-strip,#cpa-card,#cpa-hist,.cpa-btn,#cpq-pill,#cpq-root,#cpx-panel,#cpx-fab,#cpx-tools,.cpb-pill,.lr-ui,.lr-sheet,.lr-pop';
  var PAGE; try { PAGE = decodeURIComponent(location.pathname); } catch (e) { PAGE = location.pathname; }

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function nearest(px) { var b = 0; SPEEDS.forEach(function (v, i) { if (Math.abs(v - px) < Math.abs(SPEEDS[b] - px)) b = i; }); return b; }

  var idx = nearest(load(KEY, 16));

  var state = 'off';        // off | run | paused
  var raf = 0, stuck = 0, last = 0, acc = 0, factor = 1, expectY = null, holdUntil = 0, lastRewind = 0, stopAt = null, scroller = null;
  var density = 0;          // words per pixel of page height
  var sess = null;          // the reading session in progress
  var pill = null, histBtn = null, toolBtn = null, strip = null, label = null;

  /* ---------- the thing that scrolls: the page, or the biggest scrolling box on app-style pages ---------- */
  function findScroller() {
    var se = document.scrollingElement || document.documentElement;
    if (se.scrollHeight > innerHeight + 40) return se;
    var best = null, bestH = 0;
    Array.prototype.forEach.call(document.querySelectorAll('body *'), function (el) {
      if (el.clientHeight < innerHeight * 0.5 || el.scrollHeight <= el.clientHeight + 40) return;
      var oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.clientHeight > bestH) { best = el; bestH = el.clientHeight; }
    });
    return best || se;
  }
  function top() { return scroller.scrollTop; }
  function viewH() { return scroller === (document.scrollingElement || document.documentElement) ? innerHeight : scroller.clientHeight; }
  /* always an instant jump: with scroll-behavior:smooth on the page (all SQL modules, and more) a plain
     scrollTop write animates, top() still reads the old value, and the loop thought it was stuck */
  function moveBy(px) {
    var st = scroller.style, was = st.scrollBehavior;
    st.scrollBehavior = 'auto'; scroller.scrollTop = top() + px; st.scrollBehavior = was;
  }

  /* words per pixel, so a px/s speed can be shown as words per minute on this page */
  function measure() {
    var sc = scroller || findScroller();
    var host = sc === (document.scrollingElement || document.documentElement) ? document.body : sc;
    var words = 0;
    try {
      var w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
        var p = n.parentNode; return p && p.closest && p.closest('script,style,noscript,nav,' + MINE) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      } });
      while (w.nextNode()) { var m = w.currentNode.nodeValue.match(/\S+/g); if (m) words += m.length; }
    } catch (e) {}
    density = words / Math.max(sc.scrollHeight, 1);
  }
  function wpmOf(pxs) { return Math.round(pxs * density * 60); }

  /* ---------- where to stop: the end-of-lesson block, else a "Check yourself" heading ---------- */
  function findStop() {
    var el = document.querySelector(STOP_SEL);
    if (!el) {
      var hs = document.querySelectorAll('h1,h2,h3,h4');
      for (var i = 0; i < hs.length; i++) if (/^\s*check yourself/i.test(hs[i].textContent)) { el = hs[i]; break; }
    }
    return el;
  }
  function stopReached() {
    if (!stopAt || !stopAt.isConnected) return false;
    var r = stopAt.getBoundingClientRect();
    return r.height > 0 && r.top <= viewH() * 0.35;
  }

  /* ---------- reasons to wait without stopping ---------- */
  function shown(el) { return !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'); }
  function typing() {
    var a = document.activeElement; if (!a || a === document.body) return false;
    return a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || !!(a.closest && a.closest('.CodeMirror,.cm-editor,.monaco-editor'));
  }
  function selecting() { var s = window.getSelection && getSelection(); return !!(s && !s.isCollapsed && s.toString().trim()); }
  function waiting(now) {
    return now < holdUntil || document.hidden || typing() || selecting() ||
      shown(document.getElementById('cpq-root')) || shown(document.getElementById('cpx-panel')) || shown(document.getElementById('cpa-hist'));
  }

  /* ---------- slow-down: what sits on the reading line (40% down the screen)? ---------- */
  function overSlow() {
    var y = Math.round(innerHeight * 0.4);
    var xs = [innerWidth * 0.3, innerWidth * 0.5, innerWidth * 0.7];
    for (var i = 0; i < xs.length; i++) {
      var el = document.elementFromPoint(Math.round(xs[i]), y);
      if (el && el.closest && el.closest(SLOW_SEL) && !el.closest(MINE)) return true;
    }
    return false;
  }

  /* ---------- the loop ---------- */
  function tick(now) {
    raf = 0; if (state !== 'run') return;
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
    var y = top();
    if (expectY !== null && Math.abs(y - expectY) > 2) {          // you scrolled: wait for you
      if (y - expectY < -80 && now - lastRewind > USER_WAIT) { sess.rewinds++; lastRewind = now; }
      holdUntil = now + USER_WAIT; acc = 0;
    }
    if (y > sess.maxY) sess.maxY = y;
    if (stopReached()) { stop('end'); return; }
    if (y + viewH() >= scroller.scrollHeight - 2) { stop('bottom'); return; }
    if (waiting(now)) { sess.idle += dt; expectY = y; raf = requestAnimationFrame(tick); return; }
    sess.act += dt; sess.pxSum += SPEEDS[idx] * dt;
    var target = overSlow() ? SLOW : 1;
    factor += (target - factor) * Math.min(1, dt * 2.5);   // ease in and out of the slow zones
    acc += SPEEDS[idx] * factor * dt;
    var step = Math.floor(acc);
    if (step >= 1) { acc -= step; moveBy(step); }
    expectY = top();
    if (step >= 1) stuck = expectY === y ? stuck + 1 : 0;
    if (stuck > 45) { stop(); return; }    // could not move for a while: something is locking scroll
    raf = requestAnimationFrame(tick);
  }

  function start() {
    closeCard();
    scroller = findScroller(); stopAt = findStop(); measure();
    if (stopReached()) stopAt = null;   // already past the end block: run on to the bottom of the page
    sess = { page: PAGE, title: (document.title || PAGE.split('/').pop()).slice(0, 90), t: Date.now(), act: 0, idle: 0, pxSum: 0,
             y0: top(), maxY: top(), pauses: 0, away: 0, rewinds: 0, pausedAt: 0 };
    state = 'run'; stuck = 0; last = 0; acc = 0; factor = 1; expectY = null; holdUntil = 0; lastRewind = 0;
    paint(); if (!raf) raf = requestAnimationFrame(tick);
  }
  function pause() { if (state !== 'run') return; state = 'paused'; sess.pauses++; sess.pausedAt = Date.now(); paint(); }
  function resume() {
    if (state !== 'paused') return;
    sess.idle += (Date.now() - sess.pausedAt) / 1000; sess.pausedAt = 0;
    state = 'run'; last = 0; expectY = null; paint(); if (!raf) raf = requestAnimationFrame(tick);
  }
  function stop(why) {
    if (state === 'off') return;
    if (state === 'paused' && sess.pausedAt) sess.idle += (Date.now() - sess.pausedAt) / 1000;
    state = 'off'; if (raf) cancelAnimationFrame(raf); raf = 0; paint();
    var rec = finish(why === 'end' || why === 'bottom');
    if (why === 'quiet') return;
    if (rec) showCard(rec, why === 'end' ? 'End of lesson — time for the check' : why === 'bottom' ? 'End of page' : 'Session saved');
    else if (why === 'end') flash('End of lesson — time for the check');
    else if (why === 'bottom') flash('End of page');
  }
  function toggle() { if (state === 'off') start(); else stop(); }
  function speed(d) {
    idx = Math.max(0, Math.min(SPEEDS.length - 1, idx + d));
    save(KEY, SPEEDS[idx]);
    paint();
  }
  function setSpeed(pxs) { idx = nearest(pxs); save(KEY, SPEEDS[idx]); paint(); }

  /* ---------- the session record and its verdict ---------- */
  function finish(done) {
    var s = sess; sess = null;
    if (!s || s.act < MIN_SESSION) return null;
    var words = Math.round(Math.max(0, s.maxY - s.y0) * density);
    var rec = { page: s.page, title: s.title, t: s.t, act: Math.round(s.act), idle: Math.round(s.idle),
                words: words, real: Math.round(words / (s.act / 60)), pxs: Math.round(s.pxSum / s.act * 10) / 10,
                pauses: s.pauses, away: s.away, rewinds: s.rewinds, done: !!done, quiz: null };
    rec.wpm = wpmOf(rec.pxs);   // the pace you set; real = what you covered, after code slow-downs and waits
    judge(rec);
    var log = load(LOG, []); log.push(rec); if (log.length > LOG_MAX) log = log.slice(-LOG_MAX); save(LOG, log);
    return rec;
  }
  /* Focus: share of the session spent reading rather than stopped, minus pauses, tab switches and scroll-backs.
     Pace: scroll-backs or a low quiz score mean too fast; a slow pace with stops (or a low score at a slow pace)
     means the mind had room to wander, so faster. A good score with few scroll-backs means there is room to push. */
  function judge(r) {
    var per10 = 600 / Math.max(r.act, 300),   /* rates per 10 minutes, never over less than 5, so one stop in a short session does not dominate */ stops = (r.pauses + r.away) * per10, backs = r.rewinds * per10;
    var idleR = r.idle / Math.max(r.act + r.idle, 1);
    r.focus = Math.max(0, Math.min(100, Math.round(100 * (1 - idleR) - 6 * stops - 4 * backs)));
    var slow = r.wpm < SLOW_WPM, v, step;
    if (r.quiz != null) {
      if (r.quiz < 60 && slow) { v = 'drift'; step = 1; }
      else if (r.quiz < 60) { v = 'fast'; step = -1; }
      else if (r.quiz >= 80 && backs < 2) { v = 'push'; step = 1; }
      else { v = 'good'; step = 0; }
    } else if (backs >= 4) { v = 'fast'; step = -1; }
    else if (slow || (stops >= 3 && backs < 2)) { v = 'drift'; step = 1; }
    else { v = 'good'; step = 0; }
    r.v = v; r.step = step; r.next = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, nearest(r.pxs) + step))];
    r.floor = step < 0 && density > 0 && wpmOf(r.next) < SLOW_WPM;   // never coach below the wander line
    if (r.floor) r.next = r.pxs;
    return r;
  }
  var VERDICT = {
    fast: ['Too fast', 'You lost the thread: '],
    drift: ['Too slow — mind wandering', 'The slow pace left room to drift: '],
    push: ['Comfortable — push a little', 'You kept up well: '],
    good: ['Right pace', 'Steady reading: ']
  };
  function reason(r) {
    var bits = [];
    if (r.quiz != null) bits.push('quiz ' + r.quiz + '%');
    bits.push(r.wpm + ' wpm' + (r.wpm < SLOW_WPM ? ' (below ' + SLOW_WPM + ')' : '') + (r.real != null && Math.abs(r.real - r.wpm) > 10 ? ' set, ' + r.real + ' actual' : ''));
    if (r.rewinds) bits.push(r.rewinds + ' scroll-back' + (r.rewinds > 1 ? 's' : ''));
    if (r.pauses) bits.push(r.pauses + ' pause' + (r.pauses > 1 ? 's' : ''));
    if (r.away) bits.push(r.away + ' tab switch' + (r.away > 1 ? 'es' : ''));
    return VERDICT[r.v][1] + bits.join(', ') + '.' +
      (r.floor ? ' Going slower than ' + SLOW_WPM + ' wpm invites drifting — keep this speed and pause on purpose at the hard parts.' : '');
  }

  /* the quiz after reading: pair its score with the latest session on this page (within 3 hours) */
  document.addEventListener('cpq:result', function (e) {
    var pct = e.detail && e.detail.pct; if (pct == null) return;
    if (state !== 'off') stop('quiet');
    if (!density) { scroller = scroller || findScroller(); measure(); }   // not started on this load: wpm needs words per pixel
    var log = load(LOG, []);
    for (var i = log.length - 1; i >= 0; i--) {
      var r = log[i];
      if (r.page !== PAGE) continue;
      if (Date.now() - r.t > 3 * 3600e3 || r.quiz != null) return;
      r.quiz = pct; judge(r); save(LOG, log);
      setTimeout(function () { showCard(r, 'Pace + quiz'); }, 400);
      return;
    }
  });

  /* ---------- UI ---------- */
  var FONT = 'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;';
  var css = document.createElement('style');
  css.textContent =
    '#cpa-pill{position:fixed;left:140px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9998;height:30px;padding:0 12px 0 10px;border-radius:999px;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;' + FONT + 'font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);opacity:.72;display:flex;align-items:center;gap:6px}' +
    '#cpa-pill:hover,#cpa-pill.on{opacity:1;border-color:#8a5a2b}' +
    '#cpa-hbtn{position:fixed;left:230px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9998;width:30px;height:30px;padding:0;border-radius:50%;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);opacity:.72;display:flex;align-items:center;justify-content:center}' +
    '#cpa-hbtn:hover{opacity:1;border-color:#8a5a2b}' +
    '@media (max-width:419px){.lr-ui.cpa-crowd{gap:0;padding-left:2px;padding-right:2px}.lr-ui.cpa-crowd button .lr-l{font-size:10px;letter-spacing:-.2px}}' +   /* eight buttons on a narrow phone */
    '#cpa-strip{position:fixed;left:50%;bottom:calc(52px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:99999;display:none;align-items:center;gap:2px;padding:4px;border-radius:999px;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;box-shadow:0 4px 16px rgba(0,0,0,.14);' + FONT + 'font-size:12.5px;font-weight:600;-webkit-user-select:none;user-select:none;max-width:calc(100vw - 16px);box-sizing:border-box}' +
    '#cpa-strip.show{display:flex}' +
    '#cpa-strip button{all:unset;cursor:pointer;min-width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:15px;-webkit-tap-highlight-color:transparent}' +
    '#cpa-strip button:hover,#cpa-strip button:active{background:#f1e8da}' +
    '#cpa-strip .cpa-l{min-width:74px;text-align:center;font-variant-numeric:tabular-nums;line-height:1.1}' +
    '#cpa-strip .cpa-l small{display:block;font-size:10px;font-weight:500;color:#8a7a66}' +
    '#cpa-strip .cpa-l.slow,#cpa-strip .cpa-l.slow small{color:#b45309}' +
    '#cpa-strip.cpa-tb{bottom:calc(74px + env(safe-area-inset-bottom))}' +
    '@media (min-width:820px){#cpa-strip.cpa-tb{left:auto;right:18px;transform:none;bottom:86px}}' +
    '#cpa-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;padding:8px 14px;border-radius:999px;background:#2b241c;color:#fffdf7;' + FONT + 'font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:opacity .4s}' +
    '#cpa-card,#cpa-hist{position:fixed;z-index:2147482000;background:#fffdf7;color:#3b2f22;border:1px solid #d8cbb8;box-shadow:0 10px 34px rgba(0,0,0,.18);' + FONT + 'font-size:13.5px;line-height:1.45;box-sizing:border-box}' +
    '#cpa-card{left:50%;top:16px;transform:translateX(-50%);width:min(400px,calc(100vw - 24px));border-radius:16px;padding:14px 16px 12px}' +
    '#cpa-card h4,#cpa-hist h4{margin:0 0 2px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a66;font-weight:600}' +
    '#cpa-card .cpa-v{font-size:18px;font-weight:700;margin:2px 0 4px}' +
    '#cpa-card .cpa-v.fast{color:#b42318}#cpa-card .cpa-v.drift{color:#b45309}#cpa-card .cpa-v.push{color:#4f46e5}#cpa-card .cpa-v.good{color:#047857}' +
    '#cpa-card .cpa-why{color:#5a4632;margin:0 0 10px}' +
    '.cpa-nums{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 10px;text-align:center}' +
    '.cpa-nums span{background:#f6efe3;border-radius:10px;padding:6px 2px;font-size:11px;color:#8a7a66}.cpa-nums b{display:block;font-size:16px;color:#3b2f22}' +
    '.cpa-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}' +
    '.cpa-acts button{all:unset;cursor:pointer;padding:6px 12px;border-radius:999px;border:1px solid #d8cbb8;font-size:12.5px;font-weight:600}' +
    '.cpa-acts button.pri{background:#3b2f22;color:#fffdf7;border-color:#3b2f22}' +
    '#cpa-hist{top:0;right:0;bottom:0;width:min(420px,100vw);overflow-y:auto;padding:16px;border-radius:0}' +
    '#cpa-hist table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}' +
    '#cpa-hist th{text-align:left;font-weight:600;color:#8a7a66;border-bottom:1px solid #e6ddcf;padding:4px 3px}' +
    '#cpa-hist td{border-bottom:1px solid #f1ebe1;padding:5px 3px;vertical-align:top;font-variant-numeric:tabular-nums}' +
    '#cpa-hist td.t{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#cpa-hist .cpa-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}' +
    '#cpa-hist .cpa-tip{background:#f6efe3;border-radius:12px;padding:10px 12px;margin:10px 0}' +
    '#cpa-hist .x,#cpa-card .x{all:unset;cursor:pointer;float:right;font-size:18px;line-height:1;padding:2px 6px;color:#8a7a66}';
  document.head.appendChild(css);

  var ICON = {
    pause: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor"/><rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor"/></svg>',
    play: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>',
    stop: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    stats: '<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="1" y="7" width="3" height="5" rx=".8" fill="currentColor"/><rect x="5" y="4" width="3" height="8" rx=".8" fill="currentColor"/><rect x="9" y="1" width="3" height="11" rx=".8" fill="currentColor"/></svg>'
  };
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mins(sec) { return sec < 60 ? sec + 's' : Math.round(sec / 60) + 'm'; }

  function buildStrip() {
    strip = el('div', { id: 'cpa-strip', role: 'group', 'aria-label': 'Auto-scroll' });
    var pp = el('button', { type: 'button', title: 'Pause / resume (or tap the page)', 'data-a': 'pp' }, ICON.pause);
    var mi = el('button', { type: 'button', title: 'Slower', 'data-a': '-' }, '−');
    label = el('span', { class: 'cpa-l' });
    var pl = el('button', { type: 'button', title: 'Faster', 'data-a': '+' }, '+');
    var hi = el('button', { type: 'button', title: 'Reading history and verdicts', 'data-a': 'h' }, ICON.stats);
    var st = el('button', { type: 'button', title: 'Stop (Esc)', 'data-a': 'x' }, ICON.stop);
    [pp, mi, label, pl, hi, st].forEach(function (n) { strip.appendChild(n); });
    strip.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'pp') state === 'run' ? pause() : resume();
      else if (a === '-') speed(-1);
      else if (a === '+') speed(1);
      else if (a === 'h') showHistory();
      else stop();
    });
    document.body.appendChild(strip);
  }

  function paint() {
    if (!strip) return;
    strip.classList.toggle('show', state !== 'off');
    strip.querySelector('[data-a="pp"]').innerHTML = state === 'run' ? ICON.pause : ICON.play;
    var w = wpmOf(SPEEDS[idx]), slow = density > 0 && w < SLOW_WPM;
    label.className = 'cpa-l' + (slow ? ' slow' : '');
    label.innerHTML = (density > 0 ? '≈ ' + w + ' wpm' : SPEEDS[idx] + ' px/s') +
      '<small>' + (state === 'paused' ? 'paused · tap page' : slow ? 'slow — mind may wander' : 'speed ' + (idx + 1) + '/' + SPEEDS.length) + '</small>';
    label.title = 'Words per minute on this page at this speed (code and diagrams scroll at about half). Below ' + SLOW_WPM + ' wpm the mind tends to wander.';
    if (pill) { pill.classList.toggle('on', state !== 'off'); pill.innerHTML = state === 'off' ? '<span aria-hidden="true">▶</span>Scroll' : '<span aria-hidden="true">■</span>Stop'; placePill(); }
    if (toolBtn) {
      toolBtn.classList.toggle('on', state !== 'off');
      toolBtn.querySelector('.lr-g').textContent = state === 'off' ? '▶' : '■';
      toolBtn.querySelector('.lr-l').textContent = state === 'off' ? 'Scroll' : 'Stop';
      toolBtn.setAttribute('aria-label', state === 'off' ? 'Auto-scroll' : 'Stop auto-scroll');
    }
  }

  var toastT;
  function flash(msg) {
    var t = document.getElementById('cpa-toast') || document.body.appendChild(el('div', { id: 'cpa-toast', role: 'status' }));
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 450); }, 2600);
  }

  /* the verdict card after a session (and again once the quiz score is in) */
  function closeCard() { var c = document.getElementById('cpa-card'); if (c) c.remove(); }
  function showCard(r, head) {
    closeCard();
    var change = !!r.step && !r.floor && nearest(r.next) !== idx;
    var c = el('div', { id: 'cpa-card', role: 'dialog', 'aria-label': 'Reading session' },
      '<button class="x" type="button" data-a="x" aria-label="Close">×</button>' +
      '<h4>' + esc(head) + '</h4>' +
      '<div class="cpa-v ' + r.v + '">' + VERDICT[r.v][0] + '</div>' +
      '<div class="cpa-why">' + esc(reason(r)) + (change ? ' Next time: about ' + wpmOf(r.next) + ' wpm.' : '') + '</div>' +
      '<div class="cpa-nums"><span><b>' + r.wpm + '</b>wpm</span><span><b>' + r.focus + '</b>focus</span><span><b>' + mins(r.act) + '</b>reading</span><span><b>' + (r.quiz != null ? r.quiz + '%' : '—') + '</b>quiz</span></div>' +
      '<div class="cpa-acts">' +
        (r.quiz == null && window.CPQuiz ? '<button type="button" data-a="q">🧠 Quiz me now</button>' : '') +
        '<button type="button" data-a="h">History</button>' +
        (change ? '<button type="button" class="pri" data-a="s">Use ' + (r.step > 0 ? 'faster' : 'slower') + ' speed</button>' : '') +
      '</div>');
    c.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 's') { setSpeed(r.next); flash('Speed set: ≈ ' + wpmOf(SPEEDS[idx]) + ' wpm'); }
      if (a === 'h') showHistory();
      if (a === 'q' && window.CPQuiz) window.CPQuiz.open();
      closeCard();
    });
    document.body.appendChild(c);
  }

  /* history: last 7 days, your sweet spot, and recent sessions */
  function showHistory() {
    var old = document.getElementById('cpa-hist'); if (old) { old.remove(); return; }
    var log = load(LOG, []).slice().reverse();
    var week = log.filter(function (r) { return Date.now() - r.t < 7 * 864e5; });
    function avg(a, f) { var v = a.map(f).filter(function (x) { return x != null; }); return v.length ? Math.round(v.reduce(function (s, x) { return s + x; }, 0) / v.length) : null; }
    var sum = function (a, f) { return a.reduce(function (s, r) { return s + f(r); }, 0); };
    var good = log.filter(function (r) { return r.quiz != null && r.quiz >= 80; });
    var sweet = avg(good.slice(0, 10), function (r) { return r.wpm; });
    var recentF = avg(log.slice(0, 5), function (r) { return r.focus; }), prevF = avg(log.slice(5, 10), function (r) { return r.focus; });
    var tip = !log.length ? 'No sessions yet. Read with ▶ Scroll for at least ' + MIN_SESSION + ' seconds, then take the 🧠 quiz: each session is judged on pace, focus and score.'
      : sweet ? 'Your sweet spot: about <b>' + sweet + ' wpm</b> — the average pace of your sessions that scored 80%+ on the quiz.'
      : 'Take the 🧠 quiz after reading: once a few sessions score 80%+, this shows the pace that works for you.';
    if (recentF != null && prevF != null) tip += '<br>Focus, last 5 sessions: <b>' + recentF + '</b> (before: ' + prevF + ') ' + (recentF > prevF + 3 ? '— improving.' : recentF < prevF - 3 ? '— slipping.' : '— steady.');
    var COL = { fast: '#b42318', drift: '#b45309', push: '#4f46e5', good: '#047857' };
    var rows = log.slice(0, 40).map(function (r) {
      var d = new Date(r.t);
      return '<tr><td>' + (d.getMonth() + 1) + '/' + d.getDate() + '</td><td class="t" title="' + esc(r.title) + '">' + esc(r.title) + '</td><td>' + r.wpm + '</td><td>' + r.focus + '</td><td>' + (r.quiz != null ? r.quiz + '%' : '—') + '</td>' +
        '<td><span class="cpa-dot" style="background:' + COL[r.v] + '"></span>' + VERDICT[r.v][0].split(' —')[0] + '</td></tr>';
    }).join('');
    var h = el('div', { id: 'cpa-hist', role: 'dialog', 'aria-label': 'Reading history' },
      '<button class="x" type="button" aria-label="Close">×</button><h4>Reading pace · last 7 days</h4>' +
      '<div class="cpa-nums" style="margin-top:8px"><span><b>' + week.length + '</b>sessions</span><span><b>' + mins(sum(week, function (r) { return r.act; })) + '</b>reading</span>' +
      '<span><b>' + (avg(week, function (r) { return r.wpm; }) || '—') + '</b>avg wpm</span><span><b>' + (avg(week, function (r) { return r.focus; }) || '—') + '</b>avg focus</span></div>' +
      '<div class="cpa-tip">' + tip + '</div>' +
      (rows ? '<table><tr><th>Date</th><th>Page</th><th>wpm</th><th>Focus</th><th>Quiz</th><th>Verdict</th></tr>' + rows + '</table>' : '') +
      '<div style="font-size:11.5px;color:#8a7a66;margin-top:12px">Focus = time spent reading rather than stopped, minus pauses, tab switches and scroll-backs. Saved on this device and included in ⇅ Export progress.</div>');
    h.querySelector('.x').onclick = function () { h.remove(); };
    document.body.appendChild(h);
  }

  /* the Python lesson toolbar (lesson-reader.js) if it is there, else a pill beside 🧠 Quiz */
  function mountToolbar(ui) {
    toolBtn = el('button', { type: 'button', class: 'cpa-btn' }, '<span class="lr-g">▶</span><span class="lr-l">Scroll</span>');
    toolBtn.onclick = toggle;
    ui.appendChild(toolBtn);
    var hb = el('button', { type: 'button', class: 'cpa-btn cpa-hbtn', 'aria-label': 'Reading pace history' }, '<span class="lr-g">' + ICON.stats + '</span><span class="lr-l">Pace</span>');
    hb.onclick = showHistory;
    ui.appendChild(hb);
    ui.classList.add('cpa-crowd');
    strip.classList.add('cpa-tb');
  }
  function mountPill() {
    pill = el('button', { id: 'cpa-pill', type: 'button', title: 'Auto-scroll the page at a steady reading pace' });
    pill.onclick = toggle;
    document.body.appendChild(pill);
    histBtn = el('button', { id: 'cpa-hbtn', type: 'button', title: 'Reading pace history and verdicts', 'aria-label': 'Reading pace history' }, ICON.stats);
    histBtn.onclick = showHistory;
    document.body.appendChild(histBtn);
    placePill();
  }
  function placePill() {
    var q = document.getElementById('cpq-pill');
    if (q && pill && shown(q)) { var r = q.getBoundingClientRect(); pill.style.left = Math.round(r.right + 8) + 'px'; }
    if (pill && histBtn) histBtn.style.left = Math.round(pill.getBoundingClientRect().right + 6) + 'px';
  }

  function mount() {
    buildStrip();
    var tries = 0;
    (function wait() {
      var ui = document.querySelector('.lr-ui');
      if (ui) { mountToolbar(ui); paint(); return; }
      /* lesson-reader loads deferred; give it a moment on pages that have it */
      if (++tries < 12 && document.querySelector('script[src*="lesson-reader.js"]')) { setTimeout(wait, 150); return; }
      mountPill(); paint();
      setTimeout(placePill, 600); setTimeout(placePill, 2000);   // the quiz pill loads after us
    })();
  }

  /* ---------- tap to pause / resume; your own scrolling, tab switches and Esc ---------- */
  var downX = 0, downY = 0, downT = 0;
  document.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; downT = Date.now(); }, true);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var hist = document.getElementById('cpa-hist');
    if (hist && !t.closest('#cpa-hist,#cpa-strip,#cpa-card,#cpa-hbtn,.cpa-hbtn')) { hist.remove(); return; }
    if (state === 'off' || t.closest(MINE)) return;
    if (Math.abs(e.clientX - downX) > 8 || Math.abs(e.clientY - downY) > 8 || Date.now() - downT > 600) return;   // a drag or long press, not a tap
    if (state === 'run') { pause(); return; }
    if (!selecting() && !t.closest('a,button,input,textarea,select,label,summary,[contenteditable],[role="button"]')) resume();
  }, true);
  ['wheel', 'touchmove'].forEach(function (ev) {
    addEventListener(ev, function () { if (state === 'run') holdUntil = performance.now() + USER_WAIT; }, { passive: true, capture: true });
  });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var h = document.getElementById('cpa-hist'); if (h) { h.remove(); return; } }
    if (state === 'off') return;
    if (e.key === 'Escape') { stop(); return; }
    if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key) && !typing()) holdUntil = performance.now() + USER_WAIT;
  }, true);
  document.addEventListener('visibilitychange', function () { if (document.hidden && state !== 'off' && sess) sess.away++; });
  addEventListener('pagehide', function () { if (state !== 'off') stop('quiet'); });

  window.CPAutoScroll = { start: start, stop: stop, pause: pause, resume: resume, speed: speed, history: showHistory, get state() { return state; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
