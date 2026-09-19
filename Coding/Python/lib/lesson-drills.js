/* lesson-drills.js — Phase 1 drill engine for lesson pages.
   Bootstrapped by lib/lesson-reader.js, which loads lib/random/fd.js, this file,
   lib/lesson-drills.css and lib/drills/<lessonId>.js, then calls
   LESSON_DRILLS.mount(data, lessonId).

   Shape of each variant in the data file:
     { name:"randint", title:"…", concept:"…html…",
       d1:{ kind, ask, code, blanks:[{a,lures}], why },     // fill the blank
       d2:{ kind, ask, code, options:[…], answer:i, why } } // spot the bug
   Soft lock: variant 1 is open; drill 2 unlocks once drill 1 is resolved; the next
   variant unlocks once its pair is resolved. Nothing is ever a hard wall — the rail
   dots for unlocked variants are clickable and "Skip ahead" opens everything. */
window.LESSON_DRILLS = (function () {
  "use strict";

  function mount(data, lessonId) {
    if (!data || !data.length || !window.FD) return;
    var KEY = "lsd:" + lessonId;
    var done = {};
    try { done = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    var at = 0, allOpen = false;

    var page = document.querySelector(".page") || document.body;
    var sec = document.createElement("section");
    sec.className = "lesson-section lsd";
    sec.id = "sdrills";
    sec.setAttribute("data-screen-label", "Drills");
    page.appendChild(sec);

    function resolved(i) { var d = done[i] || {}; return !!(d.d1 && d.d2); }
    function open(i) { if (allOpen || i === 0) return true; return resolved(i - 1); }

    function head() {
      var n = 0, i;
      for (i = 0; i < data.length; i++) if (resolved(i)) n++;
      var dots = "";
      for (i = 0; i < data.length; i++) {
        var cls = i === at ? "here" : (resolved(i) ? "done" : (open(i) ? "" : "lock"));
        dots += '<button type="button" class="' + cls + '" data-go="' + i + '" aria-label="Variant ' + (i + 1) + '">' + (i + 1) + "</button>";
      }
      return '<div class="step-label"><span class="step-num">9</span><h2>Drills</h2></div>' +
        '<p class="lsd-intro">Two per idea — fill the blank, then spot the bug. Optional, but this is where the reading turns into recall. ' + n + " of " + data.length + " done.</p>" +
        '<div class="lsd-rail"><div class="lsd-dots">' + dots + "</div>" +
        '<span class="lsd-pos">' + (at + 1) + " / " + data.length + "</span></div>";
    }

    function draw() {
      var f = data[at], d = done[at] || {};
      var h = head() +
        '<span class="lsd-name">' + esc(f.name) + "</span>" +
        '<h3 class="lsd-title">' + f.title + "</h3>" +
        (f.concept ? '<p class="lsd-concept">' + f.concept + "</p>" : "") +
        '<div class="drill" id="lsd-d1"><div class="drill-head"><span class="k">' + (f.d1.kind || "Fill the blank") + '</span><span class="n">Drill 1 of 2</span></div><div id="lsd-h1"></div></div>';

      var canD2 = allOpen || !!d.d1;
      h += '<div class="drill' + (canD2 ? "" : " is-lock") + '" id="lsd-d2"><div class="drill-head"><span class="k">' + (f.d2.kind || "Spot the bug") + '</span><span class="n">Drill 2 of 2</span></div>' +
        (canD2 ? '<div id="lsd-h2"></div>' : '<p class="drill-lockmsg">Answer drill 1 to open this one</p>') + "</div>";

      h += '<div class="lsd-nav">' +
        '<button type="button" class="fd-btn" data-a="prev"' + (at ? "" : " disabled") + ">&larr; Prev</button>" +
        '<span class="sp"></span>' +
        (allOpen ? "" : '<button type="button" class="fd-btn" data-a="skip">Skip ahead</button>') +
        '<button type="button" class="fd-btn pri" data-a="next"' + (at < data.length - 1 && open(at + 1) ? "" : " disabled") + ">Next &rarr;</button></div>";

      if (at === data.length - 1 && resolved(at)) h += '<div class="lsd-done">All ' + data.length + " drills cleared</div>";

      sec.innerHTML = h;
      FD.cloze(sec.querySelector("#lsd-h1"), spec(f.d1, "d1", f));
      if (canD2) FD.mcq(sec.querySelector("#lsd-h2"), spec(f.d2, "d2", f));
    }

    function spec(d, slot, f) {
      var o = {}, k;
      for (k in d) o[k] = d[k];
      o.id = lessonId + ":" + f.name + ":" + slot;
      o.onDone = function (ok) {
        var rec = done[at] || (done[at] = {});
        rec[slot] = ok ? 1 : (rec[slot] || 0.5);
        try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {}
        if (window.LESSON_XP) window.LESSON_XP(ok ? 15 : 5, ok ? "Drill cleared" : "Noted");
        else xpFallback(ok ? 15 : 5, ok ? "Drill cleared" : "Noted");
        var y = window.scrollY;
        draw();
        window.scrollTo(0, y);
      };
      o.onBank = function (s) {
        var B = "lsd:bank";
        var list = [];
        try { list = JSON.parse(localStorage.getItem(B) || "[]"); } catch (e) {}
        list.push({ id: s.id, lesson: lessonId, name: f.name, ask: s.ask, code: s.code, why: s.why, at: Date.now() });
        try { localStorage.setItem(B, JSON.stringify(list)); } catch (e) {}
      };
      return o;
    }

    sec.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.dataset.go != null) {
        var i = +t.dataset.go;
        if (!open(i)) return;
        at = i; draw(); return;
      }
      var a = t.dataset.a;
      if (a === "prev" && at > 0) { at--; draw(); }
      else if (a === "next" && at < data.length - 1 && open(at + 1)) { at++; draw(); }
      else if (a === "skip") { allOpen = true; draw(); }
    });

    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

    /* lesson.js keeps addXp private, so drive the HUD and toast directly when it is */
    var tT;
    function xpFallback(n, msg) {
      var el = document.getElementById("xp");
      if (el) el.textContent = (parseInt(el.textContent, 10) || 0) + n;
      var toast = document.getElementById("toast");
      if (!toast) return;
      toast.textContent = msg + "  +" + n + " XP";
      toast.classList.add("show");
      clearTimeout(tT); tT = setTimeout(function () { toast.classList.remove("show"); }, 2100);
    }

    for (var i = 0; i < data.length; i++) { if (!resolved(i)) { at = i; break; } }
    draw();
  }

  return { mount: mount };
})();
