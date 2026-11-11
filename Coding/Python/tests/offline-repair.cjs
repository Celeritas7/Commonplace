const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../offline-repair.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function run(failure){
 const nodes={};const node=id=>nodes[id]||(nodes[id]={hidden:true});
 const removed=[];let registered;
 const worker={state:'activated',scriptURL:'https://test.invalid/Commonplace/Coding/Python/sw.js?repair=49',postMessage(message,ports){ports[0].postMessage({basic:{done:230,total:243}});}};
 const nav={serviceWorker:{register(url,options){registered={url,options};return failure?Promise.reject(new Error('Storage blocked')):Promise.resolve({active:worker});}}};
 const caches={keys:async()=>['cp-py-v45','cp-py-v48','cp-python-downloads-v1','another-app'],delete:async n=>removed.push(n)};
 class Channel{constructor(){this.port1={close(){}};this.port2={postMessage:data=>this.port1.onmessage({data})};}}
 vm.runInNewContext(script,{URL,Date,Promise,MessageChannel:Channel,caches,navigator:nav,location:{href:'https://test.invalid/Commonplace/Coding/Python/offline-repair.html?nocache=49'},window:{caches,isSecureContext:true,addEventListener(){}},document:{getElementById:node},setTimeout,clearTimeout});
 await node('repair').onclick();
 assert.deepEqual(removed,['cp-py-v45','cp-py-v48']);assert.equal(registered.options.updateViaCache,'none');
 if(failure){assert.match(node('result').textContent,/Storage blocked/);assert.equal(node('continue').hidden,true);assert.equal(node('repair').disabled,false);}
 else {assert.match(node('result').textContent,/230 \/ 243/);assert.equal(node('continue').hidden,false);assert.match(node('continue').href,/nocache=repair49/);}
 console.log('PASS: repair',failure?'failure is visible':'preserves downloads and other apps, verifies worker');
}
(async()=>{await run(false);await run(true)})().catch(e=>{console.error(e);process.exitCode=1});
