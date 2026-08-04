/* Commonplace - progress export/import (injected by make_offline.py) */
(function(){
if(window.__cpBackup)return;window.__cpBackup=1;
function dl(){var d={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);d[k]=localStorage.getItem(k);}
 var blob=new Blob([JSON.stringify({app:"commonplace",exportedAt:new Date().toISOString(),data:d},null,1)],{type:"application/json"});
 var a=document.createElement("a");a.href=URL.createObjectURL(blob);
 a.download="commonplace-progress-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
function imp(){var inp=document.createElement("input");inp.type="file";inp.accept=".json,application/json";
 inp.onchange=function(){var f=inp.files[0];if(!f)return;var r=new FileReader();
  r.onload=function(){try{var j=JSON.parse(r.result),d=j.data||j,n=0;
   Object.keys(d).forEach(function(k){var v=d[k];
    if(k.indexOf("crs::")===0){try{var cur=JSON.parse(localStorage.getItem(k)||"{}"),inc=JSON.parse(v);
     Object.keys(inc).forEach(function(ik){if(inc[ik]==="done")cur[ik]="done";else if(!(ik in cur))cur[ik]=inc[ik];});
     localStorage.setItem(k,JSON.stringify(cur));n++;return;}catch(e){}}
    if(localStorage.getItem(k)===null){localStorage.setItem(k,v);n++;}});
   alert("Imported "+n+" entries. Reloading.");location.reload();
  }catch(e){alert("Could not read that file: "+e.message);}};
  r.readAsText(f);};
 inp.click();}
function boot(){
 var st=document.createElement("style");
 st.textContent=".cpb-pill{position:fixed;left:10px;bottom:10px;z-index:9998;display:flex;gap:6px;align-items:center;font-family:system-ui,-apple-system,sans-serif}.cpb-main{width:30px;height:30px;border-radius:50%;border:1px solid #d8cbb8;background:#fffdf7;color:#8a5a2b;opacity:.4;cursor:pointer;font-size:14px;line-height:1}.cpb-main:hover{opacity:1}.cpb-menu button{font-size:12px;margin-right:6px;padding:5px 10px;border-radius:999px;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)}";
 document.head.appendChild(st);
 var box=document.createElement("div");box.className="cpb-pill";
 box.innerHTML='<button class="cpb-main" title="Backup / restore study progress">&#8645;</button><span class="cpb-menu" hidden><button data-a="ex">Export progress</button><button data-a="im">Import progress</button></span>';
 document.body.appendChild(box);
 box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
  var m=box.querySelector(".cpb-menu");
  if(b.className==="cpb-main"){m.hidden=!m.hidden;return;}
  if(b.getAttribute("data-a")==="ex")dl();else imp();m.hidden=true;});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
