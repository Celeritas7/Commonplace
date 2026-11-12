(function(){
  'use strict';
  const root=new URL('../',document.currentScript.src);
  const $=id=>document.getElementById(id);
  let busy=false;
  function bounded(promise,ms,message){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error(message)),ms);
      promise.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});
    });
  }
  async function worker(update){
    if(!isSecureContext||!navigator.serviceWorker) throw new Error('Use the HTTPS app in Safari. Offline storage is not available here.');
    let reg=await navigator.serviceWorker.getRegistration(root.href);
    if(!reg || reg.scope!==root.href) reg=await bounded(navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.href,updateViaCache:'none'}),25000,'Setup timed out. Reconnect and retry.');
    else if(update) await bounded(reg.update(),25000,'Update check timed out. Your saved download is kept.');
    // Wait for the exact new worker, not serviceWorker.ready from a parent scope.
    const next=reg.installing||reg.waiting;
    if(next && next.state!=='activated') await bounded(new Promise((resolve,reject)=>{
      const check=()=>{if(next.state==='activated') resolve(); if(next.state==='redundant') reject(new Error('Worker update failed. Retry setup.'));};
      next.addEventListener('statechange',check);check();
    }),55000,'Worker setup timed out. Use Retry or Repair setup.');
    if(!reg.active) throw new Error('No active C/C++ worker. Retry setup.');
    return reg.active;
  }
  async function rpc(type,update){
    const active=await worker(update);
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      let timer;
      const finish=(error,data)=>{clearTimeout(timer);channel.port1.close();error?reject(error):resolve(data);};
      const tick=()=>{clearTimeout(timer);timer=setTimeout(()=>finish(new Error('Storage/download stopped responding. Keep the screen open, then retry. Completed files are kept.')),45000);};
      channel.port1.onmessage=event=>{
        tick();const data=event.data;
        if(data.progress){render(data);$('state').textContent=data.phase;return;}
        finish(data.error?new Error(data.error):null,data);
      };
      tick();active.postMessage({type},[channel.port2]);
    });
  }
  function render(s){
    $('size').textContent=(s.bytes/1e6).toFixed(2)+' MB total · '+(s.remainingBytes/1e6).toFixed(2)+' MB remaining · '+s.done+'/'+s.total+' files';
    $('progress').value=s.savedBytes/s.bytes;
    $('state').textContent=s.ready?'Ready offline — lessons and editing':s.done?'Download incomplete':'Not downloaded';
    $('download').textContent=s.ready?'Verify saved pack':s.done?'Resume download':'Download study pack';
    $('version').textContent='Pack '+s.version;
  }
  async function act(type,update){
    if(busy)return;busy=true;
    $('download').disabled=$('check').disabled=true;
    $('error').textContent='';$('state').textContent=update?'Checking for updates…':'Checking saved files…';
    try{
      if(type==='download'&&navigator.storage?.persist) await bounded(navigator.storage.persist(),3000,'').catch(()=>{});
      render(await rpc(type,update));
    }catch(e){$('state').textContent='Needs attention';$('error').textContent=e.message;}
    finally{busy=false;$('download').disabled=$('check').disabled=false;}
  }
  $('download').onclick=()=>act('download',false);
  $('check').onclick=()=>act('status',navigator.onLine);
  act('status',navigator.onLine);
})();
