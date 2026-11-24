/* Web Studio offline preparation. No remembered success flag: ask the worker to
 * read and hash saved files. This module never writes study or account records. */
(() => {
 'use strict';
 const boot=window.WebStudioOfflineBoot;if(boot)boot.started=true;
 const $=id=>document.getElementById(id),root=new URL('./',document.currentScript.src).href;
 const button=$('wb-offline-download'),study=$('wb-offline-study'),check=$('wb-offline-check'),pause=$('wb-offline-pause'),status=$('wb-offline-status'),size=$('wb-offline-size'),bar=$('wb-offline-progress'),error=$('wb-offline-error'),help=$('wb-offline-help'),toggle=$('wb-offline-toggle'),revisionInfo=$('wb-offline-revision');
 let busy=false,downloading=false,workerPromise=null,last=null,checkedAt=0;
 function bounded(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
 function activated(reg){return new Promise((resolve,reject)=>{const deadline=Date.now()+20000;function poll(){if(reg.active?.state==='activated'&&!reg.installing&&!reg.waiting)return resolve(reg.active);if(Date.now()>=deadline)return reject(new Error('Offline support could not activate. Retry while connected, or use Repair Web Studio offline setup below.'));setTimeout(poll,100);}poll();});}
 async function existingWorker(){
  const reg=await bounded(navigator.serviceWorker.getRegistration(root),2000,'The saved offline worker did not respond. Retry setup.');
  if(!reg||reg.scope!==root||reg.active?.state!=='activated')return null;
  const url=new URL(reg.active.scriptURL);url.search='';url.hash='';
  return url.href===root+'sw.js'?reg.active:null;
 }
 async function prepareWorker(){
  // Repair deliberately uses a query on sw.js. Re-registering its queryless
  // URL while disconnected can fail even though the repaired worker is ready.
  if(navigator.onLine===false){const active=await existingWorker();if(active)return active;}
  try{return await bounded(navigator.serviceWorker.register(root+'sw.js',{scope:root,updateViaCache:'none'}).then(activated),25000,'Offline setup timed out. Retry while connected, or use Repair below.');}
  catch(error){const active=await existingWorker().catch(()=>null);if(active)return active;throw error;}
 }
 function worker(){
  if(!navigator.serviceWorker||!window.isSecureContext)return Promise.reject(new Error('Open the hosted Web Studio page in Safari using HTTPS to prepare offline study.'));
  if(!workerPromise)workerPromise=prepareWorker().catch(e=>{workerPromise=null;throw e;});
  return workerPromise;
 }
 async function rpc(type,onProgress){
  const active=await worker();
  return new Promise((resolve,reject)=>{
   const channel=new MessageChannel();let idle,total,finished=false;
   function finish(err,data){if(finished)return;finished=true;clearTimeout(idle);clearTimeout(total);channel.port1.close();if(err){workerPromise=null;reject(err);}else resolve(data);}
   function reset(){clearTimeout(idle);idle=setTimeout(()=>finish(new Error('Offline storage stopped responding. Completed files are kept. Retry, or use Repair below.')),40000);}
   reset();total=setTimeout(()=>finish(new Error('This operation took too long. Completed files are kept. Keep the app open and retry.')),type==='offline-download'?300000:60000);
   channel.port1.onmessage=event=>{const data=event.data||{};reset();if(data.progress){onProgress?.(data);return;}if(data.error){if(Number.isFinite(data.bytes))render(data);finish(new Error(data.error));}else finish(null,data);};
   channel.port1.onmessageerror=()=>finish(new Error('The offline worker sent an unreadable response. Retry setup.'));
   try{active.postMessage({type},[channel.port2]);}catch(e){finish(e);}
  });
 }
 function bytes(n){return n>=1000000?(n/1000000).toFixed(2)+' MB':Math.ceil(n/1000)+' kB';}
 function controls(){button.disabled=busy;check.disabled=busy;pause.hidden=!downloading;pause.disabled=false;}
 function readyAction(ready){if(study)study.hidden=!ready;button.classList.toggle('wb-primary',!ready||!study);}
 function short(value){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)?value.slice(0,12):'unknown';}
 function render(s){
  if(!Number.isFinite(s.bytes)||!Number.isFinite(s.remainingBytes)){
   if(s.paused){readyAction(false);status.textContent='Download paused · completed files kept';button.textContent='Resume download';toggle.dataset.ready='false';}
   return;
  }
  last=s;size.textContent=bytes(s.bytes)+' total · '+bytes(Math.max(0,s.remainingBytes))+' remaining · '+s.done+' / '+s.total+' files';
  bar.value=s.bytes?Math.max(0,Math.min(1,(s.bytes-s.remainingBytes)/s.bytes)):0;
  const ready=s.ready===true&&!downloading&&!s.checking;
  const previous=s.previousReady===true&&!s.checking;
  const usable=ready||previous;
  readyAction(usable);toggle.dataset.ready=String(usable);
  toggle.title=usable?'A complete saved revision is available in this browser':'Prepare and check offline downloads';
  status.textContent=s.checking?'Verifying saved files… '+s.done+' / '+s.total:
   downloading?'Saving '+s.done+' / '+s.total+' files…':
   ready&&s.reloadRecommended?'Updated pack verified · reload to use it':
   ready?'Ready offline':
   previous?'Update incomplete · previous pack ready offline':
   s.paused?'Download paused · completed files kept':
   s.done?'Download incomplete · resume to finish':'Not downloaded';
  button.textContent=ready?'Check saved pack':s.done?'Resume download':'Download study pack';
  if(revisionInfo&&!s.checking){
   revisionInfo.textContent=previous?'Saved revision '+short(s.completeRevision)+' is available; update '+short(s.revision)+' is not complete.':
    ready?'Verified revision '+short(s.completeRevision||s.revision)+(s.reloadRecommended?' · this page uses an older revision until reload.':'.'):
    'No complete saved revision has been verified for this download.';
  }
  if(previous)help.textContent='You can keep studying with the previous verified pack. Resume the new download when connected; do not reload into an incomplete update.';
  else if(ready&&s.reloadRecommended)help.textContent='The new pack is complete. Save your work, then use Reload app in Updates and repair to adopt it.';
  else if(ready)help.textContent='Saved files are verified. Close and reopen this app offline and run a preview before relying on it away from Wi-Fi.';
 }

 function fail(e){readyAction(false);status.textContent='Downloads need attention';toggle.dataset.ready='false';error.textContent=e.message||'Offline setup failed. Retry while connected.';check.textContent='Retry check';button.textContent=last?.done?'Resume download':'Retry download';}
 async function inspect(){
  if(busy)return null;busy=true;controls();readyAction(false);error.textContent='';status.textContent='Checking downloads…';
  let result=null;
  try{result=await rpc('offline-status',render);render(result);check.textContent='Check downloads';checkedAt=Date.now();}
  catch(e){fail(e);}finally{busy=false;controls();}
  return result;
 }
 async function download(){
  if(busy)return;if(last?.ready)return inspect();busy=true;downloading=true;controls();readyAction(false);error.textContent='';status.textContent='Preparing download…';toggle.dataset.ready='false';
  help.textContent='Keep this app open. You can study while it saves, or pause and resume without downloading completed, unchanged files again.';
  try{
   if(navigator.storage?.persist)await bounded(navigator.storage.persist(),2000,'Storage preference unavailable').catch(()=>false);
   const s=await rpc('offline-download',render);downloading=false;render(s);checkedAt=Date.now();
   if(s.paused)help.textContent='Download paused. Reconnect and choose Resume download when ready.';
  }catch(e){downloading=false;fail(e);}finally{busy=false;downloading=false;controls();}
 }
 button.onclick=download;check.onclick=inspect;
 pause.onclick=async()=>{pause.disabled=true;try{await rpc('offline-pause');if(downloading)help.textContent='Pausing… Completed files will be kept.';}catch(e){error.textContent=e.message;pause.disabled=false;}};
 toggle.addEventListener('click',()=>{if(!$('wb-offline').hidden&&Date.now()-checkedAt>15000)inspect();});
 navigator.serviceWorker?.addEventListener('controllerchange',()=>{workerPromise=null;if(!busy)inspect();});
 window.addEventListener('online',()=>{workerPromise=null;if(!$('wb-offline').hidden)inspect();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('wb-offline').hidden&&Date.now()-checkedAt>60000)inspect();});
 // This is a read-only view for the existing update/reload buttons; no saved
 // content is exposed and no download starts without a user action.
 window.WebStudioOfflineState={check:inspect,snapshot:()=>last};
 // Register without waiting for unrelated page resources or starting a pack.
 if(boot){boot.ready=true;clearTimeout(boot.timer);}
 inspect();
})();
