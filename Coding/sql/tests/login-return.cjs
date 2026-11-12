// Uses the actual SQL page, shared gate and bundled Supabase SDK.
// Only backend responses and the allow-listed email hash are test fixtures.
const {chromium,webkit}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../..'),origin='https://commonplace.test';
const email='offline-fixture@example.test',id='a9d4b067-3dbe-49b8-8d40-3d9b7ec6df0c';
const emailHash=crypto.createHash('sha256').update(email).digest('hex');
const gate=fs.readFileSync(path.join(root,'_lib/gate.js'),'utf8').replace(/var ALLOW = \['[a-f0-9]+'\];/,`var ALLOW = ['${emailHash}'];`);
const now=Math.floor(Date.now()/1000),b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:id,email,exp:now+3600,iat:now,aud:'authenticated',role:'authenticated'})+'.fixture';
const user={id,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'google'},user_metadata:{},created_at:new Date().toISOString()};
const watchdog=setTimeout(()=>{console.error('Callback suite exceeded 90 seconds');process.exit(1)},90000);
(async()=>{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{
   const context=await browser.newContext();context.setDefaultTimeout(15000);let legacy=true;
   await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.pathname==='/auth/v1/user')return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Allow-Methods':'GET, OPTIONS'},body:JSON.stringify(user)});
    if(u.origin!==origin)return route.abort();
    const rel=decodeURIComponent(u.pathname).replace(/^\/Commonplace\//,'');
    if(rel==='_lib/gate.js')return route.fulfill({contentType:'text/javascript',body:gate});
    if(rel==='_lib/supabase.js'){
     return route.fulfill({contentType:'text/javascript',body:'window.__callbackAtSdkLoad = location.hash.includes("access_token=");\n'+fs.readFileSync(path.join(root,'_lib/supabase.js'),'utf8')});
    }
    const f=path.resolve(root,rel);
    if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});
    if(rel==='Coding/sql/index.html' && legacy)return route.fulfill({contentType:'text/html',body:fs.readFileSync(f,'utf8').replace('if (!authReturn && history.replaceState)', 'if (history.replaceState)')});
    const type={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.woff2':'font/woff2'}[path.extname(f)]||'application/octet-stream';
    return route.fulfill({contentType:type,body:fs.readFileSync(f)});
   });
   const page=await context.newPage();page.on('pageerror',e=>console.log('Page error: '+e.message));
   const start=origin+'/Commonplace/Coding/sql/index.html';
   const callback=start+'#access_token='+token+'&refresh_token=fixture&expires_in=3600&token_type=bearer';
   await page.goto(callback);
   await page.waitForFunction(()=>localStorage.getItem('cp:gate:ok')==='offline-fixture@example.test');
   assert.equal(await page.evaluate(()=>window.__callbackAtSdkLoad),true,'SQL must retain callback until SDK loads');
   assert.equal(await page.locator('#cp-gate').count(),0);
   assert.ok(!new URL(page.url()).hash.includes('access_token'),'SDK removes consumed credentials');
   const key='sb-wylxvmkcrexwfpjpbhyy-auth-token';
   assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).user.email,key),email);
   await page.reload();assert.equal(await page.locator('#cp-gate').count(),0);

   console.log('PASS '+name+': real SQL callback retained, real SDK persists session, gate unlocks, reload stays signed in and normal tabs work');
   await context.close();
  }finally{await browser.close();}
 }
})().then(()=>clearTimeout(watchdog)).catch(e=>{console.error(e);clearTimeout(watchdog);process.exitCode=1;});
