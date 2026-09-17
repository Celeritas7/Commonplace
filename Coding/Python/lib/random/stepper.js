/* stepper.js — drives the 23-step random-module page (candidate D shape).
 * Soft lock: running the cell unlocks the next feature; drills stay optional.
 * A missed drill banks to localStorage under commonplace_syntaxdrill_bank. */
(function () {
  "use strict";
  var FEATS = []
    .concat(window.RND_CORE.map(function (f) { return tag(f, "Core", ""); }))
    .concat(window.RND_APPENDIX.map(function (f) { return tag(f, "Appendix", "ap"); }))
    .concat(window.RND_RECIPES.map(function (f) { return tag(f, "Recipes", "rc"); }));
  function tag(f, group, cls) { f.group = group; f.gcls = cls; return f; }

  var KEY = "rnd.module.state";
  var st = { idx: 0, ran: {}, drilled: {} };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  if (!st.ran) st.ran = {};
  if (!st.drilled) st.drilled = {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* soft lock: you may open any feature up to the first one you have not run, +1 */
  function unlockedThrough() {
    var i = 0;
    while (i < FEATS.length && st.ran[FEATS[i].name]) i++;
    return Math.min(i, FEATS.length - 1);
  }

  var stage = document.getElementById("stage");
  var toastEl = document.getElementById("toast"), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  function bank(spec, feat) {
    try {
      var k = "commonplace_syntaxdrill_bank";
      var b = JSON.parse(localStorage.getItem(k) || "[]");
      b.push({ at: new Date().toISOString(), kind: "syntax-cloze", module: "random",
               feature: feat.name, id: feat.name + "-" + spec.kind, title: feat.title,
               ask: spec.ask, code: spec.code, why: spec.why });
      localStorage.setItem(k, JSON.stringify(b));
    } catch (e) {}
    toast("Banked: random." + feat.name);
  }

  function beat(i) {
    for (var n = 0; n < 4; n++) {
      var el = document.getElementById("b" + n);
      el.className = "bd" + (n < i ? " done" : n === i ? " here" : "");
    }
  }

  function rail() {
    var max = unlockedThrough();
    document.getElementById("dots").innerHTML = FEATS.map(function (f, i) {
      var c = "rd";
      if (i === st.idx) c += " here";
      else if (st.ran[f.name]) c += " done";
      if (i > max) c += " lock";
      return '<button class="' + c + '" type="button" data-j="' + i + '" title="random.' + f.name + '()">' + (i + 1) + "</button>";
    }).join("");
  }

  function nudge(el) {
    var y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function draw() {
    var F = FEATS[st.idx], prev = FEATS[st.idx - 1], next = FEATS[st.idx + 1];
    var ran = !!st.ran[F.name];
    document.getElementById("pos").textContent = (st.idx + 1) + " / " + FEATS.length + " · " + F.group;
    var apiName = F.apiName || F.api || F.name.replace(/ /g, "_");
    document.getElementById("fname").textContent = "random." + apiName + "()";
    document.getElementById("glab").textContent = F.group;
    rail();

    stage.innerHTML =
      '<div class="block live cleared"><span class="block-kick">Read</span><div class="paper">' +
        '<span class="gbadge ' + F.gcls + '">' + F.group + (F.api ? " · built on " + F.api : "") + "</span>" +
        '<h1 class="ftitle">' + F.title + '</h1><p class="fconcept">' + F.concept + "</p>" +
        '<ul class="uses">' + F.uses.map(function (u) { return "<li>" + u + "</li>"; }).join("") + "</ul></div></div>" +

      '<div class="block ' + (ran ? "live cleared" : "live") + '" id="blk1"><span class="block-kick">Run it</span>' +
        '<div class="cell"><div class="cell-bar"><span class="kick">' + F.name.replace(/ /g, "_") + '.py</span>' +
        '<button class="cell-run" id="run" type="button"' + (ran ? " disabled" : "") + ">" + (ran ? "ran ✓" : "▶ Run") + "</button></div>" +
        "<pre>" + F.code + "</pre>" +
        '<div class="cell-out" id="out"' + (ran ? "" : " hidden") + '><span class="kick">out</span><span>' + F.out + "</span></div>" +
        '<div class="cav">Example only — random values differ each run unless you seed with <code>random.seed()</code>.</div></div></div>' +

      '<div class="block ' + (ran ? "live" : "shut") + '" id="blk2"><span class="block-kick">Drill 1 · ' + F.d1.kind + "</span>" +
        '<p class="shut-note" id="n2"' + (ran ? " hidden" : "") + ">Run the cell to open this</p>" +
        '<div class="drill" id="w1"' + (ran ? "" : " hidden") + '><div id="d1"></div></div></div>' +

      '<div class="block shut" id="blk3"><span class="block-kick">Drill 2 · ' + F.d2.kind + "</span>" +
        '<p class="shut-note" id="n3">Clear drill 1 to open this</p>' +
        '<div class="drill" id="w2" hidden><div id="d2"></div></div></div>' +

      '<div class="block" id="blk4"><span class="block-kick">Next</span><div class="foot">' +
        (prev ? '<button class="fd-btn" type="button" data-nav="-1">← ' + prev.name + "</button>" : '<a class="fd-btn" href="../index.html">← Fundamentals</a>') +
        '<span class="sp"></span>' +
        (next ? '<button class="fd-btn' + (ran ? " pri" : "") + '" type="button" data-nav="1"' + (ran ? "" : " disabled") + ">" + next.name + " →</button>"
              : '<a class="fd-btn pri" href="../index.html">Done · back to Fundamentals</a>') +
      "</div></div>";

    beat(ran ? 2 : 1);

    var runBtn = document.getElementById("run");
    if (runBtn && !ran) runBtn.addEventListener("click", function () {
      this.disabled = true; this.textContent = "ran ✓";
      document.getElementById("out").hidden = false;
      document.getElementById("blk1").classList.add("cleared");
      st.ran[F.name] = 1; save(); rail();
      var b2 = document.getElementById("blk2");
      b2.classList.remove("shut"); b2.classList.add("live");
      document.getElementById("n2").hidden = true;
      document.getElementById("w1").hidden = false;
      var fwd = stage.querySelector('[data-nav="1"]');
      if (fwd) { fwd.disabled = false; fwd.classList.add("pri"); }
      beat(2); nudge(b2);
      openDrill1();
    });

    var d2Mounted = false;
    function openDrill1() {
      window.FD.cloze(document.getElementById("d1"), Object.assign({
        id: F.name + "-1",
        onBank: function (s) { bank(s, F); },
        onDone: function (ok) {
          document.getElementById("blk2").classList.add("cleared");
          if (ok) { st.drilled[F.name + "-1"] = 1; save(); }
          var b3 = document.getElementById("blk3");
          b3.classList.remove("shut"); b3.classList.add("live");
          document.getElementById("n3").hidden = true;
          document.getElementById("w2").hidden = false;
          beat(3); nudge(b3);
          if (d2Mounted) return;
          d2Mounted = true;
          window.FD.mcq(document.getElementById("d2"), Object.assign({
            id: F.name + "-2",
            onBank: function (s) { bank(s, F); },
            onDone: function (ok2) {
              document.getElementById("blk3").classList.add("cleared");
              if (ok2) { st.drilled[F.name + "-2"] = 1; save(); }
              document.getElementById("blk4").classList.add("live", "cleared");
              beat(4); nudge(document.getElementById("blk4"));
            }
          }, F.d2));
        }
      }, F.d1));
    }
    if (ran) openDrill1();
  }

  function go(i) {
    if (i < 0 || i >= FEATS.length || i > unlockedThrough()) return;
    st.idx = i; save(); draw(); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", function (e) {
    var j = e.target.closest("[data-j]");
    if (j) return go(+j.dataset.j);
    var n = e.target.closest("[data-nav]");
    if (n && !n.disabled) return go(st.idx + (+n.dataset.nav));
  });

  draw();
})();
