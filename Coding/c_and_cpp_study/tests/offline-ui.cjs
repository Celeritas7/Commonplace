/* Unit tests for timeout UI, account snapshots and existing editor draft storage.
   These execute shipped scripts in VM contexts; they are NOT Safari tests. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const storage=new Map([['cpx.bookmarks','bookmark'],['cpx.marks','highlight and note']]);
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false});return nodes.get(id)};
let flushed=false;const events={};
const ctx=vm.createContext({localStorage,document:{getElementById:el},navigator:{onLine:true},addEventListener:(n,f)=>events[n]=f,
 currentUser:{id:'user-a'},exercises:[{id:'one',title:'Practice'}],cppProblemsFresh:true,__draftFlush:()=>flushed=true});ctx.window=ctx;
vm.runInContext(fs.readFileSync(path.join(root,'lib/offline-practice.js'),'utf8'),ctx);
el('offline-save-problems').onclick();assert.match(el('offline-practice-status').textContent,/Saved 1/);
assert.equal(ctx.cppSavedProblems()[0].id,'one');ctx.currentUser={id:'user-b'};assert.equal(ctx.cppSavedProblems().length,0);
ctx.currentUser={id:'user-a'};ctx.cppProblemsFresh=false;el('offline-save-problems').onclick();assert.match(el('offline-practice-status').textContent,/older snapshot/);
events.pagehide();assert.ok(flushed);assert.equal(storage.get('cpx.bookmarks'),'bookmark');assert.equal(storage.get('cpx.marks'),'highlight and note');
console.log('PASS explicit account snapshot, user isolation, stale snapshot protection, pagehide flush');
// Execute the existing draft controller (leave unrelated skip/mistake UI out).
const html=fs.readFileSync(path.join(root,'cpp_playground.html'),'utf8');
let script=html.match(/<script id="v4-drafts-js">([\s\S]*?)<\/script>/)[1];
script=script.split('  /* ---- Skip:')[0]+'})();';
let source='cout << 55;',change;
const cm={getValue:()=>source,setValue:s=>source=s,on:(_,f)=>change=f,lastLine:()=>0,getLine:()=>source,setCursor:()=>{},refresh:()=>{}};
const draft=vm.createContext({localStorage,cm,document:{addEventListener:()=>{}},addEventListener:()=>{},setTimeout,clearTimeout,setInterval,clearInterval});draft.window=draft;
vm.runInContext(script,draft);draft.__draftFlush();assert.equal(JSON.parse(storage.get('cpp.draft.free')).code,source);
source='';vm.runInContext(script,draft);assert.equal(source,'cout << 55;');
console.log('PASS actual per-item draft save/restore preserves existing annotations');
(async()=>{
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{disabled:false,textContent:''});return elements.get(id)};
 const m=vm.createContext({URL,Promise,Error,isSecureContext:true,navigator:{onLine:true,serviceWorker:{getRegistration:async()=>null,register:()=>new Promise(()=>{})}},document:{currentScript:{src:'https://test/Coding/c_and_cpp_study/lib/offline-manager.js'},getElementById:get},setTimeout:(f)=>setTimeout(f,5),clearTimeout});
 vm.runInContext(fs.readFileSync(path.join(root,'lib/offline-manager.js'),'utf8'),m);
 await new Promise(r=>setTimeout(r,25));assert.equal(get('state').textContent,'Needs attention');assert.match(get('error').textContent,/timed out/);assert.equal(get('check').disabled,false);assert.equal(get('download').disabled,false);
 console.log('PASS hung registration becomes visible error with enabled retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
