/* Node regression tests for the real service-worker code, with an in-memory Cache API. */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../../..'), base='https://test.invalid/Commonplace/Coding/Python/';
const stores=new Map(),handlers={};let online=true,corrupt='',fetches=0,quota=false;
function url(r){return typeof r==='string'?new URL(r,base).href:r.url;}
function equal(a,b,options={}){if(options.ignoreSearch){a=a.split('?')[0];b=b.split('?')[0];}return a===b;}
const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {
 async match(r,o){for(const [k,v] of m)if(equal(k,url(r),o))return v.clone();},
 async put(r,res){if(quota){const e=new Error('quota');e.name='QuotaExceededError';throw e;}m.set(url(r),res.clone());},
 async keys(r,o){return [...m.keys()].filter(k=>!r||equal(k,url(r),o)).map(k=>new Request(k));},
 async delete(r){return m.delete(url(r));},async add(r){await this.put(r,await fetcher(r));}
};},async keys(){return [...stores.keys()];},async delete(n){return stores.delete(n);}};
async function fetcher(r){fetches++;if(!online)throw new Error('Offline');let file=decodeURIComponent(new URL(url(r)).pathname).replace('/Commonplace/','');if(file.endsWith('/'))file+='index.html';const data=file.endsWith(corrupt)&&corrupt?'portal':fs.existsSync(path.join(root,file))?fs.readFileSync(path.join(root,file)):null;const res=new Response(data||'Not found',{status:data?200:404,headers:{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'}});Object.defineProperty(res,'type',{value:'basic'});return res;}
const ctx=vm.createContext({URL,Request,Response,Headers,Map,AbortController,setTimeout,clearTimeout,setInterval,clearInterval,Uint8Array,crypto:webcrypto,caches,fetch:fetcher,console});
ctx.self={location:{href:base+'sw.js',origin:new URL(base).origin},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(n,f)=>(handlers[n]||=[]).push(f)};
ctx.importScripts=(...names)=>names.forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,'Coding/Python',n),'utf8'),ctx));
vm.runInContext(fs.readFileSync(path.join(root,'Coding/Python/sw.js'),'utf8'),ctx);
async function request(relative,mode='cors'){let output,waits=[];handlers.fetch[0]({request:{url:new URL(relative,base).href,method:'GET',mode},respondWith:p=>output=p,waitUntil:p=>waits.push(p)});const res=await output;await Promise.all(waits);return res;}
(async()=>{
 assert.equal((await ctx.packStatus()).basic.ready,false);
 corrupt='python_stdlib.zip';let progress=0;
 await assert.rejects(()=>ctx.downloadPack('basic',{postMessage:()=>progress++}),/unexpected file/);
 assert.ok(progress>0);assert.equal((await ctx.packStatus()).basic.ready,false);
 corrupt='';await ctx.downloadPack('basic',{postMessage(){}});assert.equal((await ctx.packStatus()).basic.ready,true);
 console.log('PASS: corrupt response rejected; interrupted download resumed and verified');
 online=false;
 let before=fetches;assert.equal((await request('../../_lib/pyodide/pyodide.asm.wasm')).status,200);assert.equal(fetches,before);
 assert.match(await (await request('./','navigate')).text(),/Study offline/);
 assert.match(await (await request('shelf.html?topic=functions','navigate')).text(),/Shelf/);
 const page=await request('libraries/numpy.html','navigate');assert.equal(page.headers.get('Cross-Origin-Opener-Policy'),'same-origin');
 assert.match(await (await request('missing.html','navigate')).text(),/not cached yet/);
 console.log('PASS: offline root, query URLs, isolation headers, fallback; runtime makes no network request');
 await caches.open('cp-py-v45');await caches.open('other-app');let waits=[];handlers.activate[0]({waitUntil:p=>waits.push(p)});await Promise.all(waits);
 assert.ok(stores.has('cp-python-downloads-v1'));assert.ok(stores.has('other-app'));assert.ok(!stores.has('cp-py-v45'));
 assert.equal((await ctx.packStatus()).basic.ready,true);
 const cache=await caches.open(ctx.PACK_CACHE),asset=ctx.self.CP_OFFLINE_ASSETS.basic.find(a=>a.url.endsWith('python_stdlib.zip'));
 await cache.delete(ctx.packKey(asset));assert.equal((await ctx.packStatus()).basic.ready,false);
 online=true;quota=true;await assert.rejects(()=>ctx.downloadPack('basic',{postMessage(){}}),/Not enough storage/);quota=false;
 await ctx.downloadPack('basic',{postMessage(){}});
 await ctx.downloadPack('science',{postMessage(){}});assert.equal((await ctx.packStatus()).science.ready,true);
 console.log('PASS: updates preserve packs/other apps; missing storage detected; quota error recoverable; science pack complete');
 console.log('ALL SERVICE-WORKER REGRESSION CHECKS PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});
