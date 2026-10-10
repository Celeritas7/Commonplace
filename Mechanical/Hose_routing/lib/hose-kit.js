/* hose-kit.js — shared helpers for Hose_routing pages.
   window.HoseKit = { mk, hose, fitting, store, readbar, MONO }
   Storage keys all start with "commonplace_hose_" so Export backup picks them up. */
(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var MONO = "'IBM Plex Mono',monospace";
  function mk(p, n, a, txt){ var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; }

  // A rubber hose along path d, w px wide; optional layline text. Returns {path, tp, set(d)}.
  var uid = 0;
  function hose(g, d, w, text, size){
    var id = 'hosePath' + (++uid), layers = [];
    layers.push(mk(g,'path',{d:d,fill:'none',stroke:'var(--shadow)','stroke-width':w+10,transform:'translate(0,8)',opacity:.6}));
    layers.push(mk(g,'path',{d:d,fill:'none',stroke:'var(--rubber-edge)','stroke-width':w}));
    layers.push(mk(g,'path',{d:d,fill:'none',stroke:'var(--rubber)','stroke-width':w*.8}));
    layers.push(mk(g,'path',{d:d,fill:'none',stroke:'var(--sheen)','stroke-width':w*.36,opacity:.16}));
    layers.push(mk(g,'path',{d:d,fill:'none',stroke:'var(--sheen)','stroke-width':w*.1,opacity:.22}));
    var p = mk(g,'path',{d:d,id:id,fill:'none',stroke:'none'}); layers.push(p);
    var tp = null;
    if (text){ var t = mk(g,'text',{fill:'var(--layline)','font-family':"'Archivo','Arial Narrow',sans-serif",'font-stretch':'70%','font-weight':700,'font-size':size,'letter-spacing':size*.12,dy:size*.36});
      tp = mk(t,'textPath',{href:'#'+id,startOffset:0},text); }
    return { path:p, tp:tp, set:function(nd){ layers.forEach(function(l){ l.setAttribute('d', nd); }); } };
  }

  // Crimped brass fitting at (x,y). dir 1 = hose leaves to the right, -1 = to the left.
  function fitting(g, x, y, dir, h){
    var fl = 72, nx = x - dir*fl, grp = mk(g,'g',{}), gid = 'br' + (++uid);
    var lg = mk(grp,'linearGradient',{id:gid,x1:0,y1:0,x2:0,y2:1});
    [['0','var(--brass-lo)'],['.28','var(--brass-hi)'],['.55','var(--brass)'],['1','var(--brass-lo)']].forEach(function(s){ mk(lg,'stop',{offset:s[0],'stop-color':s[1]}); });
    var fh = h + 12, x0 = Math.min(x, nx);
    mk(grp,'rect',{x:x0,y:y-fh/2,width:fl,height:fh,rx:4,fill:'url(#'+gid+')'});
    for (var i=1;i<6;i++) mk(grp,'rect',{x:x0+i*fl/6-1.5,y:y-fh/2+2,width:3,height:fh-4,fill:'var(--brass-lo)',opacity:.55});
    var hx = dir>0 ? x0-30 : x0+fl, hh = h + 28;
    mk(grp,'rect',{x:hx,y:y-hh/2,width:30,height:hh,rx:3,fill:'url(#'+gid+')'});
    mk(grp,'rect',{x:hx,y:y-hh/2+hh*.33,width:30,height:1.5,fill:'var(--brass-lo)',opacity:.7});
    mk(grp,'rect',{x:hx,y:y+hh/2-hh*.33,width:30,height:1.5,fill:'var(--brass-lo)',opacity:.7});
    return grp;
  }

  var store = {
    get: function(k, d){ try { var v = localStorage.getItem('commonplace_hose_' + k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
    set: function(k, v){ try { localStorage.setItem('commonplace_hose_' + k, JSON.stringify(v)); } catch(e){} }
  };

  // Thin hose along the top of the page that fills as you scroll.
  function readbar(){
    var bar = document.getElementById('readbar'); if (!bar) return;
    var fill = bar.querySelector('i');
    function upd(){ var h = document.documentElement, max = h.scrollHeight - innerHeight; fill.style.width = (max>0 ? Math.min(1, scrollY/max)*100 : 0) + '%'; }
    addEventListener('scroll', upd, {passive:true}); addEventListener('resize', upd); upd();
  }

  window.HoseKit = { mk:mk, hose:hose, fitting:fitting, store:store, readbar:readbar, MONO:MONO };
})();
