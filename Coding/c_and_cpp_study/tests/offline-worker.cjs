/* Real worker code, Fetch/Response/crypto APIs; in-memory Cache Storage emulator.
   This is not a browser test. Run offline-browser.cjs separately. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../..');
const base='https://example.test/Commonplace/Coding/c_and_cpp_study/';
class Cache {
 constructor(){this.items=new Map();}
 url(r){return typeof r==='string'?r:r.url||r.href;}
 async put(r,s){this.items.set(this.url(r),s.clone());}
 async match(r,opts={}){const u=this.url(r);for(const [k,v] of this.items)if(k===u||opts.ignoreSearch&&k.split('?')[0]===u.split('?')[0])return v.clone();}
 async keys(r,opts={}){const u=r&&this.url(r);return [...this.items.keys()].filter(k=>!u||k===u||opts.ignoreSearch&&k.split('?')[0]===u.split('?')[0]).map(url=>({url}));}
 async delete(r){return this.items.delete(this.url(r));}
}
const stores=new Map();const caches={open:async n=>{if(!stores.has(n))stores.set(n,new Cache());return stores.get(n);},keys:async()=>[...stores.keys()],delete:async n=>stores.delete(n)};
let offline=false,fail=null,requests=[],override=new Map();
function worker(manifest){
 const handlers={};
 const ctx=vm.createContext({URL,Request,Response,Headers,AbortController,crypto,console,setTimeout,clearTimeout,Map,Uint8Array,
  caches,location:new URL(base+'sw.js'),clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(n,f)=>handlers[n]=f,
  fetch:async url=>{
   url=String(url);requests.push(url);if(offline||fail&&url.includes(fail))throw new Error('Test connection interrupted');
   const clean=new URL(url).pathname.replace('/Commonplace/','');
   const p=path.join(repo,decodeURIComponent(clean));
   if(!fs.existsSync(p))return new Response('not found',{status:404});
   return new Response(override.get(clean)||fs.readFileSync(p),{headers:{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':'text/plain'}});
  }});
 ctx.self=ctx;ctx.importScripts=()=>vm.runInContext(manifest||fs.readFileSync(path.join(root,'offline-assets.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);
 return {ctx,handlers,assets:ctx.CPP_PACK.assets};
}
async function dispatch(w,type){let p,final;w.handlers.message({data:{type},ports:[{postMessage:x=>{if(!x.progress)final=x;}}],waitUntil:x=>p=x});await p;return final;}
async function fetchThrough(w,url,mode='navigate'){let p;w.handlers.fetch({request:{url,method:'GET',mode},respondWith:x=>p=x});return p?await p:null;}
(async()=>{
 let w=worker();assert.ok(w.assets.length>180);
 let install;requests=[];w.handlers.install({waitUntil:p=>install=p});await install;
 assert.equal(requests.length,3);assert.ok(requests.every(u=>/offline/.test(u)));
 const other=await caches.open('cp-python-downloads-v1');await other.put(base+'other',new Response('untouched'));
 fail='lessons/C_Book_Lesson_2_1.html';let s=await dispatch(w,'download');assert.match(s.error,/interrupted/);
 s=await dispatch(w,'status');assert.ok(s.done>10&&s.done<s.total);const completed=s.done;
 requests=[];fail=null;s=await dispatch(w,'download');assert.equal(s.ready,true);assert.equal(requests.length,s.total-completed);
 console.log('PASS small installation, interruption, verified resume without refetching completed files');
 const pack=await caches.open('cp-cpp-downloads-v1');const keys=await pack.keys();await pack.put(keys[0],new Response('corrupt'));
 s=await dispatch(w,'status');assert.equal(s.ready,false);requests=[];s=await dispatch(w,'download');assert.equal(s.ready,true);assert.equal(requests.length,1);
 console.log('PASS corrupted stored bytes detected and repaired');
 offline=true;let res=await fetchThrough(w,base+'index.html?old=1');assert.equal(res.status,200);assert.match(await res.text(),/Study offline/);
 res=await fetchThrough(w,base);assert.match(await res.text(),/Study offline/);
 for(const a of w.assets){const r=await fetchThrough(w,new URL(a.url,base).href,'same-origin');assert.ok(r?.ok,a.url);}
 assert.equal(await fetchThrough(w,'https://example.test/Commonplace/Coding/Python/index.html'),null);
 console.log('PASS all saved assets reopen with network disabled and no HTTP cache; unrelated paths bypassed');
 offline=false;
 const gate=w.assets.find(a=>a.url==='../../_lib/gate.js');assert.ok(gate);
 const replacement=Buffer.concat([fs.readFileSync(path.join(repo,'_lib/gate.js')),Buffer.from('\n// test newer login revision\n')]);
 const changed={...gate,bytes:replacement.length,revision:require('node:crypto').createHash('sha256').update(replacement).digest('hex')};
 const manifest='self.CPP_PACK='+JSON.stringify({version:'next-test-release',assets:w.assets.map(a=>a===gate?changed:a)});
 override.set('_lib/gate.js',replacement);w=worker(manifest);s=await dispatch(w,'status');assert.equal(s.ready,false);assert.equal(s.total-s.done,1);
 offline=true;res=await fetchThrough(w,new URL(gate.url,base).href);assert.ok(res.ok); // older pack retained
 offline=false;requests=[];s=await dispatch(w,'download');assert.equal(s.ready,true);assert.equal(requests.length,1);
 assert.equal(await (await other.match(base+'other')).text(),'untouched');
 console.log('PASS shared-file update downloads only changed file; old pack fallback; other section preserved');
 // Compile every inline script, including the recovery page, without executing UI code.
 for(const name of ['index.html','cpp_playground.html','offline-repair.html']){
  const html=fs.readFileSync(path.join(root,name),'utf8');
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/src=|application\/json/.test(match[1]))new vm.Script(match[2],{filename:name});
 }
 console.log('PASS page JavaScript syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
