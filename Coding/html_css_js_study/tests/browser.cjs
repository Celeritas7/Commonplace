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
  assert.equal(await page.locator('#wb-title').textContent(), 'Give your page meaning.');
  assert.equal(await page.locator('.wb-toc [data-part]').count(), 9);
  await preserved();

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
  await view('practice');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'wb-practice-title', 'opening mobile practice must not focus the keyboard');
  assert.equal(await page.locator('#wb-contents').isVisible(), false);
  await view('course');
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
  console.log('PASS '+engine+': mobile reading focus, no forced keyboard, top course return and parent-folder navigation preserve study data');

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
  assert.deepEqual(errors, [], 'uncaught page errors');
  console.log('PASS ' + engine + ': original lesson deep links, saved tracker data and malformed-record preservation');
})().catch(async error => {
  console.error(error);
  if (page) { try { fs.mkdirSync('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/web-studio-' + engine + '.png', fullPage: true }); } catch (_) {} }
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
});
