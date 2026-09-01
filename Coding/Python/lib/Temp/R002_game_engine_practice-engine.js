/* practice-engine.js — reusable "Practice & Mistake Bank" panel.
 * Multi-instance factory ported from python-practice-section.js. Pyodide (CPython)
 * and the CSS are loaded ONCE and shared; every panel gets its own exercises,
 * localStorage store, DOM and mistake bank.
 *
 *   CommonplacePractice.mount({
 *     root:        <HTMLElement>,     // container to render into
 *     exercises:   [...],             // same shape as PY_PRACTICE_EX
 *     storePrefix: "commonplace_practice_fund",
 *     enginePillId:"fund-engine",     // the "CPython ready" pill in the section head
 *     countId:     "fund-count"       // the count chip in the section head
 *   });
 */
window.CommonplacePractice = (function () {
  "use strict";

  /* ===================== shared helpers ===================== */
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function localHl(code){
    var kw=/\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g;
    var bi=/\b(print|input|len|range|int|str|float|list|dict|set|tuple|bool|abs|sum|min|max|enumerate|zip|map|filter|sorted|open|type|isinstance|round|join|split)\b/g;
    var num=/\b(\d+\.?\d*)\b/g;
    function paint(t){ return esc(t).replace(kw,'<span class="t-kw">$1</span>').replace(bi,'<span class="t-bi">$1</span>').replace(num,'<span class="t-num">$1</span>'); }
    return String(code).split("\n").map(function(line){
      var re=/("""[\s\S]*?"""|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|#.*$)/g, html="", idx=0, m;
      while((m=re.exec(line))!==null){
        html+=paint(line.slice(idx,m.index));
        var tok=m[0];
        html+= tok.charAt(0)==="#" ? '<span class="t-com">'+esc(tok)+'</span>' : '<span class="t-str">'+esc(tok)+'</span>';
        idx=m.index+tok.length;
      }
      return html+paint(line.slice(idx));
    }).join("\n");
  }
  function hl(code){ return typeof window.highlightPy==="function" ? window.highlightPy(code) : localHl(code); }
  function normOut(s){ return String(s==null?"":s).replace(/\r/g,"").split("\n").map(function(l){return l.replace(/\s+$/g,"");}).join("\n").replace(/\n+$/g,""); }
  function onlyTraceback(e){ var l=String(e).trim().split("\n"); return l[l.length-1]||"error"; }
  function cap(s){ s=String(s||""); return s.charAt(0).toUpperCase()+s.slice(1); }
  function relTime(ts){
    var s=Math.max(0,Math.round((Date.now()-ts)/1000));
    if(s<45) return "just now";
    var m=Math.round(s/60); if(m<60) return m+" min ago";
    var h=Math.round(m/60); if(h<24) return h+"h ago";
    var d=Math.round(h/24); if(d<14) return d+"d ago";
    return new Date(ts).toLocaleDateString(undefined,{month:"short",day:"numeric"});
  }
  function dots(n){ var s=""; for(var i=1;i<=3;i++) s+='<span class="pmb-dot'+(i<=n?" on":"")+'"></span>'; return s; }

  var C={ brass:"#a98a4b", ok:"#2f8f5b", err:"#b3261e" };

  /* ===================== shared Pyodide engine ===================== */
  var PY_BASE="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  var py=null, pyState="idle", pyPromise=null, enginePills=[], engineSubs=[];
  var ENGINE_MAP={ idle:[C.brass,"CPython idle"], boot:[C.brass,"loading CPython…"], ready:[C.ok,"CPython ready"],
                   nodb:[C.err,"offline — connect to load Python"], err:[C.err,"engine failed to load"] };
  function applyPill(pill,state){
    var v=ENGINE_MAP[state]||ENGINE_MAP.idle;
    var dot=pill.querySelector(".pmb-led"), txt=pill.querySelector(".pmb-led-txt");
    if(dot) dot.style.background=v[0];
    if(txt) txt.textContent=v[1];
  }
  function setEngine(state){ pyState=state; enginePills.forEach(function(p){ applyPill(p,state); }); engineSubs.forEach(function(cb){ try{ cb(state); }catch(e){} }); }
  function registerPill(id){ if(!id) return; var p=document.getElementById(id); if(p && enginePills.indexOf(p)<0){ enginePills.push(p); applyPill(p,pyState); } }
  function loadScript(src){
    return new Promise(function(res,rej){
      if(document.querySelector('script[data-pmb="'+src+'"]')) return res();
      var s=document.createElement("script"); s.src=src; s.setAttribute("data-pmb",src);
      s.onload=res; s.onerror=function(){ rej(new Error("load fail")); };
      document.head.appendChild(s);
    });
  }
  function ensurePy(){
    if(pyState==="ready") return Promise.resolve(py);
    if(pyPromise) return pyPromise;
    setEngine("boot");
    pyPromise=(async function(){
      try{
        if(typeof window.loadPyodide!=="function") await loadScript(PY_BASE+"pyodide.js");
        py=await window.loadPyodide({ indexURL: PY_BASE });
        setEngine("ready"); return py;
      }catch(e){
        setEngine(navigator.onLine===false?"nodb":"err"); pyPromise=null; throw e;
      }
    })();
    return pyPromise;
  }
  async function runPy(code, feed){
    var harness="import sys, builtins, io\n__out = io.StringIO()\nsys.stdout = __out\n__feed = "+JSON.stringify(feed||[])+
      "\n__ii = [0]\ndef __inp(prompt=''):\n    if __ii[0] < len(__feed):\n        v = __feed[__ii[0]]; __ii[0] += 1; return v\n    return ''\nbuiltins.input = __inp\n";
    await py.runPythonAsync(harness);
    var err=null;
    try{
      try{ await py.loadPackagesFromImports(code); }catch(_){}   // pulls numpy/pandas on demand
      await py.runPythonAsync(code);
    }catch(e){ err=String(e.message||e); }
    var stdout=""; try{ stdout=py.runPython("__out.getvalue()"); }catch(_){}
    return { stdout:stdout, err:err };
  }
  function grade(ex,q){
    return runPy(q, ex.stdin).then(function(r){
      if(r.err){ var short=onlyTraceback(r.err); return {ok:false,output:{text:r.err,isErr:true},fbMsg:"✕ "+short,reason:short}; }
      var ok=normOut(r.stdout)===normOut(ex.expect);
      return {ok:ok, output:{text:r.stdout||"(no output)",isErr:false},
        fbMsg: ok?"✓ Correct — output matches the expected result.":"✕ Output doesn't match the expected result yet.",
        reason: ok?"":"wrong output"};
    });
  }

  /* ===================== shared editor ===================== */
  var PY_KW=["def ","for ","while ","if ","elif ","else:","in ","range(","return ","import ","not ","and ","or ","True","False","None"];
  var PY_BI=["print(","input(","len(","int(","str(","sum(","sorted(","enumerate(","\":\"","[]","{}","\"  \""];
  function insertAtCaret(ta, raw){
    if(!ta) return;
    var token=raw, back=0;
    if(token==='"  "'){ token='""'; back=1; }
    else if(token==="[]"||token==="{}"){ back=1; }
    var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value,before=v.slice(0,s);
    var needSpace=before.length && !/\s$/.test(before) && !/[(.\[]$/.test(before) && !/^[\s)\]:,]/.test(token);
    var ins=(needSpace?" ":"")+token;
    ta.value=before+ins+v.slice(e);
    ta.dispatchEvent(new Event("input",{bubbles:true}));
    ta.focus(); var p=s+ins.length-back; ta.setSelectionRange(p,p);
  }
  function makeEditor(ex, initialCode, onCodeChange, onCheck, placeholder){
    /* Compose Blocks replaces the flat textarea when compose-blocks.js is loaded */
    if(window.ComposeBlocks && window.ComposeBlocks.enabled){
      return window.ComposeBlocks.makeEditor(ex, initialCode, onCodeChange, onCheck, placeholder, { hl: hl, esc: esc });
    }
    var block=document.createElement("div"); block.className="pmb-edblock";
    var ta=document.createElement("textarea");
    ta.spellcheck=false; ta.setAttribute("autocapitalize","off"); ta.setAttribute("autocorrect","off"); ta.setAttribute("autocomplete","off");
    function tokBtn(t,kind){
      var b=document.createElement("button"); b.type="button"; b.className="pmb-tok pmb-tok-"+kind;
      b.textContent = t==='"  "' ? '" "' : t.trim();
      b.addEventListener("click",function(){ insertAtCaret(ta,t); });
      return b;
    }
    var tray=document.createElement("div"); tray.className="pmb-tray open";
    var toggle=document.createElement("button"); toggle.type="button"; toggle.className="pmb-keys-toggle";
    toggle.innerHTML='<span>⌨</span> <span class="pmb-kt-label">Hide keys</span> <span class="pmb-caret">⌃</span>';
    var rows=document.createElement("div"); rows.className="pmb-tray-rows";
    var rowK=document.createElement("div"); rowK.className="pmb-tok-row";
    var rowB=document.createElement("div"); rowB.className="pmb-tok-row";
    PY_KW.forEach(function(t){ rowK.appendChild(tokBtn(t,"kw")); });
    PY_BI.forEach(function(t){ rowB.appendChild(tokBtn(t,"bi")); });
    rows.appendChild(rowK); rows.appendChild(rowB);
    tray.appendChild(toggle); tray.appendChild(rows);
    toggle.addEventListener("click",function(){
      var open=tray.classList.toggle("open");
      toggle.querySelector(".pmb-kt-label").textContent= open?"Hide keys":"Insert keywords & builtins";
      toggle.querySelector(".pmb-caret").textContent= open?"⌃":"⌄";
    });

    var wrap=document.createElement("div"); wrap.className="pmb-edwrap";
    var pre=document.createElement("pre"); pre.className="pmb-hl"; pre.setAttribute("aria-hidden","true");
    var codeEl=document.createElement("code"); pre.appendChild(codeEl);
    ta.className="pmb-ta"; ta.spellcheck=false; ta.value=initialCode||"";
    wrap.appendChild(pre); wrap.appendChild(ta);
    function paint(){ var v=ta.value; codeEl.innerHTML = v ? hl(v)+"\n" : '<span class="pmb-ph">'+esc(placeholder||"")+'</span>'; }
    paint();
    ta.addEventListener("input",function(){ paint(); if(onCodeChange) onCodeChange(ta.value); });
    ta.addEventListener("scroll",function(){ pre.scrollTop=ta.scrollTop; pre.scrollLeft=ta.scrollLeft; });
    ta.addEventListener("keydown",function(e){
      if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){ e.preventDefault(); onCheck(); }
      if(e.key==="Escape"&&api.isFull) setFull(false);
    });

    var controls=document.createElement("div"); controls.className="pmb-controls";
    var runBtn=document.createElement("button"); runBtn.type="button"; runBtn.className="pmb-btn pmb-btn-run"; runBtn.textContent="▶ Run & Check";
    var fullBtn=document.createElement("button"); fullBtn.type="button"; fullBtn.className="pmb-btn pmb-btn-ghost"; fullBtn.textContent="⤢ Fullscreen";
    controls.appendChild(runBtn); controls.appendChild(fullBtn);
    if(ex.stdin&&ex.stdin.length){ var si=document.createElement("span"); si.className="pmb-stdin"; si.innerHTML='sample input: <span>'+esc(ex.stdin.join(" ⏎ "))+'</span>'; controls.appendChild(si); }
    runBtn.addEventListener("click",onCheck);
    fullBtn.addEventListener("click",function(){ setFull(!api.isFull); });
    block.appendChild(tray); block.appendChild(wrap); block.appendChild(controls);

    var fb=document.createElement("div"); fb.className="pmb-fb"; fb.style.display="none";
    var out=document.createElement("div"); out.className="pmb-out"; out.style.display="none";

    var api={ block:block, ta:ta, fb:fb, out:out, isFull:false, setRunning:setRunning, showFeedback:showFeedback, showOutput:showOutput };
    var overlay=null, relocations=[];
    function relocate(node,parent){ var ph=document.createComment("pmb"); node.parentNode.insertBefore(ph,node); parent.appendChild(node); relocations.push({node:node,ph:ph}); }
    function restoreAll(){ relocations.forEach(function(r){ r.ph.parentNode.insertBefore(r.node,r.ph); r.ph.parentNode.removeChild(r.ph); }); relocations=[]; }
    function setFull(on){
      if(on===api.isFull) return;
      if(on){
        overlay=document.createElement("div"); overlay.className="pmb-full";
        var head=document.createElement("div"); head.className="pmb-full-head";
        head.innerHTML='<span class="pmb-full-kick">Editor · fullscreen</span>';
        var exit=document.createElement("button"); exit.type="button"; exit.className="pmb-btn pmb-btn-ghost pmb-full-exit"; exit.textContent="✕ Exit (Esc)";
        exit.addEventListener("click",function(){ setFull(false); }); head.appendChild(exit);
        var q=document.createElement("div"); q.className="pmb-full-q";
        q.innerHTML='<div class="pmb-full-qhead"><span class="pmb-badge">'+esc((ex.id||"").toUpperCase())+'</span><span class="pmb-full-qtitle">'+esc(ex.title||"")+'</span></div><p class="pmb-full-prompt">'+(ex.prompt||"")+'</p>';
        var body=document.createElement("div"); body.className="pmb-full-body";
        overlay.appendChild(head); overlay.appendChild(q); overlay.appendChild(body);
        document.body.appendChild(overlay);
        relocate(block,body); relocate(fb,body); relocate(out,body);
        document.body.style.overflow="hidden"; fullBtn.textContent="✕ Exit fullscreen  (Esc)"; api.isFull=true; ta.focus();
      } else {
        restoreAll(); if(overlay){ overlay.parentNode.removeChild(overlay); overlay=null; }
        document.body.style.overflow=""; fullBtn.textContent="⤢ Fullscreen"; api.isFull=false;
      }
    }
    function setRunning(on){ runBtn.disabled=on; runBtn.textContent=on?"Running…":"▶ Run & Check"; }
    function showFeedback(ok,msg){ if(msg==null){ fb.style.display="none"; return; } fb.style.display=""; fb.className="pmb-fb "+(ok?"ok":"err"); fb.textContent=msg; }
    function showOutput(o){ if(!o){ out.style.display="none"; return; } out.style.display=""; out.innerHTML='<div class="pmb-out-label">Output</div><pre class="pmb-out-pre'+(o.isErr?" err":"")+'">'+esc(o.text)+'</pre>'; }
    return api;
  }

  /* ===================== per-instance mount ===================== */
  var PANELS = [];   // registry of mounted practice panels, read by the Mistake Bank
  function makeStore(P){
    function ls(k,d){ try{ return JSON.parse(localStorage.getItem(k)||d); }catch(e){ return JSON.parse(d); } }
    return {
      att: ls(P+"_attempts","{}"),
      code: ls(P+"_code","{}"),
      solved: ls(P+"_solved","{}"),
      bank: ls(P+"_bank","{}"),
      saveAtt:function(){ try{ localStorage.setItem(P+"_attempts",JSON.stringify(this.att)); }catch(e){} },
      saveCode:function(){ try{ localStorage.setItem(P+"_code",JSON.stringify(this.code)); }catch(e){} },
      persist:function(){ try{ localStorage.setItem(P+"_solved",JSON.stringify(this.solved)); localStorage.setItem(P+"_bank",JSON.stringify(this.bank)); }catch(e){} },
      logAttempt:function(ex,q,ok,msg){ var arr=this.att[ex.id]||(this.att[ex.id]=[]); var last=arr[arr.length-1]; if(!(last&&last.q===q&&last.ok===ok)){ arr.push({q:q,ok:ok,msg:msg,t:Date.now()}); if(arr.length>25) arr.shift(); this.saveAtt(); } },
      markSolved:function(id){ this.solved[id]=true; this.persist(); },
      bankAttempt:function(ex,a){ a.saved=true; this.saveAtt(); var key=ex.id+":"+a.t; this.bank[key]={key:key,exId:ex.id,sec:ex.sec,title:ex.title,reason:cap(a.msg||"wrong output"),resolved:false,t:a.t}; this.persist(); },
      bankByKey:function(key){ return this.bank[key]; },
      resolveMistake:function(key){ if(this.bank[key]&&!this.bank[key].resolved){ this.bank[key].resolved=true; this.persist(); if(window.GameLayer) window.GameLayer.onMistakeFixed(); } },
      bankedList:function(){ var o=this.bank,a=[]; for(var k in o) if(o.hasOwnProperty(k)) a.push(o[k]); return a.sort(function(x,y){return x.t-y.t;}); }
    };
  }

  function mount(cfg){
    injectCss();
    var root=cfg.root; if(!root) return;
    root.classList.add("pmb-root");
    var EX=cfg.exercises||[];
    if(!EX.length){ root.innerHTML='<div class="pmb-drill-empty"><div class="pmb-drill-empty-k">No exercises</div><p>This panel has no problems wired up yet.</p></div>'; return; }
    registerPill(cfg.enginePillId);
    var store=makeStore(cfg.storePrefix);
    PANELS = PANELS.filter(function(p){ return p.storePrefix !== cfg.storePrefix; });
    PANELS.push({ label: cfg.label || cfg.storePrefix, storePrefix: cfg.storePrefix, exercises: EX, store: store });
    var els={};
    var activeId=null, allDone=false;
    var drillMode="list", drillQueue=[], drillIdx=0;

    function computeAllDone(){ allDone=EX.every(function(e){return !!store.solved[e.id];}); return allDone; }
    function makeNextBtn(){ var b=document.createElement("button"); b.type="button"; b.className="pmb-next"; b.textContent="Next →"; b.addEventListener("click",function(){
      var prev=els.card?els.card.querySelector(".pmb-card"):null;
      var wasFull=!!(prev&&prev._ed&&prev._ed.isFull);
      if(wasFull&&prev._ed.setFull) prev._ed.setFull(false);
      advance();
      if(wasFull){ var nc=els.card?els.card.querySelector(".pmb-card"):null; if(nc&&nc._ed&&nc._ed.setFull) nc._ed.setFull(true); }
    }); return b; }

    function renderCard(){
      var ex=EX.filter(function(e){return e.id===activeId;})[0]||EX[0];
      var solved=!!store.solved[ex.id];
      var host=els.card; host.innerHTML="";
      var card=document.createElement("div"); card.className="pmb-card"+(solved?" pmb-done":"");
      var head=document.createElement("div"); head.className="pmb-card-head";
      head.innerHTML='<span class="pmb-badge'+(solved?" ok":"")+'">'+esc(ex.id.toUpperCase())+'</span>'
        +'<span class="pmb-card-title">'+esc(ex.title)+'</span>'
        +'<span class="pmb-sec">'+esc(String(ex.sec).replace(/:.*/,""))+'</span>'
        +'<span class="pmb-dots">'+dots(ex.diff)+'</span>'+(solved?'<span class="pmb-chk">✓</span>':'');
      card.appendChild(head);
      var prompt=document.createElement("p"); prompt.className="pmb-prompt"; prompt.innerHTML=ex.prompt; card.appendChild(prompt);

      var ed=makeEditor(ex, store.code[ex.id]||"",
        function(v){ store.code[ex.id]=v; store.saveCode(); },
        function(){ check(ex,card,ed); }, "Write your Python here…  ⌘/Ctrl + Enter to run");
      card.appendChild(ed.block);

      var hr=document.createElement("div"); hr.className="pmb-hr";
      var hintB=document.createElement("button"); hintB.type="button"; hintB.className="pmb-btn pmb-btn-ghost"; hintB.textContent="Hint";
      var revB=document.createElement("button"); revB.type="button"; revB.className="pmb-btn pmb-btn-ghost"; revB.textContent="Reveal answer";
      hr.appendChild(hintB); hr.appendChild(revB); card.appendChild(hr);
      var hintBox=document.createElement("div"); hintBox.className="pmb-hint"; hintBox.style.display="none"; hintBox.textContent=ex.hint||""; card.appendChild(hintBox);
      var revBox=document.createElement("pre"); revBox.className="pmb-reveal"; revBox.style.display="none"; revBox.innerHTML=hl(ex.sol); card.appendChild(revBox);
      hintB.addEventListener("click",function(){ var o=hintBox.style.display==="none"; hintBox.style.display=o?"":"none"; hintB.textContent=o?"Hide hint":"Hint"; });
      revB.addEventListener("click",function(){ var o=revBox.style.display==="none"; revBox.style.display=o?"":"none"; revB.textContent=o?"Hide answer":"Reveal answer"; });

      card.appendChild(ed.fb); card.appendChild(ed.out);
      var nextWrap=document.createElement("div"); nextWrap.className="pmb-next-wrap"; card.appendChild(nextWrap);
      if(solved && !computeAllDone()) nextWrap.appendChild(makeNextBtn());
      var att=document.createElement("div"); att.className="pmb-att"; card.appendChild(att);

      card._ed=ed; card._next=nextWrap; card._att=att; card._ex=ex;
      renderAttempts(card);
      if((store.att[ex.id]||[]).length) att.classList.add("open");
      host.appendChild(card);
    }

    function advance(){
      var idx=-1,i; for(i=0;i<EX.length;i++) if(EX[i].id===activeId){ idx=i; break; }
      for(var k=1;k<=EX.length;k++){ var e=EX[(idx+k)%EX.length]; if(!store.solved[e.id]){ activeId=e.id; renderCard(); renderTabs(true); scrollToTabs(); return; } }
      renderCard(); renderTabs();
    }

    function check(ex,card,ed){
      var q=(ed.ta.value||"").trim();
      if(!q){ ed.showFeedback(false,"Write some code first."); return; }
      if(pyState!=="ready"){
        if(pyState==="nodb"||pyState==="err"){ ed.showFeedback(false,"Python engine offline — connect to the internet to run."); return; }
        ed.setRunning(true); ed.showFeedback(false,"Loading CPython (~10 MB)…");
        ensurePy().then(function(){ ed.showFeedback(null); doCheck(ex,card,ed,q); })
                  .catch(function(){ ed.setRunning(false); ed.showFeedback(false,"Python engine offline — connect to the internet to run."); });
        return;
      }
      doCheck(ex,card,ed,q);
    }
    function doCheck(ex,card,ed,q){
      ed.setRunning(true); ed.showFeedback(null);
      grade(ex,q).then(function(res){
        ed.setRunning(false); ed.showOutput(res.output); ed.showFeedback(res.ok,res.fbMsg);
        store.logAttempt(ex,q,res.ok,res.reason);
        if(window.GameLayer) window.GameLayer.onRun(cfg.storePrefix, ex.id, res.ok);
        if(res.ok && !store.solved[ex.id]){
          store.markSolved(ex.id);
          card.classList.add("pmb-done");
          var badge=card.querySelector(".pmb-badge"); if(badge) badge.classList.add("ok");
          if(!card.querySelector(".pmb-chk")){ var c=document.createElement("span"); c.className="pmb-chk"; c.textContent="✓"; card.querySelector(".pmb-card-head").appendChild(c); }
          card._next.innerHTML=""; if(!computeAllDone()) card._next.appendChild(makeNextBtn());
          renderTabs(); renderProgress();
        }
        card._att.classList.add("open"); renderAttempts(card);
      });
    }

    function renderAttempts(card){
      var ex=card._ex, panel=card._att;
      var list=(store.att[ex.id]||[]).slice().reverse();
      var tries=list.length, showAll=panel._showAll, shown=showAll?list:list.slice(0,4);
      var head='<div class="pmb-att-head"><span class="pmb-att-ico">↻</span> Your attempts <span class="pmb-att-count">'+(tries===0?"none yet":tries+(tries===1?" try":" tries"))+'</span><span class="pmb-att-caret">▾</span></div>';
      var body;
      if(tries===0){ body='<div class="pmb-att-empty">No attempts yet — hit Run &amp; Check and your trail builds here.</div>'; }
      else {
        body=shown.map(function(a,i){
          var save=a.ok?"":(a.saved
            ? '<button class="pmb-att-save saved" type="button" disabled>Saved to bank ✓</button>'
            : '<button class="pmb-att-save" type="button" data-i="'+i+'">Save to bank</button>');
          return '<div class="pmb-att-row"><span class="pmb-att-badge '+(a.ok?"ok":"bad")+'">'+(a.ok?"✓":"✕")+'</span>'
            +'<div class="pmb-att-main"><pre class="pmb-att-q">'+hl(a.q)+'</pre>'
            +'<div class="pmb-att-reason '+(a.ok?"ok":"bad")+'">'+(a.ok?"solved":esc(a.msg||"wrong output"))+'</div>'+save+'</div>'
            +'<span class="pmb-att-when">'+relTime(a.t)+'</span></div>';
        }).join("");
        var extra=list.length-shown.length;
        if(extra>0 && !showAll) body+='<button class="pmb-att-more" type="button">+ '+extra+" earlier "+(extra===1?"attempt":"attempts")+'</button>';
      }
      panel.innerHTML=head+'<div class="pmb-att-list">'+body+'</div>';
      panel.querySelector(".pmb-att-head").addEventListener("click",function(){ panel.classList.toggle("open"); });
      var more=panel.querySelector(".pmb-att-more"); if(more) more.addEventListener("click",function(){ panel._showAll=true; renderAttempts(card); });
      Array.prototype.forEach.call(panel.querySelectorAll(".pmb-att-save:not([disabled])"),function(btn){
        btn.addEventListener("click",function(){ var a=shown[parseInt(btn.getAttribute("data-i"),10)]; if(!a||a.saved) return; store.bankAttempt(ex,a); renderAttempts(card); renderDrill(); });
      });
    }

    function renderTabs(scroll){
      var host=els.tabs; computeAllDone();
      var tabs= allDone ? EX : EX.filter(function(e){ return !store.solved[e.id] || e.id===activeId; });
      var track=tabs.map(function(e){
        var isA=e.id===activeId, isD=!!store.solved[e.id];
        return '<button class="pmb-tab'+(isA?" active":"")+'" data-id="'+esc(e.id)+'"><span class="pmb-tab-id">'+esc(e.id.toUpperCase())+'</span><span class="pmb-tab-t">'+esc(e.title)+'</span>'+(isD?'<span class="pmb-tab-chk">✓</span>':'')+'</button>';
      }).join("");
      host.innerHTML='<span class="pmb-tabs-label">'+(allDone?"all solved":"remaining")+'</span><div class="pmb-tabs-track">'+track+'</div>';
      Array.prototype.forEach.call(host.querySelectorAll(".pmb-tab"),function(b){
        b.addEventListener("click",function(){ activeId=b.getAttribute("data-id"); renderCard(); renderTabs(true); });
      });
      if(scroll){ var a=host.querySelector(".pmb-tab.active"); if(a&&a.scrollIntoView) a.scrollIntoView({block:"nearest",inline:"center"}); }
    }

    function renderProgress(){
      var total=EX.length,done=0; EX.forEach(function(e){ if(store.solved[e.id]) done++; });
      var pct=total?Math.round(done/total*100):0;
      els.progress.innerHTML='<div class="pmb-progbar"><div class="pmb-progfill" style="width:'+pct+'%"></div></div><span class="pmb-progtext">'+done+" / "+total+" solved</span>";
    }
    function scrollToTabs(){ var t=els.tabs; if(t){ window.scrollTo({top:t.getBoundingClientRect().top+window.scrollY-8,behavior:"smooth"}); } }

    /* ---------- Mistake Drill ---------- */
    function renderDrill(){
      if(!els.drill) return;
      var host=els.drill; var banked=store.bankedList();
      var chip=els.drillCount; if(chip) chip.textContent=banked.filter(function(b){return !b.resolved;}).length+" to drill";
      if(banked.length===0){ drillMode="list"; host.innerHTML='<div class="pmb-drill-empty"><div class="pmb-drill-empty-k">Nothing banked yet</div><p>When you fail a problem above and tap <b>Save to bank</b>, it lands here as a mistake to re-drill — your own quiz, solved again by hand until it sticks.</p></div>'; return; }
      if(drillMode==="drill"){ renderDrillCard(); return; }
      if(drillMode==="done"){ host.innerHTML='<div class="pmb-drill-done"><div class="pmb-drill-done-ico">✓</div><h3>Drill complete</h3><p>You worked back through '+drillQueue.length+' banked '+(drillQueue.length===1?"mistake":"mistakes")+'.</p><button type="button" class="pmb-btn pmb-btn-go pmb-drill-back">Back to the bank</button></div>'; host.querySelector(".pmb-drill-back").addEventListener("click",function(){ drillMode="list"; renderDrill(); }); return; }
      var unresolved=banked.filter(function(b){return !b.resolved;});
      var rows=banked.map(function(b){
        return '<div class="pmb-bank-row'+(b.resolved?" resolved":"")+'"><span class="pmb-badge">'+esc(b.exId.toUpperCase())+'</span>'
          +'<div class="pmb-bank-main"><div class="pmb-bank-title">'+esc(b.title)+'</div><div class="pmb-bank-reason"><span class="pmb-bank-dot"></span>'+esc(b.reason)+'</div></div>'
          +(b.resolved?'<span class="pmb-bank-res">resolved ✓</span>':'<button type="button" class="pmb-btn pmb-btn-ghost pmb-bank-drill" data-key="'+esc(b.key)+'">Drill →</button>')+'</div>';
      }).join("");
      host.innerHTML='<div class="pmb-drill-bar"><button type="button" class="pmb-btn pmb-btn-go pmb-drill-start"'+(unresolved.length?"":" disabled")+'>▶ Start drill · '+unresolved.length+'</button><span class="pmb-drill-meta">'+banked.length+" banked · "+(banked.length-unresolved.length)+' resolved</span></div><div class="pmb-bank-list">'+rows+'</div>';
      var sB=host.querySelector(".pmb-drill-start"); if(sB) sB.addEventListener("click",function(){ var q=unresolved.map(function(b){return b.key;}); if(!q.length) return; drillQueue=q; drillIdx=0; drillMode="drill"; renderDrill(); });
      Array.prototype.forEach.call(host.querySelectorAll(".pmb-bank-drill"),function(btn){ btn.addEventListener("click",function(){ drillQueue=[btn.getAttribute("data-key")]; drillIdx=0; drillMode="drill"; renderDrill(); }); });
    }
    function renderDrillCard(){
      var host=els.drill; var b=store.bankByKey(drillQueue[drillIdx]);
      if(!b){ drillMode="list"; renderDrill(); return; }
      var ex=EX.filter(function(e){return e.id===b.exId;})[0]||{};
      host.innerHTML="";
      var card=document.createElement("div"); card.className="pmb-drillcard";
      var bar=document.createElement("div"); bar.className="pmb-drill-head2";
      bar.innerHTML='<span class="pmb-drill-kick">Mistake Drill</span><span class="pmb-drill-idx">'+(drillIdx+1)+" / "+drillQueue.length+'</span>';
      var quit=document.createElement("button"); quit.type="button"; quit.className="pmb-btn pmb-btn-ghost pmb-drill-quit"; quit.textContent="Quit";
      quit.addEventListener("click",function(){ drillMode="list"; renderDrill(); }); bar.appendChild(quit); card.appendChild(bar);
      var bodyW=document.createElement("div"); bodyW.className="pmb-drillcard-body";
      bodyW.innerHTML='<div class="pmb-drill-q"><span class="pmb-badge">'+esc(b.exId.toUpperCase())+'</span><span class="pmb-drill-qtitle">'+esc(b.title)+'</span></div><p class="pmb-prompt">'+(ex.prompt||"")+'</p><div class="pmb-drill-missed"><span class="pmb-bank-dot"></span>you missed this before: '+esc(b.reason)+'</div>';
      card.appendChild(bodyW);
      var ed=makeEditor(ex, "", null, function(){ drillCheck(ex,b,ed,doneWrap); }, "Solve it yourself this time…");
      bodyW.appendChild(ed.block);
      var doneWrap=document.createElement("div"); doneWrap.className="pmb-drill-next"; bodyW.appendChild(doneWrap);
      bodyW.appendChild(ed.fb); bodyW.appendChild(ed.out);
      host.appendChild(card);
    }
    function drillCheck(ex,b,ed,doneWrap){
      var q=(ed.ta.value||"").trim();
      if(!q){ ed.showFeedback(false,"Write some code first."); return; }
      if(pyState!=="ready"){
        if(pyState==="nodb"||pyState==="err"){ ed.showFeedback(false,"Python engine offline — connect to the internet to run."); return; }
        ed.setRunning(true); ed.showFeedback(false,"Loading CPython (~10 MB)…");
        ensurePy().then(function(){ ed.showFeedback(null); drillDo(ex,b,ed,doneWrap,q); })
                  .catch(function(){ ed.setRunning(false); ed.showFeedback(false,"Python engine offline — connect to the internet to run."); });
        return;
      }
      drillDo(ex,b,ed,doneWrap,q);
    }
    function drillDo(ex,b,ed,doneWrap,q){
      ed.setRunning(true); ed.showFeedback(null);
      grade(ex,q).then(function(res){
        ed.setRunning(false); ed.showOutput(res.output);
        if(res.ok){
          ed.showFeedback(true,"✓ Fixed! This mistake is cleared from the bank."); store.resolveMistake(b.key);
          var nb=document.createElement("button"); nb.type="button"; nb.className="pmb-btn pmb-btn-go";
          nb.textContent=(drillIdx+1<drillQueue.length)?"Next mistake →":"Finish drill ✓";
          nb.addEventListener("click",function(){ if(drillIdx+1<drillQueue.length){ drillIdx++; renderDrill(); } else { drillMode="done"; renderDrill(); } });
          doneWrap.innerHTML=""; doneWrap.appendChild(nb);
        } else { ed.showFeedback(false,"✕ Not yet — "+b.reason+". Adjust and run again."); }
      });
    }

    /* ---------- skeleton + boot ---------- */
    function buildSkeleton(){
      var drill = cfg.hideDrill ? "" : '<div class="pmb-drill-section"><div class="pmb-drill-title"><h3>Mistake Drill</h3><span class="pmb-drill-chip">0 to drill</span></div><div class="pmb-drill-body"></div></div>';
      root.innerHTML='<div class="pmb-progress"></div><div class="pmb-tabs"></div><div class="pmb-card-host"></div>'
        + drill
        +'<p class="pmb-foot">Runs real CPython in your browser via Pyodide (first run downloads ~10&nbsp;MB). Your solved state, attempts and mistake bank are saved on this device (localStorage).</p>';
      els.progress=root.querySelector(".pmb-progress");
      els.tabs=root.querySelector(".pmb-tabs");
      els.card=root.querySelector(".pmb-card-host");
      els.drill=root.querySelector(".pmb-drill-body");
      els.drillCount=root.querySelector(".pmb-drill-chip");
    }
    function boot(){
      var cnt=document.getElementById(cfg.countId); if(cnt) cnt.textContent=EX.length;
      buildSkeleton();
      var first=EX.filter(function(e){return !store.solved[e.id];})[0]||EX[0]; activeId=first.id;
      renderProgress(); renderTabs(); renderCard(); renderDrill();
    }
    boot();
    return { boot:boot };
  }

  /* ===================== Mistake Bank (aggregates every panel) ===================== */
  function mountBank(cfg){
    injectCss();
    var root=cfg.root; if(!root) return;
    root.classList.add("pmb-root");
    registerPill(cfg.enginePillId);
    var mode="list", queue=[], idx=0;

    function entries(){ var out=[]; PANELS.forEach(function(p){ p.store.bankedList().forEach(function(it){ out.push({p:p, it:it}); }); }); return out; }
    function unresolved(){ return entries().filter(function(x){ return !x.it.resolved; }); }
    function exOf(p, id){ return (p.exercises||[]).filter(function(e){return e.id===id;})[0]||{}; }
    function setChips(){
      var u=unresolved().length, all=entries().length;
      var c=document.getElementById(cfg.countId); if(c) c.textContent=u;
      var t=document.getElementById(cfg.totalChipId); if(t){ if(u){ t.hidden=false; t.textContent=u; } else { t.hidden=true; } }
      return { u:u, all:all };
    }
    function rowHtml(x){
      var it=x.it;
      return '<div class="pmb-bank-row'+(it.resolved?' resolved':'')+'"><span class="pmb-badge">'+esc(it.exId.toUpperCase())+'</span>'
        +'<div class="pmb-bank-main"><div class="pmb-bank-title">'+esc(it.title)+'</div><div class="pmb-bank-reason"><span class="pmb-bank-dot"></span>'+esc(it.reason)+'</div></div>'
        +(it.resolved?'<span class="pmb-bank-res">resolved \u2713</span>':'<button type="button" class="pmb-btn pmb-btn-ghost bank-drill" data-prefix="'+esc(x.p.storePrefix)+'" data-key="'+esc(it.key)+'">Drill \u2192</button>')+'</div>';
    }
    function startQueue(list){ if(!list.length) return; queue=list.map(function(x){return {prefix:x.p.storePrefix,key:x.it.key};}); idx=0; mode="drill"; render(); }
    function next(){ if(idx+1<queue.length){ idx++; render(); } else { mode="done"; render(); } }

    function render(){
      var st=setChips();
      if(mode==="drill"){ renderDrill(); return; }
      if(mode==="done"){
        root.innerHTML='<div class="pmb-drill-done"><div class="pmb-drill-done-ico">\u2713</div><h3>Bank cleared for now</h3><p>You worked back through '+queue.length+' banked '+(queue.length===1?'mistake':'mistakes')+'.</p><button type="button" class="pmb-btn pmb-btn-go bank-back">Back to the bank</button></div>';
        root.querySelector(".bank-back").addEventListener("click",function(){ mode="list"; render(); }); return;
      }
      if(st.all===0){ root.innerHTML='<div class="pmb-drill-empty"><div class="pmb-drill-empty-k">Nothing banked yet</div><p>Head to the <b>Practice</b> tab. When you miss a problem and tap <b>Save to bank</b>, it lands here grouped by section \u2014 your own quiz to re-solve until it sticks.</p></div>'; return; }
      var un=unresolved();
      var feat = window.__bankFeatured || [];
      var bar='<div class="pmb-drill-bar"><button type="button" class="pmb-btn pmb-btn-go bank-start-all"'+(un.length?'':' disabled')+'>\u25B6 Drill all \u00b7 '+un.length+'</button><span class="pmb-drill-meta">'+st.all+' banked \u00b7 '+(st.all-un.length)+' resolved</span></div>';
      var secs=PANELS.map(function(p){ return {p:p, items:p.store.bankedList()}; }).filter(function(g){ return g.items.length; }).map(function(g){
        var rows=g.items.map(function(it){ return rowHtml({p:g.p, it:it}); }).join('');
        var gUn=g.items.filter(function(it){return !it.resolved;}).length;
        var isFeat = feat.indexOf(g.p.storePrefix)>=0;
        var collapsed = isFeat ? '' : ' collapsed';
        return '<div class="hd-group'+collapsed+'" data-prefix="'+esc(g.p.storePrefix)+'"><div class="hd-group-head"><h3>'+esc(g.p.label)+'</h3>'
          +(isFeat?'<span class="sec-today-badge">Today</span>':'')+'<span class="hd-group-count">'+gUn+' to drill</span>'
          +'<button type="button" class="pmb-btn pmb-btn-ghost bank-start-group" data-prefix="'+esc(g.p.storePrefix)+'"'+(gUn?'':' disabled')+'>Drill section \u2192</button>'
          +'<span class="sec-caret hd-caret">\u25BE</span></div>'
          +'<div class="pmb-bank-list">'+rows+'</div></div>';
      }).join('');
      root.innerHTML=bar+secs;
      Array.prototype.forEach.call(root.querySelectorAll(".hd-group-head"),function(h){ h.addEventListener("click",function(e){ if(e.target.closest("button")) return; h.parentNode.classList.toggle("collapsed"); }); });
      var sa=root.querySelector(".bank-start-all"); if(sa) sa.addEventListener("click",function(){ startQueue(unresolved()); });
      Array.prototype.forEach.call(root.querySelectorAll(".bank-start-group"),function(b){ b.addEventListener("click",function(){ var pf=b.getAttribute("data-prefix"); startQueue(unresolved().filter(function(x){return x.p.storePrefix===pf;})); }); });
      Array.prototype.forEach.call(root.querySelectorAll(".bank-drill"),function(b){ b.addEventListener("click",function(){ var pf=b.getAttribute("data-prefix"), key=b.getAttribute("data-key"); startQueue(entries().filter(function(x){return x.p.storePrefix===pf && x.it.key===key;})); }); });
    }

    function renderDrill(){
      var cur=queue[idx]; if(!cur){ mode="list"; render(); return; }
      var panel=PANELS.filter(function(p){return p.storePrefix===cur.prefix;})[0];
      if(!panel){ mode="list"; render(); return; }
      var b=panel.store.bankByKey(cur.key); if(!b){ next(); return; }
      var ex=exOf(panel, b.exId);
      root.innerHTML="";
      var card=document.createElement("div"); card.className="pmb-drillcard";
      var bar=document.createElement("div"); bar.className="pmb-drill-head2";
      bar.innerHTML='<span class="pmb-drill-kick">'+esc(panel.label)+' \u00b7 Mistake Drill</span><span class="pmb-drill-idx">'+(idx+1)+" / "+queue.length+'</span>';
      var quit=document.createElement("button"); quit.type="button"; quit.className="pmb-btn pmb-btn-ghost pmb-drill-quit"; quit.textContent="Quit";
      quit.addEventListener("click",function(){ mode="list"; render(); }); bar.appendChild(quit); card.appendChild(bar);
      var body=document.createElement("div"); body.className="pmb-drillcard-body";
      body.innerHTML='<div class="pmb-drill-q"><span class="pmb-badge">'+esc(b.exId.toUpperCase())+'</span><span class="pmb-drill-qtitle">'+esc(b.title)+'</span></div><p class="pmb-prompt">'+(ex.prompt||"")+'</p><div class="pmb-drill-missed"><span class="pmb-bank-dot"></span>you missed this before: '+esc(b.reason)+'</div>';
      card.appendChild(body);
      var ed=makeEditor(ex, "", null, function(){ checkDrill(panel, b, ex, ed, doneWrap); }, "Solve it yourself this time\u2026");
      body.appendChild(ed.block);
      var doneWrap=document.createElement("div"); doneWrap.className="pmb-drill-next"; body.appendChild(doneWrap);
      body.appendChild(ed.fb); body.appendChild(ed.out);
      root.appendChild(card);
    }
    function checkDrill(panel,b,ex,ed,doneWrap){
      var q=(ed.ta.value||"").trim();
      if(!q){ ed.showFeedback(false,"Write some code first."); return; }
      if(pyState!=="ready"){
        if(pyState==="nodb"||pyState==="err"){ ed.showFeedback(false,"Python engine offline \u2014 connect to the internet to run."); return; }
        ed.setRunning(true); ed.showFeedback(false,"Loading CPython (~10 MB)\u2026");
        ensurePy().then(function(){ ed.showFeedback(null); doDrill(panel,b,ex,ed,doneWrap,q); }).catch(function(){ ed.setRunning(false); ed.showFeedback(false,"Python engine offline \u2014 connect to the internet to run."); });
        return;
      }
      doDrill(panel,b,ex,ed,doneWrap,q);
    }
    function doDrill(panel,b,ex,ed,doneWrap,q){
      ed.setRunning(true); ed.showFeedback(null);
      grade(ex,q).then(function(res){
        ed.setRunning(false); ed.showOutput(res.output);
        if(res.ok){
          ed.showFeedback(true,"\u2713 Fixed! This mistake is cleared from the bank."); panel.store.resolveMistake(b.key); setChips();
          var nb=document.createElement("button"); nb.type="button"; nb.className="pmb-btn pmb-btn-go";
          nb.textContent=(idx+1<queue.length)?"Next mistake \u2192":"Finish \u2713";
          nb.addEventListener("click",next); doneWrap.innerHTML=""; doneWrap.appendChild(nb);
        } else { ed.showFeedback(false,"\u2715 Not yet \u2014 "+b.reason+". Adjust and run again."); }
      });
    }

    render();
    return { render: render };
  }

  /* ===================== shared CSS (injected once) ===================== */
  function injectCss(){
    if(document.getElementById("pmb-style")) return;
    var css=[
".pmb-root{font-size:17px;}",
".pmb-engine{display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#2f6b4f;background:#dde7dd;border:1px solid #7fa68b;border-radius:999px;padding:2px 9px;}",
".pmb-led{width:7px;height:7px;border-radius:50%;background:#a98a4b;}",
".pmb-progress{display:flex;align-items:center;gap:14px;margin:6px 0 18px;}",
".pmb-progbar{flex:1;height:9px;background:#f4f5ec;border:1px solid #d2dacb;border-radius:6px;overflow:hidden;}",
".pmb-progfill{height:100%;background:#2f6b4f;transition:width .3s;}",
".pmb-progtext{font-family:'JetBrains Mono',monospace;font-size:12px;color:#41564a;white-space:nowrap;}",
".pmb-tabs{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:12px;background:rgba(236,238,228,.92);backdrop-filter:blur(8px);border-top:1px solid #cdbfa3;border-bottom:1px solid #cdbfa3;margin:0 0 18px;}",
".pmb-tabs-label{flex:0 0 auto;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#7a8c80;}",
".pmb-tabs-track{display:flex;gap:8px;overflow-x:auto;padding:9px 0;}",
".pmb-tab{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:20px;cursor:pointer;max-width:240px;font-family:'JetBrains Mono',monospace;border:1px solid #cdbfa3;background:#fbfcf6;}",
".pmb-tab-id{font-size:11px;font-weight:700;color:#2f6b4f;flex:0 0 auto;}",
".pmb-tab-t{font-size:12.5px;color:#41564a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
".pmb-tab.active{background:#211b13;border-color:#211b13;}.pmb-tab.active .pmb-tab-id{color:#fff;}.pmb-tab.active .pmb-tab-t{color:#efe7d6;}",
".pmb-tab-chk{color:#2f8f5b;font-size:11px;}.pmb-tab.active .pmb-tab-chk{color:#8fe0b0;}",
"@media(max-width:680px){.pmb-tabs-label{display:none;}}",
".pmb-card{background:#fbfcf6;border:1px solid #d2dacb;border-radius:11px;padding:16px 18px;}",
".pmb-card.pmb-done{border-color:#2f8f5b;box-shadow:inset 3px 0 0 #2f8f5b;}",
".pmb-card-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}",
".pmb-badge{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#fff;background:#7a8c80;border-radius:5px;padding:2px 7px;}.pmb-badge.ok{background:#2f8f5b;}",
".pmb-card-title{font-weight:600;font-size:18px;flex:1;color:#1a2820;font-family:'EB Garamond',serif;}",
".pmb-sec{font-family:'JetBrains Mono',monospace;font-size:10px;color:#7a8c80;}",
".pmb-dots{display:inline-flex;gap:3px;}.pmb-dot{width:6px;height:6px;border-radius:50%;background:#cdbfa3;}.pmb-dot.on{background:#2f6b4f;}",
".pmb-chk{color:#2f8f5b;font-weight:700;margin-left:4px;}",
".pmb-prompt{margin:10px 0 12px;color:#41564a;font-family:'EB Garamond',serif;font-size:16px;}.pmb-prompt code{font-family:'JetBrains Mono',monospace;font-size:.92em;}",
".pmb-tray{margin:10px 0 0;}",
".pmb-keys-toggle{display:inline-flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#41564a;background:#f4f5ec;border:1px solid #d2dacb;border-radius:8px;padding:8px 13px;cursor:pointer;min-height:38px;}",
".pmb-tray.open .pmb-keys-toggle{border-color:#2f6b4f;}.pmb-caret{color:#7a8c80;font-size:11px;}",
".pmb-tray-rows{display:flex;flex-direction:column;gap:7px;margin-top:9px;}.pmb-tray:not(.open) .pmb-tray-rows{display:none;}",
".pmb-tok-row{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;}",
".pmb-tok{flex:0 0 auto;font-family:'JetBrains Mono',monospace;font-size:12.5px;padding:6px 11px;border-radius:8px;cursor:pointer;min-height:34px;display:inline-flex;align-items:center;user-select:none;border:1px solid;}",
".pmb-tok-kw{border-color:#cbb3d8;background:#f3e9f6;color:#7a4ea0;font-weight:600;}",
".pmb-tok-bi{border-color:#bcdfca;background:#e4f3ea;color:#234f3b;}",
".pmb-edwrap{position:relative;background:#16352a;border:1px solid #1e4636;border-radius:8px;overflow:hidden;display:flex;margin-top:10px;}",
".pmb-hl,.pmb-ta{margin:0;border:none;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;padding:12px;white-space:pre-wrap;overflow-wrap:break-word;word-break:break-word;tab-size:4;box-sizing:border-box;}",
".pmb-hl{position:absolute;inset:0;color:#d7e8dd;overflow:hidden;pointer-events:none;}.pmb-hl code{font:inherit;}",
".pmb-ta{position:relative;width:100%;min-height:150px;resize:vertical;background:transparent;color:transparent;-webkit-text-fill-color:transparent;caret-color:#d7e8dd;outline:none;overflow:auto;}",
".pmb-ph{color:#7e9486;}",
".pmb-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;}",
".pmb-btn{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.3px;border-radius:7px;padding:8px 15px;cursor:pointer;border:1px solid transparent;}",
".pmb-btn-run{background:#2f6b4f;color:#fff;border-color:#2f6b4f;}.pmb-btn-run:disabled{opacity:.6;cursor:default;}",
".pmb-btn-go{background:#3c8362;color:#08130b;border-color:#3c8362;}.pmb-btn-go:disabled{opacity:.5;cursor:default;}",
".pmb-btn-ghost{background:transparent;color:#7a8c80;border-color:#d2dacb;}",
".pmb-stdin{font-family:'JetBrains Mono',monospace;font-size:11px;color:#7a8c80;}.pmb-stdin span{color:#2f6b4f;}",
".pmb-hr{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}",
".pmb-hint{margin-top:12px;font-size:14.5px;color:#7a5a17;background:#faf3df;border:1px solid #e7d6a8;border-radius:8px;padding:9px 12px;font-family:'EB Garamond',serif;}",
".pmb-reveal{margin-top:12px;background:#16352a;font-family:'JetBrains Mono',monospace;font-size:12.5px;padding:12px;border-radius:8px;overflow:auto;white-space:pre;color:#d7e8dd;}",
".pmb-fb{margin-top:11px;font-family:'JetBrains Mono',monospace;font-size:12.5px;padding:9px 12px;border-radius:8px;}",
".pmb-fb.ok{color:#2f8f5b;background:#e9f5ee;border:1px solid #b6dcc4;}.pmb-fb.err{color:#b3261e;background:#f8ebe6;border:1px solid #e7c3b4;}",
".pmb-out{margin-top:10px;}.pmb-out-label{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:#7a8c80;margin-bottom:5px;}",
".pmb-out-pre{margin:0;background:#16352a;color:#d7e8dd;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.6;padding:12px 14px;border-radius:8px;overflow:auto;white-space:pre-wrap;}.pmb-out-pre.err{color:#f0a99e;}",
".pmb-next{margin-top:14px;width:100%;justify-content:center;display:inline-flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;background:#2f8f5b;color:#fff;border:1px solid #2f8f5b;border-radius:8px;padding:11px 16px;cursor:pointer;}",
".pmb-att{margin-top:16px;border-top:1px dashed #cdbfa3;padding-top:13px;}",
".pmb-att-head{display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#7a8c80;cursor:pointer;user-select:none;}",
".pmb-att-ico{font-size:13px;color:#2f6b4f;}.pmb-att-count{color:#2f6b4f;}.pmb-att-caret{margin-left:auto;font-size:10px;transition:transform .15s;}.pmb-att.open .pmb-att-caret{transform:rotate(180deg);}",
".pmb-att-list{display:flex;flex-direction:column;gap:9px;margin-top:12px;}.pmb-att:not(.open) .pmb-att-list{display:none;}",
".pmb-att-empty{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#7a8c80;font-style:italic;}",
".pmb-att-row{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:start;}",
".pmb-att-badge{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;margin-top:1px;}.pmb-att-badge.ok{background:#2f8f5b;}.pmb-att-badge.bad{background:#b3261e;}",
".pmb-att-main{min-width:0;}",
".pmb-att-q{margin:0;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5;color:#d7e8dd;background:#16352a;border:1px solid #1e4636;border-radius:6px;padding:7px 10px;white-space:pre-wrap;word-break:break-word;}",
".pmb-att-reason{font-family:'JetBrains Mono',monospace;font-size:10.5px;margin-top:4px;}.pmb-att-reason.ok{color:#2f8f5b;}.pmb-att-reason.bad{color:#b3261e;}",
".pmb-att-save{margin-top:7px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#fff;background:#2f6b4f;border:1px solid #2f6b4f;border-radius:6px;padding:5px 11px;cursor:pointer;}.pmb-att-save.saved,.pmb-att-save:disabled{color:#2f8f5b;background:#fbfcf6;border-color:#d2dacb;cursor:default;}",
".pmb-att-when{font-family:'JetBrains Mono',monospace;font-size:10px;color:#7a8c80;white-space:nowrap;padding-top:3px;}",
".pmb-att-more{background:none;border:none;font-family:'JetBrains Mono',monospace;font-size:11px;color:#2f6b4f;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:2px 0;text-align:left;align-self:flex-start;}",
".pmb-drill-section{margin-top:40px;}",
".pmb-drill-title{display:flex;align-items:baseline;gap:10px;margin:0 0 14px;padding-bottom:6px;border-bottom:1px solid #d2dacb;}",
".pmb-drill-title h3{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:24px;line-height:1;margin:0;color:#234f3b;}",
".pmb-drill-chip{font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#2f6b4f;background:#dde7dd;border:1px solid #7fa68b;border-radius:999px;padding:1px 8px;}",
".pmb-drill-empty{background:#fbfcf6;border:1px dashed #cdbfa3;border-radius:11px;padding:22px 24px;text-align:center;}",
".pmb-drill-empty-k{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:#7a8c80;margin-bottom:8px;}",
".pmb-drill-empty p{margin:0;color:#41564a;font-family:'EB Garamond',serif;font-size:16px;}",
".pmb-drill-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px;}.pmb-drill-meta{font-family:'JetBrains Mono',monospace;font-size:12px;color:#7a8c80;}",
".pmb-bank-list{display:flex;flex-direction:column;gap:10px;}",
".pmb-bank-row{display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:start;background:#fbfcf6;border:1px solid #e7c3b4;border-radius:10px;padding:13px 15px;}.pmb-bank-row.resolved{border-color:#d2dacb;opacity:.6;}",
".pmb-bank-main{min-width:0;}.pmb-bank-title{font-family:'EB Garamond',serif;font-weight:600;font-size:16px;color:#1a2820;}",
".pmb-bank-reason{display:flex;align-items:flex-start;gap:7px;margin-top:5px;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#41564a;}",
".pmb-bank-dot{width:6px;height:6px;border-radius:50%;background:#2f6b4f;flex:0 0 auto;margin-top:6px;}",
".pmb-bank-res{font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#2f8f5b;white-space:nowrap;margin-top:3px;}",
".pmb-bank-drill{white-space:nowrap;color:#2f6b4f;border-color:#cdbfa3;}",
".pmb-drill-done{background:#e9f5ee;border:1px solid #b6dcc4;border-radius:11px;padding:26px 24px;text-align:center;}",
".pmb-drill-done-ico{font-size:34px;}.pmb-drill-done h3{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:26px;margin:6px 0 4px;color:#1a2820;}.pmb-drill-done p{margin:0 0 14px;color:#41564a;font-family:'EB Garamond',serif;}",
".pmb-drillcard{background:#fbfcf6;border:1px solid #cdbfa3;border-radius:12px;overflow:hidden;}",
".pmb-drill-head2{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#f4f5ec;border-bottom:1px solid #d2dacb;}",
".pmb-drill-kick{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#2f6b4f;}.pmb-drill-idx{font-family:'JetBrains Mono',monospace;font-size:11px;color:#7a8c80;}.pmb-drill-quit{margin-left:auto;padding:5px 11px;font-size:11px;}",
".pmb-drillcard-body{padding:18px 18px 20px;}",
".pmb-drill-q{display:flex;align-items:center;gap:9px;margin-bottom:8px;}.pmb-drill-qtitle{font-weight:600;font-size:18px;color:#1a2820;font-family:'EB Garamond',serif;}",
".pmb-drill-missed{display:flex;align-items:center;gap:7px;margin:0 0 12px;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#2f6b4f;}",
".pmb-full{position:fixed;inset:0;z-index:1000;background:#16352a;display:flex;flex-direction:column;padding:18px 20px 20px;}",
".pmb-full-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}.pmb-full-kick{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7fa68b;}.pmb-full-exit{margin-left:auto;color:#d7e8dd;border-color:rgba(255,255,255,.25);}",
".pmb-full-q{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.12);}.pmb-full-qhead{display:flex;align-items:center;gap:10px;margin-bottom:6px;}.pmb-full-qtitle{font-family:'EB Garamond',serif;font-weight:600;font-size:18px;color:#fff;}.pmb-full-prompt{margin:0;color:rgba(231,240,232,.85);font-family:'EB Garamond',serif;font-size:16px;}",
".pmb-full-body{flex:1;display:flex;flex-direction:column;min-height:0;overflow:auto;}",
".pmb-full .pmb-edblock{flex:1;display:flex;flex-direction:column;min-height:0;}.pmb-full .pmb-edwrap{flex:1;min-height:0;}.pmb-full .pmb-ta{height:100%;min-height:100%;resize:none;}.pmb-full .pmb-hl,.pmb-full .pmb-ta{font-size:15px;padding:16px;}",
".pmb-foot{margin-top:20px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6;color:#7a8c80;}"
    ].join("\n");
    var s=document.createElement("style"); s.id="pmb-style"; s.textContent=css; document.head.appendChild(s);
  }

  return { mount: mount, mountBank: mountBank,
    ensure: ensurePy,
    state: function(){ return pyState; },
    onEngine: function(cb){ if(typeof cb==="function"){ engineSubs.push(cb); cb(pyState); } },
    /* runRepl: evaluate a line like a Python REPL — echo expression results, run statements. */
    runRepl: function(src){
      return ensurePy().then(function(){
        py.globals.set("__src", src);
        return runPy("try:\n    __r = eval(compile(__src, '<repl>', 'eval'))\n    if __r is not None:\n        print(repr(__r))\nexcept SyntaxError:\n    exec(compile(__src, '<repl>', 'exec'))", []);
      });
    }
  };
})();