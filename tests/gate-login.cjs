// Browser regression tests with mocked OAuth/session responses: no real credentials.
const {chromium,webkit}=require('playwright');
const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const gate=fs.readFileSync(path.resolve(__dirname,'../_lib/gate.js'),'utf8');
const origin='https://commonplace.test',start=origin+'/Commonplace/Coding/batch_study/index.html';
const SKEY='sb-wylxvmkcrexwfpjpbhyy-auth-token';
(async()=>{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:820,height:1180}});
   let sdkRequests=0,authorizeURL;
   await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.pathname==='/_lib/gate.js')return route.fulfill({contentType:'text/javascript',body:gate});
    if(u.pathname.endsWith('/supabase.js')){sdkRequests++;return route.abort();}
    if(u.pathname==='/auth/v1/authorize'){
     authorizeURL=u;return route.fulfill({contentType:'text/html',body:'<h1>OAuth destination reached</h1>'});
    }
    if(u.origin===origin)return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><script src="/_lib/gate.js"></script></head><body><main>Saved lesson</main></body></html>'});
    return route.abort();
   });
   const page=await context.newPage();await page.goto(start);
   await page.getByRole('link',{name:'Continue with Google'}).click();
   await page.getByRole('heading',{name:'OAuth destination reached'}).waitFor();
   assert.equal(authorizeURL.searchParams.get('provider'),'google');
   assert.equal(authorizeURL.searchParams.get('redirect_to'),start);
   assert.equal(sdkRequests,0);
   console.log('PASS '+name+': native Google navigation works without SDK loading or session initialization');
   await page.goto(start);
   await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true}));
   await page.getByRole('link',{name:'Continue with Google'}).click();
   assert.match(await page.locator('.g-msg').innerText(),/offline/);assert.equal(page.url(),start);
   assert.equal(await page.getByRole('link',{name:'Continue with Google'}).getAttribute('aria-disabled'),null);
   console.log('PASS '+name+': offline sign-in gives an explanation instead of hanging');
   await page.evaluate(([key])=>{localStorage.setItem(key,JSON.stringify({user:{email:'fixture@example.test'}}));localStorage.setItem('cp:gate:ok','fixture@example.test');localStorage.setItem('bat-note-test','keep');},[SKEY]);
   await page.reload();assert.equal(await page.locator('#cp-gate').count(),0);assert.equal(await page.locator('main').innerText(),'Saved lesson');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bat-note-test')),'keep');
   console.log('PASS '+name+': saved approved sign-in opens locally and preserves study data');
   await page.evaluate(key=>{localStorage.removeItem(key);localStorage.removeItem('cp:gate:ok');},SKEY);
   await page.addInitScript(()=>{window.supabase={createClient:()=>({auth:{getSession:()=>new Promise(()=>{}),signInWithOtp:()=>new Promise(()=>{})}})};});
   await page.clock.install();await page.goto(start+'?code=fixture');await page.clock.fastForward(16000);
   await page.getByRole('link',{name:'Continue with Google'}).waitFor();assert.match(await page.locator('.g-msg').innerText(),/could not finish/);
   console.log('PASS '+name+': stalled callback has a bounded failure and retry');
   await page.goto(start);await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');
   await page.getByRole('button',{name:'Email me a sign-in link'}).click();await page.clock.fastForward(16000);
   assert.equal(await page.getByRole('button',{name:'Email me a sign-in link'}).isEnabled(),true);
   assert.match(await page.locator('.g-msg').innerText(),/Could not send/);
   console.log('PASS '+name+': stalled email sign-in becomes retryable');
   await context.close();
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
