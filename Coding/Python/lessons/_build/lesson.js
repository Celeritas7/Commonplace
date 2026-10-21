  var toast = document.getElementById('toast');
  var tT;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(tT); tT = setTimeout(function () { toast.classList.remove('show'); }, 2100);
  }
  /* XP HUD retired — a right answer just gets its word */
  function addXp(n, msg) { if (msg) say(msg); }

  /* ---- Cobra's line changes with the section in view ---- */
  var LINES = __COBRA_LINES__;
  var lineEl = document.getElementById('cobraLine');

  /* ---- generic option picker ---- */
  function wire(container, onRight) {
    var answer = container.getAttribute('data-answer');
    var settled = false;
    container.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (settled) return;
        if (b.getAttribute('data-k') === answer) {
          settled = true;
          b.classList.add('right');
          container.querySelectorAll('.opt').forEach(function (o) { o.disabled = true; });
          onRight();
        } else {
          b.classList.add('wrong');
          b.disabled = true;
        }
      });
    });
  }

  /* ---- section 4: matcher ---- */
  var rows = document.querySelectorAll('#matcher .opts');
  var got = 0;
  rows.forEach(function (r) {
    wire(r, function () {
      got++; addXp(10, 'Matched');
      if (got === rows.length) {
        document.getElementById('matchDone').classList.add('show');
        addXp(15, 'All three');
      }
    });
  });

  /* ---- section 5: predict ---- */
  var quiz = document.getElementById('quiz');
  if (quiz) wire(quiz, function () {
    document.getElementById('quizR').classList.add('show');
    addXp(20, 'Called it');
  });

  /* ---- end of lesson: recall questions, then "Mark done" ---- */
  var rqs = Array.prototype.slice.call(document.querySelectorAll('#eol .rq')), rqDone = 0;
  rqs.forEach(function (r) {
    wire(r.querySelector('.rq-opts'), function () {
      r.querySelector('.rq-why').classList.add('show');
      if (++rqDone === rqs.length) { var st = document.getElementById('eol-recall'); if (st) st.classList.add('done'); }
    });
  });
  /* ---- lesson check: a 5-question quiz between this lesson and the next (soft gate) ----
     cp_py_check = { "2.3": { pass, right, asked, at } }. Passing once removes the gate for this lesson;
     "Continue anyway" always goes on, the lesson just stays "read, not checked". */
  var CHECK_KEY = 'cp_py_check';
  function checks() { try { return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'); } catch (e) { return {}; } }
  function checked() { var c = checks()[__LESSON_ID__]; return !!(c && c.pass); }
  function saveCheck(r) {
    var all = checks(), prev = all[__LESSON_ID__];
    if (prev && prev.pass && !r.pass) return;            // a later miss never un-checks a lesson
    all[__LESSON_ID__] = { pass: r.pass, right: r.right, asked: r.asked, at: r.at || Date.now() };
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function secName(n) {
    var h = document.querySelector('#s' + n + ' .step-label h2');
    return 'Section ' + n + (h ? ' · ' + h.textContent.trim() : '');
  }
  function goToSection(list) {
    var n = list && list.length ? list[0] : 1, el = document.getElementById('s' + n);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  var checkBtn = document.getElementById('eol-check'), checkNote = document.getElementById('eol-check-note');
  function showChecked() {
    var c = checks()[__LESSON_ID__];
    if (!checkBtn || !c) return;
    if (c.pass) {
      checkBtn.classList.add('is-done'); checkBtn.textContent = '✓ Checked · ' + c.right + '/' + c.asked;
      if (checkNote) checkNote.textContent = 'You passed the check for this lesson. Retake it any time from 🧠 Quiz.';
      checkBtn.closest('.eol-step').classList.add('done');
    } else {
      checkBtn.textContent = '↻ Try the check again';
      if (checkNote) checkNote.textContent = 'Last try: ' + c.right + '/' + c.asked + '. Get 4 of 5 to check this lesson.';
    }
  }
  function runCheck(after) {
    if (!window.CPQuiz || !CPQuiz.check) { if (after) after({ action: 'continue' }); return; }
    CPQuiz.check({
      count: 5, pass: 4, title: 'Check · Lesson ' + __LESSON_ID__,
      passTitle: 'Lesson ' + __LESSON_ID__ + ' checked',
      continueLabel: after ? 'Next lesson' : 'Done', anywayLabel: after ? 'Continue anyway' : 'Close',
      secName: secName,
      onResult: function (r) { saveCheck(r); showChecked(); },
      onDone: function (r) {
        if (r.empty) { if (after) after(r); return; }   // nothing to ask on this page: never block
        if (r.action === 'review') return goToSection(r.sections);
        if (after && r.action === 'continue') after(r);
      }
    });
  }
  if (checkBtn) {
    showChecked();
    checkBtn.addEventListener('click', function () { runCheck(null); });   // also a retake once checked
  }
  /* Next → runs the check first, unless this lesson is already checked */
  Array.prototype.forEach.call(document.querySelectorAll('.next a'), function (a) {
    if (!/^\s*Next\b/.test(a.textContent)) return;
    a.addEventListener('click', function (e) {
      if (checked() || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var href = a.href;
      runCheck(function () { location.href = href; });
    });
  });

  var doneBtn = document.getElementById('eol-done');
  function showDone() {
    if (!doneBtn || doneBtn.classList.contains('is-done')) return;
    doneBtn.classList.add('is-done'); doneBtn.textContent = '✓ Done';
    doneBtn.closest('.eol-step').classList.add('done');
  }
  function alreadyDone() {
    var r = {}; try { r = JSON.parse(localStorage.getItem('cp_py_read') || '{}'); } catch (e) {}
    return (r[__LESSON_ID__] && r[__LESSON_ID__].pct >= 100) || (window.ReadingSync && ReadingSync.isDone());
  }
  if (doneBtn) {
    if (alreadyDone()) showDone();
    document.addEventListener('DOMContentLoaded', function () { if (alreadyDone()) showDone(); });   // reading-sync loads after this script
    /* done on another device: reading-sync pulls it after sign-in, then tells us */
    document.addEventListener('readingsync:apply', function () { if (alreadyDone()) showDone(); });
    doneBtn.addEventListener('click', function () {
      if (doneBtn.classList.contains('is-done')) return;
      showDone();
      if (window.PYPROGRESS) PYPROGRESS.write(__LESSON_ID__, 100);
      if (window.ReadingSync) ReadingSync.markPageDone();   // syncs to your account when signed in
      say('Marked done');
    });
  }

  /* ---- progress: a section counts once 55% of it has been seen ---- */
  var secs = Array.prototype.slice.call(document.querySelectorAll('section.lesson-section'));
  var total = secs.length, seen = {};
  var fill = document.getElementById('pfill'), pct = document.getElementById('ppc');
  function paint() {
    var n = Object.keys(seen).length;
    var p = Math.round(n / total * 100);
    fill.style.width = p + '%'; pct.textContent = p + '%';
    if (window.PYPROGRESS) PYPROGRESS.write(__LESSON_ID__, p);
  }
  try {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        if (!seen[id]) {
          seen[id] = 1; e.target.classList.add('done'); paint();
          if (Object.keys(seen).length === total) { say('Lesson complete'); }
        }
        if (LINES[id] && lineEl.textContent !== LINES[id]) {
          lineEl.textContent = LINES[id];
        }
      });
    }, { threshold: 0.55 });
    secs.forEach(function (s) { io.observe(s); });
  } catch (e) {}
  paint();