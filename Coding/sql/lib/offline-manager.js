(()=>{
  'use strict';
  const root=new URL('./',location.href), $=id=>document.getElementById(id);
  let busy=false,active=null;
  const bounded=(promise,ms,label)=>new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(Error(label+' timed out. Retry while connected.')),ms);
    promise.then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)});
  });
  async function worker(repair=false){
    if(!isSecureContext||!navigator.serviceWorker||!window.caches)throw Error('Open the hosted SQL app in Safari over HTTPS. Offline storage is unavailable here.');
    if(active&&!repair)return active;
    const url=new URL('sw.js'+(repair?'?repair='+Date.now():''),root);
    const reg=await bounded(navigator.serviceWorker.register(url,{scope:root.href,updateViaCache:'none'}),20000,'Worker registration');
    await bounded(new Promise((resolve,reject)=>{
      const deadline=Date.now()+20000;
      function poll(){
        if(reg.waiting)reg.waiting.postMessage('skip-waiting');
        if(!reg.installing&&!reg.waiting&&reg.active?.state==='activated')return resolve();
        if(Date.now()>deadline)return reject(Error('Worker activation timed out. Close other SQL tabs and retry repair.'));
        setTimeout(poll,100);
      }poll();
    }),22000,'Worker activation');
    active=reg.active;return active;
  }
  async function rpc(type,progress){
    const w=await worker();
    return new Promise((resolve,reject)=>{
      const c=new MessageChannel();let timer;
      const finish=(err,data)=>{clearTimeout(timer);c.port1.close();err?reject(err):resolve(data)};
      const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>finish(Error('Download check stopped responding. Tap Retry or Repair. Saved files are kept.')),type==='sql-status'?20000:60000)};
      reset();c.port1.onmessage=e=>{reset();if(e.data.progress){progress?.(e.data);return;}finish(e.data.error?Error(e.data.error):null,e.data)};
      try{w.postMessage({type},[c.port2])}catch(e){finish(e)}
    });
  }
  function size(s){$('size').textContent=(s.bytes/1e6).toFixed(2)+' MB total · '+(s.remainingBytes/1e6).toFixed(2)+' MB remaining';$('progress').value=(s.bytes-s.remainingBytes)/s.bytes;}
  function render(s){size(s);$('status').textContent=s.ready?'Ready offline':s.done?'Download incomplete · '+s.done+' / '+s.total+' files':'Not downloaded';$('download').textContent=s.ready?'Verify saved pack':s.done?'Resume download':'Download SQL pack';}
  function error(e){$('error').textContent=e.message;$('status').textContent='Setup needs attention';active=null;}
  function controls(value){busy=value;document.querySelectorAll('button').forEach(b=>b.disabled=value);}
  async function action(kind){
    if(busy)return;controls(true);$('error').textContent='';
    try{
      if(kind==='repair'){
        $('status').textContent='Refreshing SQL offline support…';active=null;
        await worker(true);
        await bounded((async()=>{for(const k of await caches.keys())if(k.startsWith('cp-sql-shell-')||/^sql-lab-v\d+$/.test(k))await caches.delete(k)})(),10000,'SQL cache repair');
        $('message').textContent='Repair completed. Saved packs and study data were kept. Resume if files need updating.';
      }
      if(kind==='download'){
        $('message').textContent='Keep this screen open. Interrupted downloads resume from completed files.';
        if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
        render(await rpc('sql-download',s=>{size(s);$('status').textContent='Saving '+s.done+' / '+s.total+' files…';}));
        $('message').textContent='Pack verified. Turn off Wi-Fi, reopen SQL and run SELECT 2 + 3 AS answer;';
      }else render(await rpc('sql-status'));
    }catch(e){error(e)}finally{controls(false)}
  }
  $('download').onclick=()=>action('download');$('check').onclick=()=>action('check');$('repair').onclick=()=>action('repair');
  action('check');
})();
