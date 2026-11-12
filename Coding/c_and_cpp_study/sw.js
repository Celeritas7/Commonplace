/* Section-scoped worker. No study data is deleted, even during repair/updates. */
importScripts('offline-assets.js');
const PACK = 'cp-cpp-downloads-v1';
const SHELL = 'cp-cpp-shell-v1';
const ROOT = new URL('./', self.location.href);
const assets = CPP_PACK.assets;
const absolute = a => new URL(a.url, ROOT).href;
const key = a => absolute(a) + '?__cpp_revision=' + a.revision;
const byURL = new Map(assets.map(a => [absolute(a), a]));
const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
const digest = async data => hex(await crypto.subtle.digest('SHA-256', data));
const send = (port, data) => { try { port.postMessage(data); } catch (_) {} };
let downloading = false;
async function network(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {cache:'no-store', signal:controller.signal});
    // Read the body within the deadline too (fetch alone only waits for headers).
    const body = await response.arrayBuffer();
    return new Response(body, {status:response.status, statusText:response.statusText, headers:response.headers});
  } finally { clearTimeout(timer); }
}
async function valid(cache, asset) {
  const res = await cache.match(key(asset));
  if (!res || !res.ok) return false;
  const body = await res.arrayBuffer();
  return body.byteLength === asset.bytes && await digest(body) === asset.revision;
}
function state(done, savedBytes) {
  const bytes = assets.reduce((n,a) => n+a.bytes,0);
  return {version:CPP_PACK.version, done, total:assets.length, bytes, savedBytes,
    remainingBytes:bytes-savedBytes, ready:done===assets.length};
}
async function status(port) {
  const cache = await caches.open(PACK);
  let done=0, savedBytes=0;
  for (let i=0; i<assets.length; i++) {
    const a=assets[i];
    if (await valid(cache,a)) {done++; savedBytes+=a.bytes;}
    if (port && i%10===0) send(port,{progress:true, phase:'Checking saved files', ...state(done,savedBytes)});
  }
  return state(done,savedBytes);
}
async function download(port) {
  if (downloading) throw new Error('A download is already running in another tab. Keep that tab open, then check again.');
  downloading=true;
  let done=0, savedBytes=0;
  try {
    const cache=await caches.open(PACK);
    for (const a of assets) {
      send(port,{progress:true,phase:'Saving '+a.url,...state(done,savedBytes)});
      if (!await valid(cache,a)) {
        try {
          const res=await network(absolute(a),30000);
          if (!res.ok) throw new Error('HTTP '+res.status);
          const body=await res.arrayBuffer();
          if (body.byteLength!==a.bytes || await digest(body)!==a.revision)
            throw new Error('File does not match this release. The site may be updating; tap Check for updates, then resume');
          await cache.put(key(a),new Response(body,{status:200,headers:res.headers}));
          // Preserve earlier versions until the new one is safely written.
          for (const old of await cache.keys(absolute(a),{ignoreSearch:true}))
            if (old.url!==key(a)) await cache.delete(old);
        } catch (e) {
          throw new Error(a.url+': '+(e.name==='QuotaExceededError' ? 'Device storage is full' : e.message)+'. Completed files and study data are kept. Reconnect and resume.');
        }
      }
      done++; savedBytes+=a.bytes;
      send(port,{progress:true,phase:'Saved',...state(done,savedBytes)});
    }
    return await status(port); // Check real bytes, never a stored ready flag.
  } finally { downloading=false; }
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache=await caches.open(SHELL);
  // No lessons, fonts or editor downloaded by installation.
  for (const path of ['offline.html','offline-repair.html','lib/offline-manager.js']) {
    try {const res=await network(new URL(path,ROOT)); if(res.ok) await cache.put(new URL(path,ROOT),res);} catch (_) {}
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  const port=event.ports[0], type=event.data && event.data.type;
  if (!port || !['status','download'].includes(type)) return;
  event.waitUntil((async () => {
    try {send(port,type==='download'?await download(port):await status(port));}
    catch(e){send(port,{error:e.message});}
  })());
});
self.addEventListener('fetch', event => {
  const req=event.request, url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==ROOT.origin||url.searchParams.has('nocache')) return;
  url.search=''; url.hash='';
  if(url.href===ROOT.href) url.pathname+='index.html';
  const asset=byURL.get(url.href);
  const shellFile=['offline.html','offline-repair.html','lib/offline-manager.js'].some(p=>url.href===new URL(p,ROOT).href);
  // Never cache API traffic or unrelated Commonplace sections.
  if(!asset&&!shellFile) return;
  event.respondWith((async () => {
    const cache=await caches.open(PACK), shell=await caches.open(SHELL);
    const saved=asset && await cache.match(key(asset));
    // Pages and scripts get fixes immediately when connected; binaries/fonts stay local.
    if(saved && !/\.(html|js|css|json)$/.test(url.pathname)) return saved;
    try {
      const live=await network(req.url,4000);
      if(live.ok) {if(shellFile) await shell.put(url.href,live.clone()); return live;}
    } catch (_) {}
    if(saved) return saved;
    const cachedShell=await shell.match(url.href);
    if(cachedShell) return cachedShell;
    // An interrupted upgrade can still read the previous saved release.
    if(asset) {const old=await cache.match(absolute(asset),{ignoreSearch:true}); if(old) return old;}
    if(req.mode==='navigate') return new Response('<meta name="viewport" content="width=device-width"><h1>This page is not downloaded</h1><p>Connect and resume the C/C++ study download.</p><a href="'+new URL('offline.html',ROOT)+'">Study offline</a>',{status:503,headers:{'Content-Type':'text/html'}});
    return new Response('Not downloaded',{status:504});
  })());
});
