/* Run: node Coding/Python/tests/offline.cjs (Playwright + Chromium required). */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
let corrupt = false;
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.wasm':'application/wasm', '.svg':'image/svg+xml', '.png':'image/png'};
const server = http.createServer((req, res) => {
  let filename = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!filename.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename += '/index.html';
  if (!fs.existsSync(filename)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
  if(corrupt && filename.endsWith('/python_stdlib.zip')) {res.end('captive portal');return;}
  fs.createReadStream(filename).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:820,height:1180}});
  await context.route(/https:\/\/.*/, route => route.abort());
  let page = await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(origin+'/Coding/Python/offline.html');
    await page.waitForFunction(()=>document.querySelector('#basic-download').disabled===false);
    corrupt = true;
    await page.click('#basic-download');
    await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Download paused'),null,{timeout:90000});
    assert.match(await page.locator('#basic-status').innerText(), /incomplete/);
    assert.equal(await page.locator('#science-download').isDisabled(),true);
    corrupt = false;
    await page.click('#basic-download');
    await page.waitForFunction(()=>document.querySelector('#basic-status').textContent==='Ready offline',null,{timeout:90000});
    console.log('PASS: corrupt download rejected, partial files retained, resume complete');
    await page.click('#science-download');
    await page.waitForFunction(()=>document.querySelector('#science-status').textContent==='Ready offline',null,{timeout:120000});
    await page.screenshot({path:'/tmp/python-offline-ipad.png',fullPage:true});
    console.log('PASS: both packs downloaded');
    const cdp=await context.newCDPSession(page);await cdp.send('Network.clearBrowserCache');
    await page.close(); await context.setOffline(true); page=await context.newPage();
    await page.goto(origin+'/Coding/Python/index.html');
    await page.waitForFunction(()=>!!window.CommonplacePractice);
    const result=await page.evaluate(async()=>{await CommonplacePractice.ensure();return CommonplacePractice.runRepl('sum(range(11))');});
    assert.match(JSON.stringify(result),/55/);
    console.log('PASS: cold navigation and actual CPython execution offline (HTTP cache cleared)');
    await page.goto(origin+'/Coding/Python/fundamentals/01_random_module.html');
    const random=await page.evaluate(()=>PyRun.run('sum(range(6))'));
    assert.match(JSON.stringify(random),/15/);
    console.log('PASS: random-module runner offline');
    await page.goto(origin+'/Coding/Python/libraries/matplotlib.html');
    assert.equal(await page.evaluate(()=>crossOriginIsolated),true);
    const run=await page.evaluate(async()=>{
      await NotebookPlayer.engine.load();
      let stdout='';
      const r=await NotebookPlayer.engine.run(0,"import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nprint(int(np.arange(5).sum()))\nprint(pd.DataFrame({'x':[1,2]}).shape)\nprint(input('Name?'))\nplt.plot([1,2],[3,4])",{out:s=>stdout+=s,err:s=>stdout+=s,input:()=>Promise.resolve('Offline')});
      return {stdout,figures:r.figures.length};
    });
    assert.match(run.stdout,/10/);assert.match(run.stdout,/\(2, 1\)/);assert.match(run.stdout,/Offline/);assert.equal(run.figures,1);
    console.log('PASS: worker, input(), NumPy, pandas and generated plot offline');
    await page.goto(origin+'/Coding/Python/practice/set.html?set=any');
    assert.ok(!(await page.title()).includes('Offline'));
    await page.goto(origin+'/Coding/Python/offline.html');
    await page.waitForFunction(()=>document.querySelector('#basic-status').textContent==='Ready offline');
    await page.evaluate(async()=>{
      const cache=await caches.open('cp-python-downloads-v1');
      const keys=await cache.keys();
      await cache.delete(keys.find(k=>k.url.includes('python_stdlib.zip')));
    });
    await page.click('#check');
    await page.waitForFunction(()=>document.querySelector('#basic-status').textContent.includes('incomplete'));
    console.log('PASS: missing cached runtime detected by readiness check');
    assert.deepEqual(errors,[]);
    console.log('ALL OFFLINE CHECKS PASSED');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
