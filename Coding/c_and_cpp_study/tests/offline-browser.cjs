/* Browser acceptance suite. npm install playwright; CHROMIUM_PATH optional.
   Uses a local static server, never real cloud credentials or records. */
const {chromium,webkit}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright' : 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fixtureEmail='cpp-login-fixture@example.test';
const fixtureHash=crypto.createHash('sha256').update(fixtureEmail).digest('hex');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../..');
let interrupted=true;const counts=new Map(), overrides=new Map();
const fixtureGate=fs.readFileSync(path.join(repo,'_lib/gate.js'),'utf8')
 .replace(/  if \(location.protocol === 'file:'[^\n]+\n/, '')
 .replace(/var ALLOW = \['[a-f0-9]+'\];/, `var ALLOW = ['${fixtureHash}'];`);
overrides.set(path.join(repo,'_lib/gate.js'),Buffer.from(fixtureGate));
const fixturePack={self:{}};require('node:vm').runInNewContext(fs.readFileSync(path.join(root,'offline-assets.js'),'utf8'),fixturePack);
const gateAsset=fixturePack.self.CPP_PACK.assets.find(a=>a.url==='../../_lib/gate.js');
gateAsset.bytes=Buffer.byteLength(fixtureGate);gateAsset.revision=crypto.createHash('sha256').update(fixtureGate).digest('hex');
overrides.set(path.join(root,'offline-assets.js'),Buffer.from('self.CPP_PACK='+JSON.stringify(fixturePack.self.CPP_PACK)+';'));

const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');const file=path.join(repo,decodeURIComponent(url.pathname));
 counts.set(url.pathname,(counts.get(url.pathname)||0)+1);
 if(interrupted&&url.pathname.endsWith('/lessons/C_Book_Lesson_2_1.html')){res.writeHead(503);res.end('test interruption');return;}
 if(!file.startsWith(repo+path.sep)){res.writeHead(403);res.end();return;}
 try{
  const body=overrides.get(file)||fs.readFileSync(file);
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'application/octet-stream');
  res.end(body);
 }catch(e){res.writeHead(404);res.end('not found');}
});
(async()=>{
 const engine=process.env.BROWSER==='webkit'?webkit:chromium;
 // Launch first so unavailable browsers fail with the real browser diagnostic.
 const browser=await engine.launch({headless:true,...(engine===chromium?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}: {})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://localhost:'+server.address().port;
 const base=origin+'/Coding/c_and_cpp_study/';
 const context=await browser.newContext({viewport:{width:820,height:1180},isMobile:engine===webkit,hasTouch:true});
 // Do not intercept local worker installation requests (WebKit cannot route them reliably).
 await context.route('https://**/*',route=>route.abort());
 const page=await context.newPage();const errors=[];
 page.on('dialog',async d=>{console.log('DIALOG '+d.type());await d.accept();});
 page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('NAV '+new URL(f.url()).pathname);});
 page.on('requestfailed',r=>{if(new URL(r.url()).origin===origin)console.log('FAILED '+new URL(r.url()).pathname+' '+r.failure()?.errorText);});
page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'offline.html');
  await page.evaluate(email=>{
   localStorage.setItem('cp:gate:ok',email);
   const exp=Math.floor(Date.now()/1000)+3600,id='a9d4b067-3dbe-49b8-8d40-3d9b7ec6df0c';
   const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:id,email,exp,aud:'authenticated',role:'authenticated'}))+'.fixture';
   localStorage.setItem('sb-wylxvmkcrexwfpjpbhyy-auth-token',JSON.stringify({access_token:token,token_type:'bearer',refresh_token:'offline-fixture',expires_in:3600,expires_at:exp,user:{id,email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}}));
  },fixtureEmail);
  await page.goto(base+'index.html');assert.equal(await page.locator('#cp-gate').count(),0);await page.getByRole('link',{name:'↓ Study offline',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#download').disabled);
  await page.click('#download');await page.waitForFunction(()=>document.querySelector('#error').textContent,{},{timeout:65000});
  assert.match(await page.locator('#error').textContent(),/Completed files/);
  const first=counts.get('/Coding/c_and_cpp_study/index.html');interrupted=false;
  await page.click('#download');await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('Ready offline'),{},{timeout:90000});
  assert.equal(counts.get('/Coding/c_and_cpp_study/index.html'),first);
  console.log('PASS fresh setup, interruption/resume');
  // Serve a new manifest and shared login file over a fully downloaded older release.
  const vm=require('node:vm'),crypto=require('node:crypto'),sandbox={self:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'offline-assets.js'),'utf8'),sandbox);
  const pack=sandbox.self.CPP_PACK,gatePath=path.join(repo,'_lib/gate.js');
  const gate=Buffer.concat([Buffer.from(fixtureGate),Buffer.from('\n// browser update test\n')]);
  const a=pack.assets.find(a=>a.url==='../../_lib/gate.js');a.bytes=gate.length;a.revision=crypto.createHash('sha256').update(gate).digest('hex');pack.version='browser-update';
  overrides.set(gatePath,gate);overrides.set(path.join(root,'offline-assets.js'),Buffer.from('self.CPP_PACK='+JSON.stringify(pack)+';'));
  await page.click('#check');await page.waitForFunction(()=>document.querySelector('#version').textContent.includes('browser-update')&&!document.querySelector('#check').disabled,{},{timeout:90000});
  assert.match(await page.locator('#state').textContent(),/incomplete/);
  const gateRequests=counts.get('/_lib/gate.js')||0;
  await page.click('#download');await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('Ready offline'),{},{timeout:90000});
  assert.equal(counts.get('/_lib/gate.js'),gateRequests+1);
  console.log('PASS newer shared dependency over older saved release');
  const marker=await page.evaluate(async()=>{
   localStorage.setItem('cpx.bookmarks',JSON.stringify([{path:'/Coding/c_and_cpp_study/index.html',title:'Saved C++',ts:1}]));
   localStorage.setItem('cpx.marks',JSON.stringify({'/Coding/c_and_cpp_study/index.html':[{id:'test',type:'hl',text:'Two books.',note:'Keep this note',occ:0}]}));
   const c=await caches.open('cp-python-downloads-v1');await c.put('/sentinel',new Response('keep'));
   return {bookmarks:localStorage.getItem('cpx.bookmarks'),marks:localStorage.getItem('cpx.marks')};
  });
  await page.goto(base+'offline-repair.html?nocache=1');await page.click('#repair');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Setup repaired'),{},{timeout:90000});
  const after=await page.evaluate(async()=>({bookmarks:localStorage.getItem('cpx.bookmarks'),marks:localStorage.getItem('cpx.marks'),other:await(await(await caches.open('cp-python-downloads-v1')).match('/sentinel')).text()}));
  assert.equal(after.bookmarks,marker.bookmarks);assert.equal(after.marks,marker.marks);assert.equal(after.other,'keep');
  if(engine===chromium){const cdp=await context.newCDPSession(page);await cdp.send('Network.clearBrowserCache');}
  await context.setOffline(true);
  await page.goto(base+'lessons/Cpp_Book_Lesson_0_1_v3.html');await page.waitForFunction(()=>window.__cpx&&window.__cpBackup);
  await page.goto(base+'cpp_playground.html');await page.waitForFunction(()=>window.cm&&window.__draftFlush);
  assert.equal(await page.locator('#cp-gate').count(),0,'Saved sign-in reopens offline with real gate');
  await page.evaluate(()=>{cm.setValue('cout << 55; // offline draft');__draftFlush();runCode();});
  assert.match(await page.locator('#term').textContent(),/does not include a C\+\+ compiler/);
  console.log('RELOAD before',await page.evaluate(()=>({gate:!!document.querySelector('#cp-gate'),session:!!localStorage.getItem('sb-wylxvmkcrexwfpjpbhyy-auth-token')})));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.cm&&cm.getValue().includes('offline draft'));
  await page.goto(base+'offline.html');await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('Ready offline'),{},{timeout:60000});
  assert.deepEqual(errors,[]);console.log('PASS repair isolation, offline reopening, local draft persistence, honest execution notice');
 }finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
