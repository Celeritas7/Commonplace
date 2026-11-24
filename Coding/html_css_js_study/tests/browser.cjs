'use strict';
// Actual browser acceptance. Authentication is replaced only in this test
// context; production gate.js and its restrictions are never changed.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); }
catch (_) { playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules', 'playwright')); }
const ROOT = path.resolve(__dirname, '../../..');
const SECTION = '/Coding/html_css_js_study/index.html';
const KEY = 'commonplace_web_studio_v1';
const LEGACY = 'commonplace_wdb_v1';
const engine = process.env.BROWSER || 'chromium';
const legacyRecord = JSON.stringify({ done: { l123: 1 }, star: { l7: 1 }, notes: { l123: 'Keep the original tracker note.' }, open: {}, show: 'star', hide: { video: true }, unknownFutureField: 'keep' });
const untouched = {
  [LEGACY]: legacyRecord,
  'cpx.bookmarks': '[{"path":"/existing-page","title":"Keep"}]',
  'cpx.marks': '{"/existing-page":[{"text":"Keep highlight"}]}',
  'cpx.resume': '{"/existing-page":[{"text":"Keep reading position"}]}',
  'sb-test-auth-token': 'FAKE-TEST-AUTH-DO-NOT-EXPORT'
};
let server, browser, page, origin;
const serverRequests = [];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

function startServer() {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost'); serverRequests.push(url.pathname);
    let file;
    try { file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname.replace(/^\/Commonplace(?=\/)/, ''))); }
    catch (_) { res.writeHead(400).end(); return; }
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => { origin = 'http://127.0.0.1:' + server.address().port; resolve(); }); });
}

async function context(seed = untouched) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 1000 }, acceptDownloads: true });
  await ctx.route('**/_lib/gate.js', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* Authentication fixture: browser acceptance only. */' }));
  await ctx.addInitScript(({ seed, origin }) => {
    if (window !== window.top || location.origin !== origin) return;
    // Playwright's serviceWorkers: 'block' reads navigator.serviceWorker in
    // every frame, which itself throws in our deliberately opaque preview.
    // Disable registration only in the app, on every navigation/reload.
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => {
      throw new Error('Service Worker registration disabled by browser acceptance fixture.');
    };
    if (sessionStorage.getItem('web-studio-fixture')) return;
    for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
    sessionStorage.setItem('web-studio-fixture', '1');
  }, { seed, origin });
  return ctx;
}

async function textHas(selector, pattern) {
  await page.waitForFunction(({ selector, pattern, flags }) => {
    const el = document.querySelector(selector); return !!el && new RegExp(pattern, flags).test(el.textContent);
  }, { selector, pattern: pattern.source, flags: pattern.flags }, { timeout: 12000 });
}
const view = name => page.locator('.wb-app-tabs [data-view="' + name + '"]').click();
const chapter = name => page.locator('.wb-language-tabs [data-language="' + name + '"]').click();
async function part(number) {
  if (!await page.locator('#wb-contents').evaluate(el => el.open)) await page.locator('#wb-contents > summary').click();
  await page.locator('.wb-toc [data-part="' + number + '"]').click();
}
async function edit(file, value) {
  await page.locator('.wb-file-tabs [data-file="' + file + '"]').click();
  await page.locator('#wb-editor').fill(value);
}
async function run() {
  await page.locator('#wb-run').click();
  await textHas('#wb-run-status', /Preview running|Execution limit|blocked|Blocked|Error|error/);
}
async function preserved() {
  assert.deepEqual(await page.evaluate(keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])), Object.keys(untouched)), untouched);
}

(async () => {
  assert(['chromium', 'webkit'].includes(engine), 'BROWSER must be chromium or webkit');
  await startServer();
  browser = await playwright[engine].launch({ headless: true, ...(engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const ctx = await context(); page = await ctx.newPage(); page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + SECTION); await page.locator('#wb-title').waitFor({ state: 'visible' });
  const startup = await page.evaluate(() => ({state: window.WebStudioStartup?.state, reason: window.WebStudioStartup?.reason, asset: window.WebStudioStartup?.asset}));
  assert.equal(startup.state, 'ready', 'the main app must acknowledge readiness before study interactions: ' + JSON.stringify(startup));
  assert.equal(await page.locator('#wb-startup-recovery').isVisible(), false, 'healthy startup must never obscure lessons');
  assert.equal(await page.locator('#wb-title').textContent(), 'Give your page meaning.');
  assert.equal(await page.locator('.wb-toc [data-part]').count(), 9);
  await preserved();

  // The supplied sample must work before the learner edits any file.
  await view('practice'); await run();
  const starterPreview = page.frameLocator('#wb-preview-host iframe');
  assert.equal(await starterPreview.locator('h1').textContent(), 'My study desk');
  assert.equal(await starterPreview.locator('.card').evaluate(el => getComputedStyle(el).padding), '24px');
  await starterPreview.locator('#counter').click();
  assert.equal(await starterPreview.locator('#counter').textContent(), 'Clicks: 1');
  await page.locator('#wb-return').click();
  const afterPreviewBoot = await page.evaluate(() => ({state:window.WebStudioStartup?.state,reason:window.WebStudioStartup?.reason,asset:window.WebStudioStartup?.asset,hidden:document.getElementById('wb-startup-recovery')?.hidden}));
  assert.equal(afterPreviewBoot.state, 'ready', 'preview must not change healthy startup status: '+JSON.stringify(afterPreviewBoot));
  assert.equal(afterPreviewBoot.hidden, true, 'preview must not open recovery panel: '+JSON.stringify(afterPreviewBoot));
  console.log('PASS ' + engine + ': fresh sample starter renders its card and runs the click counter');

  await part(2); await page.locator('#wb-bookmark').click();
  await view('notes'); await page.locator('#wb-note-editor').fill('A note to keep through updates.');
  await view('book'); await part(8);
  const answers = await page.evaluate(() => window.WebStudioLessons.chapters.html.quiz.map(q => q.correct));
  const answerQuiz = async choices => {
    for (const answer of choices) {
      await page.locator('#wb-quiz-options input[value="' + answer + '"]').check();
      await page.locator('#wb-quiz-next').click();
    }
  };
  await answerQuiz(answers.map((a, i) => i < 2 ? (a + 1) % 3 : a));
  await textHas('#wb-quiz-score', /3 \/ 5/); await textHas('#wb-check-state', /Keep practising/);
  await page.locator('#wb-quiz-retry').click();
  await answerQuiz(answers.map((a, i) => i === 0 ? (a + 1) % 3 : a));
  await textHas('#wb-quiz-score', /4 \/ 5/); await textHas('#wb-check-state', /Check passed/);
  await page.locator('#wb-mark-read').click();
  await page.reload(); await textHas('#wb-check-state', /4 \/ 5/);
  assert.equal(await page.locator('#wb-mark-read').getAttribute('aria-pressed'), 'true');
  await part(2); assert.equal(await page.locator('#wb-bookmark').getAttribute('aria-pressed'), 'true');
  await view('notes'); assert.equal(await page.locator('#wb-note-editor').inputValue(), 'A note to keep through updates.');
  await preserved();
  console.log('PASS ' + engine + ': book flow, 4/5 check, bookmarks, notes and reading progress survive reload without touching old data');

  await view('practice');
  const html = '<main class="card"><h1>My saved reading desk</h1><p>Learn every day.</p><button id="counter">Clicks: 0</button></main>';
  const css = '.card { padding: 32px; background: #edf5ff; color: #244f7c; border-radius: 12px; }';
  const js = 'const button = document.querySelector("#counter"); let count = 0; button.addEventListener("click", () => { count += 2; button.textContent = "Clicks: " + count; });';
  await edit('html', html); await chapter('css'); await view('practice');
  await page.locator('.wb-file-tabs [data-file="html"]').click();
  assert.equal(await page.locator('#wb-editor').inputValue(), html);
  await edit('css', css); await chapter('js'); await view('practice'); await edit('js', js);
  await page.reload(); await page.locator('#wb-editor').waitFor({ state: 'visible' });
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.deepEqual(stored.project, { html, css, js });
  await run();
  const preview = page.frameLocator('#wb-preview-host iframe');
  assert.equal(await page.locator('#wb-preview-host iframe').getAttribute('sandbox'), 'allow-scripts');
  await preview.locator('#counter').click(); await preview.locator('#counter').click();
  assert.equal(await preview.locator('#counter').textContent(), 'Clicks: 4');
  assert.equal(await preview.locator('h1').textContent(), 'My saved reading desk');
  assert.equal(await preview.locator('.card').evaluate(el => getComputedStyle(el).padding), '32px');
  await page.locator('#wb-return').click(); await textHas('#wb-part-title', /Why this matters/);
  await preserved();
  console.log('PASS ' + engine + ': shared three-file project survives chapter changes/reload and executes real HTML/CSS/JavaScript');

  const beforeSamples = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  await page.locator('.wb-samples-link').click();
  assert.equal(await page.locator('#wb-library-list .wb-library-entry').count(), 3);
  const htmlSample = page.locator('#wb-library-list .wb-library-entry').filter({ has: page.locator('[data-language="html"]') });
  assert.match(await htmlSample.textContent(), /Reading marked done.*Check passed · 4 \/ 5.*Practice not marked tested/s);
  assert.match(await htmlSample.textContent(), /Saved place: Walk-through/);
  for (const width of [320, 390, 810]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sample library overflow at ' + width);
  }
  await page.setViewportSize({ width: 1024, height: 1000 });
  for (const language of ['html', 'css', 'js']) {
    await page.locator('#wb-library-list [data-language="' + language + '"]').click();
    const lessonId = { html: 'html-elements', css: 'css-spacing', js: 'js-events' }[language];
    const expectedPart = beforeSamples.lessons[lessonId].part;
    assert.equal(await page.locator('.wb-toc [aria-current="step"]').getAttribute('data-part'), String(expectedPart));
    await page.locator('#wb-sources > summary').click();
    assert(await page.locator('#wb-source-detail a').count() > 0, language + ' must identify lesson references');
    assert.match(await page.locator('#wb-source-detail').textContent(), /Reference links open online/);
    for (const href of await page.locator('#wb-source-detail a').evaluateAll(links => links.map(link => link.href))) {
      assert.match(href, /^https:\/\/(drive\.google\.com|developer\.mozilla\.org)\//);
    }
    await page.locator('#wb-sources > summary').click();
    if (language === 'html') assert.match(await page.locator('#wb-prose').textContent(), /id="counter"/, 'HTML walk-through must match the shared counter selector');
    if (language !== 'js') await page.locator('.wb-samples-link').click();
  }
  const afterSamples = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.deepEqual(afterSamples.project, beforeSamples.project);
  assert.deepEqual(afterSamples.lessons, beforeSamples.lessons, 'sample navigation must preserve notes, answers, reading marks, bookmarks and saved places');
  await preserved();
  console.log('PASS ' + engine + ': sample library, online source notes and saved-place resume preserve all learning records');

  await view('practice');
  await edit('js', 'try { parent.localStorage.setItem("preview-must-not-write", "bad"); document.querySelector("#counter").textContent = "ACCESS GRANTED"; } catch (e) { document.querySelector("#counter").textContent = "parent blocked"; }');
  await run(); assert.equal(await preview.locator('#counter').textContent(), 'parent blocked');
  assert.equal(await page.evaluate(() => localStorage.getItem('preview-must-not-write')), null);
  await edit('js', 'fetch(' + JSON.stringify(origin + '/network-probe') + ').then(() => { document.querySelector("#counter").textContent = "NETWORK ALLOWED"; }).catch(() => { document.querySelector("#counter").textContent = "network blocked"; });');
  await run(); await preview.locator('#counter').filter({ hasText: 'network blocked' }).waitFor();
  assert(!serverRequests.includes('/network-probe'), 'preview must not make an external request');
  await edit('js', 'while (true) {}'); await page.locator('#wb-run').click(); await textHas('#wb-run-status', /Execution limit reached/);
  assert.equal(await page.locator('#wb-run-status').getAttribute('data-error'), 'true');
  await page.locator('#wb-stop').click(); assert.equal(await page.locator('#wb-preview-host iframe').count(), 0);
  await edit('js', js); await run();
  console.log('PASS ' + engine + ': opaque preview cannot access parent storage or network; endless loop stops and retry works');

  for (const width of [320, 360, 390, 810, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow at ' + width);
    if (width === 1440) {
      await page.locator('#wb-split').click();
      for (const file of ['html', 'css', 'js']) assert(await page.locator('#wb-editor-' + file).isVisible(), file + ' editor must be visible in wide split mode');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'split layout overflow');
      await page.locator('#wb-split').click();
    }
  }
  await page.setViewportSize({ width: 1024, height: 1000 });
  await view('notes');
  const downloading = page.waitForEvent('download'); await page.locator('#wb-export').click();
  const download = await downloading, backupText = fs.readFileSync(await download.path(), 'utf8'), backup = JSON.parse(backupText);
  assert.deepEqual(Object.keys(backup.records).sort(), [KEY, LEGACY].sort());
  assert(!backupText.includes('FAKE-TEST-AUTH-DO-NOT-EXPORT'));
  assert.equal(backup.currentDraft.project.html, html);
  await preserved();
  console.log('PASS ' + engine + ': phone/iPad/desktop widths, optional split editors and scoped export without authentication data');

  // Mobile learning flow and real folder navigation, including GitHub Pages' prefix.
  await page.setViewportSize({width:390,height:844});
  await view('book'); await part(0);
  await page.locator('#wb-next').click();
  assert.equal(await page.locator('#wb-part-title').textContent(), 'The mental model');
  await page.waitForFunction(() => { const r=document.querySelector('#wb-part-title').getBoundingClientRect(); return r.top>=52 && r.top<250; });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'wb-part-title');
  await textHas('#wb-contents-current', /2 \/ 8.*mental model/);
  const showOffline = async () => {
    await page.locator('#wb-offline-toggle').click();
    assert(await page.locator('#wb-offline').isVisible());
  };
  const closedOffline = async () => {
    assert.equal(await page.locator('#wb-offline').isVisible(), false, 'navigation must dismiss the download panel');
    assert.equal(await page.locator('#wb-offline-toggle').getAttribute('aria-expanded'), 'false');
  };
  await showOffline(); await page.locator('#wb-offline-close').click(); await closedOffline();
  assert.equal(await page.locator('#wb-part-title').textContent(), 'The mental model', 'returning from offline setup must preserve the selected reading part');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'wb-part-title');
  await page.waitForFunction(() => { const r=document.querySelector('#wb-part-title').getBoundingClientRect(); return r.top>=0 && r.bottom<innerHeight; });
  await showOffline(); await view('book'); await closedOffline();
  assert.equal(await page.locator('#wb-part-title').textContent(), 'The mental model');
  await showOffline(); await view('notes'); await closedOffline();
  assert.equal(await page.evaluate(() => document.activeElement.closest('[data-screen]')?.dataset.screen), 'notes');
  await showOffline(); await chapter('html'); await closedOffline();
  assert.equal(await page.locator('#wb-title').textContent(), 'Give your page meaning.');
  await chapter('js'); await part(1);
  await showOffline();
  await view('practice');
  await closedOffline();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'wb-practice-title', 'opening mobile practice must not focus the keyboard');
  assert.equal(await page.locator('#wb-contents').isVisible(), false);
  await showOffline();
  await view('course');
  await closedOffline();
  await page.waitForFunction(() => document.querySelector('#web-return-book').getBoundingClientRect().top<160);
  await page.locator('#web-return-book').click();
  await page.locator('#wb-title').waitFor({state:'visible'});
  await preserved();
  for (const prefix of ['', '/Commonplace']) {
    const destination=origin+prefix+SECTION;
    await page.goto(destination);
    await view('notes');
    assert.equal(await page.locator('#wb-note-editor').inputValue(), ''); // JavaScript note starts empty.
    const note='Mobile folder navigation '+prefix;
    await page.locator('#wb-note-editor').fill(note);
    const nav=page.locator('#web-site-nav');
    assert.equal(await nav.getByRole('link',{name:'Commonplace',exact:true}).getAttribute('href'),'../../index.html');
    assert.equal(await nav.getByRole('link',{name:'Coding',exact:true}).getAttribute('href'),'../index.html');
    for(const [name, folder] of [['Coding','/Coding/index.html'],['Commonplace','/index.html']]) {
      const parent=origin+prefix+folder;
      await ctx.route(parent, route => route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Parent folder</title><h1>'+name+'</h1>'}));
      await nav.getByRole('link',{name,exact:true}).click();
      await page.waitForURL(parent);
      await page.goBack(); await page.locator('#wb-note-editor').waitFor({state:'visible'});
      assert.equal(await page.locator('#wb-note-editor').inputValue(),note);
      assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).project,KEY),{html,css,js});
    }
    await page.locator('#wb-note-editor').fill('');
  }
  console.log('PASS '+engine+': mobile reading focus, offline-panel dismissal by every main navigation choice, no forced keyboard, top course return and parent-folder navigation preserve study data');

  await page.goto(origin + SECTION + '#l123');
  await page.locator('#legacy-course').waitFor({ state: 'visible' }); await page.locator('#l123').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#l123 input[type=checkbox]').isChecked(), true);
  const remaining = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEGACY);
  assert.equal(remaining.notes.l123, 'Keep the original tracker note.'); assert.equal(remaining.star.l7, 1); assert.equal(remaining.unknownFutureField, 'keep');
  await page.locator('#return-studio').click(); await page.locator('#wb-title').waitFor({ state: 'visible' });

  const corrupt = '{"version":1,"broken":';
  const badContext = await context({ ...untouched, [KEY]: corrupt });
  const bad = await badContext.newPage(); await bad.goto(origin + SECTION);
  await bad.locator('#wb-save-status[data-error=true]').waitFor();
  await bad.locator('#wb-next').click(); await bad.locator('.wb-app-tabs [data-view=notes]').click(); await bad.locator('#wb-note-editor').fill('Unsaved draft must not replace damaged data.');
  assert.equal(await bad.evaluate(key => localStorage.getItem(key), KEY), corrupt);
  await bad.reload(); assert.equal(await bad.evaluate(key => localStorage.getItem(key), KEY), corrupt);
  const beforeLeave=bad.url();
  bad.once('dialog', async dialog => { assert.match(dialog.message(),/could not be saved/); await dialog.dismiss(); });
  await bad.locator('#web-site-nav').getByRole('link',{name:'Coding',exact:true}).click();
  assert.equal(bad.url(),beforeLeave,'cancel leaving must retain unsaved draft');
  await badContext.close();
  // The breadcrumb must stay compact even if an old stylesheet is returned.
  const staleContext=await context();
  const staleCss=fs.readFileSync(path.join(ROOT,'Coding/html_css_js_study/studio.css'),'utf8').split('/* A shared way home')[0];
  await staleContext.route('**/studio.css*',route=>route.fulfill({status:200,contentType:'text/css',body:staleCss}));
  const compact=await staleContext.newPage(); await compact.goto(origin+SECTION);
  for(const width of [320,390,810]) {
    await compact.setViewportSize({width,height:900});
    const layout=await compact.locator('#web-site-nav').evaluate(nav=>{
      const links=[...nav.querySelectorAll('.web-crumbs a,.web-crumbs [aria-current]')];
      return {height:nav.getBoundingClientRect().height,centres:links.map(a=>{const r=a.getBoundingClientRect();return r.top+r.height/2;}),numbered:nav.querySelectorAll('ol,li').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert(layout.height<=46,'breadcrumb should be one compact row at '+width);
    assert(Math.max(...layout.centres)-Math.min(...layout.centres)<2,'breadcrumb items must stay on one line');
    assert.equal(layout.numbered,0); assert.equal(layout.overflow,false);
    assert.equal(await compact.locator('.wb-preview-label,.wb-brand small').count(),0,'no duplicate header rows');
  }
  await staleContext.close();
  console.log('PASS '+engine+': compact single-line breadcrumb survives a stale stylesheet');

  // An older cached document may receive current unversioned scripts first.
  const oldContext=await context();
  const oldMarkup=fs.readFileSync(path.join(ROOT,SECTION),'utf8')
    .replace(/<nav id="web-site-nav"[\s\S]*?<\/nav>/,'')
    .replace(/<span id="wb-contents-current">[\s\S]*?<\/span>/,'')
    .replace(/<button[^>]*id="wb-offline-study"[^>]*>[\s\S]*?<\/button>/,'');
  await oldContext.route(origin+SECTION, route => route.fulfill({status:200,contentType:'text/html',body:oldMarkup}));
  const old=await oldContext.newPage(), oldErrors=[]; old.on('pageerror',e=>oldErrors.push(e.message));
  await old.goto(origin+SECTION);
  await old.locator('#wb-next').click();
  assert.equal(await old.locator('#wb-part-title').textContent(),'The mental model');
  await old.locator('#wb-offline-toggle').click();
  assert(await old.locator('#wb-offline').isVisible());
  await old.locator('#wb-offline-close').click();
  assert.equal(await old.locator('#wb-offline').isVisible(),false);
  assert.equal(await old.evaluate(() => document.activeElement.id),'wb-part-title','cached markup without Start studying must keep its existing return control usable');
  await old.locator('.wb-app-tabs [data-view=course]').click();
  assert(await old.locator('#legacy-course > .crumb').isVisible(),'cached documents retain their original folder links');
  assert.deepEqual(oldErrors,[],'new scripts tolerate cached markup');
  await oldContext.close();
  console.log('PASS '+engine+': cached older navigation and offline markup remain usable with new scripts');

  // Phase 3 HTML may be cached while the main controller/runtime update first.
  // Missing exercise modules and controls must not erase already saved attempts.
  const phase3Files={html:'<main class="card"><h1>Cached lesson</h1><p>Keep learning.</p><button id="counter">Clicks: 0</button></main>',css:'.card { padding: 24px; }',js:'const b=document.querySelector("#counter");let n=0;b.addEventListener("click",()=>{n++;b.textContent="Clicks: "+n;});'};
  const phase4Exercises={'html-reading-card':{totalAttempts:1,hintsSeen:1,solutionViewed:false,unknownFutureFlag:'keep',attempts:[{id:'cached-document-attempt',at:'2026-11-19T00:00:00.000Z',exerciseVersion:1,status:'failed',checks:[{id:'button',passed:false,expected:'Start reading',actual:'Clicks: 0'}],files:phase3Files,assisted:false}]}};
  const phase3Context=await context({...untouched,[KEY]:JSON.stringify({version:1,language:'html',view:'mistakes',project:phase3Files,exercises:phase4Exercises})});
  const phase3Markup=fs.readFileSync(path.join(ROOT,SECTION),'utf8')
    .replace(/<section\b[^>]*\bid="wb-exercise-panel"[^>]*>[\s\S]*?<\/section>/,'')
    .replace(/<p\b[^>]*\bid="wb-exercise-unavailable"[^>]*>[\s\S]*?<\/p>/,'')
    .replace(/<section\b[^>]*\bdata-screen="mistakes"[^>]*>[\s\S]*?<\/section>/,'')
    .replace(/<script\b[^>]*\bsrc="studio-(?:exercises|practice)\.js(?:\?[^"]*)?"[^>]*><\/script>/g,'');
  assert(!/id="wb-exercise-panel"|data-screen="mistakes"|src="studio-(?:exercises|practice)\.js/.test(phase3Markup),'fixture must remove all Phase 4 controls/modules');
  await phase3Context.route(origin+SECTION,route=>route.fulfill({status:200,contentType:'text/html',body:phase3Markup}));
  const phase3=await phase3Context.newPage(),phase3Errors=[];phase3.on('pageerror',error=>phase3Errors.push(error.message));
  await phase3.goto(origin+SECTION);await phase3.locator('#wb-title').waitFor({state:'visible'});
  assert.equal(await phase3.locator('#wb-exercise-panel,[data-screen="mistakes"]').count(),0);
  await phase3.locator('.wb-app-tabs [data-view="practice"]').click();
  const editedCachedHTML=phase3Files.html.replace('Cached lesson','Edited cached lesson');
  await phase3.locator('#wb-editor').fill(editedCachedHTML);
  await phase3.locator('#wb-run').click();
  const cachedPreview=phase3.frameLocator('#wb-preview-host iframe');
  await cachedPreview.locator('#counter').click();
  assert.equal(await cachedPreview.locator('#counter').textContent(),'Clicks: 1');
  assert.equal(await cachedPreview.locator('h1').textContent(),'Edited cached lesson');
  const phase3Saved=await phase3.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  assert.deepEqual(phase3Saved.exercises,phase4Exercises,'older document must preserve attempt history and unknown fields');
  assert.equal(phase3Saved.project.html,editedCachedHTML,'older document still saves code');
  assert.deepEqual(await phase3.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(untouched)),untouched);
  assert.deepEqual(phase3Errors,[],'current controller must tolerate missing exercise modules/markup');
  await phase3Context.close();
  console.log('PASS '+engine+': cached Phase 3 document still edits/runs and preserves new exercise records without Phase 4 modules');
  assert.deepEqual(errors, [], 'uncaught page errors');
  console.log('PASS ' + engine + ': original lesson deep links, saved tracker data and malformed-record preservation');
  await require('./exercises-browser.cjs')({ context, origin, SECTION, KEY, untouched, engine, setPage: value => { page = value; } });
  await require('./projects-browser.cjs')({ context, origin, SECTION, KEY, untouched, engine, setPage: value => { page = value; } });
  await require('./sync-browser.cjs')({ context, origin, SECTION, KEY, untouched, engine, setPage: value => { page = value; } });
})().catch(async error => {
  console.error(error);
  if (page) { try { fs.mkdirSync('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/web-studio-' + engine + '.png', fullPage: true }); } catch (_) {} }
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
});
