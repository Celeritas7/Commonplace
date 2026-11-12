/* Worker integration using Fetch/WebCrypto and persistent CacheStorage test adapter.
   This complements (does not replace) real browser tests. */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),scope='https://study.test/Commonplace/Coding/sql/';
const stores=new Map(),requests=[];let fail='',offline=false,hang=false;
function cache(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async match(k,opts){k=typeof k==='string'?k:k.url;let r=map.get(k);if(!r&&opts?.ignoreSearch)for(const [key,value]of map)if(key.split('?')[0]===k.split('?')[0]){r=value;break;}return r?.clone()},async put(k,r){map.set(typeof k==='string'?k:k.url,r.clone())},async delete(k){return map.delete(typeof k==='string'?k:k.url)},async keys(){return [...map.keys()].map(k=>new Request(k))}}}
const caches={async open(n){return cache(n)},async keys(){return [...stores.keys()]},async delete(n){return stores.delete(n)}};
function boot(assets){
 const listeners={};const self={location:{href:scope+'sw.js',origin:'https://study.test'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 const ctx=vm.createContext({self,URL,Map,Response,Request,Headers,AbortController,crypto:require('node:crypto').webcrypto,Uint8Array,setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,150)),clearTimeout,setInterval,clearInterval,caches,
 importScripts(){},SQL_OFFLINE_ASSETS:assets,fetch:async(req,opts)=>{const url=typeof req==='string'?req:req.url;requests.push(url);if(offline)throw Error('offline');if(hang)return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError'))));let file=path.join(root,decodeURIComponent(new URL(url).pathname.replace('/Commonplace/','')));if(url.includes(fail)&&fail)return new Response('interrupted');return new Response(fs.readFileSync(file),{headers:{'Content-Type':file.endsWith('.wasm')?'application/wasm':'text/javascript'}})}});
 vm.runInContext(fs.readFileSync(path.join(root,'Coding/sql/sw.js'),'utf8'),ctx);
 return {ctx,listeners};
}
const manifest=fs.readFileSync(path.join(root,'Coding/sql/offline-assets.js'),'utf8');const assets=JSON.parse(manifest.slice(manifest.indexOf('['),manifest.lastIndexOf(']')+1));
(async()=>{
 let w=boot(assets);let p;w.listeners.install({waitUntil:v=>p=v});await p;assert.equal(requests.length,0);
 fail='sql-wasm.wasm';await assert.rejects(vm.runInContext('download({postMessage(){}})',w.ctx),/Paused at/);let st=await vm.runInContext('status()',w.ctx);assert(!st.ready&&st.done>0);const count=requests.length;
 fail='';await vm.runInContext('download({postMessage(){}})',w.ctx);st=await vm.runInContext('status()',w.ctx);assert(st.ready);assert(requests.length-count<5);
 console.log('PASS install has no pack fetch; interrupted download resumes without refetching completed files');
 const pack=await caches.open('cp-sql-downloads-v1');const runtime=(await pack.keys()).find(k=>k.url.includes('sql-wasm.wasm'));await pack.put(runtime,new Response('corrupt'));assert(!(await vm.runInContext('status()',w.ctx)).ready);await vm.runInContext('download({postMessage(){}})',w.ctx);
 offline=true;w=boot(assets);for(const a of assets){let response;w.listeners.fetch({request:new Request(new URL(a.url,scope)),respondWith:p=>response=p});assert(response);const r=await response;assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,a.bytes);}
 console.log('PASS fresh worker serves all pack assets without network or HTTP cache; corrupted body detected and repaired');
 offline=false;const revised=assets.map(a=>({...a}));revised[0].revision='new-version';w=boot(revised);assert(!(await vm.runInContext('status()',w.ctx)).ready);offline=true;let fallback;w.listeners.fetch({request:new Request(new URL(revised[0].url,scope)),respondWith:p=>fallback=p});assert.equal((await fallback).status,200);
 offline=false;hang=true;await assert.rejects(vm.runInContext('download({postMessage(){}})',w.ctx),/timed out/);hang=false;
 assert.equal((await pack.keys()).length,assets.length);
 console.log('PASS new manifest detects changed file, retains previous pack during incomplete update, connection times out visibly');
 // A newer login script fetched online must survive a cold offline reopen.
 const gateAsset=assets.find(a=>a.url==='../../_lib/gate.js');
 const oldRevision=require('node:crypto').createHash('sha256').update('old login code').digest('hex');
 const oldAssets=assets.map(a=>a===gateAsset?{...a,revision:oldRevision,bytes:14}:a);
 const gateKey=new URL(gateAsset.url,scope);gateKey.searchParams.set('__sql_revision',oldRevision);
 await pack.put(gateKey.href,new Response('old login code'));
 offline=false;w=boot(oldAssets);let onlineGate;
 w.listeners.fetch({request:new Request(new URL(gateAsset.url,scope)),respondWith:p=>onlineGate=p});
 const currentGate=await (await onlineGate).text();
 offline=true;let offlineGate;
 w.listeners.fetch({request:new Request(new URL(gateAsset.url,scope)),respondWith:p=>offlineGate=p});
 assert.equal(await (await offlineGate).text(),currentGate,'online login fix must not revert to old downloaded code offline');
 console.log('PASS refreshed login code survives offline reopening without deleting packs');
 const init=require(path.join(root,'_lib/sqljs/sql-wasm.js'));const SQL=await init({wasmBinary:fs.readFileSync(path.join(root,'_lib/sqljs/sql-wasm.wasm'))});const db=new SQL.Database();db.run('CREATE TABLE t(x); INSERT INTO t VALUES(3),(7);');assert.equal(db.exec('SELECT SUM(x) FROM t')[0].values[0][0],10);
 const seed=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'Coding/sql/Practice/sqlzoo-seed.js'),'utf8'),seed);db.run(seed.window.SQLZOO_SEED);assert(db.exec('SELECT COUNT(*) FROM world')[0].values[0][0]>0);
 const ex=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'Coding/sql/Practice/sqlzoo-exercises.js'),'utf8'),ex);let n=0;for(const e of ex.window.SQLZOO_EXERCISES){if(e.sol){const d=new SQL.Database();d.run(seed.window.SQLZOO_SEED);d.exec(e.sol);d.close();n++;}}
 console.log('PASS actual bundled SQLite WASM executes CREATE/INSERT/SELECT and '+n+' exercise reference queries');
})().catch(e=>{console.error(e);process.exitCode=1});
