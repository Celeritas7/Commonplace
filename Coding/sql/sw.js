/* SQL only. Installation downloads just worker code + manifest; packs are explicit. */
importScripts('offline-assets.js');
const PACK = 'cp-sql-downloads-v1';
const SHELL = 'cp-sql-shell-v1';
const root = new URL('./', self.location.href);
const assets = SQL_OFFLINE_ASSETS;
const urlOf = a => new URL(a.url, root).href;
const keyOf = a => { const u = new URL(urlOf(a)); u.searchParams.set('__sql_revision', a.revision); return u.href; };
const byURL = new Map(assets.map(a => [urlOf(a), a]));
let downloading = false;
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
async function hash(data) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), b => b.toString(16).padStart(2,'0')).join(''); }
async function status() {
  const cache = await caches.open(PACK);
  let done = 0, remainingBytes = 0;
  // Verify bodies, not a flag or merely a list of cache keys.
  for (const a of assets) {
    const r = await cache.match(keyOf(a));
    if (r && await hash(await r.arrayBuffer()) === a.revision) done++;
    else { remainingBytes += a.bytes; if (r) await cache.delete(keyOf(a)); }
  }
  return {done,total:assets.length,bytes:assets.reduce((s,a)=>s+a.bytes,0),remainingBytes,ready:done===assets.length};
}
async function download(port) {
  if (downloading) throw Error('A download is running. Keep its screen open and retry shortly.');
  downloading = true;
  const cache = await caches.open(PACK);
  let done = 0;
  let remainingBytes = (await status()).remainingBytes;
  const totalBytes = assets.reduce((s,a)=>s+a.bytes,0);
  try {
    for (const a of assets) {
      const old = await cache.match(keyOf(a));
      if (!old || await hash(await old.arrayBuffer()) !== a.revision) {
        const abort = new AbortController();
        const timer = setTimeout(()=>abort.abort(),45000);
        const heartbeat = setInterval(()=>port.postMessage({progress:true,done,total:assets.length,bytes:totalBytes,remainingBytes,file:a.url}),5000);
        try {
          const r = await fetch(urlOf(a),{cache:'no-store',signal:abort.signal});
          if (!r.ok || r.type==='opaque') throw Error('HTTP '+r.status);
          const data = await r.arrayBuffer();
          if (await hash(data)!==a.revision) throw Error('File version mismatch. The site may be updating. Repair setup while online, then resume.');
          await cache.put(keyOf(a),new Response(data,{headers:r.headers}));
          // A verified pack update also supersedes older network-fetched shell files.
          await (await caches.open(SHELL)).put(urlOf(a),new Response(data,{headers:r.headers}));
          remainingBytes -= a.bytes;
          // Keep previous revisions: incomplete updates and repair must not destroy working packs.
        } catch (e) {
          throw Error('Paused at '+a.url+': '+(e.name==='QuotaExceededError'?'Not enough device storage':e.name==='AbortError'?'Connection timed out':e.message)+'. Completed files are kept.');
        } finally { clearTimeout(timer); clearInterval(heartbeat); }
      }
      done++;
      port.postMessage({progress:true,done,total:assets.length,bytes:totalBytes,remainingBytes,file:a.url});
    }
  } finally { downloading=false; }
}
self.addEventListener('message',e=>{
  if(e.data==='skip-waiting'){self.skipWaiting();return;}
  const p=e.ports[0]; if(!p || !['sql-status','sql-download'].includes(e.data.type))return;
  e.waitUntil((async()=>{try{if(e.data.type==='sql-download')await download(p);p.postMessage(await status());}catch(err){p.postMessage({error:err.message});}})());
});
self.addEventListener('fetch',e=>{
  const req=e.request,u=new URL(req.url);
  if(req.method!=='GET'||u.origin!==root.origin)return;
  u.search='';u.hash='';if(u.href===root.href)u.pathname+='index.html';
  const a=byURL.get(u.href);
  if(!a)return; // API traffic and other sections are never cached here.
  e.respondWith((async()=>{
    const pack=await caches.open(PACK),shell=await caches.open(SHELL);
    const saved=await pack.match(keyOf(a));
    // Runtime binaries are immutable within this manifest. Pages/scripts get bounded network-first refresh.
    if(saved && u.pathname.includes('/_lib/sqljs/'))return saved;
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),3500);
    try {
      const live=await fetch(req,{cache:'no-store',signal:abort.signal});
      if(live.ok){await shell.put(u.href,live.clone());return live;}
    }catch(_){}finally{clearTimeout(timer);}
    const hit=await shell.match(u.href);
    // Prefer the most recently fetched page/script, so an online login fix
    // cannot revert to an older explicit pack on the next offline launch.
    if(hit)return hit;
    if(saved)return saved;
    const previous=await pack.match(urlOf(a),{ignoreSearch:true});if(previous)return previous;
    return new Response(req.mode==='navigate'?'This SQL page is not downloaded. Reconnect and open Study offline.':'Offline file not saved',{status:503,headers:{'Content-Type':'text/plain'}});
  })());
});
