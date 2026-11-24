'use strict';
// Combined Cloudflare STAGING OUTPUT + real worker + real Commonplace login gate.
// Local self-signed HTTPS server, restricted CONNECT proxy and disposable
// persistent browser profiles. Never a production account or public network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

let playwright;
try { playwright = require('playwright'); }
catch (_) { playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules', 'playwright')); }

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist-cloudflare');
const HOST = 'cloudflare-pilot.example.test'; // not localhost, so real gate runs
const BASE = '/Commonplace/Coding/html_css_js_study/';
const APP = BASE + 'index.html';
const KEY = 'commonplace_web_studio_v1';
const SESSION = fs.readFileSync(path.join(ROOT, '_lib/gate.js'), 'utf8').match(/var SKEY = '([^']+)'/)[1];
const engine = process.env.BROWSER || 'chromium';
const fixtureUser = { id: '94b4a7d8-93dc-4c4e-87ca-4ec58743c2a7', email: 'cloudflare-pilot@example.test' };
const noteText = 'Cloudflare isolated offline review';
const projectHTML = '<main class="card"><h1>Cloudflare offline preview</h1><button id="counter">Clicks: 0</button></main>';
const projectCSS = '.card { padding: 24px; }';
const projectJS = 'const b=document.querySelector("#counter");let n=0;b.addEventListener("click",()=>{n+=2;b.textContent="Clicks: "+n;});';
const manifest = JSON.parse(fs.readFileSync(path.join(DIST, BASE, 'offline-assets.json')));
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.woff2':'font/woff2', '.woff':'font/woff',
  '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg',
  '.ico':'image/x-icon' };

let origin, site, proxy, context, page, workdir, networkDown = false;
const sockets = new Set(), profiles = [], externalAttempts = [], errors = [], requests = [];

function certificate() {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-cloudflare-pilot-https-'));
  const key = path.join(workdir, 'key.pem'), crt = path.join(workdir, 'cert.pem');
  execFileSync('openssl', ['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,
    '-out',crt,'-days','1','-subj','/CN='+HOST,
    '-addext','subjectAltName=DNS:'+HOST], { stdio:'ignore' });
  return { key:fs.readFileSync(key), cert:fs.readFileSync(crt) };
}
async function port(server) {
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  return server.address().port;
}
async function servers() {
  site = https.createServer(certificate(), (req,res) => {
    if (networkDown) { req.socket.destroy(); return; }
    let url;
    try { url = new URL(req.url,'https://'+HOST); }
    catch (_) { res.writeHead(400).end(); return; }
    requests.push({ path:url.pathname, method:req.method });
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    let filepath;
    try { filepath = path.resolve(DIST,'.'+decodeURIComponent(pathname)); }
    catch (_) { res.writeHead(400).end(); return; }
    if (!filepath.startsWith(DIST + path.sep)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
      res.writeHead(404, {'Content-Type':'text/html','Cache-Control':'no-store'});
      if (req.method !== 'HEAD') res.end(fs.readFileSync(path.join(DIST,'404.html')));
      else res.end();
      return;
    }
    res.writeHead(200, {'Content-Type':MIME[path.extname(filepath)]||'application/octet-stream',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if (req.method==='HEAD') {res.end();return;}
    fs.createReadStream(filepath).pipe(res);
  });
  const tlsPort = await port(site);
  origin = 'https://' + HOST + ':' + tlsPort;
  proxy = http.createServer((_req,res) => res.writeHead(502).end());
  proxy.on('connect',(req,client,head)=>{
    if (req.url !== HOST+':'+tlsPort) {
      externalAttempts.push(req.url); client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');return;
    }
    const upstream = net.connect({ host:'127.0.0.1',port:tlsPort });
    sockets.add(client);sockets.add(upstream);
    client.on('close',()=>sockets.delete(client));
    upstream.on('close',()=>sockets.delete(upstream));
    upstream.once('connect',()=>{
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      client.pipe(upstream);upstream.pipe(client);
    });
    upstream.on('error',()=>client.destroy());
    client.on('error',()=>upstream.destroy());
  });
  const proxyPort = await port(proxy);
  return 'http://127.0.0.1:'+proxyPort;
}

async function launch(proxyAddress, profileFolder, { offline=false, approved=true }={}) {
  const folder=profileFolder||fs.mkdtempSync(path.join(os.tmpdir(),'cp-cloudflare-browser-'+engine+'-'));
  if (!profileFolder) profiles.push(folder);
  else assert(profiles.includes(profileFolder), 'Only a test-owned browser profile can be reopened');
  context=await playwright[engine].launchPersistentContext(folder,{
    headless:true,offline,viewport:{width:390,height:844},
    ignoreHTTPSErrors:true,
    proxy:{server:proxyAddress},
    ...(engine==='chromium'?{args:['--ignore-certificate-errors']}:{}),
  });
  for(const extra of context.pages().slice(1))await extra.close();
  await context.addInitScript(({origin,user,sessionKey,approved})=>{
    if(window!==window.top || location.origin!==origin)return;
    if (!localStorage.getItem('cp-cloudflare-browser-fixture-seeded')) {
      localStorage.setItem('cp-cloudflare-browser-fixture-seeded','1');
      localStorage.setItem('cpx.bookmarks','[{"path":"/unrelated","title":"Other section bookmark"}]');
      localStorage.setItem('cpx.marks','{"/unrelated":[{"text":"Keep unrelated annotation"}]}');
      localStorage.setItem('commonplace_wdb_v1','{"done":{"l123":1},"notes":{"l123":"Keep original tracker"}}');
      if (approved) {
        // Model an ALREADY APPROVED cached session, not a new sign-in.
        // The real gate still checks this cached identity and locks if absent.
        localStorage.setItem(sessionKey,JSON.stringify({user,access_token:'SYNTHETIC-ONLY'}));
        localStorage.setItem('cp:gate:ok',user.email);
      }
    }
    window.__stagingAccountTransportCalls=0;
    window.__cpSupabase={
      auth:{getSession(){window.__stagingAccountTransportCalls++;return Promise.resolve({data:{session:null},error:null});},
        onAuthStateChange(){window.__stagingAccountTransportCalls++;return{data:{subscription:{unsubscribe(){}}}};}},
      from(){window.__stagingAccountTransportCalls++;throw Error('Staging must never read production study sync');},
      rpc(){window.__stagingAccountTransportCalls++;throw Error('Staging must never write production study sync');}
    };
  },{origin,user:fixtureUser,sessionKey:SESSION,approved});
  page=context.pages()[0]||await context.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror',err=>errors.push(err.name));
  return folder;
}
async function ready() {
  await page.waitForFunction(base => !!navigator.serviceWorker.controller &&
    navigator.serviceWorker.controller.scriptURL.startsWith(location.origin+base+'sw.js'),
    BASE,{timeout:30000});
  const state=await page.evaluate(async base=>{
    const reg=await navigator.serviceWorker.getRegistration(base);
    return {protocol:location.protocol,host:location.hostname,secure:isSecureContext,
      scope:reg?.scope,controller:!!navigator.serviceWorker.controller};
  },BASE);
  assert.equal(state.protocol,'https:');
  assert.equal(state.host,HOST);
  assert.equal(state.secure,true);
  assert.equal(state.scope,origin+BASE);
  assert.equal(state.controller,true);
}
async function rpc(type) {
  return page.evaluate(async ({base,type}) => {
    const reg=await navigator.serviceWorker.getRegistration(base);
    if(!reg?.active)throw Error('The real Web Studio worker did not activate');
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      const timeout=setTimeout(()=>{channel.port1.close();reject(Error('Timed out checking offline pack'));},110000);
      channel.port1.onmessage=({data})=>{
        if(data.progress)return;
        clearTimeout(timeout);channel.port1.close();resolve(data);
      };
      reg.active.postMessage({type},[channel.port2]);
    });
  },{base:BASE,type});
}
async function eventual(fn,label,ms=30000){
  const end=Date.now()+ms;
  while(Date.now()<end){
    if(await fn())return;
    await new Promise(r=>setTimeout(r,90));
  }
  assert.fail(label);
}
async function run() {
  assert(['chromium','webkit'].includes(engine));
  assert.equal(manifest.files.length,58);
  assert.equal(manifest.revision,digest(Buffer.from(JSON.stringify(manifest.files))));
  const proxyAddress=await servers();
  const folder=await launch(proxyAddress,null,{approved:true});
  await page.goto(origin+APP,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.webStudioStartup==='ready');
  await ready();
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('cp-locked')),false);
  assert.equal(await page.locator('#cp-gate').count(),0);
  assert.equal(await page.evaluate(()=>window.__stagingAccountTransportCalls),0);
  await eventual(()=>page.locator('#wb-sync-status').evaluate(e=>/Cloud sync is disabled in this Cloudflare pilot/.test(e.textContent)),
    'Staging must show explicitly disabled account sync');
  assert.equal(await page.locator('#wb-sync-now').isDisabled(),true);
  assert.equal(await page.locator('#wb-sync-status').getAttribute('data-state'),'offline');
  console.log('PASS '+engine+': real HTTPS gate, real Web Studio worker and local-only staged sync');

  await page.locator('#wb-offline-toggle').click();
  await page.locator('#wb-offline-download').click();
  await eventual(async()=>/Ready offline|Updated pack verified/.test(await page.locator('#wb-offline-status').textContent()),
    'Staging study pack failed to finish',180000);
  const pack=await rpc('offline-status');
  assert.equal(pack.ready,true,pack.error||'Pack must verify');
  assert.equal(pack.done,manifest.files.length);
  assert.equal(pack.completeRevision,manifest.revision);
  assert.equal(pack.remainingBytes,0);
  assert.equal(await page.evaluate(()=>window.__stagingAccountTransportCalls),0);
  console.log('PASS '+engine+': real worker verifies all 58 STAGED SHA-256 files, no account sync');

  await page.locator('#wb-offline-close').click();
  await page.locator('#wb-bookmark').click();
  await page.locator('.wb-app-tabs [data-view="notes"]').click();
  await page.locator('#wb-note-editor').fill(noteText);
  await page.locator('.wb-app-tabs [data-view="practice"]').click();
  for (const [name,body] of [['html',projectHTML],['css',projectCSS],['js',projectJS]]) {
    await page.locator('.wb-file-tabs [data-file="'+name+'"]').click();
    await page.locator('#wb-editor').fill(body);
  }
  await page.locator('.wb-project-bar [data-view="projects"]').click();
  await page.locator('#wb-project-name').fill('Cloudflare pilot review');
  await page.locator('#wb-project-duplicate').click();
  await page.locator('.wb-app-tabs [data-view="practice"]').click();
  await page.locator('#wb-run').click();
  const preview=page.frameLocator('#wb-preview-host iframe');
  await preview.locator('#counter').click();await preview.locator('#counter').click();
  assert.equal(await preview.locator('#counter').textContent(),'Clicks: 4');
  const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
  assert(before && before.includes('Cloudflare pilot review'));
  const unrelated=await page.evaluate(()=>Object.fromEntries(
    ['cpx.bookmarks','cpx.marks','commonplace_wdb_v1'].map(k=>[k,localStorage.getItem(k)])));
  assert.equal(await page.evaluate(()=>window.__stagingAccountTransportCalls),0);

  // Cache should be self-sufficient after a CLOSED browser restart, not just
  // while a page/tab continues to run. Online HTTP is no-store in the fixture.
  networkDown=true;
  await context.setOffline(true);
  await context.close();context=null;page=null;
  await launch(proxyAddress,folder,{offline:true,approved:true});
  await page.goto(origin+APP,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.webStudioStartup==='ready');
  await ready();
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('cp-locked')),false);
  assert.equal(await page.evaluate(async()=>{
    try {await fetch('/Commonplace/__not_in_pack');return false;}catch(_){return true;}
  }),true,'Uncached network negative control must fail');
  await page.locator('.wb-app-tabs [data-view="notes"]').click();
  assert.equal(await page.locator('#wb-note-editor').inputValue(),noteText);
  await page.locator('.wb-app-tabs [data-view="book"]').click();
  assert.equal(await page.locator('#wb-bookmark').getAttribute('aria-pressed'),'true');
  await page.locator('.wb-app-tabs [data-view="practice"]').click();
  assert.equal(await page.locator('#wb-project-current').textContent(),'Cloudflare pilot review');
  await page.locator('#wb-run').click();
  const coldPreview=page.frameLocator('#wb-preview-host iframe');
  await coldPreview.locator('#counter').click();await coldPreview.locator('#counter').click();
  assert.equal(await coldPreview.locator('#counter').textContent(),'Clicks: 4');
  assert.equal((await rpc('offline-status')).ready,true);
  assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),
    Object.keys(unrelated)),unrelated);
  assert.equal(await page.evaluate(()=>window.__stagingAccountTransportCalls),0);
  console.log('PASS '+engine+': full offline restart keeps local notes, bookmark, named project and preview');

  networkDown=false;
  await context.setOffline(false);
  await eventual(()=>page.locator('#wb-sync-status').evaluate(e=>/Cloud sync is disabled/.test(e.textContent)),
    'Staging must stay local-only after reconnecting');
  assert.equal(await page.evaluate(()=>window.__stagingAccountTransportCalls),0);
  assert.equal(externalAttempts.length,0,'Staging pilot should not access external services in this cached-session scenario');
  console.log('PASS '+engine+': reconnection cannot enable production study progress sync');

  await page.evaluate(key=>{localStorage.removeItem(key);localStorage.removeItem('cp:gate:ok');},SESSION);
  networkDown=true;await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#cp-gate [data-a=google]').waitFor({state:'visible'});
  await ready();
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('cp-locked')),true);
  const original=await page.evaluate(key=>localStorage.getItem(key),KEY);
  assert(original && original.includes('Cloudflare pilot review'));
  assert.equal(await page.evaluate(()=>window.__stagingAccountTransportCalls),0);
  console.log('PASS '+engine+': signed-out offline gate stays locked; saved work is not erased');
  assert.deepEqual(errors,[],'No unhandled errors in the real staging application');
}
(async()=>{
  try{await run();}
  catch(err){
    console.error('Cloudflare staged browser test failed:',err);
    if(page&&!page.isClosed()){
      try{
        const diag=await page.evaluate(async base=>{
          const reg=await navigator.serviceWorker?.getRegistration(base);
          return {protocol:location.protocol,hostname:location.hostname,
            startup:document.body?.dataset.webStudioStartup,
            locked:document.documentElement.classList.contains('cp-locked'),
            controller:!!navigator.serviceWorker?.controller,
            worker:!!reg?.active,offlineStatus:document.getElementById('wb-offline-status')?.textContent,
            stagingSync:document.getElementById('wb-sync-status')?.textContent};
        },BASE);
        console.error('Synthetic staging browser diagnostic:',JSON.stringify(diag));
      }catch(_){}
      try{
        fs.mkdirSync('test-results',{recursive:true});
        await page.screenshot({path:'test-results/cloudflare-stage-'+engine+'.png',fullPage:true});
      }catch(_){}
    }
    process.exitCode=1;
  } finally {
    if(context)await context.close().catch(()=>{});
    for(const socket of sockets)socket.destroy();
    if(proxy)await new Promise(resolve=>proxy.close(resolve));
    if(site)await new Promise(resolve=>site.close(resolve));
    for(const folder of profiles)fs.rmSync(folder,{recursive:true,force:true});
    if(workdir)fs.rmSync(workdir,{recursive:true,force:true});
  }
})();
