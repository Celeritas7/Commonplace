/* compose-blocks.js — "Compose Blocks" Python editor (Commonplace sage/paper skin).
 * Implements the Commonplace DS template `compose-blocks` as a working,
 * drop-in replacement for practice-engine.js's flat-textarea makeEditor.
 *
 * practice-engine.js delegates here when window.ComposeBlocks.enabled is true:
 *   ComposeBlocks.makeEditor(ex, initialCode, onCodeChange, onCheck, placeholder, opts)
 * and receives the exact same api surface back:
 *   { block, ta, fb, out, isFull, setRunning, showFeedback, showOutput }
 * `ta` is a hidden textarea always holding the ASSEMBLED program, so the
 * engine's check()/drillCheck() (which read ed.ta.value) work unchanged.
 *
 * The learner writes small labeled blocks, drags ⠿ to reorder, and runs the
 * top-to-bottom assembly. Order is the lesson: a call above its def fails,
 * the guilty block is stamped, and the traceback teaches the fix.
 */
(function(){
  "use strict";

  /* ---------- Commonplace Python-page tokens (matches index.html :root) ---------- */
  var CREAM="#f4f5ec", PAPER="#fbfcf6", INK="#1a2820", VERM="#a23b2b",
      GREEN="#2f6b4f", GREEN_DK="#234f3b", GREEN_DEEP="#16352a", SAGE="#7fa68b", LINE="#d2dacb",
      KW_BG="#dde7dd", FN_BG="#f3ecd8";

  var PY_KW=["def ","for ","while ","if ","elif ","else:","in ","range(","return ","import ","not ","and ","or ","True","False","None"];
  var PY_BI=["print(","input(","len(","int(","str(","sum(","sorted(","enumerate("];
  var PY_PUNCT=["\":\"",")","[]","{}","\"  \""];
  /* names to exclude from the dynamic "yours" row (already on the palette / reserved) */
  var PY_STOP=["def","for","while","if","elif","else","in","range","return","import","from","not","and","or","True","False","None","print","input","len","int","str","sum","sorted","enumerate","float","list","dict","set","tuple","break","continue","pass","class","try","except","finally","with","as","lambda","global","nonlocal","yield","del","is","raise","assert","abs","min","max","round","type","open","zip","map","filter"];

  /* scan assembled code for the learner's own tokens: string literals,
   * def/class names (as callables), assignment targets, for-vars, params */
  function scanUserTokens(code){
    var seen={}, toks=[], m;
    function add(t){ if(t && !seen[t]){ seen[t]=1; toks.push(t); } }
    var reStr=/(['"])((?:\\.|(?!\1).)*?)\1/g;
    while((m=reStr.exec(code))){ if(m[2].length>0 && m[2].length<=18) add(m[0]); }
    var reDef=/(?:^|\n)\s*(?:def|class)\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?/g;
    while((m=reDef.exec(code))){
      add(m[1]+"(");
      (m[2]||"").split(",").forEach(function(p){ p=p.trim().split("=")[0].trim(); if(/^[A-Za-z_]\w*$/.test(p)) add(p); });
    }
    var reAsn=/(?:^|\n)\s*([A-Za-z_]\w*)\s*(?:=[^=]|[+\-*\/]=)/g;
    while((m=reAsn.exec(code))) add(m[1]);
    var reFor=/\bfor\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s+in\b/g;
    while((m=reFor.exec(code))) m[1].split(",").forEach(function(v){ add(v.trim()); });
    return toks.filter(function(t){ return PY_STOP.indexOf(t.replace(/\($/,""))===-1; }).slice(0,14);
  }

  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  /* ---------- css (injected once) ---------- */
  var cssDone=false;
  function injectCss(){
    if(cssDone) return; cssDone=true;
    var st=document.createElement("style"); st.setAttribute("data-cb","1");
    st.textContent=
".cb-wrap{background:"+CREAM+";border:1px solid "+LINE+";border-radius:14px;box-shadow:0 12px 26px -18px rgba(20,40,30,.45);padding:16px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;font-family:'EB Garamond',Georgia,serif;color:"+INK+"}"+
".cb-kickrow{display:flex;align-items:baseline;justify-content:space-between}"+
".cb-kick{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(26,40,32,.55)}"+
/* palette */
".cb-pal{background:"+PAPER+";border:1px solid "+LINE+";border-radius:12px;box-shadow:0 10px 22px -16px rgba(20,40,30,.5);padding:10px 0 12px;overflow:hidden}"+
".cb-pal.cb-target{border:2px solid "+GREEN+";padding:9px 0 11px}"+
".cb-pal-head{display:flex;align-items:center;justify-content:space-between;padding:0 12px 9px}"+
".cb-pal-head .cb-kick b{color:"+GREEN+";font-weight:700}"+
".cb-pal.cb-hidden{display:flex;align-items:center;justify-content:space-between;padding:6px 6px 6px 12px}"+
".cb-keysbtn{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;background:"+CREAM+";border:1px solid "+LINE+";border-radius:8px;padding:7px 10px;box-shadow:0 1px 0 rgba(20,40,30,.12);color:"+INK+";cursor:pointer}"+
".cb-pillrow{display:flex;gap:8px;padding:2px 12px 4px;overflow-x:auto;scrollbar-width:none}"+
".cb-pillrow::-webkit-scrollbar{display:none}"+
".cb-pillrow+.cb-pillrow{padding-top:6px}"+
".cb-pill{flex:0 0 auto;display:inline-flex;align-items:center;height:38px;padding:0 13px;border:1px solid "+LINE+";border-radius:10px;box-shadow:0 1px 0 rgba(20,40,30,.12);font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:"+INK+";cursor:pointer}"+
".cb-pill:active{transform:translateY(1px)}"+
".cb-pill-kw{background:"+KW_BG+"}.cb-pill-bi{background:"+FN_BG+"}"+
".cb-pill-dyn{background:#fff;border:1px dashed "+SAGE+"}"+
".cb-pillrow-dyn{align-items:center;border-top:1px dashed "+LINE+";margin-top:7px;padding-top:8px}"+
".cb-dyn-tag{flex:0 0 auto;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:1.5px;color:rgba(26,40,32,.45)}"+
/* stack + block cards */
".cb-stack{display:flex;flex-direction:column;gap:12px}"+
".cb-card{background:"+PAPER+";border:1px solid "+LINE+";border-radius:12px;box-shadow:0 10px 22px -16px rgba(20,40,30,.5);overflow:hidden}"+
".cb-card.cb-focus{border:2px solid "+GREEN+"}"+
".cb-card.cb-err{border:1px solid "+VERM+";box-shadow:0 12px 26px -18px rgba(162,59,43,.6)}"+
".cb-card.cb-lift{border:1px solid "+GREEN+";box-shadow:0 18px 34px -20px rgba(20,40,30,.75);transform:rotate(-2deg)}"+
".cb-dim{opacity:.45}"+
".cb-head{display:flex;align-items:center;gap:10px;height:46px;padding:0 4px 0 13px}"+
".cb-card.cb-open .cb-head{border-bottom:1px solid rgba(26,40,32,.2)}"+
".cb-grip{color:rgba(26,40,32,.45);font-size:14px;cursor:grab;touch-action:none;user-select:none;padding:14px 2px}"+
".cb-name{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:"+INK+";background:transparent;border:none;outline:none;padding:0;min-width:40px;max-width:45%}"+
".cb-lines{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(26,40,32,.45);white-space:nowrap;flex:0 0 auto}"+
".cb-stamp{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:1px;color:"+GREEN_DK+";border:1px solid "+GREEN+";background:rgba(47,107,79,.08);padding:3px 6px;border-radius:6px;transform:rotate(-1.5deg);white-space:nowrap;flex:0 0 auto}"+
".cb-card.cb-err .cb-stamp{color:"+VERM+";border-color:"+VERM+";background:rgba(162,59,43,.07)}"+
".cb-sp{flex:1}"+
".cb-hbtn{width:40px;height:46px;display:flex;align-items:center;justify-content:center;color:rgba(26,40,32,.6);background:none;border:none;cursor:pointer;font-size:15px;padding:0}"+
".cb-hbtn.cb-x{font-size:17px}"+
".cb-chev{transition:transform .15s}.cb-card.cb-closed .cb-chev{transform:rotate(-90deg)}"+
".cb-card.cb-closed .cb-body{display:none}"+
/* block body: highlight overlay + textarea */
".cb-body{position:relative}"+
".cb-hl,.cb-ta{margin:0;padding:12px 14px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;white-space:pre;overflow-wrap:normal;box-sizing:border-box}"+
".cb-hl{pointer-events:none;min-height:45px;color:"+INK+";overflow:hidden}"+
".cb-hl .cb-ph{color:rgba(26,40,32,.35);white-space:pre-wrap;overflow-wrap:break-word}"+
".cb-ta{position:absolute;inset:0;width:100%;height:100%;resize:none;border:none;outline:none;background:transparent;color:transparent;caret-color:"+GREEN+";overflow:auto}"+
/* add + actions */
".cb-add{width:100%;background:transparent;border:1.5px dashed "+SAGE+";border-radius:12px;padding:13px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:rgba(26,40,32,.55);cursor:pointer}"+
".cb-add:hover{border-color:"+GREEN+";color:"+GREEN+"}"+
".cb-actions{display:flex;gap:12px}"+
".cb-run{flex:1;background:"+GREEN_DK+";color:#eaf2ea;border:1px solid "+GREEN_DEEP+";border-radius:11px;padding:13px;font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;letter-spacing:.3px;box-shadow:0 12px 26px -18px rgba(20,40,30,.6);cursor:pointer}"+
".cb-run:disabled{opacity:.6;cursor:default}"+
".cb-run:not(:disabled):hover{background:"+GREEN_DEEP+"}"+
".cb-run:not(:disabled):active{transform:translateY(1px)}"+
".cb-fs{background:"+PAPER+";color:"+INK+";border:1px solid "+LINE+";border-radius:11px;padding:13px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;cursor:pointer}"+
".cb-fs:hover{border-color:"+SAGE+"}"+
/* insertion line while dragging */
".cb-insline{display:flex;align-items:center;gap:6px;margin:-2px 0}"+
".cb-insline i{width:10px;height:10px;border-radius:50%;background:"+GREEN+"}"+
".cb-insline b{flex:1;height:3px;background:"+GREEN+";border-radius:2px}"+
/* ghost while dragging */
".cb-ghost{position:fixed;z-index:9999;pointer-events:none;width:var(--cbw)}"+
/* output: assembled + stdout */
".cb-outwrap{display:flex;flex-direction:column;gap:14px;margin-top:14px}"+
"@media(min-width:640px){.cb-outwrap.cb-two{display:grid;grid-template-columns:1fr 1fr;align-items:start}}"+
".cb-asm{background:"+PAPER+";border:1px solid "+LINE+";border-radius:12px;box-shadow:0 10px 22px -16px rgba(20,40,30,.5);overflow:hidden}"+
".cb-asm-head,.cb-so-head{display:flex;align-items:center;justify-content:space-between;padding:9px 12px}"+
".cb-asm-head{border-bottom:1px solid rgba(26,40,32,.2)}"+
".cb-seg{position:relative;padding:6px 12px 6px 10px}"+
".cb-seg+.cb-seg{border-top:1px dashed rgba(26,40,32,.2)}"+
".cb-seg.cb-guilty{background:rgba(162,59,43,.07)}"+
".cb-seg-tag{position:absolute;top:6px;right:10px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:1px;color:rgba(26,40,32,.4)}"+
".cb-seg.cb-guilty .cb-seg-tag{color:"+VERM+";font-weight:700}"+
".cb-seg pre{margin:0;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.65;white-space:pre;overflow-x:auto}"+
".cb-ln{color:rgba(26,40,32,.35)}.cb-ln-err{color:"+VERM+";font-weight:700}"+
".cb-so{background:"+GREEN_DEEP+";border:1px solid "+GREEN_DEEP+";border-radius:12px;box-shadow:0 12px 26px -18px rgba(20,40,30,.6);overflow:hidden}"+
".cb-so-head{border-bottom:1px solid rgba(234,242,234,.15)}"+
".cb-so-kick{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(234,242,234,.6)}"+
".cb-exit{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px}"+
".cb-exit-ok{color:#8fd6a0}.cb-exit-err{color:#e0917e}"+
".cb-so pre{margin:0;padding:12px 14px;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.65;color:#eaf2ea;white-space:pre-wrap;word-break:break-word}"+
".cb-so pre.cb-tb{color:#d08a7a}"+
".cb-so-hint{border-top:1px solid rgba(234,242,234,.15);padding:9px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6;color:rgba(234,242,234,.6)}"+
".cb-so-hint b{color:#eaf2ea;font-weight:600}"+
/* fullscreen */
".cb-full{position:fixed;inset:0;z-index:1000;background:"+CREAM+";overflow:auto;padding:18px;box-sizing:border-box}"+
".cb-full-head{display:flex;align-items:center;justify-content:space-between;max-width:760px;margin:0 auto 14px}"+
".cb-full-body{max-width:760px;margin:0 auto}";
    document.head.appendChild(st);
  }

  /* ---------- caret insertion (ported from practice-engine) ---------- */
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

  function labelFor(code, fallback){
    var ln=(code||"").split("\n").filter(function(l){return l.trim();})[0]||"";
    var m=/^\s*def\s+([A-Za-z_]\w*)/.exec(ln); if(m) return "def "+m[1];
    if(/^\s*(import|from)\s/.test(ln)) return "imports";
    if(/^\s*class\s+([A-Za-z_]\w*)/.exec(ln)) return "class "+/^\s*class\s+([A-Za-z_]\w*)/.exec(ln)[1];
    return fallback;
  }

  /* ---------- the editor ---------- */
  function makeEditor(ex, initialCode, onCodeChange, onCheck, placeholder, opts){
    injectCss();
    opts=opts||{};
    var hl=opts.hl||function(s){ return esc(s); };

    var isDrill = !onCodeChange;                      // drill mode: fresh, unpersisted
    var storeKey = "cb_blocks_"+(ex&&ex.id?ex.id:"x");

    /* --- model --- */
    var blocks=null;
    if(!isDrill){ try{ blocks=JSON.parse(localStorage.getItem(storeKey)||"null"); }catch(e){ blocks=null; } }
    if(!blocks || !blocks.length){
      blocks=[{ n:"main", c:initialCode||"", col:false, auto:true }];
    }
    var focusedIdx=-1, lastAsm=null, errBlockIdx=-1, errLine=-1;

    /* --- skeleton --- */
    var block=document.createElement("div"); block.className="cb-wrap";
    block.innerHTML=
      '<div class="cb-kickrow"><span class="cb-kick">COMPOSE · PYTHON</span><span class="cb-kick cb-count"></span></div>'+
      '<div class="cb-pal"></div>'+
      '<div class="cb-stack"></div>'+
      '<button type="button" class="cb-add">+ Add block</button>'+
      '<div class="cb-actions">'+
        '<button type="button" class="cb-run">▶&nbsp; Assemble &amp; run</button>'+
        '<button type="button" class="cb-fs">⤢ Fullscreen</button>'+
      '</div>';
    var countEl=block.querySelector(".cb-count"),
        palEl=block.querySelector(".cb-pal"),
        stackEl=block.querySelector(".cb-stack"),
        addBtn=block.querySelector(".cb-add"),
        runBtn=block.querySelector(".cb-run"),
        fsBtn=block.querySelector(".cb-fs");

    /* hidden textarea = the engine-facing assembled program */
    var ta=document.createElement("textarea");
    ta.style.display="none"; ta.setAttribute("aria-hidden","true"); ta.tabIndex=-1;
    block.appendChild(ta);

    var fb=document.createElement("div"); fb.className="pmb-fb"; fb.style.display="none";
    var out=document.createElement("div"); out.className="cb-outwrap"; out.style.display="none";

    /* --- assembly + persistence --- */
    function assemble(){
      var segs=[], lines=[], n=1;
      blocks.forEach(function(b,i){
        var code=(b.c||"").replace(/\s+$/,"");
        if(!code.trim()) return;
        var cnt=code.split("\n").length;
        segs.push({ i:i, n:b.n, code:code, start:n, end:n+cnt-1 });
        lines.push(code); n+=cnt;
      });
      lastAsm={ segs:segs, text:lines.join("\n"), total:n-1 };
      return lastAsm;
    }
    function sync(){
      var a=assemble();
      ta.value=a.text;
      countEl.textContent="№ "+blocks.length+" BLOCK"+(blocks.length===1?"":"S");
      if(onCodeChange) onCodeChange(a.text);
      if(!isDrill){ try{ localStorage.setItem(storeKey,JSON.stringify(blocks)); }catch(e){} }
      refreshDyn();
    }

    /* --- key palette --- */
    var keysOpen=true, dynRowEl=null;
    function refreshDyn(){
      if(!dynRowEl || !keysOpen) return;
      var toks=scanUserTokens(ta.value);
      dynRowEl.innerHTML="";
      if(!toks.length){ dynRowEl.style.display="none"; return; }
      dynRowEl.style.display="";
      var tag=document.createElement("span"); tag.className="cb-dyn-tag"; tag.textContent="YOURS";
      dynRowEl.appendChild(tag);
      toks.forEach(function(t){ dynRowEl.appendChild(pillBtn(t,"dyn")); });
    }
    function pillBtn(t,kind){
      var b=document.createElement("button"); b.type="button"; b.className="cb-pill cb-pill-"+kind;
      b.textContent = t==='"  "' ? '" "' : t.trim();
      b.addEventListener("pointerdown",function(e){ e.preventDefault(); }); // keep block textarea focus
      b.addEventListener("click",function(){
        var target = focusedIdx>=0 ? stackEl.querySelector('[data-i="'+focusedIdx+'"] .cb-ta') : null;
        if(!target){ // no focus yet: target the last block
          focusedIdx=blocks.length-1; renderStack();
          target=stackEl.querySelector('[data-i="'+focusedIdx+'"] .cb-ta');
        }
        if(target) insertAtCaret(target,t);
      });
      return b;
    }
    function renderPal(){
      palEl.className="cb-pal"+(keysOpen?"":" cb-hidden")+(keysOpen&&focusedIdx>=0?" cb-target":"");
      if(!keysOpen){
        palEl.innerHTML='<span class="cb-kick">KEYS HIDDEN</span>';
        var show=document.createElement("button"); show.type="button"; show.className="cb-keysbtn"; show.textContent="Show keys ⌄";
        show.addEventListener("click",function(){ keysOpen=true; renderPal(); });
        palEl.appendChild(show);
        return;
      }
      palEl.innerHTML='<div class="cb-pal-head"><span class="cb-kick">KEY PALETTE'+(focusedIdx>=0?' <b>→ '+esc((blocks[focusedIdx]||{}).n||"").toUpperCase()+'</b>':'')+'</span></div>';
      var hide=document.createElement("button"); hide.type="button"; hide.className="cb-keysbtn"; hide.textContent="Hide keys ⌃";
      hide.addEventListener("click",function(){ keysOpen=false; renderPal(); });
      palEl.querySelector(".cb-pal-head").appendChild(hide);
      var r1=document.createElement("div"); r1.className="cb-pillrow";
      var r2=document.createElement("div"); r2.className="cb-pillrow";
      var r3=document.createElement("div"); r3.className="cb-pillrow";
      PY_KW.forEach(function(t){ r1.appendChild(pillBtn(t,"kw")); });
      PY_BI.forEach(function(t){ r2.appendChild(pillBtn(t,"bi")); });
      PY_PUNCT.forEach(function(t){ r3.appendChild(pillBtn(t,"bi")); });
      var r4=document.createElement("div"); r4.className="cb-pillrow cb-pillrow-dyn";
      palEl.appendChild(r1); palEl.appendChild(r2); palEl.appendChild(r3); palEl.appendChild(r4);
      dynRowEl=r4; refreshDyn();
    }

    /* --- block cards --- */
    function renderStack(){
      stackEl.innerHTML="";
      blocks.forEach(function(b,i){
        var card=document.createElement("div");
        card.className="cb-card"+(b.col?" cb-closed":" cb-open")+(i===focusedIdx?" cb-focus":"")+(i===errBlockIdx?" cb-err":"");
        card.setAttribute("data-i",i);

        var head=document.createElement("div"); head.className="cb-head";
        var grip=document.createElement("span"); grip.className="cb-grip"; grip.textContent="⠿";
        var name=document.createElement("input"); name.className="cb-name"; name.value=b.n; name.spellcheck=false;
        name.addEventListener("input",function(){ b.n=name.value; b.auto=false; sync(); });
        name.addEventListener("focus",function(){ setFocus(i,false); });
        head.appendChild(grip); head.appendChild(name);
        if(i===errBlockIdx){
          var stamp=document.createElement("span"); stamp.className="cb-stamp";
          stamp.textContent = errStamp || "ERROR HERE"; head.appendChild(stamp);
        } else if(i===focusedIdx && keysOpen){
          var kstamp=document.createElement("span"); kstamp.className="cb-stamp"; kstamp.textContent="KEYS INSERT HERE";
          head.appendChild(kstamp);
        }
        if(b.col){
          var lc=(b.c||"").split("\n").filter(function(l){return l.trim();}).length;
          var lines=document.createElement("span"); lines.className="cb-lines"; lines.textContent="· "+lc+" line"+(lc===1?"":"s");
          head.appendChild(lines);
        }
        var sp=document.createElement("span"); sp.className="cb-sp"; head.appendChild(sp);
        var chev=document.createElement("button"); chev.type="button"; chev.className="cb-hbtn"; chev.title=b.col?"Expand":"Collapse";
        chev.innerHTML='<span class="cb-chev">⌄</span>';
        chev.addEventListener("click",function(){ b.col=!b.col; if(b.col&&focusedIdx===i) setFocus(-1,false); renderStack(); });
        var del=document.createElement("button"); del.type="button"; del.className="cb-hbtn cb-x"; del.textContent="×"; del.title="Delete block";
        del.addEventListener("click",function(){
          if(blocks.length===1){ b.c=""; b.n="main"; b.auto=true; }
          else blocks.splice(i,1);
          if(focusedIdx===i) focusedIdx=-1;
          errBlockIdx=-1; sync(); renderStack(); renderPal();
        });
        head.appendChild(chev); head.appendChild(del);
        card.appendChild(head);

        var body=document.createElement("div"); body.className="cb-body";
        var pre=document.createElement("pre"); pre.className="cb-hl"; pre.setAttribute("aria-hidden","true");
        var bta=document.createElement("textarea"); bta.className="cb-ta"; bta.spellcheck=false; bta.value=b.c||"";
        bta.wrap="off";
        function paint(){
          pre.innerHTML = (b.c ? hl(b.c)+"\n" : '<span class="cb-ph">'+esc(i===0&&blocks.length===1?(placeholder||"Write your Python here…"):"…")+'</span>');
          bta.style.height=pre.offsetHeight+"px";
        }
        bta.addEventListener("input",function(){
          b.c=bta.value;
          if(b.auto){ var nl=labelFor(b.c,b.n); if(nl!==b.n){ b.n=nl; name.value=nl; } }
          if(errBlockIdx>=0){ errBlockIdx=-1; card.classList.remove("cb-err"); var s=head.querySelector(".cb-stamp"); if(s&&s.textContent!=="KEYS INSERT HERE") s.remove(); }
          paint(); sync();
        });
        bta.addEventListener("scroll",function(){ pre.scrollTop=bta.scrollTop; pre.scrollLeft=bta.scrollLeft; });
        bta.addEventListener("focus",function(){ setFocus(i,true); });
        bta.addEventListener("keydown",function(e){
          if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){ e.preventDefault(); onCheck(); }
          if(e.key==="Tab"){ e.preventDefault(); insertAtCaret(bta,"    "); }
          if(e.key==="Escape"&&api.isFull) setFull(false);
        });
        body.appendChild(pre); body.appendChild(bta);
        card.appendChild(body);
        stackEl.appendChild(card);
        paint();

        /* drag to reorder */
        grip.addEventListener("pointerdown",function(e){ startDrag(e,i,card); });
      });
    }

    function setFocus(i,rerenderStamp){
      if(focusedIdx===i) return;
      var prev=stackEl.querySelector(".cb-card.cb-focus");
      if(prev){ prev.classList.remove("cb-focus"); var st=prev.querySelector(".cb-stamp"); if(st&&st.textContent==="KEYS INSERT HERE") st.remove(); }
      focusedIdx=i;
      if(i>=0){
        var card=stackEl.querySelector('[data-i="'+i+'"]');
        if(card){
          card.classList.add("cb-focus");
          if(keysOpen && !card.querySelector(".cb-stamp") && i!==errBlockIdx){
            var k=document.createElement("span"); k.className="cb-stamp"; k.textContent="KEYS INSERT HERE";
            var nameEl=card.querySelector(".cb-name"); nameEl.parentNode.insertBefore(k,nameEl.nextSibling);
          }
        }
      }
      renderPal();
    }

    /* --- drag & drop (pointer events) --- */
    function startDrag(e,idx,card){
      e.preventDefault();
      var grip=e.currentTarget;
      try{ grip.setPointerCapture(e.pointerId); }catch(_){}
      var rect=card.getBoundingClientRect();
      var ghost=card.cloneNode(true); ghost.className+=" cb-ghost cb-lift";
      ghost.style.setProperty("--cbw",rect.width+"px");
      ghost.style.left=rect.left+"px"; ghost.style.top=rect.top+"px";
      document.body.appendChild(ghost);
      card.style.display="none";
      var insline=document.createElement("div"); insline.className="cb-insline"; insline.innerHTML="<i></i><b></b>";
      var offX=e.clientX-rect.left, offY=e.clientY-rect.top;
      block.classList.add("cb-dragging");
      [palEl,addBtn,runBtn.parentNode].forEach(function(n){ n.classList.add("cb-dim"); });
      var target=idx;

      function place(clientY){
        var cards=[].slice.call(stackEl.querySelectorAll(".cb-card")).filter(function(c){ return c!==card; });
        var before=null; target=blocks.length;
        for(var k=0;k<cards.length;k++){
          var r=cards[k].getBoundingClientRect();
          if(clientY < r.top+r.height/2){ before=cards[k]; target=parseInt(cards[k].getAttribute("data-i"),10); break; }
        }
        cards.forEach(function(c){ c.classList.add("cb-dim"); });
        if(before) stackEl.insertBefore(insline,before); else stackEl.appendChild(insline);
      }
      function move(ev){
        ghost.style.left=(ev.clientX-offX)+"px"; ghost.style.top=(ev.clientY-offY)+"px";
        place(ev.clientY);
      }
      function up(ev){
        grip.removeEventListener("pointermove",move);
        grip.removeEventListener("pointerup",up);
        grip.removeEventListener("pointercancel",up);
        ghost.remove(); if(insline.parentNode) insline.remove();
        card.style.display="";
        block.classList.remove("cb-dragging");
        [palEl,addBtn,runBtn.parentNode].forEach(function(n){ n.classList.remove("cb-dim"); });
        var from=idx, to=target;
        if(to>from) to--;
        if(to!==from && to>=0 && to<=blocks.length-1){
          var b=blocks.splice(from,1)[0]; blocks.splice(to,0,b);
          focusedIdx=-1; errBlockIdx=-1;
        }
        sync(); renderStack(); renderPal();
      }
      grip.addEventListener("pointermove",move);
      grip.addEventListener("pointerup",up);
      grip.addEventListener("pointercancel",up);
      place(e.clientY);
    }

    /* --- add block --- */
    addBtn.addEventListener("click",function(){
      blocks.push({ n:"block "+(blocks.length+1), c:"", col:false, auto:true });
      errBlockIdx=-1; sync(); renderStack();
      var last=stackEl.querySelector('[data-i="'+(blocks.length-1)+'"] .cb-ta');
      if(last) last.focus();
    });

    /* --- run / fullscreen --- */
    runBtn.addEventListener("click",function(){ onCheck(); });

    var overlay=null, relocations=[];
    function relocate(node,parent){ var ph=document.createComment("cb"); node.parentNode.insertBefore(ph,node); parent.appendChild(node); relocations.push({node:node,ph:ph}); }
    function restoreAll(){ relocations.forEach(function(r){ r.ph.parentNode.insertBefore(r.node,r.ph); r.ph.parentNode.removeChild(r.ph); }); relocations=[]; }
    function setFull(on){
      if(on===api.isFull) return;
      if(on){
        overlay=document.createElement("div"); overlay.className="cb-full";
        var head=document.createElement("div"); head.className="cb-full-head";
        head.innerHTML='<span class="cb-kick">COMPOSE · FULLSCREEN'+(ex&&ex.title?' — '+esc(ex.title).toUpperCase():'')+'</span>';
        var exit=document.createElement("button"); exit.type="button"; exit.className="cb-keysbtn"; exit.textContent="✕ Exit (Esc)";
        exit.addEventListener("click",function(){ setFull(false); }); head.appendChild(exit);
        var body=document.createElement("div"); body.className="cb-full-body";
        overlay.appendChild(head); overlay.appendChild(body);
        document.body.appendChild(overlay);
        relocate(block,body); relocate(fb,body); relocate(out,body);
        document.body.style.overflow="hidden"; fsBtn.textContent="✕ Exit"; api.isFull=true;
      } else {
        restoreAll(); if(overlay){ overlay.parentNode.removeChild(overlay); overlay=null; }
        document.body.style.overflow=""; fsBtn.textContent="⤢ Fullscreen"; api.isFull=false;
      }
    }
    fsBtn.addEventListener("click",function(){ setFull(!api.isFull); });

    /* --- engine-facing api --- */
    var errStamp="";
    function setRunning(on){ runBtn.disabled=on; runBtn.innerHTML=on?"Running…":"▶&nbsp; Assemble &amp; run"; }
    function showFeedback(ok,msg){ if(msg==null){ fb.style.display="none"; return; } fb.style.display=""; fb.className="pmb-fb "+(ok?"ok":"err"); fb.textContent=msg; }

    function guiltyFromError(text){
      errLine=-1; errBlockIdx=-1; errStamp="";
      var mAll=String(text).match(/line (\d+)/g);
      if(mAll&&mAll.length){ errLine=parseInt(mAll[mAll.length-1].slice(5),10); }
      if(errLine>0 && lastAsm){
        for(var i=0;i<lastAsm.segs.length;i++){
          var s=lastAsm.segs[i];
          if(errLine>=s.start&&errLine<=s.end){ errBlockIdx=s.i; break; }
        }
      }
      var nm=/NameError: name '([A-Za-z_]\w*)' is not defined/.exec(String(text));
      if(nm&&lastAsm&&errBlockIdx>=0){
        var name=nm[1], guilty=null, defSeg=null;
        lastAsm.segs.forEach(function(s){ if(s.i===errBlockIdx) guilty=s; });
        lastAsm.segs.forEach(function(s){
          if(guilty && s.start>guilty.end && new RegExp("(^|\\n)\\s*(def\\s+"+name+"\\b|"+name+"\\s*=)").test(s.code)) defSeg=s;
        });
        if(defSeg){ errStamp="RAN TOO EARLY"; return { name:name, defSeg:defSeg }; }
      }
      if(errBlockIdx>=0) errStamp="ERROR HERE";
      return null;
    }

    function showOutput(o){
      if(!o){ out.style.display="none"; out.innerHTML=""; return; }
      var isErr=!!o.isErr;
      var orderHint = isErr ? guiltyFromError(o.text) : (errBlockIdx=-1, errStamp="", null);

      /* auto-collapse blocks after a run to make room for output */
      blocks.forEach(function(b){ b.col=true; });
      focusedIdx=-1; renderStack(); renderPal();
      runBtn.innerHTML="▶&nbsp; Run again";

      var html='';
      if(lastAsm && lastAsm.segs.length){
        html+='<div class="cb-asm"><div class="cb-asm-head"><span class="cb-kick">ASSEMBLED PROGRAM</span><span class="cb-kick">'+lastAsm.total+' LINE'+(lastAsm.total===1?'':'S')+'</span></div>';
        lastAsm.segs.forEach(function(s){
          var guilty = isErr && s.i===errBlockIdx;
          var tag=esc(s.n).toUpperCase()+(guilty&&errStamp==="RAN TOO EARLY"?" — TOO SOON":"");
          html+='<div class="cb-seg'+(guilty?' cb-guilty':'')+'"><span class="cb-seg-tag">'+tag+'</span><pre>';
          s.code.split("\n").forEach(function(line,li){
            var n=s.start+li, bad=guilty&&n===errLine;
            html+='<span class="'+(bad?'cb-ln-err':'cb-ln')+'">'+(bad? n+' ▸' : (n<10?n+'  ':n+' '))+'</span>'+hl(line)+'\n';
          });
          html+='</pre></div>';
        });
        html+='</div>';
      }
      html+='<div class="cb-so"><div class="cb-so-head"><span class="cb-so-kick">STDOUT</span><span class="cb-exit '+(isErr?'cb-exit-err':'cb-exit-ok')+'">EXIT '+(isErr?'1':'0')+'</span></div>'
          +'<pre class="'+(isErr?'cb-tb':'')+'">'+esc(o.text)+'</pre>';
      if(orderHint){
        var g=null; lastAsm.segs.forEach(function(s){ if(s.i===errBlockIdx) g=s; });
        html+='<div class="cb-so-hint">line '+errLine+' ran before <b>'+esc(orderHint.defSeg.n)+'</b> existed — drag <b>'+esc(g?g.n:"it")+'</b> below it ↓</div>';
      }
      html+='</div>';
      out.className="cb-outwrap"+(block.offsetWidth>=640?" cb-two":"");
      out.style.display=""; out.innerHTML=html;
    }

    var api={ block:block, ta:ta, fb:fb, out:out, isFull:false,
              setRunning:setRunning, showFeedback:showFeedback, showOutput:showOutput };

    /* --- boot --- */
    renderPal(); renderStack(); sync();
    return api;
  }

  window.ComposeBlocks={ enabled:true, makeEditor:makeEditor, version:"dyn-palette-1" };
})();
