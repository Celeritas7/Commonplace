/* node Coding/batch_study/tests/offline.cjs — Playwright + Chromium */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),base='/Coding/batch_study/';
let corrupt=false, old=false, changed=false; const requests=new Map();
const oldSW=fs.readFileSync(path.join(__dirname,'legacy-sw.js'),'utf8');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');let name=decodeURIComponent(u.pathname);
 requests.set(name,(requests.get(name)||0)+1);
 let f=path.join(root,name);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f+='/index.html';
 if(!fs.existsSync(f)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');
 if(old && name===base+'sw.js'){res.end(oldSW);return;}
 if(corrupt&&name.endsWith('/my_scripts/01_pull/original.bat')){res.end('bad download');return;}
 if(changed&&name.endsWith('/offline-assets.json')){
  const m=JSON.parse(fs.readFileSync(f));const a=m.files.find(a=>a.url==='../../_lib/gate.js');
  const b=Buffer.concat([fs.readFileSync(path.join(root,'_lib/gate.js')),Buffer.from('\n// update fixture')]);
  a.bytes=b.length;a.revision=require('node:crypto').createHash('sha256').update(b).digest('hex');res.end(JSON.stringify(m));return;
 }
 if(changed&&name==='/_lib/gate.js'){res.end(fs.readFileSync(f,'utf8')+'\n// update fixture');return;}
 fs.createReadStream(f).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
 try{
 const c=await browser.newContext({viewport:{width:820,height:1180}});await c.route(/https:\/\/.*/,r=>r.abort());let page=await c.newPage();
 const waitReady=()=>page.waitForFunction(()=>document.querySelector('#state').textContent==='Ready offline',null,{timeout:90000});
 await page.goto(origin+base+'offline.html');await page.waitForFunction(()=>!document.querySelector('#download').disabled);
 assert.equal(await page.evaluate(async()=> (await(await caches.open('cp-bat-downloads-v1')).keys()).length),0);
 corrupt=true;await page.click('#download');await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('differs'),null,{timeout:60000});
 await page.waitForFunction(()=>!document.querySelector('#download').disabled);
 const before=requests.get(base+'The Modules/Batch Practice.dc.html');corrupt=false;await page.click('#download');await waitReady();
 assert.equal(requests.get(base+'The Modules/Batch Practice.dc.html'),before);
 console.log('PASS fresh setup, corrupt/interrupted download, resume without refetching unchanged files');
 await page.evaluate(async()=>{localStorage.setItem('commonplace_myscripts_v1',JSON.stringify({offlineTest:'saved note'}));localStorage.setItem('commonplace_bat_m01_mark','{"test":"bookmark"}');localStorage.setItem('cpx:test','highlight');await(await caches.open('cp-python-downloads-v1')).put('/sentinel',new Response('keep'));});
 changed=true;await page.click('#check');await page.waitForFunction(()=>!document.querySelector('#check').disabled);assert.notEqual(await page.locator('#state').innerText(),'Ready offline');
 await page.click('#download');await waitReady();assert.equal(requests.get(base+'The Modules/Batch Practice.dc.html'),before);console.log('PASS shared file update requires new verified download, unchanged files reused');
 await page.click('#repair');await page.waitForURL(/bat-network/);await waitReady();
 assert.match(await page.evaluate(()=>localStorage.getItem('commonplace_myscripts_v1')),/saved note/);
 assert.equal(await page.evaluate(async()=>await(await(await caches.open('cp-python-downloads-v1')).match('/sentinel')).text()),'keep');
 console.log('PASS repair preserves BAT local data, downloaded packs and another section cache');
 // Remove query used for online repair, then clear only ordinary HTTP cache.
 await page.goto(origin+base+'offline.html');await waitReady();
 const cdp=await c.newCDPSession(page);await cdp.send('Network.clearBrowserCache');await page.close();await c.setOffline(true);page=await c.newPage();
 await page.goto(origin+base+'index.html');assert.equal(await page.getByRole('link',{name:'↓ Study offline'}).count(),1);
 await page.goto(origin+base+'The%20Modules/Batch%20Sandbox.dc.html');
 await page.locator('input').first().waitFor();await page.locator('input').first().fill('echo offline hello');await page.locator('input').first().press('Enter');
 await page.getByText('offline hello',{exact:true}).waitFor();console.log('PASS offline cold reopen, real browser simulation works without CDN or HTTP cache');
 for(const name of ['Batch Practice.dc.html','My Scripts.dc.html','Module 01 · Foundations - Folders.dc.html','Batch Command Reference.dc.html']){
  await page.goto(origin+base+'The%20Modules/'+encodeURIComponent(name));await page.waitForFunction(()=>window.React && document.body.innerText.length>1000);assert.ok(!await page.locator('body').innerText().then(t=>t.includes('failed to load')));
 }
 await page.goto(origin+base+'my_scripts/index.html');await page.locator('#rows a.row').first().waitFor();
 assert.match(await page.evaluate(()=>localStorage.getItem('commonplace_myscripts_v1')),/saved note/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('cpx:test')),'highlight');console.log('PASS lessons, practice, scripts, saved data available offline');
 await page.goto(origin+base+'offline.html');await waitReady();
 await page.evaluate(async()=>{const cache=await caches.open('cp-bat-downloads-v1');await cache.delete(new URL('The Modules/Batch Practice.dc.html',location.href));});
 await page.click('#check');await page.waitForFunction(()=>!document.querySelector('#check').disabled);assert.notEqual(await page.locator('#state').innerText(),'Ready offline');console.log('PASS missing saved file invalidates readiness');
 await c.close();
 // Upgrade actual legacy worker and cache.
 old=true;const legacy=await browser.newContext();page=await legacy.newPage();await page.goto(origin+base+'index.html');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();old=false;
 await page.goto(origin+base+'offline.html');await page.waitForFunction(()=>!document.querySelector('#check').disabled,null,{timeout:60000});
 await page.click('#repair');await page.waitForURL(/bat-network/);await page.waitForFunction(()=>!document.querySelector('#download').disabled);await page.click('#download');await waitReady();
 console.log('PASS upgrade from actual batch-study-v15 worker and old cached pages');await legacy.close();
 console.log('All BAT offline tests passed in Chromium (Linux), iPad-sized viewport; not physical iPad/Safari.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
