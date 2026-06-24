/* ============================================================================
 * python-practice-plus.js  ·  Commonplace
 * Drop-in attempts log for the Python practice pages. No engine changes.
 *
 * Add ONE line just before </body> on any fundamentals page:
 *     <script src="../python-practice-plus.js"></script>
 *   (use "python-practice-plus.js" if the file sits beside the page)
 *
 * What it does, per exercise / notebook cell:
 *   • injects a collapsible  "↻ Your attempts · N tries"  panel under the buttons
 *   • on EVERY run (button, Shift-Enter, ⌘/Ctrl-Enter, Run all) it observes the
 *     page's OWN result — pass = ran with no traceback, fail = traceback — by
 *     watching the run button's disabled flag flip back and reading the output's
 *     `err` class. It does NOT re-implement grading.
 *   • records { q, ok, msg, t } to localStorage  commonplace_python_attempts
 *     and, when you're signed in, mirrors it to your Supabase
 *     commonplace_attempts / commonplace_mistakes (same account the page uses),
 *     so the Mistake Drill page picks it up automatically.
 *
 * Idempotent: safe to include twice.
 * ========================================================================== */
(function () {
  "use strict";
  if (window.__commonplacePyPlus) return;          // guard double-include
  window.__commonplacePyPlus = true;

  /* ----------------------------------------------------------------- config */
  var SUPABASE_URL = "https://wylxvmkcrexwfpjpbhyy.supabase.co";
  var SUPABASE_KEY = "sb_publishable_e3pDOuxIdstaC7s0a680kQ_R10TrAyv";
  var SUBJECT      = "python";
  var LS_KEY       = "commonplace_python_attempts"; // { [exId]: [{q,ok,msg,t}] }
  var SHOW_LATEST  = 4;                              // collapse to latest N
  var PAGE_ID = (location.pathname.split("/").pop() || "page").replace(/\.html?$/i, "");

  /* ------------------------------------------------------------ tiny helpers */
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function decodeEntities(s){ var t=document.createElement("textarea"); t.innerHTML=String(s==null?"":s); return t.value; }
  function stripTags(s){ var d=document.createElement("div"); d.innerHTML=String(s==null?"":s); return (d.textContent||"").trim(); }
  function rel(ts){
    if(!ts) return "";
    var d=Math.max(0, Date.now()-ts);
    var min=Math.round(d/6e4), hr=Math.round(d/36e5), day=Math.round(d/864e5);
    if(min<1) return "just now";
    if(min<60) return min+(min===1?" min ago":" mins ago");
    if(hr<24) return hr+(hr===1?" hour ago":" hours ago");
    if(day<31) return day+(day===1?" day ago":" days ago");
    var mo=Math.round(day/30); if(mo<12) return mo+(mo===1?" month ago":" months ago");
    return Math.round(day/365)+" yr ago";
  }
  function conciseReason(msg){
    if(!msg) return "";
    var lines=String(msg).trim().split("\n").filter(function(l){return l.trim();});
    // last non-empty line of a Python traceback is the actual error
    var last=lines[lines.length-1]||"";
    if(last.length>160) last=last.slice(0,157)+"…";
    return last;
  }

  /* ------------------------------------------------------------- localStorage */
  function readAll(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); }catch(e){ return {}; } }
  function writeAll(o){ try{ localStorage.setItem(LS_KEY, JSON.stringify(o)); }catch(e){} }
  function attemptsFor(id){ var a=readAll()[id]; return Array.isArray(a)?a:[]; }
  function pushAttempt(id, rec){
    var all=readAll(); var list=Array.isArray(all[id])?all[id]:[];
    var last=list[list.length-1];
    // dedupe identical consecutive attempts (same code + same pass/fail)
    if(last && last.q===rec.q && !!last.ok===!!rec.ok){ return false; }
    list.push(rec); all[id]=list; writeAll(all); return true;
  }

  /* --------------------------------------------------------------- supabase */
  var sb=null, session=null;
  try {
    if(window.supabase && window.supabase.createClient){
      sb=window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,
        { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    }
  } catch(e){ sb=null; }

  var exCache = {};                 // slug -> exercise uuid
  var ensureInflight = {};          // slug -> Promise (avoid duplicate inserts)
  function primeExerciseCache(){
    if(!sb || !session) return;
    sb.from("commonplace_exercises").select("id,title,tags").eq("subject",SUBJECT)
      .then(function(res){
        if(res.error || !res.data) return;
        res.data.forEach(function(r){
          var slug=null;
          if(Array.isArray(r.tags)){ for(var i=0;i<r.tags.length;i++){ if(/^slug:/.test(r.tags[i])){ slug=r.tags[i].slice(5); break; } } }
          if(slug) exCache[slug]=r.id;
        });
      }, function(){});
  }
  if(sb){
    sb.auth.getSession().then(function(r){ session=r.data.session||null; primeExerciseCache(); renderAllPanels(); });
    sb.auth.onAuthStateChange(function(_e,s){ session=s||null; exCache={}; ensureInflight={}; primeExerciseCache(); renderAllPanels(); });
  }

  // lazily create (under the signed-in user's own account) an exercise row for
  // a fundamentals exercise, so attempts/mistakes can reference it by uuid.
  function ensureExercise(meta){
    if(!sb || !session) return Promise.resolve(null);
    if(exCache[meta.slug]) return Promise.resolve(exCache[meta.slug]);
    if(ensureInflight[meta.slug]) return ensureInflight[meta.slug];
    var row = {
      subject:SUBJECT, kind:"code", language:"python",
      title: meta.title,
      prompt: meta.prompt||"",
      starter_code: meta.starter||"",
      expected_output: meta.expected||"",
      difficulty: meta.kind==="challenge" ? "challenge" : (meta.kind==="basic" ? "basic" : "drill"),
      tags: ["fundamentals", PAGE_ID, "slug:"+meta.slug],
      order_index: meta.order||0
    };
    var p = sb.from("commonplace_exercises").insert(row).select("id").single()
      .then(function(res){
        var id = res && res.data ? res.data.id : null;
        if(id) exCache[meta.slug]=id;
        delete ensureInflight[meta.slug];
        return id;
      }, function(){ delete ensureInflight[meta.slug]; return null; });
    ensureInflight[meta.slug]=p;
    return p;
  }

  function cloudRecord(meta, code, ok, msg, out){
    if(!sb || !session) return;
    ensureExercise(meta).then(function(exId){
      if(!exId) return;
      sb.from("commonplace_attempts").insert({
        subject:SUBJECT, exercise_id:exId, language:"python",
        code: code||"", stdout: ok ? (out||"") : "", stderr: ok ? "" : (msg||""),
        passed: !!ok
      }).select("id").single().then(function(res){
        var attemptId = res && res.data ? res.data.id : null;
        if(!ok){
          // open a mistake if there isn't already an unresolved one for this ex
          sb.from("commonplace_mistakes").select("id").eq("subject",SUBJECT)
            .eq("exercise_id",exId).eq("resolved",false).limit(1)
            .then(function(m){
              if(m.data && m.data.length) return; // already in the bank
              sb.from("commonplace_mistakes").insert({
                subject:SUBJECT, exercise_id:exId, attempt_id:attemptId,
                reason: conciseReason(msg) || "Ran with an error.", resolved:false
              }).then(function(){}, function(){});
            }, function(){});
        } else {
          // a pass resolves any open mistake for this exercise
          sb.from("commonplace_mistakes").update({ resolved:true, resolved_at:new Date().toISOString() })
            .eq("subject",SUBJECT).eq("exercise_id",exId).eq("resolved",false)
            .then(function(){}, function(){});
        }
      }, function(){});
    });
  }

  /* ----------------------------------------------------------- inject styles */
  (function injectCSS(){
    if(document.getElementById("cpp-style")) return;
    var css =
    ".cpp-wrap{font-family:'JetBrains Mono',ui-monospace,monospace;border-top:1px solid var(--line,#d2dacb);background:var(--paper-2,#f4f5ec);}"+
    ".cpp-toggle{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:none;background:none;cursor:pointer;"+
      "padding:10px 16px;font-family:inherit;font-size:11.5px;letter-spacing:.4px;color:var(--ink-mute,#7a8c80);}"+
    ".cpp-toggle:hover{color:var(--green,#2f6b4f);}"+
    ".cpp-toggle .cpp-rot{display:inline-block;transition:transform .18s;font-size:10px;}"+
    ".cpp-wrap.open .cpp-toggle .cpp-rot{transform:rotate(90deg);}"+
    ".cpp-toggle .cpp-n{color:var(--ink,#1a2820);font-weight:700;}"+
    ".cpp-toggle .cpp-spark{margin-left:auto;display:flex;gap:3px;}"+
    ".cpp-toggle .cpp-spark i{width:7px;height:7px;border-radius:2px;display:inline-block;}"+
    ".cpp-body{display:none;padding:2px 14px 14px;}"+
    ".cpp-wrap.open .cpp-body{display:block;}"+
    ".cpp-row{display:flex;gap:10px;padding:10px 0;border-top:1px dashed var(--line-soft,#e0e6d8);}"+
    ".cpp-row:first-child{border-top:none;}"+
    ".cpp-badge{flex:none;width:20px;height:20px;border-radius:5px;display:grid;place-items:center;font-size:12px;font-weight:700;margin-top:1px;}"+
    ".cpp-badge.ok{background:var(--green,#2f6b4f);color:#fff;}"+
    ".cpp-badge.no{background:#fbeae6;color:#8c2f22;border:1px solid var(--err,#e79088);}"+
    ".cpp-main{flex:1;min-width:0;}"+
    ".cpp-meta{display:flex;align-items:baseline;gap:8px;margin-bottom:5px;flex-wrap:wrap;}"+
    ".cpp-verdict{font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}"+
    ".cpp-verdict.ok{color:var(--green,#2f6b4f);}"+
    ".cpp-verdict.no{color:#8c2f22;}"+
    ".cpp-when{font-size:10px;color:var(--ink-mute,#7a8c80);}"+
    ".cpp-code{margin:0;background:var(--code-bg,#152620);color:var(--w,#dceadf);border-radius:7px;padding:9px 11px;"+
      "font-family:inherit;font-size:11.5px;line-height:1.5;white-space:pre;overflow-x:auto;max-height:150px;}"+
    ".cpp-reason{margin:6px 0 0;font-size:11.5px;line-height:1.45;color:var(--ink-soft,#41564a);font-family:'EB Garamond',Georgia,serif;}"+
    ".cpp-reason.no{color:#8c2f22;font-style:italic;}"+
    ".cpp-reason .rl{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#a23a2c;margin-right:6px;}"+
    ".cpp-more{margin:10px 0 0;border:1px dashed var(--sage,#7fa68b);background:transparent;color:var(--green,#2f6b4f);"+
      "border-radius:7px;padding:7px 11px;font-family:inherit;font-size:11px;cursor:pointer;}"+
    ".cpp-more:hover{background:var(--sage-soft,#dde7dd);}"+
    ".cpp-empty{padding:2px 0 4px;font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:13px;color:var(--ink-mute,#7a8c80);}"+
    ".cpp-drill{display:inline-block;margin-top:9px;font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.3px;"+
      "color:var(--green,#2f6b4f);text-decoration:none;border-bottom:1px dotted var(--sage,#7fa68b);}"+
    ".cpp-drill:hover{color:var(--green-2,#3c8362);}";
    var st=document.createElement("style"); st.id="cpp-style"; st.textContent=css;
    document.head.appendChild(st);
  })();

  /* ------------------------------------------------------- panel rendering */
  var units = [];   // { id, meta, panel, expanded:false }

  function sparkline(list){
    var recent=list.slice(-6);
    return recent.map(function(a){ return '<i style="background:'+(a.ok?'var(--green,#2f6b4f)':'var(--err,#e79088)')+'"></i>'; }).join("");
  }
  function rowHtml(a){
    var code=(a.q||"").replace(/\s+$/,"") || "(empty)";
    var reason = a.ok
      ? '<p class="cpp-reason">solved</p>'
      : '<p class="cpp-reason no"><span class="rl">why</span>'+esc(conciseReason(a.msg)||"ran with an error")+'</p>';
    return '<div class="cpp-row">'
      + '<div class="cpp-badge '+(a.ok?'ok':'no')+'">'+(a.ok?'✓':'✕')+'</div>'
      + '<div class="cpp-main">'
        + '<div class="cpp-meta"><span class="cpp-verdict '+(a.ok?'ok':'no')+'">'+(a.ok?'passed':'failed')+'</span>'
        + '<span class="cpp-when">'+esc(rel(a.t))+'</span></div>'
        + '<pre class="cpp-code">'+esc(code)+'</pre>'
        + reason
      + '</div></div>';
  }
  function renderPanel(u){
    var list = attemptsFor(u.id);
    var n = list.length;
    var wrap = u.panel;
    wrap.className = "cpp-wrap" + (wrap.classList.contains("open") ? " open" : "");
    var head = '<button class="cpp-toggle" type="button">'
      + '<span class="cpp-rot">▸</span> Your attempts · <span class="cpp-n">'+n+'</span>&nbsp;'+(n===1?'try':'tries')
      + '<span class="cpp-spark">'+sparkline(list)+'</span></button>';
    var body;
    if(!n){
      body = '<div class="cpp-body"><div class="cpp-empty">No attempts yet — run your code and every try is logged here.</div></div>';
    } else {
      var ordered = list.slice().reverse();                 // newest first
      var shown = u.expanded ? ordered : ordered.slice(0, SHOW_LATEST);
      var rows = shown.map(rowHtml).join("");
      var more = "";
      if(!u.expanded && n>SHOW_LATEST){
        more = '<button class="cpp-more" type="button">+'+(n-SHOW_LATEST)+' earlier '+((n-SHOW_LATEST)===1?'try':'tries')+'</button>';
      }
      var drill='<a class="cpp-drill" href="'+drillHref()+'">↳ open the Mistake Drill</a>';
      body = '<div class="cpp-body">'+rows+more+drill+'</div>';
    }
    wrap.innerHTML = head + body;

    wrap.querySelector(".cpp-toggle").addEventListener("click", function(){
      wrap.classList.toggle("open");
    });
    var moreBtn = wrap.querySelector(".cpp-more");
    if(moreBtn) moreBtn.addEventListener("click", function(e){ e.stopPropagation(); u.expanded=true; renderPanel(u); wrap.classList.add("open"); });
  }
  function drillHref(){
    // page lives in fundamentals/<x>.html ; drill lives at fundamentals/mistake-drill.html
    return "mistake-drill.html";
  }
  function renderAllPanels(){ units.forEach(renderPanel); }

  /* ----------------------------------------------- per-unit run observation */
  function editorValue(unitEl){
    var cmEl = unitEl.querySelector(".CodeMirror");
    if(cmEl && cmEl.CodeMirror){ try{ return cmEl.CodeMirror.getValue(); }catch(e){} }
    var ta = unitEl.querySelector("textarea");
    return ta ? ta.value : "";
  }
  function wireUnit(unitEl, runBtn, outEl, meta, insertAfterEl){
    if(unitEl.__cppWired) return;
    unitEl.__cppWired = true;

    // build + insert the panel
    var panel = document.createElement("div");
    panel.className = "cpp-wrap";
    var anchor = insertAfterEl || outEl || runBtn;
    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    } else {
      unitEl.appendChild(panel);
    }
    var u = { id: meta.slug, meta: meta, panel: panel, expanded:false };
    units.push(u);
    renderPanel(u);

    // observe the run button's disabled flag: true -> false == a run finished
    var wasDisabled = !!runBtn.disabled;
    var obs = new MutationObserver(function(){
      var now = !!runBtn.disabled;
      if(wasDisabled && !now){
        // run just completed — read the engine's own verdict
        var ok = !(outEl.classList.contains("err"));
        var text = (outEl.textContent || "").trim();
        var code = editorValue(unitEl);
        var rec = { q: code, ok: ok, msg: ok ? "" : text, t: Date.now() };
        if(pushAttempt(u.id, rec)){
          renderPanel(u);
          panel.classList.add("open");           // surface the freshly-logged try
          cloudRecord(meta, code, ok, text, ok ? text : "");
        }
      }
      wasDisabled = now;
    });
    obs.observe(runBtn, { attributes:true, attributeFilter:["disabled"] });
  }

  /* --------------------------------------------------- page-type detection */
  function gradedMeta(){
    // titles -> meta, decoded to match the rendered DOM text
    var META = {};
    ["basic-bank","problem-bank"].forEach(function(bid){
      var el=document.getElementById(bid); if(!el) return;
      var arr; try{ arr=JSON.parse(el.textContent); }catch(e){ return; }
      arr.forEach(function(x, i){
        var key = decodeEntities(x.title).trim();
        META[key] = {
          slug: x.id,
          title: decodeEntities(x.title).trim(),
          prompt: stripTags(decodeEntities(x.brief || x.concept || "")),
          expected: x.expected || "",
          starter: x.starter || x.solution || "",
          kind: x.brief ? "challenge" : "basic",
          order: i
        };
      });
    });
    return META;
  }
  function attachGraded(){
    var META = gradedMeta();
    function scan(){
      document.querySelectorAll(".sec").forEach(function(card){
        if(card.__cppWired) return;
        var runBtn = card.querySelector(".runbtn");
        var outEl  = card.querySelector(".out");
        var h      = card.querySelector(".sec-head h2");
        if(!runBtn || !outEl || !h) return;
        var title = (h.textContent||"").trim();
        var meta = META[title];
        if(!meta){
          // fallback: synthesize from the visible title
          meta = { slug: PAGE_ID+"_"+title.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""),
                   title:title, prompt:"", expected:"", starter:"", kind:"basic", order:0 };
        }
        var actions = card.querySelector(".ed-actions");
        wireUnit(card, runBtn, outEl, meta, actions || outEl);
      });
    }
    scan();
    ["basics","problems"].forEach(function(mid){
      var m=document.getElementById(mid); if(!m) return;
      new MutationObserver(function(){ scan(); }).observe(m, { childList:true, subtree:true });
    });
  }
  function nearestHeading(cellEl){
    var n = cellEl.previousElementSibling;
    while(n){
      if(n.classList && n.classList.contains("nbx-md")){
        var h = n.querySelector("h1,h2,h3,h4");
        if(h) return (h.textContent||"").replace(/^[\s\d#️⃣🔁🔟0-9\.\)]+/,"").trim() || (h.textContent||"").trim();
      }
      n = n.previousElementSibling;
    }
    return "";
  }
  function attachNotebook(){
    var cells = document.querySelectorAll(".nbx-cell");
    var prettyPage = PAGE_ID.replace(/^\d+_/, "").replace(/_/g," ");
    cells.forEach(function(cell, idx){
      if(cell.__cppWired) return;
      var runBtn = cell.querySelector(".nbx-run");
      var outEl  = cell.querySelector(".nbx-out");
      if(!runBtn || !outEl) return;
      var heading = nearestHeading(cell);
      var code0 = editorValue(cell);
      var meta = {
        slug: PAGE_ID+"_c"+idx,
        title: (heading ? heading : (prettyPage+" cell")) ,
        prompt: code0 ? ("Re-create the result of this cell:\n\n"+code0) : "",
        expected: "",
        starter: code0,
        kind: "notebook",
        order: idx
      };
      // panel goes right after the cell's bar+editor+out — append to the cell
      wireUnit(cell, runBtn, outEl, meta, outEl);
    });
  }

  function boot(){
    if(document.getElementById("basic-bank") || document.querySelector(".sec .runbtn")){
      attachGraded();
    } else if(document.querySelector(".nbx-cell")){
      attachNotebook();
    } else {
      // unknown layout — try the most generic thing: any run button + sibling output
      // (no-op if nothing matches)
    }
  }

  // the page builds its cards inside an IIFE on load; wait until DOM + a tick.
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(boot, 60); });
  } else {
    setTimeout(boot, 60);
  }
  // also retry shortly after, in case CodeMirror/late rendering delays cards
  setTimeout(boot, 600);
  window.addEventListener("load", function(){ setTimeout(boot, 50); });
})();
