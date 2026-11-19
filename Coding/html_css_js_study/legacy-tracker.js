
(function () {
  'use strict';
  var B = window.BOOTCAMP;
  var KEY = 'commonplace_wdb_v1';
  var DRIVE = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; };

  // ---------- saved state: ticks, stars, notes, open sections, filters ----------
  var baselineRaw = null, protectedError = null;
  function status(message, failed) {
    var target = document.getElementById('legacy-save-status');
    if (!target) return;
    target.textContent = message;
    target.setAttribute('role', failed ? 'alert' : 'status');
    target.dataset.error = failed ? 'true' : 'false';
    target.hidden = false;
  }
  function isRecord(value) { return value !== null && Object.prototype.toString.call(value) === '[object Object]'; }
  function protect(message) {
    protectedError = message;
    status(message, true);
    return {};
  }
  function load() {
    try { baselineRaw = localStorage.getItem(KEY); }
    catch (e) { return protect('Course storage is unavailable. Changes in this tab cannot be saved. Export your work before closing it.'); }
    if (baselineRaw === null) return {};
    var value;
    try { value = JSON.parse(baselineRaw); }
    catch (e) { return protect('The saved course record could not be read. Its original data is unchanged. Export a backup before repairing it; saving is paused.'); }
    if (!isRecord(value)) return protect('The saved course record has an invalid format. Its original data is unchanged; saving is paused. Export a backup before repairing it.');
    for (var name of ['done', 'star', 'notes', 'open', 'hide']) {
      if (Object.prototype.hasOwnProperty.call(value, name) && !isRecord(value[name])) {
        return protect('The saved course ' + name + ' map has an invalid format. Its original data is unchanged; saving is paused. Export a backup before repairing it.');
      }
    }
    if (value.notes && Object.keys(value.notes).some(function (id) { return typeof value.notes[id] !== 'string'; })) {
      return protect('A saved course note has an invalid format. Its original data is unchanged; saving is paused. Export a backup before repairing it.');
    }
    return value;
  }
  var S = load();
  ['done', 'star', 'notes', 'open'].forEach(function (k) { S[k] = S[k] || {}; });
  S.show = S.show || 'all';
  S.hide = S.hide || {};
  function save() {
    if (window.WebStudioCloudLocked || window.WebStudioStore?.getImportRecovery?.().pending) { status('Saving is paused while study data is being restored.', true); return false; }
    if (protectedError) { status(protectedError, true); return false; }
    try {
      if (localStorage.getItem(KEY) !== baselineRaw) {
        status('Another tab changed this course record. This tab has not overwritten it. Export your current work, then reload to review the latest saved version.', true);
        return false;
      }
      var next = JSON.stringify(S);
      localStorage.setItem(KEY, next);
      baselineRaw = next;
      status('Course progress saved on this device.', false);
      try { window.dispatchEvent(new Event('web-studio-saved')); } catch (_) {}
      return true;
    } catch (e) {
      status('Course changes could not be saved. Storage may be full or blocked. Keep this page open and export your current work before closing it.', true);
      return false;
    }
  }

  // ---------- build the lesson list from the index ----------
  var TYPES = [
    ['video', 'Video'], ['challenge', 'Challenge'], ['solution', 'Solution'], ['exercise', 'Coding exercise'],
    ['quiz', 'Quiz'], ['tip', 'Tip'], ['download', 'Download']
  ];
  function typeOf(t) {
    if (/^Coding Exercise \d/.test(t)) return 'exercise';
    if (/^Quiz \d/.test(t)) return 'quiz';
    if (/^Tip from Angela/.test(t)) return 'tip';
    if (/Solution|Answer|Walkthrough/.test(t)) return 'solution';
    if (/^Download|Download the/.test(t)) return 'download';
    if (/Challenge|^Step \d|Dicee Challenge Step|Practice|\bExercise Start\b/.test(t)) return 'challenge';
    return 'video';
  }
  var sections = [], all = [], n = 0;
  B.sections.forEach(function (s) {
    var sec = { n: s.n, title: s.title, lessons: [], book: B.books.sections[s.n], boss: /^Boss Level/.test(s.title) };
    s.lessons.trim().split('\n').forEach(function (t) {
      t = t.trim(); if (!t) return;
      var type = typeOf(t), m, l;
      if (type === 'exercise' || type === 'quiz') {
        m = t.match(/^(Coding Exercise|Quiz) (\d+)\s*:\s*(.*)$/);
        l = { id: (type === 'quiz' ? 'q' : 'x') + m[2], num: (type === 'quiz' ? 'Quiz ' : 'Ex ') + m[2], title: m[3], type: type };
      } else {
        n++;
        l = { id: 'l' + n, num: String(n), n: n, title: t, type: type };
      }
      l.sec = sec; sec.lessons.push(l); all.push(l);
    });
    sections.push(sec);
  });

  // ---------- header ----------
  document.getElementById('course').textContent = B.course;
  document.getElementById('by').textContent = B.by;
  document.getElementById('books').innerHTML =
    '<a href="' + DRIVE(B.books.start) + '" target="_blank" rel="noopener">Contents (Start.pdf) ↗</a>' +
    '<a href="' + DRIVE(B.books.full) + '" target="_blank" rel="noopener">Full study book (PDF) ↗</a>' +
    '<a href="https://drive.google.com/drive/folders/' + B.books.folder + '" target="_blank" rel="noopener">Section-wise folder ↗</a>';

  // ---------- filters ----------
  var SHOW = [['all', 'All'], ['todo', 'To do'], ['done', 'Done'], ['star', '★ Starred'], ['notes', '✎ With notes']];
  function chips() {
    document.getElementById('show').innerHTML = SHOW.map(function (c) {
      return '<button class="chip' + (S.show === c[0] ? ' on' : '') + '" data-show="' + c[0] + '">' + c[1] + '</button>';
    }).join('');
    document.getElementById('types').innerHTML = TYPES.map(function (c) {
      return '<button class="chip t' + (S.hide[c[0]] ? ' off' : '') + '" data-type="' + c[0] + '" title="Show / hide ' + c[1].toLowerCase() + ' lessons">' + c[1] + '</button>';
    }).join('');
  }
  document.getElementById('show').onclick = function (e) {
    var b = e.target.closest('[data-show]'); if (!b) return;
    S.show = b.dataset.show; save(); chips(); render();
  };
  document.getElementById('types').onclick = function (e) {
    var b = e.target.closest('[data-type]'); if (!b) return;
    S.hide[b.dataset.type] = !S.hide[b.dataset.type]; save(); chips(); render();
  };
  var q = document.getElementById('q');
  q.addEventListener('input', render);

  function visible(l, query) {
    if (S.hide[l.type]) return false;
    if (S.show === 'todo' && S.done[l.id]) return false;
    if (S.show === 'done' && !S.done[l.id]) return false;
    if (S.show === 'star' && !S.star[l.id]) return false;
    if (S.show === 'notes' && !S.notes[l.id]) return false;
    if (query && (l.title + ' ' + l.num + ' ' + (S.notes[l.id] || '')).toLowerCase().indexOf(query) < 0) return false;
    return true;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hl(text, query) {
    var t = esc(text); if (!query) return t;
    var i = text.toLowerCase().indexOf(query);
    return i < 0 ? t : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + query.length)) + '</mark>' + esc(text.slice(i + query.length));
  }

  // ---------- render ----------
  function secStats(sec) {
    var d = sec.lessons.filter(function (l) { return S.done[l.id]; }).length;
    return { done: d, total: sec.lessons.length, pct: Math.round(100 * d / sec.lessons.length) };
  }
  function render() {
    var query = q.value.trim().toLowerCase(), shown = 0, html = '';
    B.parts.forEach(function (p, pi) {
      var block = '';
      sections.filter(function (s) { return s.n >= p.from && s.n <= p.to; }).forEach(function (sec) {
        var ls = sec.lessons.filter(function (l) { return visible(l, query); });
        if (!ls.length) return;
        shown += ls.length;
        var st = secStats(sec), open = query || S.show !== 'all' || S.open[sec.n];
        block += '<details class="sec' + (st.done === st.total ? ' done' : '') + '" data-sec="' + sec.n + '"' + (open ? ' open' : '') + '>' +
          '<summary><span class="sn">§ ' + sec.n + '</span><span class="st">' + esc(sec.title) + '</span>' +
          '<span class="sbadges">' + (sec.boss ? '<span class="badge boss">Boss level</span>' : '') +
            (sec.book ? '<span class="badge book">Study book</span>' : '') + '</span>' +
          '<span class="sprog"><span class="bar"><span style="width:' + st.pct + '%"></span></span>' + st.done + ' / ' + st.total + '</span></summary>' +
          '<div class="sbody"><div class="sacts">' +
            (sec.book ? '<a href="' + DRIVE(sec.book) + '" target="_blank" rel="noopener">Open study book: Section-' + sec.n + '.pdf ↗</a>'
                      : '<span class="note">No study book for this section yet.</span>') +
            '<button data-all="' + sec.n + '">Mark all done</button><button data-none="' + sec.n + '">Clear</button></div>' +
          ls.map(function (l) { return row(l, query); }).join('') + '</div></details>';
      });
      if (block) html += '<h2 class="part"><span class="pn">Part ' + ['I', 'II', 'III', 'IV', 'V'][pi] + ' · §' + p.from + '–' + p.to + '</span>' + p.title + '</h2>' + block;
    });
    document.getElementById('list').innerHTML = html || '<p class="empty">Nothing matches. Try another word or filter.</p>';
    document.getElementById('count').textContent = shown + ' of ' + all.length;
    stats();
  }
  function row(l, query) {
    var note = S.notes[l.id];
    return '<div class="ln' + (S.done[l.id] ? ' done' : '') + '" id="' + l.id + '" data-id="' + l.id + '">' +
      '<input type="checkbox" aria-label="Done"' + (S.done[l.id] ? ' checked' : '') + '>' +
      '<span class="num">' + l.num + '</span>' +
      '<span class="tt">' + hl(l.title, query) + '</span>' +
      '<span class="type ' + l.type + '">' + l.type + '</span>' +
      '<button class="ib star' + (S.star[l.id] ? ' on' : '') + '" title="Star">★</button>' +
      '<button class="ib pen' + (note ? ' on' : '') + '" title="Note">✎</button>' +
      (S.openNote === l.id ? '<div class="notebox"><textarea placeholder="Your note for this lesson…">' + esc(note || '') + '</textarea></div>' : '') +
      '</div>';
  }
  function stats() {
    var done = all.filter(function (l) { return S.done[l.id]; }).length;
    document.getElementById('sDone').textContent = done + ' / ' + all.length;
    document.getElementById('sBar').style.width = Math.round(100 * done / all.length) + '%';
    var full = sections.filter(function (s) { var st = secStats(s); return st.done === st.total; }).length;
    document.getElementById('sSec').textContent = full + ' / ' + sections.length;
    var cur = sections.filter(function (s) { var st = secStats(s); return st.done > 0 && st.done < st.total; });
    document.getElementById('sSecNote').textContent = cur.length ? 'In progress: §' + cur.map(function (s) { return s.n; }).join(', §') : '';
    var xq = all.filter(function (l) { return l.type === 'exercise' || l.type === 'quiz'; });
    document.getElementById('sEx').textContent = xq.filter(function (l) { return S.done[l.id]; }).length + ' / ' + xq.length;
    var nn = Object.keys(S.notes).filter(function (k) { return S.notes[k]; }).length, ns = Object.keys(S.star).filter(function (k) { return S.star[k]; }).length;
    document.getElementById('sNotes').textContent = ns + ' starred · ' + nn + ' notes';
    var next = all.filter(function (l) { return !S.done[l.id]; })[0], c = document.getElementById('cont');
    if (next) { c.textContent = 'Continue → ' + next.num + '. ' + next.title + ' (§' + next.sec.n + ')'; c.href = '#' + next.id; c.dataset.go = next.id; }
    else { c.textContent = 'Course complete. Well done.'; c.removeAttribute('href'); delete c.dataset.go; }
  }

  // ---------- interactions (one listener for the whole list) ----------
  var list = document.getElementById('list');
  list.addEventListener('change', function (e) {
    var r = e.target.closest('.ln'); if (!r || e.target.type !== 'checkbox') return;
    if (e.target.checked) S.done[r.dataset.id] = 1; else delete S.done[r.dataset.id];
    S.last = r.dataset.id; save();
    r.classList.toggle('done', e.target.checked);
    var sec = r.closest('details'), st = secStats(sections[sec.dataset.sec - 1]);
    sec.querySelector('.sprog').lastChild.textContent = st.done + ' / ' + st.total;
    sec.querySelector('.sprog .bar span').style.width = st.pct + '%';
    sec.classList.toggle('done', st.done === st.total);
    stats();
  });
  list.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.all || b.dataset.none) {
      var sec = sections[(b.dataset.all || b.dataset.none) - 1];
      if (b.dataset.none && !confirm('Clear the ticks for section ' + sec.n + '?')) return;
      sec.lessons.forEach(function (l) { if (b.dataset.all) S.done[l.id] = 1; else delete S.done[l.id]; });
      save(); render(); return;
    }
    var r = b.closest('.ln'); if (!r) return;
    var id = r.dataset.id;
    if (b.classList.contains('star')) { if (S.star[id]) delete S.star[id]; else S.star[id] = 1; save(); b.classList.toggle('on'); stats(); }
    if (b.classList.contains('pen')) { S.openNote = S.openNote === id ? null : id; render(); var ta = document.querySelector('#' + id + ' textarea'); if (ta) ta.focus(); }
  });
  list.addEventListener('input', function (e) {
    if (e.target.tagName !== 'TEXTAREA') return;
    var id = e.target.closest('.ln').dataset.id, v = e.target.value;
    if (v.trim()) S.notes[id] = v; else delete S.notes[id];
    save();
    e.target.closest('.ln').querySelector('.pen').classList.toggle('on', !!v.trim());
    stats();
  });
  // remember which sections are open
  list.addEventListener('toggle', function (e) {
    var d = e.target; if (!d.dataset || !d.dataset.sec || q.value || S.show !== 'all') return;
    if (d.open) S.open[d.dataset.sec] = 1; else delete S.open[d.dataset.sec];
    save();
  }, true);
  document.getElementById('cont').addEventListener('click', function (e) {
    var id = this.dataset.go; if (!id) return;
    e.preventDefault();
    reveal(id);
  });
  function reveal(id) {
    if (typeof id !== 'string' || !/^[lxq]\d+$/.test(id)) return false;
    var l = all.filter(function (x) { return x.id === id; })[0];
    if (!l) return false;
    S.open[l.sec.n] = 1;
    S.show = 'all'; q.value = '';
    delete S.hide[l.type];
    save(); chips();
    render();
    var el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ block: 'center' }); el.style.outline = '2px solid var(--accent)';
    setTimeout(function () { el.style.outline = ''; }, 1600);
    return true;
  }

  window.WebStudioLegacy = {
    flush: save,
    reveal: reveal,
    activate: function () { chips(); render(); },
    snapshot: function () { return JSON.parse(JSON.stringify(S)); }
  };

  chips(); render();
})();
