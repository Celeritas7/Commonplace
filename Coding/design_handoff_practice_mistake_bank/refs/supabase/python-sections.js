/* python-sections.js
 * Renders the Python index card grids (Fundamentals / Data Libraries / Practice)
 * from Supabase instead of static HTML. Nothing about the LOOK changes — it emits
 * the exact same .sec / .card markup your page already styles — but every card now
 * comes from the `commonplace_pages` table, so you edit content in the DB.
 *
 * REQUIRES: a Supabase client on `window.sb` (your index.html already creates one
 * for the 100 Days viewer) and the `commonplace_pages` table (see the .seed.sql).
 *
 * USAGE — replace your three static <section> blocks (Fundamentals, Data
 * Libraries, Practice & Drills) with ONE placeholder, and keep a copy of the old
 * cards inside it as an offline fallback:
 *
 *   <div id="dyn-sections">
 *     <!-- optional: paste your current static <section> blocks here as fallback -->
 *   </div>
 *
 * then, before </body> (after the Supabase client is created):
 *   <script src="python-sections.js"></script>
 */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function cardHtml(c) {
    var href = c.href || "#";
    var go = c.status === "wip"
      ? '<span class="go" style="opacity:.6">WIP</span>'
      : '<span class="go">Open \u2197</span>';
    return '<a class="card" href="' + esc(href) + '">'
      + '<span class="idx">' + esc(c.idx || "") + '</span>'
      + '<span class="ct">' + esc(c.title) + '</span>'
      + go
      + '</a>';
  }

  function sectionHtml(sec) {
    var cards = sec.cards.map(cardHtml).join("");
    return '<section class="sec">'
      + '<div class="sec-head">'
      +   '<span class="n">\u00a7 ' + esc(sec.no) + '</span>'
      +   '<h2>' + esc(sec.title) + '</h2>'
      +   '<span class="count">' + sec.cards.length + '</span>'
      +   '<span class="ln"></span>'
      + '</div>'
      + (sec.desc ? '<p class="sec-desc">' + esc(sec.desc) + '</p>' : '')
      + '<div class="cards">' + cards + '</div>'
      + '</section>';
  }

  function group(rows) {
    var order = [], map = {};
    rows.forEach(function (r) {
      if (!map[r.section_key]) {
        map[r.section_key] = { no: r.section_no, title: r.section_title, desc: r.section_desc, cards: [] };
        order.push(map[r.section_key]);
      }
      map[r.section_key].cards.push(r);
    });
    return order;
  }

  async function render() {
    var host = document.getElementById("dyn-sections");
    if (!host) return;
    var sb = window.sb;
    if (!sb) { console.warn("python-sections: window.sb (Supabase client) not found — keeping static fallback."); return; }
    try {
      var res = await sb.from("commonplace_pages")
        .select("*")
        .eq("subject", "python")
        .neq("status", "hidden")
        .order("section_order", { ascending: true })
        .order("card_order", { ascending: true });
      if (res.error) { console.warn("python-sections: " + res.error.message + " — keeping static fallback."); return; }
      var rows = res.data || [];
      if (!rows.length) return;                 // nothing in DB yet → keep fallback
      host.innerHTML = group(rows).map(sectionHtml).join("");
    } catch (e) {
      console.warn("python-sections: load failed (" + e.message + ") — keeping static fallback.");
    }
  }

  if (document.readyState !== "loading") render();
  else document.addEventListener("DOMContentLoaded", render);
})();
