// Actual SQL pages, shared gate and bundled SDK; only backend and allowed email are fixtures.
const {chromium,webkit}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../..'),origin='https://commonplace.test';
const email='offline-fixture@example.test',id='a9d4b067-3dbe-49b8-8d40-3d9b7ec6df0c';
const emailHash=crypto.createHash('sha256').update(email).digest('hex');
const gate=fs.readFileSync(path.join(root,'_lib/gate.js'),'utf8').replace(/var ALLOW = \['[a-f0-9]+'\];/,`var ALLOW = ['${emailHash}'];`);
const now=Math.floor(Date.now()/1000),b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:id,email,exp:now+3600,iat:now,aud:'authenticated',role:'authenticated'})+'.fixture';
const user={id,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'google'},user_metadata:{},created_at:new Date().toISOString()};
const key='sb-wylxvmkcrexwfpjpbhyy-auth-token';
const watchdog=setTimeout(()=>{console.error('SQL callback suite exceeded 150 seconds');process.exit(1)},150000);
(async()=>{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{
   let legacy=false,denied=false;
   async function context(){
    const c=await browser.newContext();c.setDefaultTimeout(15000);
    await c.route('**/*',async route=>{
     const u=new URL(route.request().url());
     if(u.pathname==='/auth/v1/user')return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Allow-Methods':'GET, OPTIONS'},body:JSON.stringify({...user,email:denied?'denied@example.test':email})});
     if(u.origin!==origin)return route.abort();
     const rel=decodeURIComponent(u.pathname).replace(/^\/Commonplace\//,'');
     if(rel==='_lib/gate.js')return route.fulfill({contentType:'text/javascript',body:legacy?gate.replace("    if (!root.classList.contains('cp-locked')) return;","    return; // reproduce old missing resume check"):gate});
     const f=path.resolve(root,rel);
     if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});
     const type={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.wasm':'application/wasm'}[path.extname(f)]||'application/octet-stream';
     return route.fulfill({contentType:type,body:fs.readFileSync(f)});
    });return c;
   }
   const base=origin+'/Commonplace/Coding/sql/';
   const callback='#access_token='+token+'&refresh_token=fixture&expires_in=3600&token_type=bearer';
   async function unlocked(p){await p.waitForFunction(()=>localStorage.getItem('cp:gate:ok')==='offline-fixture@example.test'&&!document.querySelector('#cp-gate'));}
   // Reproduce the retained login curtain after a valid SDK session is saved
   // and the original document is restored. No tokens are written by test code.
   for(const old of [true,false]){
    legacy=old;const c=await context(),p=await c.newPage();await p.goto(base+'index.html');
    await p.getByRole('link',{name:'Continue with Google'}).waitFor();
    await p.evaluate(async token=>{await window.sb.auth.setSession({access_token:token,refresh_token:'fixture'});window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));},token);
    if(old){await p.waitForTimeout(300);assert.equal(await p.locator('#cp-gate').count(),1);assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).user.email,key),email);}
    else await unlocked(p);
    await c.close();
   }
   console.log('PASS '+name+': reproduced saved-session/restored-screen loop; resume fix unlocks through allow-list');
   for(const pagePath of ['index.html','Practice/sqlzoo.html','Practice/mistake-drill.html','The%20Modules/module-01.html']){
    const c=await context(),p=await c.newPage();await p.goto(base+pagePath+callback);await unlocked(p);
    assert(!new URL(p.url()).hash.includes('access_token'));
    assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).user.email,key),email);
    await p.evaluate(()=>{localStorage.setItem('fixture-note','keep');localStorage.setItem('fixture-bookmark','keep');});
    await p.reload();await unlocked(p);assert.equal(await p.evaluate(()=>localStorage.getItem('fixture-note')),'keep');
    if(pagePath==='index.html'){await p.locator('a[href="#practice"]').click();assert.equal(new URL(p.url()).hash,'#practice');}
    await c.close();
   }
   console.log('PASS '+name+': four actual SQL pages process callback, SDK persists session, reload and ordinary anchors work');
   // Separate browser contexts deliberately do not inherit a Safari/app session.
   const safari=await context(),sp=await safari.newPage();await sp.goto(base+'index.html'+callback);await unlocked(sp);
   const app=await context(),ap=await app.newPage();await ap.goto(base+'index.html');await ap.getByRole('link',{name:'Continue with Google'}).waitFor();
   assert.equal(await ap.evaluate(k=>localStorage.getItem(k),key),null);await safari.close();await app.close();
   denied=true;const dc=await context(),dp=await dc.newPage();await dp.goto(base+'index.html'+callback);await dp.getByRole('heading',{name:'Not allowed'}).waitFor();await dc.close();denied=false;
   const ec=await context(),ep=await ec.newPage();await ep.goto(base+'index.html#error=access_denied&error_description=Cancelled');await ep.locator('.g-msg.bad').waitFor();assert.match(await ep.locator('.g-msg.bad').innerText(),/Cancelled/);await ec.close();
   console.log('PASS '+name+': isolated storage requires its own login; unauthorized account denied; OAuth error remains visible');
  }finally{await browser.close();}
 }
})().then(()=>clearTimeout(watchdog)).catch(e=>{console.error(e);clearTimeout(watchdog);process.exitCode=1;});
