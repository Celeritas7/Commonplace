// funnel-interactive.js — makes the funnel diagrams in the modules readable.
// The big funnel already carries its labels. The small "mini" funnels only
// highlight the layers this section is about (fill-opacity 1), with no text,
// so a reader can't tell which clause is meant. This adds:
//   1. a tooltip (<title>) on every layer, big and mini, naming the clause
//   2. a one-line caption under each mini funnel: "You are here · FROM, WHERE"
//   3. a click on any layer opens that clause in the home-page funnel
// Loaded by every module-*.html with `defer`, after the page content exists.
(function () {
  "use strict";
  var CLAUSES = ["SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT"];
  var SVG_NS = "http://www.w3.org/2000/svg";

  document.querySelectorAll(".funnel-wrap svg").forEach(function (svg) {
    var layers = svg.querySelectorAll("polygon");
    var active = [];
    layers.forEach(function (poly, i) {
      var name = CLAUSES[i] || ("layer " + (i + 1));
      var t = document.createElementNS(SVG_NS, "title");
      t.textContent = name;
      poly.appendChild(t);
      poly.style.cursor = "pointer";
      poly.addEventListener("click", function () {
        location.href = "../index.html#funnel-top";
      });
      if (parseFloat(poly.getAttribute("fill-opacity") || "1") >= 0.99) active.push(name);
    });
    var wrap = svg.closest(".funnel-wrap");
    if (!wrap || !wrap.classList.contains("mini") || !active.length) return;
    if (wrap.querySelector(".funnel-caption")) return;
    var cap = document.createElement("div");
    cap.className = "funnel-caption";
    cap.style.cssText = "margin-top:8px;font-family:var(--mono, 'JetBrains Mono', monospace);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.6);";
    cap.innerHTML = '<span style="opacity:0.7">You are here ·</span> <b style="color:#fff;font-weight:600">' + active.join(", ") + "</b>";
    wrap.appendChild(cap);
  });
})();
