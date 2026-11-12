/* Cache Storage is the source of truth; no localStorage mutations. */
(() => {
  'use strict';
  const ROOT = new URL('./', location.href), PACK = 'cp-bat-downloads-v1', SHELL = 'cp-bat-shell-v1';
  const $ = id => document.getElementById(id), mb = n => (n / 1e6).toFixed(2) + ' MB';
  let manifest, busy = false, stopped = false, aborter;
  const url = name => new URL(name, ROOT).href;
  function bounded(p, ms, label) {
    let timer;
    return Promise.race([p, new Promise((_, reject) => {timer=setTimeout(()=>reject(new Error(label+' timed out. Tap Check / retry.')),ms);})]).finally(()=>clearTimeout(timer));
  }
  async function network(name) {
    aborter = new AbortController();
    const controller = aborter, timer=setTimeout(()=>controller.abort(),20000);
    try {
      const u = new URL(name,ROOT);u.searchParams.set('bat-network',Date.now());
      const r=await fetch(u,{cache:'no-store',signal:controller.signal});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const data=await r.arrayBuffer();
      return {data,headers:r.headers};
    } finally {clearTimeout(timer);if(aborter===controller) aborter=null;}
  }
  async function worker(repair=false) {
    if(!navigator.serviceWorker || !window.isSecureContext || !window.caches) throw new Error('Use Safari over HTTPS with website storage enabled.');
    const reg=await bounded(navigator.serviceWorker.register(url('sw.js')+(repair?'?repair='+Date.now():''),{scope:ROOT.href,updateViaCache:'none'}),25000,'Worker setup');
    // Await this scope, not serviceWorker.ready (which could refer to a parent).
    await bounded(new Promise(resolve=>{
      const deadline=Date.now()+14500;
      const check=()=>{if(Date.now()>deadline)return; if(reg.waiting)reg.waiting.postMessage('skip-waiting');if(reg.active && reg.active.state==='activated' && !reg.installing && !reg.waiting)return resolve();setTimeout(check,100);};check();
    }),15000,'Worker activation');
  }
  async function loadManifest(force=false) {
    const c=await caches.open(SHELL);
    try {
      const {data}=await network('offline-assets.json');
      const m=JSON.parse(new TextDecoder().decode(data));
      if(!Array.isArray(m.files)||!m.files.length)throw new Error('Invalid download list');
      await c.put(url('offline-assets.json'),new Response(data));
      manifest=m;$('message').textContent='Current download list loaded. Keep this screen open; completed files are reused.';
    } catch(e) {
      if(force)throw e;
      const old=await c.match(url('offline-assets.json'));
      if(!old)throw new Error('Cannot load download list. Reconnect and tap Check / retry. '+e.message);
      manifest=await old.json();$('message').textContent='Offline: checking the last saved download list. Reconnect to check for newer content.';
    }
  }
  async function hash(data) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');}
  async function valid(cache,file) {
    const r=await cache.match(url(file.url));if(!r)return false;
    const data=await r.arrayBuffer();return data.byteLength===file.bytes && await hash(data)===file.revision;
  }
  function paint(done,bytes,totalBytes,ready=false) {
    $('progress').value=bytes/totalBytes;
    $('state').textContent=ready?'Ready offline':`${done} / ${manifest.files.length} files saved`;
    $('size').textContent=`${mb(totalBytes)} total · ${mb(bytes)} saved · ${mb(totalBytes-bytes)} remaining`;
    $('download').textContent=ready?'Verify / update download':done?'Resume download':'Download study pack';
  }
  async function verify() {
    const cache=await bounded(caches.open(PACK),10000,'Opening storage'), total=manifest.files.reduce((n,f)=>n+f.bytes,0);
    let done=0, bytes=0;
    for(const f of manifest.files) {if(await valid(cache,f)){done++;bytes+=f.bytes;}}
    paint(done,bytes,total,done===manifest.files.length);
    return {done,bytes,total};
  }
  function lock(value) {busy=value;['check','download','repair'].forEach(id=>$(id).disabled=value);$('pause').disabled=!value;}
  function fail(e) {$('error').textContent=(e.name==='QuotaExceededError'?'Storage is full. Free space without clearing website data.':e.message)+' Saved work and completed downloads are kept.';}
  async function check() {
    if(busy)return;lock(true);$('error').textContent='';$('state').textContent='Checking downloads…';
    try {await worker();await bounded(loadManifest(),25000,'Download list');await bounded(verify(),20000,'Storage verification');}
    catch(e){$('state').textContent='Check needs attention';fail(e);}
    finally{lock(false);}
  }
  $('download').onclick=async()=>{
    if(busy)return;lock(true);stopped=false;$('error').textContent='';
    try {
      if(!manifest){await worker();await bounded(loadManifest(),25000,'Download list');}
      if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
      const cache=await bounded(caches.open(PACK),10000,'Opening storage'), total=manifest.files.reduce((n,f)=>n+f.bytes,0);
      let done=0,bytes=0;
      // Count every saved file first, so resume progress never drops back to zero.
      const missing=[];
      for(const f of manifest.files){if(await bounded(valid(cache,f),10000,'Storage read')){done++;bytes+=f.bytes;}else missing.push(f);}
      paint(done,bytes,total);
      for(const f of missing) {
        if(stopped)throw new Error('Download paused. Tap Resume download.');
        $('state').textContent='Downloading '+f.url;
        try {
          const {data,headers}=await network(f.url);
          if(data.byteLength!==f.bytes || await hash(data)!==f.revision)throw new Error('File differs from the download list. Tap Check / retry to refresh the list after deployment finishes.');
          await bounded(cache.put(url(f.url),new Response(data,{headers})),10000,'Saving file');
        } catch(e){throw new Error((stopped?'Download paused':`Could not save ${f.url}: ${e.message}`)+'. Reconnect and resume.');}
        done++;bytes+=f.bytes;paint(done,bytes,total);
      }
      await bounded(verify(),20000,'Final verification');
    }catch(e){fail(e);if(manifest)await bounded(verify(),20000,'Storage verification').catch(fail);}
    finally{lock(false);}
  };
  $('pause').onclick=()=>{stopped=true;aborter?.abort();};
  $('check').onclick=check;
  $('repair').onclick=async()=>{
    if(busy)return;lock(true);$('error').textContent='';$('repair-result').textContent='Refreshing BAT setup…';
    try {
      await worker(true);
      const cache=await caches.open(SHELL);
      for(const f of ['offline.html','offline-manager.js','index.html']) {
        const {data,headers}=await network(f);await cache.put(url(f),new Response(data,{headers}));
      }
      await bounded(loadManifest(true),25000,'Download list');await bounded(verify(),20000,'Storage verification');
      $('repair-result').textContent='Repair complete. Saved work and packs kept. Reloading fresh setup…';
      location.replace(url('offline.html')+'?bat-network='+Date.now());
    }catch(e){$('repair-result').textContent='Repair needs attention. Retry while connected.';fail(e);}
    finally{lock(false);}
  };
  check();
})();
