/* today.js — Commonplace · Python. Real data for the Today card (js/today-card.js).
   Load after js/learn-shelf.js (it mounts the card):
     <script src="js/today.js" defer></script>

   Rows it fills — a row with nothing to show is passed as null and hidden:
     mistakes  unresolved practice mistakes (<prefix>_bank) — the ones the Mistake Bank lists
               (missed lesson drills in lsd:bank have no "resolved" state yet, so they are not counted)
     drills    My Scripts review items due today (window.MyScripts.dueCount)
     notebook  the notebook that pairs with the lesson you are on
   Everything is read from this device's localStorage; nothing here writes. */
(function () {
  "use strict";

  /* lessons whose "Try it" names a specific notebook (from the nb-link in each lesson);
     any other lesson falls back to the first notebook listed for its Part */
  var SHOW_MISTAKES = false;

  var LESSON_NB = { "0.3": "r02", "1.3": "r06", "2.1": "r04", "2.3": "r02", "2.4": "r03", "3.2": "r05" };

  function json(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function keys() { var out = []; try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; }
  function days(t) { return Math.max(0, Math.floor((Date.now() - t) / 864e5)); }
  function age(t) { var d = days(t); return d === 0 ? "today" : d === 1 ? "1 day" : d + " days"; }

  function mistakes() {
    var open = [];
    keys().forEach(function (k) {
      if (!/^commonplace_(practice_[a-z]+|pypractice)_bank$/.test(k)) return;
      var bank = json(k, {});
      for (var id in bank) if (bank.hasOwnProperty(id) && bank[id] && !bank[id].resolved) open.push(bank[id].t || 0);
    });
    if (!open.length) return null;
    var oldest = Math.min.apply(null, open.filter(Boolean).concat([Date.now()]));
    return { count: open.length, title: open.length === 1 ? "1 mistake waiting" : open.length + " mistakes waiting",
             meta: "oldest " + age(oldest), href: "index.html#bank" };
  }

  function drills() {
    var n = 0;
    try { n = window.MyScripts && window.MyScripts.dueCount ? window.MyScripts.dueCount() : 0; } catch (e) {}
    if (!n) return null;
    return { count: n, title: "My Scripts review", meta: n === 1 ? "1 item due today" : n + " items due today", href: "index.html#scripts" };
  }

  function notebook() {
    var S = window.PYSHELF;
    if (!S) return null;
    var last = S.state("live").last;
    var id = last ? last.id : "0.1";
    var pi = +id.split(".")[0], part = S.PARTS[pi];
    var key = LESSON_NB[id] || (part && part.nb && part.nb[0]);
    var nb = key && S.NB[key];
    if (!nb) return null;
    return { title: nb[1], meta: "pairs with lesson " + id, href: nb[2] };
  }

  function refresh() {
    if (!window.TodayCard || !document.getElementById("today-root")) return;
    /* mistakes: null for now. The Mistakes tab still shows only the Supabase drill page, which does
       not list these device-only practice mistakes, so the row would point at a page without them.
       Switch to mistakes() once the merged mistake store and the native Mistake Bank tab land. */
    window.TodayCard.updateLearn({ mistakes: SHOW_MISTAKES ? mistakes() : null, drills: drills(), notebook: notebook() });
  }

  refresh();
  /* counts change in other tabs (a lesson, the Practice tab) — redraw when we come back */
  window.addEventListener("storage", refresh);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
  window.addEventListener("hashchange", function () { if (location.hash === "#learn") refresh(); });
})();
