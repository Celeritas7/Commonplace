(function () {
var P = window.PYSHELF;
var q = new URLSearchParams(location.search);
var slug = q.get("s") || "python-book";
var st = q.get("state") || "live";
var S = P.state(st);
var head = document.getElementById("head"), body = document.getElementById("body");

function stat(l, v) { return '<div class="fh-s"><span class="l">' + l + '</span><span class="v">' + v + '</span></div>'; }
function setHead(kick, title, sub, stats) {
  var m = P.shelfMeta(slug);
  document.documentElement.style.setProperty("--accent", m.accent);
  document.documentElement.style.setProperty("--tint", m.tint);
  document.getElementById("cr").textContent = title;
  document.title = title + " · Python · Commonplace";
  head.innerHTML = '<div class="fh-mark">' + m.mark + '</div><div><div class="fh-kick">' + kick + '</div><h1 class="fh-t">' + title + '</h1><p class="fh-sub">' + sub + '</p></div>'
    + '<div class="fh-stats">' + stats.map(function (s) { return stat(s[0], s[1]); }).join("") + '</div>';
}
function nbchip(k) { var n = P.NB[k]; return '<a class="nb" href="' + n[2] + '"><span class="nn">' + n[0] + '</span>' + n[1] + '<span class="rn">▸</span></a>'; }

/* ---------- the book ---------- */
function renderBook() {
  setHead("Books · reference reading", "The Python Book",
    "Thirteen parts, written in order — mental model first, then the code. A part hands off to its notebooks when it is time to run something.",
    [["Written", S.book.written + " / " + S.book.total], ["Read", S.book.read], ["Parts", "13"]]);
  var open = S.last ? S.last.id.split(".")[0] : "0", html = "";
  P.PARTS.forEach(function (p) {
    var pn = P.R2N[p.n], w = 0, r = 0, sq = "";
    for (var i = 0; i < p.c; i++) {
      var id = P.lid(p, i), cls = S.W[id] ? ((S.read[id] && S.read[id].pct >= 100) ? "r" : "w") : "";
      if (cls) w++; if (cls === "r") r++;
      sq += '<i class="' + cls + '"></i>';
    }
    var planned = w === 0, isOpen = String(pn) === open, b = "";
    if (planned) b = '<div class="planned-note"><b>Planned</b> &nbsp;' + p.c + ' lessons, not yet written.</div>';
    else for (var j = 0; j < p.c; j++) {
      var id2 = P.lid(p, j), tt = (p.lessons || [])[j] || ("Lesson " + id2);
      if (!S.W[id2]) { b += '<div class="lesson p"><span class="l-n">' + id2 + '</span><span class="l-t">' + tt + '</span><span class="l-s">planned</span></div>'; continue; }
      var rd = S.read[id2], cls2 = rd && rd.pct >= 100 ? "r" : "w";
      var lab = cls2 === "r" ? "read" : (rd ? 'reading <span class="pct">' + rd.pct + '%</span>' : "unread");
      b += '<a class="lesson ' + cls2 + '" href="' + P.href(p, j) + '"><span class="l-n">' + id2 + '</span><span class="l-t">' + tt + '</span><span class="l-s">' + lab + ' →</span></a>';
    }
    if (p.nb.length) b += '<div class="tryit"><span class="k">Try it</span>' + p.nb.map(nbchip).join("") + '</div>';
    var cnt = planned ? p.c + " planned" : (r ? '<b>' + r + '</b> read · ' + w + ' / ' + p.c : '<b>' + w + '</b> / ' + p.c + ' written');
    html += '<div class="part' + (planned ? " planned" : "") + (isOpen ? " open" : "") + '"><div class="part-row" role="button" tabindex="0" aria-expanded="' + isOpen + '">'
      + '<span class="part-n">§ ' + p.n + '</span><span class="part-t">' + p.t + '</span>'
      + '<span class="tally" aria-label="' + r + ' read, ' + w + ' written of ' + p.c + '">' + sq + '</span>'
      + '<span class="part-c">' + cnt + '</span><span class="caret">›</span></div><div class="part-body">' + b + '</div></div>';
  });
  body.innerHTML = '<div class="toc" id="toc">' + html + '</div><div class="key"><i class="r"></i> read <i class="w"></i> written <i></i> planned</div>';
  wireToc();
}

/* ---------- a notebook folder ---------- */
function renderNbFolder(f) {
  setHead("Notebooks · runnable", f.t, f.sub + " — every cell is editable and runs real Python in the browser.",
    [["Notebooks", f.n], ["Runtime", "Pyodide"]]);
  var items = (f.items || []).map(function (k) { return P.NB[k]; }).concat(f.links || []);
  body.innerHTML = '<div class="nblist">' + items.map(function (n) {
    return '<a class="nbcard" href="' + n[2] + '"><span class="idx">' + n[0] + '</span><span class="ct">' + n[1] + '</span><span class="go">Open ↗</span></a>';
  }).join("") + '</div>';
}

function wireToc() {
  var toc = document.getElementById("toc"); if (!toc) return;
  toc.addEventListener("click", function (e) {
    var row = e.target.closest(".part-row"); if (!row) return;
    var o = row.parentNode.classList.toggle("open"); row.setAttribute("aria-expanded", o);
  });
  toc.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { var row = e.target.closest(".part-row"); if (row) { e.preventDefault(); row.click(); } }
  });
}

if (slug === "python-book") renderBook();
else {
  var f = P.NBFOLDERS.filter(function (x) { return x.id === slug; })[0];
  if (f) renderNbFolder(f);
  else { setHead("Shelf", "Not found", "No shelf matches “" + slug + "”.", []); body.innerHTML = ""; }
}
})();
