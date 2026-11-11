const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../lib/offline-manager.js'),'utf8');
async function scenario(kind){
 const nodes={};const node=id=>nodes[id]||(nodes[id]={textContent:'',disabled:true,value:0});
 for(const p of ['basic','science'])node(p+'-status').textContent='Checking downloads…';
 let registrations=0;
 const state={basic:{ready:false,done:0,total:243,bytes:22000000,remainingBytes:22000000},science:{ready:false,done:0,total:20,bytes:135000000,remainingBytes:135000000}};
 const active={postMessage(data,ports){if(kind!=='silent')queueMicrotask(()=>ports[0].postMessage(state));}};
 const nav={serviceWorker:{register(){registrations++;if(kind==='reject')return Promise.reject(new Error('Storage denied'));return Promise.resolve({active:kind==='pending'?null:active});},ready:new Promise(()=>{}),addEventListener(){}}};
 class Channel{constructor(){this.port1={close(){}};this.port2={postMessage:data=>this.port1.onmessage({data})};}}
 vm.runInNewContext(source,{URL,MessageChannel:Channel,navigator:nav,window:{isSecureContext:true},document:{currentScript:{src:'https://test.invalid/Commonplace/Coding/Python/lib/offline-manager.js?v=48'},getElementById:node,querySelectorAll:()=>Object.values(nodes)},setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,15)),clearTimeout});
 await new Promise(r=>setTimeout(r,70));
 assert.equal(registrations,1,'must register without waiting for window.load');
 if(kind==='success'){assert.equal(node('basic-status').textContent,'Not downloaded');assert.equal(node('basic-download').disabled,false);}
 else {assert.equal(node('basic-status').textContent,'Setup needs attention');assert.equal(node('check').textContent,'Retry setup');assert.equal(node('check').disabled,false);assert.ok(node('basic-error').textContent);}
 console.log('PASS:',kind);
}
(async()=>{for(const kind of ['success','pending','reject','silent'])await scenario(kind);})().catch(e=>{console.error(e);process.exitCode=1});
