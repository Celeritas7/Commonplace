/* Offline App Workshop - course engine.
   Plain JavaScript, no libraries, no network. Works from file:// (double-click index.html).
   Lessons live in js/lessons/*.js and register themselves with COURSE.module({...}).
   Progress is kept in localStorage under keys that start with "oas:". */
(function () {
  'use strict';

  // ---------- registry (lesson files call COURSE.module) ----------
  var modules = [];
  window.COURSE = {
    module: function (m) { modules.push(m); },
    // escape text for showing code inside lesson HTML: ${code('html', `...`)}
    code: function (lang, text, caption) {
      var t = String(text).replace(/^\n/, '').replace(/\s+$/, '');
      var esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<figure class="code"><figcaption>' + (caption || lang) + '</figcaption><pre><code>' + esc + '</code></pre></figure>';
    }
  };

  // ---------- storage ----------
  var PKEY = 'oas:progress';
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  var progress = load(PKEY, { ex: {}, quiz: {}, read: {} });
  function saveProgress() { save(PKEY, progress); }

  // ---------- helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function lessonKey(m, i) { return m.id + '.' + (i + 1); }
  function exKey(m, i, j) { return lessonKey(m, i) + '.ex' + j; }
  function quizKey(m, i, j) { return lessonKey(m, i) + '.q' + j; }

  function lessonState(m, i) {
    var L = m.lessons[i], need = 0, got = 0;
    (L.exercises || []).forEach(function (_, j) { need++; if (progress.ex[exKey(m, i, j)]) got++; });
    (L.quiz || []).forEach(function (_, j) { need++; if (progress.quiz[quizKey(m, i, j)]) got++; });
    if (!need) { need = 1; if (progress.read[lessonKey(m, i)]) got = 1; }
    return { need: need, got: got, done: got === need };
  }
  function moduleState(m) {
    if (m.planned) return { need: 0, got: 0, done: false };
    var n = 0, d = 0;
    m.lessons.forEach(function (_, i) { n++; if (lessonState(m, i).done) d++; });
    return { need: n, got: d, done: n > 0 && d === n };
  }

  // ---------- sidebar ----------
  function renderNav() {
    var nav = $('#nav'); nav.innerHTML = '';
    var total = 0, done = 0;
    modules.forEach(function (m, mi) {
      var sec = el('section', 'navmod' + (m.planned ? ' planned' : ''));
      var st = moduleState(m);
      sec.appendChild(el('div', 'navmod-h',
        '<span class="num">' + String(mi + 1).padStart(2, '0') + '</span>' +
        '<span class="t">' + m.title + '</span>' +
        (m.planned ? '<span class="soon">planned</span>' : '<span class="cnt">' + st.got + '/' + st.need + '</span>')));
      if (!m.planned) {
        m.lessons.forEach(function (L, i) {
          var s = lessonState(m, i); total++; if (s.done) done++;
          var a = el('a', 'navl' + (s.done ? ' done' : ''),
            '<span class="tick">' + (s.done ? '&#10003;' : '') + '</span><span>' + L.title + '</span>');
          a.href = '#/' + m.id + '/' + (i + 1);
          sec.appendChild(a);
        });
      } else {
        var a = el('a', 'navl', '<span class="tick"></span><span>What it will cover</span>');
        a.href = '#/' + m.id; sec.appendChild(a);
      }
      nav.appendChild(sec);
    });
    $('#overall').style.width = (total ? Math.round(100 * done / total) : 0) + '%';
    $('#overallTxt').textContent = done + ' of ' + total + ' lessons complete';
    markActive();
  }
  function markActive() {
    var h = location.hash;
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
      a.classList.toggle('on', a.getAttribute('href') === h);
    });
  }

  // ---------- views ----------
  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var m = modules.filter(function (x) { return x.id === parts[0]; })[0];
    var main = $('#main'); main.innerHTML = ''; window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
    if (!m) renderHome(main);
    else if (m.planned) renderPlanned(main, m);
    else {
      var i = Math.max(0, Math.min(m.lessons.length - 1, (parseInt(parts[1], 10) || 1) - 1));
      renderLesson(main, m, i);
    }
    markActive();
  }

  function renderHome(main) {
    var intro = window.COURSE_INTRO || '';
    main.appendChild(el('div', 'lesson', intro));
    var grid = el('div', 'modgrid');
    modules.forEach(function (m, mi) {
      var st = moduleState(m);
      var card = el('a', 'modcard' + (m.planned ? ' planned' : '') + (st.done ? ' done' : ''));
      card.href = '#/' + m.id + (m.planned ? '' : '/1');
      card.innerHTML = '<div class="mc-top"><span class="num">Module ' + (mi + 1) + '</span>' +
        (m.planned ? '<span class="soon">planned</span>' : '<span class="cnt">' + st.got + '/' + st.need + ' lessons</span>') + '</div>' +
        '<h3>' + m.title + '</h3><p>' + m.blurb + '</p>' +
        (m.apps ? '<div class="mc-apps">Seen in: ' + m.apps + '</div>' : '');
      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  function renderPlanned(main, m) {
    var mi = modules.indexOf(m);
    var html = '<div class="kicker">Module ' + (mi + 1) + ' &middot; planned</div><h1>' + m.title + '</h1><p class="lead">' + m.blurb + '</p>' +
      '<h2>What it will cover</h2><ul>' + m.topics.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      (m.apps ? '<div class="inapps"><b>Where you\'ll see it in your apps</b>' + m.apps + '</div>' : '') +
      '<p class="muted">This module isn\'t written yet. Ask in the Claude chat to have it added next.</p>';
    main.appendChild(el('article', 'lesson', html));
  }

  function renderLesson(main, m, i) {
    var L = m.lessons[i], mi = modules.indexOf(m);
    var art = el('article', 'lesson');
    art.innerHTML = '<div class="kicker">Module ' + (mi + 1) + ' &middot; ' + m.title + ' &middot; lesson ' + (i + 1) + ' of ' + m.lessons.length +
      (L.minutes ? ' &middot; ~' + L.minutes + ' min' : '') + '</div><h1>' + L.title + '</h1>' + L.html;
    main.appendChild(art);

    // exercises: placed at <div data-ex="N"></div>, or appended
    (L.exercises || []).forEach(function (ex, j) {
      var slot = art.querySelector('[data-ex="' + j + '"]');
      var box = buildExercise(m, i, j, ex);
      if (slot) slot.replaceWith(box); else art.appendChild(box);
    });
    // quiz
    if (L.quiz && L.quiz.length) {
      var slot = art.querySelector('[data-quiz]');
      var qb = buildQuiz(m, i, L.quiz);
      if (slot) slot.replaceWith(qb); else art.appendChild(qb);
    }
    // lessons with nothing to check get a "mark as read" button
    if (!(L.exercises || []).length && !(L.quiz || []).length) {
      var k = lessonKey(m, i);
      var b = el('button', 'btn', progress.read[k] ? '&#10003; Read' : 'Mark as read');
      b.onclick = function () { progress.read[k] = !progress.read[k]; saveProgress(); renderNav(); b.innerHTML = progress.read[k] ? '&#10003; Read' : 'Mark as read'; };
      art.appendChild(b);
    }
    // prev / next
    var pager = el('nav', 'pager');
    var prev = prevNext(mi, i, -1), next = prevNext(mi, i, 1);
    pager.innerHTML = (prev ? '<a href="' + prev.href + '">&larr; ' + prev.title + '</a>' : '<span></span>') +
                      (next ? '<a href="' + next.href + '">' + next.title + ' &rarr;</a>' : '<span></span>');
    main.appendChild(pager);
  }

  function prevNext(mi, i, dir) {
    var m = modules[mi], j = i + dir;
    if (j >= 0 && j < m.lessons.length) return { href: '#/' + m.id + '/' + (j + 1), title: m.lessons[j].title };
    var n = modules[mi + dir];
    if (!n) return null;
    if (n.planned) return { href: '#/' + n.id, title: n.title };
    var k = dir > 0 ? 0 : n.lessons.length - 1;
    return { href: '#/' + n.id + '/' + (k + 1), title: n.lessons[k].title };
  }

  // ---------- exercise widget ----------
  // A check is { label, fn(t) } where fn returns true/false (or a Promise of it).
  // t gives tools to inspect and drive the preview page:
  //   t.doc / t.win     the preview's document and window
  //   t.src             the learner's source text
  //   t.$(sel)          querySelector in the preview
  //   t.text(sel)       trimmed textContent of an element ('' if missing)
  //   t.type(sel, v)    set an input's value and fire input + change
  //   t.click(sel)      click an element
  //   t.wait(ms)        pause (for timers)
  //   t.css(sel, prop)  computed style value
  //   t.$$(sel)         querySelectorAll in the preview
  //   t.reload()        load the page again (Promise); t.doc / t.win then point at the new page
  function buildExercise(m, i, j, ex) {
    var key = exKey(m, i, j), codeKey = 'oas:code:' + key;
    var box = el('section', 'exercise');
    box.innerHTML =
      '<div class="ex-h"><span class="tag">Exercise</span><b>' + ex.title + '</b><span class="ex-state"></span></div>' +
      '<div class="ex-task">' + ex.task + '</div>' +
      '<div class="ex-grid">' +
        '<div class="ex-ed"><div class="pane-h">Your code <span>index.html</span></div><textarea spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div>' +
        '<div class="ex-pv"><div class="pane-h">Preview <span>what the browser shows</span></div><iframe title="preview"></iframe></div>' +
      '</div>' +
      '<div class="ex-bar"><button class="btn primary run">Run &amp; check</button>' +
        '<button class="btn hint">Hint</button><button class="btn sol">Show solution</button><button class="btn ghost reset">Reset</button></div>' +
      '<div class="ex-hint" hidden></div>' +
      '<ul class="checks"></ul>';
    var ta = $('textarea', box), fr = $('iframe', box), list = $('.checks', box), state = $('.ex-state', box);
    var saved = load(codeKey, null);
    ta.value = saved != null ? saved : ex.start.replace(/^\n/, '');
    function paintState() {
      state.innerHTML = progress.ex[key] ? '<span class="ok">&#10003; passed</span>' : '';
    }
    paintState();
    list.innerHTML = ex.checks.map(function (c) { return '<li><span class="mark">&#9675;</span>' + c.label + '</li>'; }).join('');

    // Tab inserts two spaces; Ctrl/Cmd+Enter runs
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        var s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
    });
    ta.addEventListener('input', function () { save(codeKey, ta.value); });

    function run() {
      save(codeKey, ta.value);
      list.innerHTML = ex.checks.map(function (c) { return '<li class="run"><span class="mark">&hellip;</span>' + c.label + '</li>'; }).join('');
      fr.onload = function () { fr.onload = null; check(); };
      fr.srcdoc = ta.value;
    }
    function check() {
      var t = {
        doc: fr.contentDocument, win: fr.contentWindow, src: ta.value,
        $: function (s) { return t.doc.querySelector(s); },
        $$: function (s) { return t.doc.querySelectorAll(s); },
        text: function (s) { var e = t.doc.querySelector(s); return e ? e.textContent.trim() : ''; },
        type: function (s, v) {
          var e = t.doc.querySelector(s); if (!e) throw new Error('no ' + s);
          e.value = v;
          e.dispatchEvent(new t.win.Event('input', { bubbles: true }));
          e.dispatchEvent(new t.win.Event('change', { bubbles: true }));
        },
        click: function (s) { var e = t.doc.querySelector(s); if (!e) throw new Error('no ' + s); e.click(); },
        wait: function (ms) { return new Promise(function (r) { setTimeout(r, ms || 50); }); },
        css: function (s, p) { var e = t.doc.querySelector(s); return e ? t.win.getComputedStyle(e).getPropertyValue(p).trim() : ''; },
        // load the learner's page again (like pressing F5), e.g. to test that saved data comes back
        reload: function () {
          return new Promise(function (r) {
            fr.onload = function () { fr.onload = null; t.doc = fr.contentDocument; t.win = fr.contentWindow; r(); };
            fr.srcdoc = ta.value + '\n<!-- reload ' + Date.now() + ' -->';
          });
        }
      };
      var results = [];
      // run checks one after another (later checks may depend on earlier interactions)
      ex.checks.reduce(function (p, c, n) {
        return p.then(function () {
          return Promise.resolve().then(function () { return c.fn(t); })
            .then(function (ok) { results[n] = !!ok; }, function () { results[n] = false; });
        });
      }, Promise.resolve()).then(function () {
        var all = results.every(Boolean);
        list.innerHTML = ex.checks.map(function (c, n) {
          return '<li class="' + (results[n] ? 'pass' : 'fail') + '"><span class="mark">' + (results[n] ? '&#10003;' : '&#10007;') + '</span>' + c.label + '</li>';
        }).join('') + (all ? '<li class="all">All checks pass. ' + (ex.done || 'Nice work.') + '</li>' : '');
        if (all && !progress.ex[key]) { progress.ex[key] = true; saveProgress(); renderNav(); }
        paintState();
      });
    }
    $('.run', box).onclick = run;
    $('.hint', box).onclick = function () { var h = $('.ex-hint', box); h.innerHTML = ex.hint; h.hidden = !h.hidden; };
    $('.sol', box).onclick = function () {
      if (ta.value !== ex.solution.replace(/^\n/, '') && !confirm('Replace your code with the solution? (Your version is not kept.)')) return;
      ta.value = ex.solution.replace(/^\n/, ''); save(codeKey, ta.value); run();
    };
    $('.reset', box).onclick = function () {
      if (!confirm('Start this exercise again from the beginning?')) return;
      ta.value = ex.start.replace(/^\n/, ''); save(codeKey, ta.value); fr.srcdoc = '';
      list.innerHTML = ex.checks.map(function (c) { return '<li><span class="mark">&#9675;</span>' + c.label + '</li>'; }).join('');
    };
    // show the starting point straight away (no checks yet)
    fr.srcdoc = ta.value;
    return box;
  }

  // ---------- quiz widget ----------
  function buildQuiz(m, i, qs) {
    var box = el('section', 'quiz');
    box.appendChild(el('div', 'ex-h', '<span class="tag">Check yourself</span><b>' + qs.length + ' question' + (qs.length > 1 ? 's' : '') + '</b>'));
    qs.forEach(function (q, j) {
      var key = quizKey(m, i, j), name = 'q-' + key.replace(/\W/g, '-');
      var item = el('div', 'q');
      item.innerHTML = '<p class="qq">' + (j + 1) + '. ' + q.q + '</p>' +
        q.options.map(function (o, k) {
          return '<label class="opt"><input type="radio" name="' + name + '" value="' + k + '"> <span>' + o + '</span></label>';
        }).join('') + '<div class="why" hidden></div>';
      var why = $('.why', item);
      function show(k) {
        var right = k === q.answer;
        why.hidden = false;
        why.className = 'why ' + (right ? 'right' : 'wrong');
        why.innerHTML = (right ? '<b>Right.</b> ' : '<b>Not quite.</b> ') + (right ? q.why : (q.wrong || 'Read the section above again and try another answer.'));
        if (right && !progress.quiz[key]) { progress.quiz[key] = true; saveProgress(); renderNav(); }
      }
      Array.prototype.forEach.call(item.querySelectorAll('input'), function (r) {
        r.addEventListener('change', function () { show(+r.value); });
      });
      if (progress.quiz[key]) { item.querySelectorAll('input')[q.answer].checked = true; show(q.answer); }
      box.appendChild(item);
    });
    return box;
  }

  // ---------- backup (export / import), theme ----------
  function exportProgress() {
    var data = { app: 'offline-app-workshop', saved: new Date().toISOString(), items: {} };
    for (var n = 0; n < localStorage.length; n++) {
      var k = localStorage.key(n);
      if (k.indexOf('oas:') === 0) data.items[k] = localStorage.getItem(k);
    }
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'offline-app-workshop-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function importProgress(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(fr.result);
        if (data.app !== 'offline-app-workshop') throw new Error('not a workshop backup');
        Object.keys(data.items).forEach(function (k) { if (k.indexOf('oas:') === 0) localStorage.setItem(k, data.items[k]); });
        progress = load(PKEY, { ex: {}, quiz: {}, read: {} });
        renderNav(); route();
        alert('Progress restored.');
      } catch (e) { alert('That file could not be read: ' + e.message); }
    };
    fr.readAsText(file);
  }
  function setTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    save('oas:theme', t || null);
  }

  // ---------- start ----------
  document.addEventListener('DOMContentLoaded', function () {
    setTheme(load('oas:theme', null));
    $('#btnExport').onclick = exportProgress;
    $('#btnImport').onclick = function () { $('#fileImport').click(); };
    $('#fileImport').onchange = function () { if (this.files[0]) importProgress(this.files[0]); this.value = ''; };
    $('#btnTheme').onclick = function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(dark ? 'light' : 'dark');
    };
    $('#btnMenu').onclick = function () { document.body.classList.toggle('nav-open'); };
    renderNav(); route();
    window.addEventListener('hashchange', route);
  });
})();
