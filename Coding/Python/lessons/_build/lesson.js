  var xp = 0, xpEl = document.getElementById('xp'), toast = document.getElementById('toast');
  var tT;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(tT); tT = setTimeout(function () { toast.classList.remove('show'); }, 2100);
  }
  function addXp(n, msg) {
    xp += n; xpEl.textContent = xp;
    if (msg) say(msg + '  +' + n + ' XP');
  }

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
  wire(document.getElementById('quiz'), function () {
    document.getElementById('quizR').classList.add('show');
    addXp(20, 'Called it');
  });

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
          if (Object.keys(seen).length === total) { say('Lesson complete · ' + xp + ' XP'); }
        }
        if (LINES[id] && lineEl.textContent !== LINES[id]) {
          lineEl.textContent = LINES[id];
        }
      });
    }, { threshold: 0.55 });
    secs.forEach(function (s) { io.observe(s); });
  } catch (e) {}
  paint();