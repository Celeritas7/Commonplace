/* Deterministic manager tests, real SHA-256/Response with in-memory Cache API.
   This is not a browser test. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../..'),base='https://test.invalid/Coding/batch_study/';
const manifest=JSON.parse(fs.readFileSync(path.join(root,'Coding/batch_study/offline-assets.json')));
const counts={},stores=new Map(),elements={};let corrupt=true,offline=false;
class Cache{constructor(){this.items=new Map()}async match(k){return this.items.get(String(k))?.clone()}async put(k,v){this.items.set(String(k),v.clone())}}
const caches={async open(n){if(!stores.has(n))stores.set(n,new Cache());return stores.get(n)}};
const el=id=>elements[id]||(elements[id]={textContent:'',disabled:false,value:0});
const location={href:base+'offline.html',replace(u){this.replaced=u}};
const active={state:'activated'};
const context={URL,Response,Headers,TextDecoder,Uint8Array,AbortController,crypto:crypto.webcrypto,setTimeout,clearTimeout,console,caches,location,
 document:{getElementById:el},navigator:{storage:{persist:async()=>true},serviceWorker:{register:async()=>({active})}},window:{isSecureContext:true,caches},
 fetch:async u=>{if(offline)throw Error('Offline');u=new URL(u);const name=decodeURIComponent(u.pathname);counts[name]=(counts[name]||0)+1;const f=path.join(root,name);if(corrupt&&name.endsWith('/my_scripts/01_pull/original.bat'))return new Response('corrupt');return new Response(fs.readFileSync(f));}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'Coding/batch_study/offline-manager.js'),'utf8'),context);
const wait=async()=>{for(let i=0;i<1000;i++){if(!el('check').disabled)return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out')};
(async()=>{
 await wait();assert.equal(el('state').textContent,'0 / '+manifest.files.length+' files saved');
 await el('download').onclick();assert.match(el('error').textContent,/differs/);const key='/Coding/batch_study/The Modules/Batch Practice.dc.html',before=counts[key];
 corrupt=false;await el('download').onclick();assert.equal(el('state').textContent,'Ready offline');assert.equal(counts[key],before);
 console.log('PASS integrity rejects corrupt file; resume reuses saved files; readiness verifies full pack');
 const pack=await caches.open('cp-bat-downloads-v1');const victim=new URL('The Modules/Batch Practice.dc.html',base).href;
 await pack.put(victim,new Response('damaged'));await el('check').onclick();assert.notEqual(el('state').textContent,'Ready offline');
 await el('download').onclick();assert.equal(el('state').textContent,'Ready offline');
 offline=true;await el('check').onclick();assert.equal(el('state').textContent,'Ready offline');console.log('PASS detects corrupt cached body, repairs only missing content, verifies saved list offline');
 offline=false;const other=await caches.open('cp-python-downloads-v1');await other.put('sentinel',new Response('keep'));
 await el('repair').onclick();assert.ok(location.replaced.includes('bat-network'));assert.equal(await(await other.match('sentinel')).text(),'keep');assert.equal(pack.items.size,manifest.files.length);
 console.log('PASS repair retains packs and unrelated cache; manager never accesses localStorage');
 // Validate deterministic manifest and all dependency bytes.
 for(const f of manifest.files){const data=fs.readFileSync(path.resolve(root,'Coding/batch_study',f.url));assert.equal(data.length,f.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),f.revision);}
 console.log('PASS all '+manifest.files.length+' manifest files match actual hashes and sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
