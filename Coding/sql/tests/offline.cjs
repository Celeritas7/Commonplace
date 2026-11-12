/* node Coding/sql/tests/offline.cjs — Chromium, actual SQLite WASM and cold offline navigations */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
let oldWorker=false,fail=false,updated=false;
const counts=new Map();
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);counts.set(pathname,(counts.get(pathname)||0)+1);
 let file=path.join(root,pathname);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file+='/index.html';
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');
 if(oldWorker&&pathname==='/Coding/sql/sw.js'){res.end(`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(caches.open('sql-lab-v2').then(async c=>{try{let r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r}catch(_){return c.match(e.request)}}))});`);return;}
 if(fail&&pathname.endsWith('sql-wasm.wasm')){res.end('connection interrupted');return;}
 let data=fs.readFileSync(file);
 if(updated&&pathname==='/_lib/gate.js')data=Buffer.concat([data,Buffer.from('\n// shared update fixture\n')]);
 if(updated&&pathname==='/Coding/sql/offline-assets.js'){
  const text=data.toString();const a=JSON.parse(text.slice(text.indexOf('['),text.lastIndexOf(']')+1));
  const gate=a.find(x=>x.url==='../../_lib/gate.js');const bytes=Buffer.concat([fs.readFileSync(path.join(root,'_lib/gate.js')),Buffer.from('\n// shared update fixture\n')]);gate.bytes=bytes.length;gate.revision=crypto.createHash('sha256').update(bytes).digest('hex');
  data=Buffer.from('self.SQL_OFFLINE_ASSETS = '+JSON.stringify(a)+';');
 }
 res.end(data);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://sql.localhost:${server.address().port}`,base=origin+'/Coding/sql/';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || chromium.executablePath(),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:820,height:1180}});
 await context.route(/https:\/\/.*/,r=>r.abort());
 let page=await context.newPage();
 async function ready(){await page.waitForFunction(()=>document.querySelector('#status').textContent==='Ready offline',{},{timeout:60000});}
 async function idle(){await page.waitForFunction(()=>!document.querySelector('#check').disabled);}
 async function offline(){const cdp=await context.newCDPSession(page);await cdp.send('Network.clearBrowserCache');await context.setOffline(true);await page.close();page=await context.newPage();}
 try{
  // Fresh setup: no pack fetched during worker installation.
  await page.goto(base+'offline.html');await idle();assert.equal(await page.locator('#status').innerText(),'Not downloaded');assert.equal(counts.get('/_lib/sqljs/sql-wasm.wasm'),undefined);
  await page.evaluate(async()=>{localStorage.setItem('cp_sql_bank',JSON.stringify([{id:'fixture',state:'due',note:'keep'}]));localStorage.setItem('fixture_bookmark','bookmark');localStorage.setItem('fixture_highlight','highlight');localStorage.setItem('fixture_note','note');await(await caches.open('cp-python-downloads-v1')).put('/python-sentinel',new Response('keep'));});
  // Exercise the real gate on a trusted non-bypassed hostname. Session fixture
  // represents a previously approved sign-in; actual OAuth is in login-return.cjs.
  await page.evaluate(()=>{localStorage.setItem('sb-wylxvmkcrexwfpjpbhyy-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'fixture',email:'offline-fixture@example.test'}}));localStorage.setItem('cp:gate:ok','offline-fixture@example.test');});
  fail=true;await page.click('#download');await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('Paused at'),{},{timeout:60000});await idle();
  assert.notEqual(await page.locator('#status').innerText(),'Ready offline');
  const before=counts.get('/Coding/sql/lib/sql-lab.js');fail=false;await page.click('#download');await ready();await idle();assert.equal(counts.get('/Coding/sql/lib/sql-lab.js'),before);
  console.log('PASS fresh setup is small; interrupted body rejected; resume skips completed unchanged files');
  await page.screenshot({path:'/tmp/sql-offline-ipad.png',fullPage:true});
  await offline();await page.goto(base+'index.html');await page.waitForFunction(()=>window.SQLBook&&document.querySelector('#results').textContent.trim().length>0);
  assert(await page.locator('#sql-study-offline').isVisible());assert.equal(await page.locator('#cp-gate').count(),0,'saved session unlocks actual gate offline');
  await page.locator('#editor').fill('SELECT 2 + 3 AS answer;');await page.locator('#run-btn').click();await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('5'));
  await page.reload();assert.equal(await page.locator('#editor').inputValue(),'SELECT 2 + 3 AS answer;');
  await page.goto(base+'Practice/sqlzoo.html');await page.waitForFunction(()=>document.querySelector('#led-text').textContent.includes('engine ready'));
  await page.locator('#editor').fill('SELECT COUNT(*) AS count FROM world;');await page.click('#run-btn');
  assert(!/could not|failed/i.test(await page.locator('#led-text').innerText()));
  // First graded exercise: run its known correct answer through actual UI.
  const exercise=await page.evaluate(()=>SQLZOO_EXERCISES[0]);
  const card=page.locator('#card-'+exercise.id);
  await card.locator('textarea').fill(exercise.sol);await card.locator('[data-action="run"]').click();
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('commonplace_sqlzoo_progress')||'{}')[id]==='done',exercise.id);
  await page.reload();await page.waitForFunction(()=>!!window.SQLBook);assert.equal(await page.locator('#card-'+exercise.id+' textarea').inputValue(),exercise.sol);
  await page.goto(base+'The%20Modules/module-01.html');await page.waitForFunction(()=>!!window.SQLBook&&window.__cpx);
  const real=await page.evaluate(async()=>{const SQL=await initSqlJs({locateFile:f=>'../../../_lib/sqljs/'+f});const db=new SQL.Database();db.run('CREATE TABLE t(x); INSERT INTO t VALUES(3),(7);');return db.exec('SELECT SUM(x) FROM t')[0].values[0][0];});assert.equal(real,10);
  await page.goto(base+'Practice/mistake-drill.html');assert(!(await page.title()).includes('Offline'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('fixture_note')),'note');
  console.log('PASS HTTP cache cleared, pages reopened offline, real SQLite SELECT/CREATE/INSERT/aggregate, query draft survives reload');
  await page.goto(base+'offline.html');await ready();
  // Detect cache corruption and recover only affected file.
  await page.evaluate(async()=>{const c=await caches.open('cp-sql-downloads-v1');const key=(await c.keys()).find(k=>k.url.includes('sql-wasm.wasm'));await c.put(key,new Response('bad'));});await page.click('#check');await idle();assert.match(await page.locator('#status').innerText(),/incomplete/);
  await context.setOffline(false);await page.click('#download');await ready();await idle();
  console.log('PASS readiness hashes saved bodies and detects missing/corrupted runtime');
  // Updated shared file + manifest: update worker, preserve pack, download only revised dependency.
  updated=true;const runtimeBefore=counts.get('/_lib/sqljs/sql-wasm.wasm');await page.click('#repair');await idle();assert.match(await page.locator('#status').innerText(),/incomplete/);await page.click('#download');await ready();await idle();assert.equal(counts.get('/_lib/sqljs/sql-wasm.wasm'),runtimeBefore);
  assert.equal(await page.evaluate(()=>localStorage.getItem('fixture_bookmark')),'bookmark');assert.equal(await page.evaluate(()=>localStorage.getItem('fixture_highlight')),'highlight');assert.equal(await page.evaluate(async()=>!!await(await caches.open('cp-python-downloads-v1')).match('/python-sentinel')),true);
  console.log('PASS shared-file update downloads only changed file; repair preserves personal storage and other section pack');
  // Old-worker upgrade with cached pages and data.
  await context.setOffline(false);await context.close();updated=false;oldWorker=true;
  const legacy=await browser.newContext();page=await legacy.newPage();await page.goto(base+'index.html');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.evaluate(()=>localStorage.setItem('cp_sql_check','{"1":{"pass":true}}'));
  oldWorker=false;await page.goto(base+'offline-repair.html?nocache=1');await idle();await page.click('#repair');await idle();assert.equal(await page.locator('#error').innerText(),'');await page.click('#download');await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cp_sql_check'))['1'].pass),true);
  console.log('PASS upgrade from legacy cached worker using standalone repair preserves study data');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'index.html');assert(await page.locator('#sql-study-offline').isVisible());assert.equal(await page.locator('#cp-gate').count(),0,'saved session unlocks actual gate offline');await page.setViewportSize({width:1440,height:900});assert(await page.locator('#sql-study-offline').isVisible());assert.equal(await page.locator('#cp-gate').count(),0,'saved session unlocks actual gate offline');
  console.log('PASS Study offline link visible at phone, iPad-sized and desktop widths');
  await legacy.close();
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
