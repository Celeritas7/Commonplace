/* my-scripts.js — "04 My Scripts" tab: rebuild your own scripts on the phone.
   Modes (pick any): Notes · Reorder · Fill gaps · Block by block · From blank.
   Code runs in the page's Pyodide (window.CommonplacePractice.ensure) against a fake test folder.
   A check passes when your output matches the original's output.
   Progress: localStorage first, synced to Supabase table py_my_scripts when signed in.
   Needs: lib/my-scripts-data.js, practice-engine.js, compose-blocks.js (+ py-keys.js for smart keys). */
(function(){
  "use strict";
  var D = window.MY_SCRIPTS_DATA || { scripts: [], next: [] };
  var root = null, LS = "ms_state_v1", LSV = "ms_view_v1";
  var IV = [1, 3, 7, 16, 35];
  var MODES = [["notes","Notes"],["reorder","Reorder"],["gaps","Fill gaps"],["blocks","Block by block"],["blank","From blank"]];

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function HL(s){ return window.highlightPy ? window.highlightPy(s) : esc(s); }
  function $(sel, el){ return (el||root).querySelector(sel); }
  function byId(id){ for(var i=0;i<D.scripts.length;i++) if(D.scripts[i].id===id) return D.scripts[i]; return null; }
  function L(sc){ return sc._L || (sc._L = sc.original.split("\n")); }
  function blockCode(sc, b){ return L(sc).slice(b.from-1, b.to).join("\n"); }

  /* ---------- state ---------- */
  var ST = {}; try{ ST = JSON.parse(localStorage.getItem(LS)||"{}")||{}; }catch(e){ ST = {}; }
  function S(id){ return ST[id] || (ST[id] = { notes:{}, sr:{}, code:{}, gapv:{}, log:[], upd:0 }); }
  function persist(){ try{ localStorage.setItem(LS, JSON.stringify(ST)); }catch(e){} }
  function touch(id){ S(id).upd = Date.now(); persist(); queuePush(id); paintChip(); paintSync(); }
  var VIEW = { sid:null, mode:"notes", bi:0 }; try{ VIEW = Object.assign(VIEW, JSON.parse(localStorage.getItem(LSV)||"{}")); }catch(e){}
  function saveView(){ try{ localStorage.setItem(LSV, JSON.stringify(VIEW)); }catch(e){} }

  /* ---------- spaced repeat ---------- */
  function pad(n){ return n<10?"0"+n:""+n; }
  function dstr(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  function today(){ return dstr(new Date()); }
  function plus(n){ var d=new Date(); d.setDate(d.getDate()+n); return dstr(d); }
  function items(sc){ return sc.blocks.map(function(b,i){ return { key:"blk:"+b.id, label:"Block "+(i+1)+" · "+b.name, mode:"blocks", bi:i }; })
    .concat([{key:"reorder",label:"Reorder the whole script",mode:"reorder"},{key:"gaps",label:"Fill the gaps",mode:"gaps"},{key:"blank",label:"Whole script from blank",mode:"blank"}]); }
  function isDue(it){ return !!(it && it.due <= today()); }
  function dueItems(){ var out=[]; D.scripts.forEach(function(sc){ var st=S(sc.id); items(sc).forEach(function(it){ if(isDue(st.sr[it.key])) out.push({sc:sc, it:it}); }); }); return out; }
  function srMark(sid, key, ok, clean){
    var st=S(sid), it=st.sr[key], r;
    if(!ok){ if(it && isDue(it)) it.miss=true; r="fail"; }
    else if(!clean) r="peek";
    else if(!it){ st.sr[key]={ box:1, due:plus(IV[0]), n:1 }; r="new"; }
    else if(isDue(it)){ if(it.miss){ it.box=Math.max(1,it.box-1); delete it.miss; r="kept"; } else { it.box=Math.min(5,it.box+1); r="up"; } it.due=plus(IV[it.box-1]); it.n++; }
    else { it.n++; r="early"; }
    st.log.push({ t:Date.now(), k:key, ok:!!ok, r:r, box:(st.sr[key]||{}).box||0 }); if(st.log.length>60) st.log=st.log.slice(-60);
    touch(sid); paintLog(sid); return r;
  }
  function srText(r, it){
    var d = it ? Math.round((new Date(it.due) - new Date(today()))/864e5) : 0, nx = " Next review in "+d+" day"+(d===1?"":"s")+".";
    return { new:"Learned."+nx, up:"Level up — "+(it&&it.box)+" of 5."+nx, kept:"Passed after a miss — level stays."+nx,
      early:"Passed. Not due yet, so the level stays.", peek:"Passed, but you peeked — not counted. Try again without peeking.", fail:"" }[r] || "";
  }
  function pips(it){ var b=it?it.box:0, h='<span class="ms-pips" title="level '+b+' of 5">'; for(var i=1;i<=5;i++) h+='<i class="'+(i<=b?"on":"")+'"></i>'; return h+'</span>'; }

  /* ---------- Supabase sync ---------- */
  var msUser = null, syncState = "local", pushT = {};
  function sbc(){ return (window.sb && typeof window.sb.from==="function") ? window.sb : null; }
  function queuePush(id){ if(!sbc()||!msUser) return; clearTimeout(pushT[id]); pushT[id]=setTimeout(function(){ push(id); }, 1200); }
  function push(id){
    var sb=sbc(); if(!sb||!msUser) return;
    syncState="saving"; paintSync();
    sb.from("py_my_scripts").upsert({ user_id:msUser.id, script_id:id, state:S(id), updated_at:new Date().toISOString() }, { onConflict:"user_id,script_id" })
      .then(function(r){ syncState = r.error ? ("err:"+r.error.message) : "synced"; paintSync(); });
  }
  function pull(){
    var sb=sbc(); if(!sb||!msUser){ syncState="local"; paintSync(); return; }
    sb.from("py_my_scripts").select("script_id,state").then(function(r){
      if(r.error){ syncState="err:"+r.error.message; paintSync(); return; }
      var changed=false, seen={};
      (r.data||[]).forEach(function(row){ seen[row.script_id]=1; var loc=ST[row.script_id], rem=row.state||{};
        if(!loc || (rem.upd||0) > (loc.upd||0)){ ST[row.script_id]=rem; changed=true; } else if((loc.upd||0) > (rem.upd||0)) push(row.script_id); });
      Object.keys(ST).forEach(function(id){ if(!seen[id] && ST[id].upd) push(id); });
      if(changed){ persist(); render(); }
      syncState="synced"; paintSync(); paintChip();
    });
  }
  function paintSync(){
    var el=root && root.querySelector(".ms-sync"); if(!el) return;
    var t = !sbc() ? "Saved on this device" : !msUser ? "Saved on this device · sign in (top) to sync" :
      syncState==="saving" ? "Saving…" : syncState==="synced" ? "Synced to your account" :
      syncState.indexOf("err:")===0 ? ("Sync failed: "+syncState.slice(4)+(/py_my_scripts/.test(syncState)?" — run sql/py_my_scripts.sql once":"")) : "Saved on this device";
    el.textContent=t; el.classList.toggle("bad", syncState.indexOf("err:")===0);
  }
  function paintChip(){ var c=document.getElementById("ms-due"); if(!c) return; var n=dueItems().length; c.textContent=n; c.hidden=!n; }

  /* ---------- runner ---------- */
  var PY_HELPERS = [
    "import os, shutil, sys, io, json",
    "def __ms_setup(files_json, name):",
    "    global __ms_buf",
    "    os.chdir('/')",
    "    if os.path.exists('/work'): shutil.rmtree('/work')",
    "    os.makedirs('/work')",
    "    from PIL import Image as _I",
    "    for f in json.loads(files_json):",
    "        p = '/work/' + f[0]",
    "        if f[1]: _I.new('RGB', tuple(f[1]), tuple(f[2])).save(p)",
    "        else:",
    "            with open(p, 'w') as fh: fh.write(f[2] or '')",
    "    os.chdir('/work')",
    "    __ms_buf = io.StringIO(); sys.stdout = __ms_buf; sys.stderr = __ms_buf",
    "    return {'__name__': '__main__', '__file__': '/work/' + name}",
    "def __ms_exec(src, ns):",
    "    import traceback",
    "    try:",
    "        exec(compile(src, '<exec>', 'exec'), ns)",
    "        return ''",
    "    except BaseException:",
    "        et, ev, tbk = sys.exc_info()",
    "        return ''.join(traceback.format_exception(et, ev, tbk.tb_next if tbk else None))",
    "def __ms_finish():",
    "    sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__",
    "    from PIL import Image as _I",
    "    tree = []",
    "    for r, ds, fs in os.walk('/work'):",
    "        ds.sort()",
    "        for f in sorted(fs):",
    "            p = os.path.join(r, f); sz = None",
    "            try:",
    "                with _I.open(p) as im: sz = list(im.size)",
    "            except Exception: pass",
    "            tree.append([os.path.relpath(p, '/work'), sz])",
    "    os.chdir('/')",
    "    return json.dumps({'out': __ms_buf.getvalue(), 'tree': tree})"
  ].join("\n");
  var pilReady=false, chain=Promise.resolve(), EXP={};
  function run(sc, src, status){ var p=chain.then(function(){ return doRun(sc, src, status||function(){}); }); chain=p.catch(function(){}); return p; }
  async function doRun(sc, src, status){
    var CP=window.CommonplacePractice;
    if(!CP || !CP.ensure) return { fatal:"The Python engine isn't on this page (practice-engine.js missing)." };
    if(!CP.state || CP.state()!=="ready") status("Starting Python… the first time downloads about 10 MB.");
    var py; try{ py=await CP.ensure(); }catch(e){ return { fatal:String(e.message||e) }; }
    if(!pilReady){
      status("Loading Pillow (first time only, about 3 MB)…");
      try{ await py.loadPackage("pillow"); py.runPython(PY_HELPERS); pilReady=true; }catch(e){ return { fatal:"Pillow could not load: "+(e.message||e) }; }
    }
    status("Running against the test folder…");
    try{ await py.loadPackagesFromImports(src); }catch(_){}
    var ns, err=null, res;
    try{ ns=py.runPython("__ms_setup("+JSON.stringify(JSON.stringify(sc.fixture))+", "+JSON.stringify(sc.title)+")"); }catch(e){ return { fatal:"Test folder setup failed: "+(e.message||e) }; }
    try{ var ex=py.globals.get("__ms_exec"); err=ex(src, ns)||null; ex.destroy(); }catch(e){ err=String(e.message||e); }
    try{ res=JSON.parse(py.runPython("__ms_finish()")); }catch(e){ res={ out:"", tree:[] }; }
    try{ ns.destroy(); }catch(_){}
    res.err=err; return res;
  }
  function expected(sc, key, src, status){
    var k=sc.id+"|"+key; if(EXP[k]) return Promise.resolve(EXP[k]);
    return run(sc, src, status).then(function(r){ if(!r.fatal && !r.err) EXP[k]=r; return r; });
  }
  function tb(err, off, n){
    var Ls=String(err).split("\n"), i=-1;
    for(var j=0;j<Ls.length;j++) if(/File "<exec>"/.test(Ls[j])){ i=j; break; }
    var t = i<0 ? String(err).trim() : ["Traceback (most recent call last):"].concat(Ls.slice(i)).join("\n").trim();
    return t.replace(/File "<exec>", line (\d+)/g, function(m, d){ d=+d; if(off==null) return "line "+d; var r=d-off;
      return (r>=1&&r<=n) ? "your line "+r : r<1 ? "line "+d+" (a block before yours)" : "the check line, after your block"; });
  }
  function lines(s){ var a=String(s||"").replace(/\r/g,"").split("\n").map(function(l){ return l.replace(/\s+$/,""); }); while(a.length && !a[a.length-1]) a.pop(); return a; }
  function compare(exp, got){
    var A=lines(exp), B=lines(got);
    if(A.join("\n")===B.join("\n")) return { ok:true, A:A, B:B };
    if(A.length===B.length && A.slice().sort().join("\n")===B.slice().sort().join("\n")) return { ok:true, order:true, A:A, B:B };
    return { ok:false, A:A, B:B };
  }
  function treeHTML(tree){ return (tree||[]).map(function(f){ return '<div class="ms-f"><span>'+esc(f[0])+'</span><span>'+(f[1]?f[1][0]+"×"+f[1][1]:"")+'</span></div>'; }).join(""); }
  function resultHTML(res, exp, opts){
    opts=opts||{};
    if(res.fatal) return '<div class="ms-verdict bad">'+esc(res.fatal)+'</div>';
    if(exp && exp.fatal) return '<div class="ms-verdict bad">'+esc(exp.fatal)+'</div>';
    var c=compare(exp.out, res.out), ok=c.ok && !res.err, h='';
    h+='<div class="ms-verdict '+(ok?"ok":"bad")+'">'+(ok ? "✓ Output matches the original"+(c.order?" (same lines, different order)":"") :
      res.err ? "✕ Your code stopped with an error" : "✕ Not yet — the output is different")+'</div>';
    if(opts.sr) h+='<div class="ms-srmsg">'+esc(opts.sr)+'</div>';
    if(res.err) h+='<pre class="ms-tb">'+esc(tb(res.err, opts.off, opts.n))+'</pre>';
    h+='<div class="ms-cmp"><div><div class="ms-k">'+esc(opts.targetLabel||"Target output")+'</div><pre class="ms-o">'+(c.A.map(esc).join("\n")||'<i>(nothing printed)</i>')+'</pre></div>'+
       '<div><div class="ms-k">Your output</div><pre class="ms-o">'+(c.B.map(function(l,i){ return (c.ok||l===c.A[i]) ? esc(l) : '<b class="ms-diff">'+(esc(l)||" ")+'</b>'; }).join("\n")||'<i>(nothing printed)</i>')+'</pre></div></div>';
    if(opts.tree){
      var same=JSON.stringify(res.tree)===JSON.stringify(exp.tree);
      h+='<details class="ms-tree"'+(same?"":" open")+'><summary>Test folder after your run'+(same?" · same as the original's":" · <b>differs from the original's</b>")+'</summary>'+
         '<div class="ms-cmp"><div><div class="ms-k">Original leaves</div>'+treeHTML(exp.tree)+'</div><div><div class="ms-k">Yours leaves</div>'+treeHTML(res.tree)+'</div></div></details>';
    }
    return h;
  }

  /* ---------- editors ---------- */
  function mountEditor(host, exId, title, prompt, placeholder, onCheck){
    var st=S(VIEW.sid), key="cb_blocks_"+exId;
    try{ if(!localStorage.getItem(key) && st.code[exId]) localStorage.setItem(key, JSON.stringify([{ n:"main", c:st.code[exId], col:false, auto:true }])); }catch(e){}
    var api;
    if(window.ComposeBlocks && window.ComposeBlocks.makeEditor){
      api=window.ComposeBlocks.makeEditor({ id:exId, title:title, prompt:prompt }, "", function(){}, function(){ onCheck(api); }, placeholder, { hl:HL });
      host.appendChild(api.block); host.appendChild(api.fb); host.appendChild(api.out);
    } else {
      var w=document.createElement("div"); w.innerHTML='<textarea class="ms-fallback" spellcheck="false" autocapitalize="off" placeholder="'+esc(placeholder)+'"></textarea><button type="button" class="ms-btn">▶ Run &amp; check</button><div></div>';
      host.appendChild(w); var ta=w.querySelector("textarea"), bt=w.querySelector("button");
      try{ ta.value=(JSON.parse(localStorage.getItem(key)||"[]")[0]||{}).c||""; }catch(e){}
      ta.addEventListener("input",function(){ try{ localStorage.setItem(key, JSON.stringify([{n:"main",c:ta.value}])); }catch(e){} });
      api={ ta:ta, out:w.lastChild, setRunning:function(on){ bt.disabled=on; } }; bt.onclick=function(){ onCheck(api); };
    }
    return api;
  }
  function showOut(api, html){ api.out.style.display=""; api.out.className="ms-out"; api.out.innerHTML=html; }

  /* ---------- views ---------- */
  function codeHTML(sc, from, to){
    var a=L(sc), h='';
    for(var i=from;i<=to;i++) h+='<span class="ms-no">'+i+'</span>'+HL(a[i-1])+'\n';
    return '<pre class="ms-code">'+h+'</pre>';
  }
  function render(){
    if(!root) return;
    var sc=VIEW.sid && byId(VIEW.sid);
    if(!sc){ renderHome(); } else { renderScript(sc); }
    paintSync(); paintChip();
  }
  function renderHome(){
    var due=dueItems(), h='<section class="sec ms"><div class="sec-head"><span class="n">§ ✎</span><h2>My Scripts</h2><span class="count">'+D.scripts.length+' / '+(D.scripts.length+D.next.length)+'</span><span class="ln"></span></div>'+
      '<p class="sec-desc">Your own tools, rebuilt by hand. Write notes on each block, then practise in any mode. The code runs here, against a fake test folder.</p>';
    if(due.length){
      h+='<div class="ms-k ms-duek">Due today · '+due.length+'</div><div class="ms-due">';
      due.forEach(function(d){ h+='<button type="button" class="ms-dcard" data-act="open" data-sid="'+d.sc.id+'" data-mode="'+d.it.mode+'" data-bi="'+(d.it.bi||0)+'"><span><b>'+esc(d.sc.short)+'</b> · '+esc(d.it.label)+'</span>'+pips(S(d.sc.id).sr[d.it.key])+'</button>'; });
      h+='</div>';
    }
    h+='<div class="ms-list">';
    D.scripts.forEach(function(sc){
      var st=S(sc.id), nn=sc.blocks.filter(function(b){ return (st.notes[b.id]||"").trim(); }).length,
          lb=sc.blocks.filter(function(b){ return st.sr["blk:"+b.id]; }).length;
      h+='<button type="button" class="ms-scard" data-act="open" data-sid="'+sc.id+'"><span class="ms-st">'+esc(sc.title)+'</span><span class="ms-sw">'+esc(sc.what)+'</span>'+
         '<span class="ms-prog"><span>Notes '+nn+'/'+sc.blocks.length+'</span><span>Blocks '+lb+'/'+sc.blocks.length+'</span>'+
         ['reorder','gaps','blank'].map(function(k){ return '<span>'+({reorder:"Reorder",gaps:"Gaps",blank:"Blank"})[k]+' '+(st.sr[k]?"●":"○")+'</span>'; }).join("")+'</span></button>';
    });
    D.next.forEach(function(n){ h+='<div class="ms-scard ms-soon"><span class="ms-st">'+esc(n.title)+'</span><span class="ms-sw">Coming next</span></div>'; });
    h+='</div><div class="ms-sync"></div></section>';
    root.innerHTML=h;
  }
  function renderScript(sc){
    var st=S(sc.id), h='<section class="sec ms"><div class="ms-top"><button type="button" class="ms-back" data-act="home">← All scripts</button><span class="ms-sync"></span></div>'+
      '<h2 class="ms-title">'+esc(sc.title)+'</h2><p class="ms-what">'+esc(sc.what)+'</p><div class="ms-modes" role="tablist">';
    MODES.forEach(function(m){
      var dueDot = m[0]==="blocks" ? sc.blocks.some(function(b){ return isDue(st.sr["blk:"+b.id]); }) : isDue(st.sr[m[0]]);
      h+='<button type="button" role="tab" class="ms-mode'+(VIEW.mode===m[0]?" on":"")+'" data-act="mode" data-mode="'+m[0]+'">'+m[1]+(dueDot?'<i class="ms-dot"></i>':'')+'</button>';
    });
    h+='</div><div class="ms-body"></div>';
    h+='<details class="ms-log">'+logHTML(sc)+'</details></section>';
    root.innerHTML=h;
    var body=$(".ms-body");
    ({ notes:viewNotes, reorder:viewReorder, gaps:viewGaps, blocks:viewBlocks, blank:viewBlank }[VIEW.mode] || viewNotes)(sc, body);
  }

  function logHTML(sc){
    var st=S(sc.id), log=st.log.slice(-15).reverse();
    return '<summary>Learning log · '+st.log.length+'</summary>'+(log.length ? log.map(function(e){ var it=null; items(sc).forEach(function(x){ if(x.key===e.k) it=x; });
      return '<div class="ms-lrow"><span>'+new Date(e.t).toLocaleDateString(undefined,{month:"short",day:"numeric"})+'</span><span>'+esc(it?it.label:e.k)+'</span><span class="'+(e.ok?"ok":"bad")+'">'+(e.ok?(e.r==="peek"?"✓ peeked":"✓"):"✕")+'</span></div>'; }).join("") : '<div class="ms-empty">Nothing yet — every check you run lands here.</div>');
  }
  function paintLog(sid){ var el=root&&root.querySelector(".ms-log"), sc=byId(sid); if(el&&sc&&VIEW.sid===sid){ var o=el.open; el.innerHTML=logHTML(sc); el.open=o; } }

  /* Notes */
  var noteT=null;
  function viewNotes(sc, body){
    var st=S(sc.id), h='<p class="ms-lead">The original is open here — read it block by block and write what each part does in your own words. These notes are your prompt in Block by block.</p>';
    sc.blocks.forEach(function(b,i){
      h+='<div class="ms-card"><div class="ms-ch"><span class="ms-bn">'+(i+1)+'</span><b>'+esc(b.name)+'</b><span class="ms-ln">lines '+b.from+'–'+b.to+'</span></div>'+codeHTML(sc,b.from,b.to);
      sc.hints.forEach(function(q,qi){ if(q.b===b.id) h+='<div class="ms-hint"><span>Q'+(qi+1)+'</span>'+esc(q.q)+'</div>'; });
      h+='<textarea class="ms-note" data-note="'+b.id+'" rows="3" placeholder="What it does · why it\'s there (what breaks without it) · what each name means">'+esc(st.notes[b.id]||"")+'</textarea></div>';
    });
    [["x_exp","Experiments I ran"],["x_unsure","Still unsure about"]].forEach(function(x){
      h+='<div class="ms-card"><div class="ms-ch"><b>'+x[1]+'</b></div><textarea class="ms-note" data-note="'+x[0]+'" rows="3">'+esc(st.notes[x[0]]||"")+'</textarea></div>';
    });
    body.innerHTML=h;
    body.addEventListener("input", function(e){
      var t=e.target; if(!t.matches(".ms-note")) return;
      st.notes[t.getAttribute("data-note")]=t.value; persist();
      clearTimeout(noteT); noteT=setTimeout(function(){ touch(sc.id); }, 700);
    });
  }

  /* Reorder */
  var RO=null;
  function chunks(sc){
    if(sc._ch) return sc._ch;
    var out=[], cur=null, depth=0;
    L(sc).forEach(function(line){
      var t=line.trim();
      if(!cur){ if(!t || t.charAt(0)==="#") return; cur=[line]; } else cur.push(line);
      depth += (line.match(/[([{]/g)||[]).length - (line.match(/[)\]}]/g)||[]).length;
      if(depth<=0){ out.push(cur.join("\n")); cur=null; depth=0; }
    });
    return (sc._ch=out);
  }
  function shuffle(n){ var a=[],i; for(i=0;i<n;i++) a.push(i); do{ for(i=n-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } }while(n>2 && a.every(function(v,k){ return v===k; })); return a; }
  function chunkHTML(c){ return esc(c).split("\n").map(function(l){ var m=/^ */.exec(l)[0].length; return '<span class="ms-ind">'+"·".repeat(m)+'</span>'+l.slice(m); }).join("\n"); }
  function viewReorder(sc, body){
    var ch=chunks(sc);
    if(!RO || RO.sid!==sc.id) RO={ sid:sc.id, pool:shuffle(ch.length), built:[] };
    function paint(){
      var h='<p class="ms-lead">Tap the lines in the order they run. The dots are indentation, which is part of each line. Tap a placed line to send it back.</p>'+
        '<div class="ms-k">Your script · '+RO.built.length+' / '+ch.length+'</div><div class="ms-built">'+
        (RO.built.length ? RO.built.map(function(ci,k){ return '<button type="button" class="ms-chunk placed" data-act="unplace" data-k="'+k+'"><span class="ms-no">'+(k+1)+'</span><pre>'+chunkHTML(ch[ci])+'</pre></button>'; }).join("") : '<div class="ms-empty">Tap a line below to start.</div>')+'</div>'+
        '<div class="ms-k">Lines left · '+RO.pool.length+'</div><div class="ms-pool">'+RO.pool.map(function(ci,k){ return '<button type="button" class="ms-chunk" data-act="place" data-k="'+k+'"><pre>'+chunkHTML(ch[ci])+'</pre></button>'; }).join("")+'</div>'+
        '<div class="ms-actions"><button type="button" class="ms-btn" data-act="ro-run"'+(RO.pool.length?" disabled":"")+'>▶ Run &amp; check</button><button type="button" class="ms-btn ghost" data-act="ro-reset">Shuffle again</button></div><div class="ms-out"></div>';
      body.innerHTML=h;
    }
    paint();
    body.onclick=function(e){
      var b=e.target.closest("[data-act]"); if(!b) return; var a=b.getAttribute("data-act"), k=+b.getAttribute("data-k");
      if(a==="place"){ RO.built.push(RO.pool.splice(k,1)[0]); paint(); }
      else if(a==="unplace"){ RO.pool.push(RO.built.splice(k,1)[0]); paint(); }
      else if(a==="ro-reset"){ RO={ sid:sc.id, pool:shuffle(ch.length), built:[] }; paint(); }
      else if(a==="ro-run"){
        var out=$(".ms-out",body), src=RO.built.map(function(ci){ return ch[ci]; }).join("\n"); b.disabled=true;
        var st=function(m){ out.innerHTML='<div class="ms-wait">'+esc(m)+'</div>'; };
        expected(sc,"full",sc.original,st).then(function(exp){ return run(sc,src,st).then(function(res){
          var ok=!res.fatal && !res.err && compare(exp.out,res.out).ok, r=(res.fatal||exp.fatal)?null:srMark(sc.id,"reorder",ok,true);
          out.innerHTML=resultHTML(res,exp,{ tree:true, sr:r?srText(r,S(sc.id).sr.reorder):"" }); b.disabled=false; }); });
      }
    };
  }

  /* Fill gaps */
  function normLine(s){ return String(s).replace(/'/g,'"').replace(/\s+/g,""); }
  function viewGaps(sc, body){
    var st=S(sc.id), a=L(sc), gset={}; sc.gaps.forEach(function(g){ gset[g]=1; });
    var h='<p class="ms-lead">'+sc.gaps.length+' lines are missing. Type each one — the indentation is already there. Then run: it passes when the output matches.</p><pre class="ms-code ms-gapcode">';
    a.forEach(function(line,i){
      var n=i+1;
      if(gset[n]){ var ind=/^ */.exec(line)[0].length;
        h+='<span class="ms-no">'+n+'</span><span class="ms-ind">'+"·".repeat(ind)+'</span><textarea class="ms-gap" rows="1" data-g="'+n+'" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off">'+esc(st.gapv[n]||"")+'</textarea><span class="ms-gm" data-gm="'+n+'"></span>\n'; }
      else h+='<span class="ms-no">'+n+'</span>'+HL(line)+'\n';
    });
    h+='</pre><div class="ms-actions"><button type="button" class="ms-btn" data-act="g-run">▶ Run &amp; check</button></div><div class="ms-out"></div><div class="ms-keys"></div>';
    body.innerHTML=h;
    function assembled(){ return a.map(function(line,i){ if(!gset[i+1]) return line; var ind=/^ */.exec(line)[0]; return ind+String(st.gapv[i+1]||"").trim(); }).join("\n"); }
    var last=null;
    body.addEventListener("focusin",function(e){ if(e.target.matches(".ms-gap")) last=e.target; });
    body.addEventListener("input",function(e){ var t=e.target; if(!t.matches(".ms-gap")) return;
      if(/\n/.test(t.value)){ var p=t.selectionStart; t.value=t.value.replace(/\n/g,""); try{ t.setSelectionRange(p-1,p-1); }catch(_){} }
      st.gapv[t.getAttribute("data-g")]=t.value; persist(); clearTimeout(noteT); noteT=setTimeout(function(){ touch(sc.id); },900); });
    if(window.PY_KEYS && window.PY_KEYS.build){
      var gaps=body.querySelectorAll(".ms-gap");
      var pal=window.PY_KEYS.build({ lang:"py", getTarget:function(){ return last||gaps[0]; }, peekTarget:function(){ return last; },
        accepts:function(el){ return !!(el && el.classList && el.classList.contains("ms-gap")); }, fullText:assembled }, null);
      $(".ms-keys",body).appendChild(pal);
    }
    body.onclick=function(e){
      var b=e.target.closest('[data-act="g-run"]'); if(!b) return;
      var out=$(".ms-out",body); b.disabled=true; var stf=function(m){ out.innerHTML='<div class="ms-wait">'+esc(m)+'</div>'; };
      expected(sc,"full",sc.original,stf).then(function(exp){ return run(sc,assembled(),stf).then(function(res){
        var ok=!res.fatal && !res.err && compare(exp.out,res.out).ok;
        sc.gaps.forEach(function(g){ var m=body.querySelector('[data-gm="'+g+'"]'), exact=normLine(st.gapv[g]||"")===normLine(a[g-1]);
          m.textContent = exact ? "✓" : ok ? "≈" : "✕"; m.className="ms-gm "+(exact?"ok":ok?"near":"bad"); m.title = exact?"same as the original":ok?"different from the original, but it works":"not this yet"; });
        var r=(res.fatal||exp.fatal)?null:srMark(sc.id,"gaps",ok,true);
        out.innerHTML=resultHTML(res,exp,{ tree:true, sr:r?srText(r,st.sr.gaps):"" }); b.disabled=false; }); });
    };
  }

  /* Block by block */
  function viewBlocks(sc, body){
    var st=S(sc.id), bi=Math.max(0,Math.min(sc.blocks.length-1, VIEW.bi|0)), b=sc.blocks[bi], key="blk:"+b.id, peeked=false;
    var h='<div class="ms-bpills">'+sc.blocks.map(function(x,i){ var it=st.sr["blk:"+x.id];
      return '<button type="button" class="ms-bp'+(i===bi?" on":"")+(isDue(it)?" due":it?" done":"")+'" data-act="bi" data-bi="'+i+'">'+(i+1)+'</button>'; }).join("")+'</div>';
    h+='<div class="ms-card"><div class="ms-ch"><span class="ms-bn">'+(bi+1)+'</span><b>'+esc(b.name)+'</b>'+pips(st.sr[key])+'</div>';
    var note=(st.notes[b.id]||"").trim();
    h+='<div class="ms-k">Your notes</div>'+(note ? '<blockquote class="ms-quote">'+esc(note).replace(/\n/g,"<br>")+'</blockquote>' :
      '<div class="ms-empty">No notes for this block yet. <button type="button" class="ms-link" data-act="mode" data-mode="notes">Write them first →</button></div>');
    h+='<div class="ms-meta">'+(bi ? 'Blocks 1–'+bi+' of the original run before yours.' : 'This is the first block.')+
      (b.indent ? ' Yours sits <b>inside the for loop</b>, so indent it 4 spaces.' : '')+'</div>'+
      '<div class="ms-meta">The check reads: '+b.reads.map(function(r){ return '<code>'+esc(r)+'</code>'; }).join(" ")+'</div>'+
      '<details class="ms-peek"><summary>Peek at the original block (this try won\'t count)</summary>'+codeHTML(sc,b.from,b.to)+'</details></div><div class="ms-ed"></div>';
    if(bi<sc.blocks.length-1) h+='<div class="ms-actions"><button type="button" class="ms-btn ghost" data-act="bi" data-bi="'+(bi+1)+'">Next block →</button></div>';
    body.innerHTML=h;
    $(".ms-peek",body).addEventListener("toggle",function(e){ if(e.target.open) peeked=true; });
    var exId="ms_"+sc.id+"_"+b.id, pre=L(sc).slice(0,b.from-1).join("\n");
    mountEditor($(".ms-ed",body), exId, "Block "+(bi+1)+" — "+b.name, note?esc(note):"", b.indent?"    # inside the loop: indent 4 spaces…":"Write block "+(bi+1)+" from your notes…", function(api){
      var code=api.ta.value.replace(/\s+$/,""); st.code[exId]=code; api.setRunning(true);
      var stf=function(m){ showOut(api,'<div class="ms-wait">'+esc(m)+'</div>'); };
      var src=(pre?pre+"\n":"")+code+"\n"+b.probe, esrc=L(sc).slice(0,b.to).join("\n")+"\n"+b.probe;
      expected(sc,key,esrc,stf).then(function(exp){ return run(sc,src,stf).then(function(res){
        var ok=!res.fatal && !res.err && compare(exp.out,res.out).ok, r=(res.fatal||exp.fatal)?null:srMark(sc.id,key,ok,!peeked);
        showOut(api, resultHTML(res,exp,{ off:pre?b.from-1:0, n:code.split("\n").length, targetLabel:"Target check output", sr:r?srText(r,st.sr[key]):"" })+
          '<div class="ms-meta">The check output is what the lines after your block print, so it tests what your block left behind.</div>');
        api.setRunning(false); var pills=body.querySelectorAll(".ms-bp"); if(ok && pills[bi]) pills[bi].classList.add("done"); }); });
    });
    body.onclick=function(e){ var t=e.target.closest('[data-act="bi"]'); if(!t) return; VIEW.bi=+t.getAttribute("data-bi"); saveView(); renderScript(sc); window.scrollTo(0, root.getBoundingClientRect().top+window.scrollY-8); };
  }

  /* From blank */
  function viewBlank(sc, body){
    var st=S(sc.id), h='<p class="ms-lead">Write the whole script from a blank page. Your notes are below if you need them. It passes when your output matches the original\'s.</p>'+
      '<details class="ms-peek"><summary>My notes</summary>'+sc.blocks.map(function(b,i){ return '<div class="ms-nrow"><b>'+(i+1)+' · '+esc(b.name)+'</b><div>'+(esc(st.notes[b.id]||"—").replace(/\n/g,"<br>"))+'</div></div>'; }).join("")+'</details>'+
      '<details class="ms-peek"><summary>The test folder</summary>'+sc.fixture.map(function(f){ return '<div class="ms-f"><span>'+esc(f[0])+'</span><span>'+(f[1]?f[1][0]+"×"+f[1][1]:"text")+'</span></div>'; }).join("")+'<div class="ms-meta">Your script runs with this as the current folder and as the folder of <code>__file__</code>.</div></details><div class="ms-ed"></div>';
    body.innerHTML=h;
    var exId="ms_"+sc.id+"_blank";
    mountEditor($(".ms-ed",body), exId, sc.title, "", "import os…", function(api){
      var code=api.ta.value.replace(/\s+$/,""); st.code[exId]=code; api.setRunning(true);
      var stf=function(m){ showOut(api,'<div class="ms-wait">'+esc(m)+'</div>'); };
      expected(sc,"full",sc.original,stf).then(function(exp){ return run(sc,code,stf).then(function(res){
        var ok=!res.fatal && !res.err && compare(exp.out,res.out).ok, r=(res.fatal||exp.fatal)?null:srMark(sc.id,"blank",ok,true);
        showOut(api, resultHTML(res,exp,{ tree:true, sr:r?srText(r,st.sr.blank):"" })); api.setRunning(false); }); });
    });
  }

  /* ---------- events + boot ---------- */
  function onRootClick(e){
    var b=e.target.closest("[data-act]"); if(!b || !root.contains(b)) return;
    var a=b.getAttribute("data-act");
    if(a==="home"){ VIEW.sid=null; saveView(); render(); }
    else if(a==="open"){ VIEW.sid=b.getAttribute("data-sid"); if(b.hasAttribute("data-mode")){ VIEW.mode=b.getAttribute("data-mode"); VIEW.bi=+b.getAttribute("data-bi")||0; } saveView(); render(); }
    else if(a==="mode"){ VIEW.mode=b.getAttribute("data-mode"); saveView(); render(); }
    else return;
    window.scrollTo(0, root.getBoundingClientRect().top+window.scrollY-8);
  }
  var CSS=
".ms{--g:var(--green,#2f6b4f);--gd:var(--green-deep,#16352a);--ln:var(--line,#d2dacb);--cd:var(--card,#fbfcf6);--ik:var(--ink,#1a2820);--is:var(--ink-soft,#41564a);--im:var(--ink-mute,#7a8c80);--vm:#a23b2b;--mono:'JetBrains Mono',monospace}"+
".ms *{box-sizing:border-box;font-variant-ligatures:none}.ms pre{margin:0}"+
".ms-k{font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--is);margin:18px 0 8px}"+
".ms-lead{font-size:16px;line-height:1.45;color:var(--is);margin:4px 0 14px;text-wrap:pretty}"+
".ms-empty{font-family:var(--mono);font-size:12px;color:var(--im);padding:10px 0}"+
".ms-due,.ms-list{display:flex;flex-direction:column;gap:10px}"+
".ms-dcard,.ms-scard{all:unset;box-sizing:border-box;display:flex;gap:10px;align-items:center;justify-content:space-between;background:var(--cd);border:1px solid var(--ln);border-radius:12px;padding:12px 14px;cursor:pointer;min-height:48px;font-family:var(--mono);font-size:12.5px;color:var(--ik)}"+
".ms-dcard{border-color:var(--vm);box-shadow:inset 3px 0 0 var(--vm)}"+
".ms-scard{flex-direction:column;align-items:flex-start;gap:6px;padding:14px 16px}.ms-scard:hover,.ms-dcard:hover{border-color:var(--sage,#7fa68b)}"+
".ms-st{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:21px;line-height:1.1;word-break:break-word}"+
".ms-sw{font-family:'EB Garamond',serif;font-size:15px;color:var(--is)}"+
".ms-prog{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:11px;color:var(--g);font-weight:600}"+
".ms-soon{cursor:default;opacity:.55}"+
".ms-sync{font-family:var(--mono);font-size:10.5px;color:var(--im);margin-top:16px}.ms-sync.bad{color:var(--vm)}"+
".ms-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.ms-top .ms-sync{margin:0}"+
".ms-back,.ms-link{all:unset;cursor:pointer;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--g);padding:10px 0}"+
".ms-title{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:clamp(26px,6vw,34px);line-height:1;margin:6px 0 4px;word-break:break-word}"+
".ms-what{font-size:16px;color:var(--is);margin:0 0 14px}"+
".ms-modes{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -2px 16px;padding:2px}.ms-modes::-webkit-scrollbar{display:none}"+
".ms-mode{flex:0 0 auto;position:relative;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--is);background:var(--cd);border:1px solid var(--ln);border-radius:10px;padding:0 14px;height:44px;cursor:pointer}"+
".ms-mode.on{background:var(--gd);border-color:var(--gd);color:#eaf2ea}"+
".ms-dot{position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--vm)}"+
".ms-card{background:var(--cd);border:1px solid var(--ln);border-radius:12px;padding:14px;margin-bottom:12px}"+
".ms-ch{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-family:var(--mono);font-size:13px}.ms-ch b{flex:1;min-width:0}"+
".ms-bn{flex:0 0 auto;width:24px;height:24px;border-radius:7px;background:var(--gd);color:#eaf2ea;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}"+
".ms-ln{font-size:10.5px;color:var(--im);white-space:nowrap}"+
".ms-code{font-family:var(--mono);font-size:12px;line-height:1.65;background:var(--paper-2,#f4f5ec);border:1px solid var(--ln);border-radius:9px;padding:10px 12px 10px 6px;overflow-x:auto;white-space:pre;color:var(--ik)}"+
".ms-no{display:inline-block;width:2.4em;text-align:right;margin-right:10px;color:var(--im);opacity:.7;user-select:none}"+
".ms-hint{display:flex;gap:8px;font-size:15px;line-height:1.4;color:var(--is);margin:10px 0 0}.ms-hint span{font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--vm);padding-top:3px}"+
".ms-note{width:100%;margin-top:12px;font-family:'EB Garamond',serif;font-size:16px;line-height:1.45;color:var(--ik);background:#fff;border:1.5px solid var(--ln);border-radius:9px;padding:10px 12px;resize:vertical;min-height:84px;outline:none}.ms-note:focus{border-color:var(--g)}"+
".ms-built,.ms-pool{display:flex;flex-direction:column;gap:6px}"+
".ms-chunk{all:unset;box-sizing:border-box;display:flex;gap:6px;align-items:flex-start;min-height:44px;padding:9px 10px;background:var(--cd);border:1px solid var(--ln);border-radius:9px;cursor:pointer;overflow-x:auto}"+
".ms-chunk pre{font-family:var(--mono);font-size:12px;line-height:1.55;white-space:pre;color:var(--ik)}.ms-chunk.placed{background:#eef4ec;border-color:var(--sage,#7fa68b)}.ms-chunk .ms-no{width:1.6em;margin-right:4px;font-family:var(--mono);font-size:11px;padding-top:1px}"+
".ms-ind{color:var(--sage,#7fa68b);opacity:.8}"+
".ms-gapcode{line-height:2}"+
".ms-gap{font-family:var(--mono);font-size:12px;width:min(32ch,70vw);height:28px;vertical-align:middle;resize:none;overflow:hidden;white-space:pre;border:1.5px dashed var(--g);border-radius:6px;background:#fff;padding:4px 7px;color:var(--ik);outline:none}.ms-gap:focus{border-style:solid}"+
".ms-gm{font-weight:700;margin-left:6px}.ms-gm.ok{color:var(--g)}.ms-gm.near{color:var(--brass,#a98a4b)}.ms-gm.bad{color:var(--vm)}"+
".ms-keys{position:sticky;bottom:0;z-index:5;margin-top:12px}"+
".ms-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}"+
".ms-btn{font-family:var(--mono);font-size:12.5px;font-weight:700;color:#fff;background:var(--g);border:1px solid var(--g);border-radius:10px;padding:0 18px;height:46px;cursor:pointer}.ms-btn:disabled{opacity:.5;cursor:default}.ms-btn.ghost{background:var(--cd);color:var(--g);border-color:var(--ln)}"+
".ms-out{margin-top:12px}.ms-wait{font-family:var(--mono);font-size:12px;color:var(--is);padding:12px 0}"+
".ms-verdict{font-family:var(--mono);font-size:13px;font-weight:700;padding:11px 13px;border-radius:9px;margin-bottom:8px}.ms-verdict.ok{background:#e3efe6;color:#1f5a3f}.ms-verdict.bad{background:#f6e6e1;color:var(--vm)}"+
".ms-srmsg{font-size:15px;color:var(--is);margin:0 0 10px}"+
".ms-tb{font-family:var(--mono);font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:#2a1714;color:#f3cfc6;border-radius:9px;padding:10px 12px;margin-bottom:10px}"+
".ms-cmp{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:10px}.ms-cmp .ms-k{margin:4px 0 6px}"+
".ms-o{font-family:var(--mono);font-size:11.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;background:#0f241c;color:#bfe3cc;border-radius:9px;padding:10px 12px;min-height:40px}.ms-o i{color:#6f8c7e}"+
".ms-diff{color:#ffb4a6;background:rgba(255,120,100,.14);font-weight:600}"+
".ms-tree,.ms-peek,.ms-log{margin-top:12px;border:1px solid var(--ln);border-radius:10px;background:var(--cd);padding:0 12px}"+
".ms-tree summary,.ms-peek summary,.ms-log summary{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--g);padding:13px 0;cursor:pointer}.ms-tree b{color:var(--vm)}"+
".ms-tree[open],.ms-peek[open],.ms-log[open]{padding-bottom:12px}"+
".ms-f{display:flex;justify-content:space-between;gap:10px;font-family:var(--mono);font-size:11.5px;padding:5px 0;border-bottom:1px solid #eef1e9;color:var(--is)}"+
".ms-bpills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}"+
".ms-bp{width:44px;height:44px;border-radius:10px;border:1px solid var(--ln);background:var(--cd);font-family:var(--mono);font-size:13px;font-weight:700;color:var(--is);cursor:pointer;position:relative}"+
".ms-bp.done{background:#e3efe6;border-color:var(--sage,#7fa68b);color:#1f5a3f}.ms-bp.due{border-color:var(--vm);color:var(--vm)}.ms-bp.on{background:var(--gd);border-color:var(--gd);color:#eaf2ea}"+
".ms-quote{margin:0 0 10px;padding:10px 12px;background:#fff;border:1px solid var(--ln);border-radius:9px;font-size:16px;line-height:1.45;color:var(--ik)}"+
".ms-meta{font-size:15px;color:var(--is);margin:8px 0 0;line-height:1.4}.ms-meta code,.ms-tree code{font-family:var(--mono);font-size:11.5px;background:var(--sage-soft,#dde7dd);border-radius:5px;padding:1px 6px}"+
".ms-ed{margin-top:4px}"+
".ms-nrow{padding:8px 0;border-bottom:1px solid #eef1e9;font-size:15px}.ms-nrow b{font-family:var(--mono);font-size:11.5px;color:var(--g)}"+
".ms-lrow{display:grid;grid-template-columns:auto 1fr auto;gap:10px;font-family:var(--mono);font-size:11.5px;padding:6px 0;border-bottom:1px solid #eef1e9;color:var(--is)}.ms-lrow .ok{color:var(--g)}.ms-lrow .bad{color:var(--vm)}"+
".ms-pips{display:inline-flex;gap:3px;flex:0 0 auto}.ms-pips i{width:7px;height:7px;border-radius:50%;border:1px solid var(--sage,#7fa68b)}.ms-pips i.on{background:var(--g);border-color:var(--g)}"+
".ms-fallback{width:100%;min-height:220px;font-family:var(--mono);font-size:12.5px;padding:10px;border:1px solid var(--ln);border-radius:9px}";

  function boot(){
    root=document.getElementById("ms-root"); if(!root) return;
    if(!document.querySelector("style[data-ms]")){ var s=document.createElement("style"); s.setAttribute("data-ms","1"); s.textContent=CSS; document.head.appendChild(s); }
    root.addEventListener("click", onRootClick);
    render();
    var sb=sbc();
    if(sb && sb.auth){
      sb.auth.getSession().then(function(r){ msUser=r.data && r.data.session ? r.data.session.user : null; pull(); });
      sb.auth.onAuthStateChange(function(_e, session){ var u=session?session.user:null; var was=msUser&&msUser.id; msUser=u; if((u&&u.id)!==was) pull(); else paintSync(); });
    }
  }
  window.MyScripts = { render:render, dueCount:function(){ return dueItems().length; } };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
