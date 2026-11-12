// Actual section pages + unmodified bundled Supabase. Only auth backend and
// allowed-email digest are fixtures. Never contacts Google or production APIs.
const {chromium,webkit}=require('playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'../../..'),origin='https://commonplace.test';
const email='cpp-login-fixture@example.test',id='a9d4b067-3dbe-49b8-8d40-3d9b7ec6df0c';
const hash=crypto.createHash('sha256').update(email).digest('hex');
const gate=fs.readFileSync(path.join(repo,'_lib/gate.js'),'utf8').replace(/var ALLOW = \['[a-f0-9]+'\];/,`var ALLOW = ['${hash}'];`);
const now=Math.floor(Date.now()/1000),b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:id,email,exp:now+3600,iat:now,aud:'authenticated',role:'authenticated'})+'.fixture';
const user={id,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'google'},user_metadata:{},created_at:new Date().toISOString()};
const key='sb-wylxvmkcrexwfpjpbhyy-auth-token';
const watchdog=setTimeout(()=>process.exit(1),240000);
(async()=>{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{
   for(const file of ['index.html','cpp_playground.html'])for(const delay of [0,500]){
    const context=await browser.newContext({viewport:{width:820,height:1180}});context.setDefaultTimeout(20000);
    const trace=[];let calls=0;
    await context.addInitScript(()=>{window.__urlChanges=[];const orig=history.replaceState.bind(history);history.replaceState=function(s,t,u){window.__urlChanges.push({hadToken:location.hash.includes('access_token='),keptToken:String(u).includes('access_token='),stack:new Error().stack.split('\n').slice(1,3).map(x=>x.split('?')[0])});return orig(s,t,u);};});
    await context.route('**/*',async route=>{
     const u=new URL(route.request().url());
     if(u.pathname==='/auth/v1/user'){
      calls++;if(delay)await new Promise(r=>setTimeout(r,delay));
      return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Allow-Methods':'GET, OPTIONS'},body:JSON.stringify(user)});
     }
     if(u.pathname.startsWith('/rest/v1/'))return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin},body:'[]'});
     if(u.origin!==origin)return route.abort();
     const rel=u.pathname.replace(/^\/Commonplace\//,'');const f=path.resolve(repo,rel);
     if(!f.startsWith(repo+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});
     let body=rel==='_lib/gate.js'?gate:fs.readFileSync(f);
     const type={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.woff2':'font/woff2'}[path.extname(f)]||'application/octet-stream';
     return route.fulfill({contentType:type,body});
    });
    const page=await context.newPage();page.on('pageerror',e=>trace.push(e.message));page.on('console',m=>{if(m.text().includes('Multiple GoTrueClient'))trace.push('Multiple GoTrueClient');});
    const start=origin+'/Commonplace/Coding/c_and_cpp_study/'+file;
    await page.goto(start+'#access_token='+token+'&refresh_token=fixture&expires_in=3600&token_type=bearer');
    await page.waitForFunction(()=>localStorage.getItem('cp:gate:ok')||document.querySelector('#cp-gate .g-google')||document.querySelector('#cp-gate h1')?.textContent==='Not allowed').catch(()=>{});
    const state=await page.evaluate(key=>({approved:!!localStorage.getItem('cp:gate:ok'),session:!!localStorage.getItem(key),hash:location.hash.includes('access_token='),gate:document.querySelector('#cp-gate')?.textContent,changes:window.__urlChanges}),key);
    console.log(JSON.stringify({name,file,delay,calls,trace,state}));await context.close();
   }
  }finally{await browser.close();}
 }
})().then(()=>clearTimeout(watchdog)).catch(e=>{console.error(e);clearTimeout(watchdog);process.exitCode=1;});
