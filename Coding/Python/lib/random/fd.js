/* fd.js — the two drill kinds used by the random-module rebuild candidates.
 * FD.cloze(host, spec)  fill-the-blank, tap-to-fill, no text inputs
 * FD.mcq(host, spec)    one-from-three (spot the bug / predict the output)
 * Both call spec.onDone(correct) once resolved. Palette comes from the page. */
(function () {
  "use strict";
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function seeded(a, seed){
    var h=0,i; for(i=0;i<seed.length;i++) h=(h*31+seed.charCodeAt(i))&0x7fffffff;
    a=a.slice(); for(i=a.length-1;i>0;i--){ h=(h*1103515245+12345)&0x7fffffff; var j=h%(i+1),t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }

  function cloze(host, spec){
    var fills = spec.blanks.map(function(){ return null; }), active = 0, checked = false, res = [];
    var pool = [], seen = {};
    spec.blanks.forEach(function(b){ pool.push(b.a); (b.lures||[]).forEach(function(l){ pool.push(l); }); });
    var chips = seeded(pool.filter(function(t){ if(seen[t]) return false; seen[t]=1; return true; }), spec.id);

    function draw(){
      var codeHtml = "", parts = spec.code.split(/\{\{(\d+)\}\}/);
      parts.forEach(function(p,i){
        if(i%2===0){ codeHtml += esc(p); return; }
        var n = +p - 1, cls = "fd-b";
        if(checked) cls += res[n] ? " ok" : " no";
        else if(fills[n]!==null) cls += " has";
        if(!checked && n===active) cls += " on";
        codeHtml += '<button type="button" class="'+cls+'" data-b="'+n+'">'+(fills[n]!==null?esc(fills[n]):"▁▁▁")+"</button>";
      });
      var done = fills.filter(function(f){ return f!==null; }).length, all = checked && res.every(Boolean);
      var h = '<p class="fd-ask">'+spec.ask+'</p><pre class="fd-code">'+codeHtml+"</pre>";
      if(!checked){
        h += '<div class="fd-tray">';
        chips.forEach(function(t){ h += '<button type="button" class="fd-chip'+(fills.indexOf(t)>=0?" used":"")+'" data-t="'+esc(t)+'">'+esc(t)+"</button>"; });
        h += '</div><div class="fd-acts"><button type="button" class="fd-btn pri" data-a="check"'+(done<spec.blanks.length?" disabled":"")+">Check</button>"+
             '<button type="button" class="fd-btn" data-a="clear"'+(done?"":" disabled")+">Clear</button></div>";
      } else {
        h += '<div class="fd-v '+(all?"ok":"no")+'"><span class="fd-m">'+(all?"✓":"×")+'</span><span>'+
             (all?"<b>Right.</b> ":"<b>Not yet.</b> ")+spec.why+"</span></div>";
        if(!all) h += '<div class="fd-acts"><button type="button" class="fd-btn" data-a="retry">Try again</button><button type="button" class="fd-btn bank" data-a="bank">▣ Bank it</button></div>';
      }
      host.innerHTML = h;
    }
    host.addEventListener("click", function(e){
      var t = e.target.closest("button"); if(!t) return;
      if(t.dataset.b!=null && !checked){ var n=+t.dataset.b; if(fills[n]!==null) fills[n]=null; active=n; return draw(); }
      if(t.dataset.t!=null && !checked){ fills[active]=t.dataset.t; var nx=fills.indexOf(null); active=nx<0?active:nx; return draw(); }
      var a = t.dataset.a;
      if(a==="check"){ res=spec.blanks.map(function(b,i){ return fills[i]===b.a; }); checked=true; draw(); if(spec.onDone) spec.onDone(res.every(Boolean)); }
      else if(a==="clear"){ fills=fills.map(function(){return null;}); active=0; draw(); }
      else if(a==="retry"){ fills=fills.map(function(){return null;}); active=0; checked=false; res=[]; draw(); }
      else if(a==="bank"){ t.textContent="▣ Banked ✓"; t.disabled=true; if(spec.onBank) spec.onBank(spec); }
    });
    draw();
  }

  function mcq(host, spec){
    var picked = null;
    function draw(){
      var h = '<p class="fd-ask">'+spec.ask+"</p>";
      if(spec.code) h += '<pre class="fd-code plain">'+esc(spec.code)+"</pre>";
      h += '<div class="fd-opts">';
      spec.options.forEach(function(o,i){
        var cls="fd-opt";
        if(picked!==null){ if(i===spec.answer) cls+=" ok"; else if(i===picked) cls+=" no"; else cls+=" dim"; }
        h += '<button type="button" class="'+cls+'" data-o="'+i+'">'+o+"</button>";
      });
      h += "</div>";
      if(picked!==null){
        var right = picked===spec.answer;
        h += '<div class="fd-v '+(right?"ok":"no")+'"><span class="fd-m">'+(right?"✓":"×")+'</span><span>'+
             (right?"<b>Right.</b> ":"<b>Not quite.</b> ")+spec.why+"</span></div>";
        if(!right) h += '<div class="fd-acts"><button type="button" class="fd-btn" data-a="retry">Try again</button><button type="button" class="fd-btn bank" data-a="bank">▣ Bank it</button></div>';
      }
      host.innerHTML = h;
    }
    host.addEventListener("click", function(e){
      var t = e.target.closest("button"); if(!t) return;
      if(t.dataset.o!=null && picked===null){ picked=+t.dataset.o; draw(); if(spec.onDone) spec.onDone(picked===spec.answer); return; }
      if(t.dataset.a==="retry"){ picked=null; draw(); }
      else if(t.dataset.a==="bank"){ t.textContent="▣ Banked ✓"; t.disabled=true; if(spec.onBank) spec.onBank(spec); }
    });
    draw();
  }

  /* the randint feature, used by all three candidates */
  window.FD = { cloze: cloze, mcq: mcq };
  window.FD_RANDINT = {
    n: 3, total: 24, group: "Core",
    name: "randint", title: "Random integer, inclusive",
    concept: "Returns a random integer <b>including both endpoints</b> — <code>randint(1, 10)</code> can return 1 or 10.",
    uses: ["Dice simulation", "Game logic", "Lottery systems"],
    code: "import random\nrandom.randint(1, 10)",
    out: "7",
    d1: { id:"r-randint-1", kind:"Fill the blank",
      ask:"Roll a fair six-sided die and print the face.",
      code:"import random\nprint(random.{{1}}({{2}}, {{3}}))",
      blanks:[{a:"randint",lures:["randrange","choice"]},{a:"1",lures:["0"]},{a:"6",lures:["7"]}],
      why:"randint includes both ends, so 1 and 6 are both reachable — exactly a die." },
    d2: { id:"r-randint-2", kind:"Spot the bug",
      ask:"This is meant to give a die face from 1 to 6. What is wrong with it?",
      code:"import random\nface = random.randint(1, 7)",
      options:["Nothing — it is correct.","It can return 7, because randint includes the stop value.","It can return 0, because randint starts below the first argument."],
      answer:1,
      why:"randint(a, b) is inclusive at <i>both</i> ends. Write <code>randint(1, 6)</code> — or <code>randrange(1, 7)</code>, which excludes the stop like <code>range</code> does." }
  };
})();
