'use strict';
// Real Chromium and WebKit recovery checks. These intentionally block the
// application scripts, not study storage, and cannot replace physical iPad QA.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); }
catch (_) { playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules', 'playwright')); }
const ROOT = path.resolve(__dirname, '../../..');
const engine = process.env.BROWSER || 'chromium';
const APP = '/Commonplace/Coding/html_css_js_study/index.html';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const sample = {
  'commonplace_web_studio_v1': JSON.stringify({ version: 1, project: { html: '<h1>Do not lose this</h1>', css: '', js: '' }, lessons: { 'html-elements': { note: 'Keep private note' } } }),
  'cpx.bookmarks': '[{"path":"/stored","title":"Keep saved bookmark"}]',
  'sb-test-auth-token': 'FAKE-SESSION-DO-NOT-PRINT'
};
let server, origin, browser;
async function startServer() {
  server = http.createServer((req, res) => {
    let file;
    try { file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname.replace(/^\/Commonplace(?=\/)/, ''))); }
    catch (_) { res.writeHead(400).end(); return; }
    if(!file.startsWith(ROOT + path.sep) && file!==ROOT){res.writeHead(403).end();return;}
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('not found');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin='http://127.0.0.1:'+server.address().port;
}
async function fixture() {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/_lib/gate.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'/* synthetic test gate; never used in production */'}));
  await context.addInitScript(({origin,seed})=>{
    if(window!==window.top||location.origin!==origin)return;
    if('serviceWorker' in navigator)navigator.serviceWorker.register=async()=>{throw new Error('Worker disabled in startup fixture');};
    if(sessionStorage.getItem('startup-fixture-seeded'))return;
    for(const [key,value]of Object.entries(seed))localStorage.setItem(key,value);
    sessionStorage.setItem('startup-fixture-seeded','1');
  },{origin,seed:sample});
  return context;
}
async function checkFailure(file,kind) {
  const context=await fixture();
  const matcher='**/Coding/html_css_js_study/'+file+'*';
  await context.route(matcher,route=>kind==='crash'
    ?route.fulfill({status:200,contentType:'text/javascript',body:'throw new Error("Keep private note FAKE-SESSION-DO-NOT-PRINT")'})
    :route.abort('failed'));
  const page=await context.newPage();
  await page.goto(origin+APP,{waitUntil:'domcontentloaded'});
  await page.locator('#wb-startup-recovery').waitFor({state:'visible',timeout:20000});
  const state=await page.evaluate(()=>({
    status:window.WebStudioStartup.state,
    code:window.WebStudioStartup.reason,
    body:document.querySelector('#wb-startup-recovery').textContent,
    paths:[...document.querySelectorAll('#wb-startup-recovery a')].map(e=>e.getAttribute('href')),
    saved:Object.fromEntries(['commonplace_web_studio_v1','cpx.bookmarks','sb-test-auth-token'].map(k=>[k,localStorage.getItem(k)]))
  }));
  assert.equal(state.status,'failed');
  assert.equal(state.code,kind==='crash'?'exception':'asset');
  assert(state.body.includes('Repair offline setup'));
  assert.deepEqual(state.paths,['offline-repair.html','offline.html']);
  assert.deepEqual(state.saved,sample,'startup failures must not overwrite local learning/auth/annotation data');
  assert(!state.body.includes('Keep private note')&&!state.body.includes('FAKE-SESSION'), 'no personal data or tokens in diagnostics');
  if(kind!=='crash')assert(state.body.includes(file), 'failed script name should be shown without URL/query values');
  console.log('PASS '+engine+': '+file+' '+kind+' opens independent repair panel and preserves all saved data');
  await context.close();
}
(async()=>{
  assert(['chromium','webkit'].includes(engine));
  await startServer();
  browser=await playwright[engine].launch({headless:true});
  const context=await fixture();
  const page=await context.newPage();
  await page.goto(origin+APP);
  await page.waitForFunction(()=>document.body.dataset.webStudioStartup==='ready');
  assert.equal(await page.locator('#wb-startup-recovery').isVisible(),false);
  assert(await page.locator('#wb-title').isVisible());
  console.log('PASS '+engine+': healthy main lesson and editor acknowledge startup without a recovery overlay');
  await context.close();
  await checkFailure('studio-lessons.js','missing');
  await checkFailure('studio.js','missing');
  await checkFailure('studio.js','crash');
  console.log('PASS '+engine+': startup recovery tests complete (physical iPad NOT TESTED)');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close().catch(()=>{});if(server)await new Promise(resolve=>server.close(resolve));});
