/* Commonplace - auto-scroll reading pacer (loaded by _lib/progress-backup.js on every page that has it)
   - Python lessons: a "▶ Scroll" button joins the lesson-reader toolbar. Everywhere else: a pill next to 🧠 Quiz.
   - While it runs, a small strip offers − / speed / + . Speed is remembered per device (localStorage cpa:speed).
   - Tap the page to pause, tap again to resume. Esc stops.
   - It slows down over code, tables, maths and diagrams, and waits (never fights) while you scroll yourself,
     select text, type, or have the quiz / bookmark panel open.
   - It stops at the end-of-lesson block ("Check yourself") or the bottom of the page.
   Opt out on a page with window.CP_AUTOSCROLL_OFF = true. */
(function () {
  if (window.__cpAuto || window.CP_AUTOSCROLL_OFF) return; window.__cpAuto = 1;

  var SPEEDS = [6, 9, 12, 16, 20, 25, 32, 40, 50, 65, 85, 110];   // px per second; middle-click's slowest is far above these
  var KEY = 'cpa:speed';
  var SLOW = 0.45;          // speed factor over code / diagrams
  var USER_WAIT = 2200;     // ms to wait after you scroll yourself
  var SLOW_SEL = 'pre,code,.CodeMirror,.cm-editor,.monaco-editor,table,svg,img,canvas,figure,.katex-display,.mermaid';
  var STOP_SEL = '#eol,.eol,[data-autoscroll-stop]';
  var MINE = '#cpa-pill,#cpa-strip,.cpa-btn,#cpq-pill,#cpq-root,#cpx-panel,#cpx-fab,#cpx-tools,.cpb-pill,.lr-ui,.lr-sheet,.lr-pop';

  var idx = 3; try { var s = localStorage.getItem(KEY); if (s !== null && +s >= 0 && +s < SPEEDS.length) idx = +s; } catch (e) {}

  var state = 'off';        // off | run | paused
  var raf = 0, stuck = 0, last = 0, acc = 0, factor = 1, expectY = null, holdUntil = 0, stopAt = null, scroller = null;
  var pill = null, toolBtn = null, strip = null, label = null;

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
  function moveBy(px) { scroller.scrollTop = top() + px; }

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
      shown(document.getElementById('cpq-root')) || shown(document.getElementById('cpx-panel'));
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
    if (expectY !== null && Math.abs(y - expectY) > 2) { holdUntil = now + USER_WAIT; acc = 0; }   // you scrolled: wait for you
    if (stopReached()) { stop(); flash('End of lesson — time for the check'); return; }
    if (y + viewH() >= scroller.scrollHeight - 2) { stop(); flash('End of page'); return; }
    if (waiting(now)) { expectY = y; last = now; raf = requestAnimationFrame(tick); return; }
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
    scroller = findScroller(); stopAt = findStop();
    if (stopReached()) stopAt = null;   // already past the end block: run on to the bottom of the page
    state = 'run'; stuck = 0; last = 0; acc = 0; factor = 1; expectY = null; holdUntil = 0;
    paint(); if (!raf) raf = requestAnimationFrame(tick);
  }
  function pause() { if (state !== 'run') return; state = 'paused'; paint(); }
  function resume() { if (state !== 'paused') return; state = 'run'; last = 0; expectY = null; paint(); if (!raf) raf = requestAnimationFrame(tick); }
  function stop() { state = 'off'; if (raf) cancelAnimationFrame(raf); raf = 0; paint(); }
  function toggle() { if (state === 'off') start(); else stop(); }
  function speed(d) {
    idx = Math.max(0, Math.min(SPEEDS.length - 1, idx + d));
    try { localStorage.setItem(KEY, String(idx)); } catch (e) {}
    paint();
  }

  /* ---------- UI ---------- */
  var FONT = 'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;';
  var css = document.createElement('style');
  css.textContent =
    '#cpa-pill{position:fixed;left:140px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9998;height:30px;padding:0 12px 0 10px;border-radius:999px;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;' + FONT + 'font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);opacity:.72;display:flex;align-items:center;gap:6px}' +
    '#cpa-pill:hover,#cpa-pill.on{opacity:1;border-color:#8a5a2b}' +
    '#cpa-strip{position:fixed;left:50%;bottom:calc(52px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:99999;display:none;align-items:center;gap:4px;padding:4px;border-radius:999px;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;box-shadow:0 4px 16px rgba(0,0,0,.14);' + FONT + 'font-size:12.5px;font-weight:600;-webkit-user-select:none;user-select:none}' +
    '#cpa-strip.show{display:flex}' +
    '#cpa-strip button{all:unset;cursor:pointer;min-width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:14px;-webkit-tap-highlight-color:transparent}' +
    '#cpa-strip button:hover,#cpa-strip button:active{background:#f1e8da}' +
    '#cpa-strip .cpa-l{min-width:78px;text-align:center;font-variant-numeric:tabular-nums}' +
    '#cpa-strip .cpa-m{font-size:11px;font-weight:500;color:#8a7a66;padding:0 8px 0 2px;white-space:nowrap}' +
    '#cpa-strip.cpa-tb{bottom:calc(74px + env(safe-area-inset-bottom))}' +
    '@media (min-width:820px){#cpa-strip.cpa-tb{left:auto;right:18px;transform:none;bottom:86px}}' +
    '#cpa-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;padding:8px 14px;border-radius:999px;background:#2b241c;color:#fffdf7;' + FONT + 'font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:opacity .4s}';
  document.head.appendChild(css);

  var ICON = {
    pause: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor"/><rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor"/></svg>',
    play: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>',
    stop: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }

  function buildStrip() {
    strip = el('div', { id: 'cpa-strip', role: 'group', 'aria-label': 'Auto-scroll' });
    var pp = el('button', { type: 'button', title: 'Pause / resume (or tap the page)', 'data-a': 'pp' }, ICON.pause);
    var mi = el('button', { type: 'button', title: 'Slower', 'data-a': '-' }, '−');
    label = el('span', { class: 'cpa-l' });
    var pl = el('button', { type: 'button', title: 'Faster', 'data-a': '+' }, '+');
    var st = el('button', { type: 'button', title: 'Stop (Esc)', 'data-a': 'x' }, ICON.stop);
    var m = el('span', { class: 'cpa-m' });
    [pp, mi, label, pl, st, m].forEach(function (n) { strip.appendChild(n); });
    strip.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'pp') state === 'run' ? pause() : resume();
      else if (a === '-') speed(-1);
      else if (a === '+') speed(1);
      else stop();
    });
    document.body.appendChild(strip);
  }

  function paint() {
    if (!strip) return;
    strip.classList.toggle('show', state !== 'off');
    strip.querySelector('[data-a="pp"]').innerHTML = state === 'run' ? ICON.pause : ICON.play;
    label.textContent = 'Speed ' + (idx + 1) + '/' + SPEEDS.length;
    strip.querySelector('.cpa-m').textContent = state === 'paused' ? 'paused · tap page' : 'slows on code';
    if (pill) { pill.classList.toggle('on', state !== 'off'); pill.innerHTML = state === 'off' ? '<span aria-hidden="true">▶</span>Scroll' : '<span aria-hidden="true">■</span>Stop'; }
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

  /* the Python lesson toolbar (lesson-reader.js) if it is there, else a pill beside 🧠 Quiz */
  function mountToolbar(ui) {
    toolBtn = el('button', { type: 'button', class: 'cpa-btn' }, '<span class="lr-g">▶</span><span class="lr-l">Scroll</span>');
    toolBtn.onclick = toggle;
    ui.appendChild(toolBtn);
    strip.classList.add('cpa-tb');
  }
  function mountPill() {
    pill = el('button', { id: 'cpa-pill', type: 'button', title: 'Auto-scroll the page at a steady reading pace' });
    pill.onclick = toggle;
    document.body.appendChild(pill);
    placePill();
  }
  function placePill() {
    var q = document.getElementById('cpq-pill');
    if (q && pill && shown(q)) { var r = q.getBoundingClientRect(); pill.style.left = Math.round(r.right + 8) + 'px'; }
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

  /* ---------- tap to pause / resume; your own scrolling and Esc ---------- */
  var downX = 0, downY = 0, downT = 0;
  document.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; downT = Date.now(); }, true);
  document.addEventListener('click', function (e) {
    if (state === 'off') return;
    var t = e.target;
    if (!t.closest || t.closest(MINE)) return;
    if (Math.abs(e.clientX - downX) > 8 || Math.abs(e.clientY - downY) > 8 || Date.now() - downT > 600) return;   // a drag or long press, not a tap
    if (state === 'run') { pause(); return; }
    if (!selecting() && !t.closest('a,button,input,textarea,select,label,summary,[contenteditable],[role="button"]')) resume();
  }, true);
  ['wheel', 'touchmove'].forEach(function (ev) {
    addEventListener(ev, function () { if (state === 'run') holdUntil = performance.now() + USER_WAIT; }, { passive: true, capture: true });
  });
  addEventListener('keydown', function (e) {
    if (state === 'off') return;
    if (e.key === 'Escape') { stop(); return; }
    if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key) && !typing()) holdUntil = performance.now() + USER_WAIT;
  }, true);

  window.CPAutoScroll = { start: start, stop: stop, pause: pause, resume: resume, speed: speed, get state() { return state; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
