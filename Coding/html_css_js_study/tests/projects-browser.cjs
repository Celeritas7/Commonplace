'use strict';
// Project management, portable exports and reviewed, scoped backup imports.
const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = async function projectsAcceptance({ context, origin, SECTION, KEY, untouched, engine, setPage }) {
  const LEGACY = 'commonplace_wdb_v1';
  const files = {
    html: '<main class="card"><h1>My saved project</h1><p>Keep this code.</p><button id="counter">Clicks: 0</button></main>',
    css: '.card { padding: 24px; }',
    js: 'const button=document.querySelector("#counter");let count=0;button.addEventListener("click",()=>{count++;button.textContent="Clicks: "+count;});'
  };
  const exercise = { attempts: [{ id: 'project-phase-attempt', at: '2026-11-19T00:00:00.000Z', exerciseVersion: 1,
    status: 'failed', checks: [{ id: 'button', passed: false, expected: 'Start reading', actual: 'Clicks: 0' }], files, assisted: false }],
    totalAttempts: 1, hintsSeen: 1, solutionViewed: false };
  const seed = { version: 1, language: 'html', view: 'book', project: files,
    lessons: { 'html-elements': { note: 'Keep my local lesson note.', bookmarks: [2], read: true, answers: [1,2,0,1,2], question: 4, submitted: true } },
    exercises: { 'html-reading-card': exercise }, unknownFutureField: 'retain this compatible field' };
  const ctx = await context({ ...untouched, [KEY]: JSON.stringify(seed) });
  const page = await ctx.newPage(); setPage(page); page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const openProjects = async target => {
    await target.locator('.wb-app-tabs [data-view="notes"]').click();
    await target.locator('[data-screen="notes"] [data-view="projects"]').click();
    await target.locator('#wb-project-list').waitFor({ state: 'visible' });
  };
  const edit = async (file, value) => {
    await page.locator('.wb-app-tabs [data-view="practice"]').click();
    await page.locator('.wb-file-tabs [data-file="' + file + '"]').click();
    await page.locator('#wb-editor').fill(value);
  };
  const download = async (target, selector) => {
    const pending = target.waitForEvent('download'); await target.locator(selector).click();
    return fs.readFileSync(await (await pending).path(), 'utf8');
  };
  const uploadBackup = async (target, body) => {
    await target.locator('#wb-backup-file').setInputFiles({ name: 'web-studio-review.json', mimeType: 'application/json', buffer: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)) });
  };
  const chooseMode = async (target, mode) => {
    await target.locator('#wb-backup-mode').selectOption(mode);
    await target.waitForFunction(() => !document.querySelector('#wb-backup-apply').disabled);
  };
  const apply = async (target, mode) => {
    await chooseMode(target, mode);
    if (mode === 'replace') target.once('dialog', dialog => dialog.accept());
    await Promise.all([target.waitForNavigation({ waitUntil: 'load' }), target.locator('#wb-backup-apply').click()]);
    await target.locator('#wb-save-status').waitFor({ state: 'visible' });
  };
  const preserved = async (target = page, includeLegacy = true) => {
    const keys = Object.keys(untouched).filter(key => includeLegacy || key !== LEGACY);
    assert.deepEqual(await target.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), keys), Object.fromEntries(keys.map(key => [key, untouched[key]])));
  };

  await page.goto(origin + SECTION); await page.locator('#wb-title').waitFor({ state: 'visible' });
  await edit('html', files.html.replace('My saved project', 'Edited original project'));
  await openProjects(page);
  const original = (await saved()).projects.activeId;
  assert.equal((await saved()).projects.items.length, 1, 'the old single draft becomes one project without losing edits');
  await page.locator('#wb-project-name').fill('Portfolio');
  await page.locator('#wb-project-template').selectOption('blank');
  await page.locator('#wb-project-create').click();
  assert.equal((await saved()).projects.items.length, 2);
  assert.notEqual((await saved()).projects.activeId, original);
  assert.match((await saved()).project.html, /My new page/, 'the selected blank template becomes the active project');
  await page.locator('#wb-project-list [data-open-project="' + original + '"]').click();
  assert.match((await saved()).project.html, /Edited original project/);
  await openProjects(page);
  await page.locator('#wb-project-name').fill('Counter copy');
  await page.locator('#wb-project-duplicate').click();
  const duplicate = (await saved()).projects.activeId;
  assert.notEqual(duplicate, original);
  assert.equal((await saved()).projects.items.length, 3);
  await page.locator('#wb-project-name').fill('Counter copy renamed');
  await page.locator('#wb-project-rename').click();
  assert.equal((await saved()).projects.items.find(item => item.id === duplicate).name, 'Counter copy renamed');
  await edit('html', files.html.replace('My saved project', 'Independent duplicate'));
  await openProjects(page);
  assert.match((await saved()).projects.items.find(item => item.id === original).files.html, /Edited original project/);
  assert.match((await saved()).project.html, /Independent duplicate/);
  await page.reload(); await page.locator('#wb-project-list').waitFor({ state: 'visible' });
  assert.equal((await saved()).projects.activeId, duplicate);
  assert.match((await saved()).project.html, /Independent duplicate/);
  assert.deepEqual((await saved()).exercises['html-reading-card'], exercise);
  assert.equal((await saved()).lessons['html-elements'].note, seed.lessons['html-elements'].note);
  await preserved();
  console.log('PASS ' + engine + ': named projects, templates, duplicate/rename and switching preserve the original draft and study records');

  // Raster images stay embedded in the project; no network asset is needed.
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('#wb-project-image').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: image });
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).project.html.includes('data:image/png;base64,'), KEY);
  const withImage = (await saved()).project;
  await page.locator('.wb-app-tabs [data-view="practice"]').click();
  await page.locator('#wb-run').click();
  const preview = page.frameLocator('#wb-preview-host iframe');
  await preview.locator('#counter').click();
  assert.equal(await preview.locator('#counter').textContent(), 'Clicks: 1');
  await page.waitForFunction(() => {
    // The preview is opaque; the image is verified with the frame-scoped locator below.
    return document.querySelector('#wb-preview-host iframe') !== null;
  });
  await preview.locator('img').waitFor({ state: 'visible' });
  assert.equal(await preview.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await openProjects(page);
  const beforeBadImage = (await saved()).project.html;
  await page.locator('#wb-project-image').setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') });
  await page.waitForFunction(() => /PNG|JPEG|GIF|WebP|supported|raster/i.test(document.querySelector('#wb-project-status').textContent));
  assert.equal((await saved()).project.html, beforeBadImage, 'unsupported image input cannot replace project code');
  const website = await download(page, '#wb-project-export');
  assert(!website.includes('FAKE-TEST-AUTH-DO-NOT-EXPORT'));
  assert(!website.includes(seed.lessons['html-elements'].note));
  const exportedContext = await context({});
  await exportedContext.route(origin + '/exported-project.html', route => route.fulfill({ status: 200, contentType: 'text/html', body: website }));
  const exported = await exportedContext.newPage();
  await exported.goto(origin + '/exported-project.html');
  assert.equal(await exported.locator('h1').textContent(), 'Independent duplicate');
  await exported.locator('#counter').click();
  assert.equal(await exported.locator('#counter').textContent(), 'Clicks: 1');
  assert.equal(await exported.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await exportedContext.close();
  console.log('PASS ' + engine + ': embedded image preview and downloaded standalone HTML execute real code without study/authentication data');

  const backupText = await download(page, '#wb-backup-export');
  const backup = JSON.parse(backupText);
  assert.deepEqual(backup.currentDraft.projects, (await saved()).projects);
  assert.deepEqual(backup.currentDraft.exercises, (await saved()).exercises);
  assert(!backupText.includes('FAKE-TEST-AUTH-DO-NOT-EXPORT'));
  const beforeInvalid = await saved();
  for (const invalid of ['{ broken JSON', { ...backup, version: 999 }, { ...backup, records: { ...backup.records, 'sb-test-auth-token': 'Do not import' } }]) {
    await uploadBackup(page, invalid);
    await page.waitForFunction(() => document.querySelector('#wb-backup-apply').disabled && /invalid|unsupported|JSON|not|only|unrecognized|unexpected/i.test(document.querySelector('#wb-backup-status').textContent));
    const after = await saved();
    assert.deepEqual(after.projects, beforeInvalid.projects);
    assert.deepEqual(after.lessons, beforeInvalid.lessons);
    assert.deepEqual(after.exercises, beforeInvalid.exercises);
    await preserved();
  }
  const incoming = JSON.parse(backupText);
  incoming.currentDraft.lessons['html-elements'].note = 'A note from the other device.';
  incoming.currentDraft.lessons['html-elements'].bookmarks = [5];
  incoming.currentDraft.project.html = incoming.currentDraft.project.html.replace('Independent duplicate', 'Imported conflicting project');
  incoming.currentDraft.projects.items.find(item => item.id === incoming.currentDraft.projects.activeId).files.html = incoming.currentDraft.project.html;
  incoming.currentLegacyDraft.notes.l123 = 'A course note from the other device.';
  await uploadBackup(page, incoming); await chooseMode(page, 'merge');
  assert(await page.locator('#wb-backup-review').isVisible());
  assert.equal((await saved()).projects.items.length, 3, 'review must not apply the import');
  await apply(page, 'merge');
  const merged = await saved();
  assert.equal(merged.projects.items.length, 4);
  assert.deepEqual(merged.project, withImage, 'merge keeps the local active code');
  assert(merged.projects.items.some(item => item.files.html.includes('Imported conflicting project')));
  assert.match(merged.lessons['html-elements'].note, /Keep my local lesson note\./);
  assert.match(merged.lessons['html-elements'].note, /A note from the other device\./);
  assert.deepEqual(new Set(merged.lessons['html-elements'].bookmarks), new Set([2,5]));
  assert.deepEqual(merged.exercises['html-reading-card'], exercise);
  const mergedLegacy = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEGACY);
  assert.match(mergedLegacy.notes.l123, /Keep the original tracker note\./);
  assert.match(mergedLegacy.notes.l123, /A course note from the other device\./);
  await preserved(page, false);
  console.log('PASS ' + engine + ': reviewed merge keeps local code, adds conflicting projects and combines notes/bookmarks without touching other sections');

  await openProjects(page); await uploadBackup(page, backup); await chooseMode(page, 'replace');
  const beforeCancel = await saved();
  page.once('dialog', dialog => dialog.dismiss()); await page.locator('#wb-backup-apply').click();
  assert.deepEqual((await saved()).projects, beforeCancel.projects, 'cancelling replacement keeps current projects');
  await apply(page, 'replace');
  const restored = await saved();
  assert.deepEqual(restored.project, backup.currentDraft.project);
  assert.deepEqual(restored.projects, backup.currentDraft.projects);
  assert.deepEqual(restored.lessons, backup.currentDraft.lessons);
  assert.deepEqual(restored.exercises, backup.currentDraft.exercises);
  assert.equal(restored.unknownFutureField, seed.unknownFutureField);
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEGACY), backup.currentLegacyDraft);
  await preserved(page, false);
  await openProjects(page);
  for (const width of [320,390,810]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'projects/backup controls overflow at ' + width);
  }
  assert.deepEqual(errors, [], 'project/import UI must not emit uncaught errors');
  console.log('PASS ' + engine + ': explicit replacement round-trips projects, image code, study/exercise records and legacy notes with mobile layouts');

  const freshContext = await context(untouched);
  const fresh = await freshContext.newPage(); setPage(fresh);
  await fresh.goto(origin + SECTION); await openProjects(fresh);
  await uploadBackup(fresh, backup); await apply(fresh, 'replace');
  const freshSaved = await fresh.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.deepEqual(freshSaved.project, backup.currentDraft.project);
  assert.deepEqual(freshSaved.projects, backup.currentDraft.projects);
  assert.deepEqual(freshSaved.lessons, backup.currentDraft.lessons);
  assert.deepEqual(freshSaved.exercises, backup.currentDraft.exercises);
  await preserved(fresh, false);
  await freshContext.close();
  console.log('PASS ' + engine + ': a backup restores the complete study/project collection into a fresh browser context');

  // Review is bound to the records inspected; another tab must win over a stale apply.
  const staleContext = await context({ ...untouched, [KEY]: JSON.stringify(seed) });
  const stale = await staleContext.newPage(); setPage(stale);
  await stale.goto(origin + SECTION); await openProjects(stale);
  await uploadBackup(stale, backup); await chooseMode(stale, 'merge');
  const external = await stale.evaluate(key => {
    const data = JSON.parse(localStorage.getItem(key)); data.lessons['html-elements'].note = 'Newer work from another tab';
    const raw = JSON.stringify(data); localStorage.setItem(key, raw); return raw;
  }, KEY);
  await stale.locator('#wb-backup-apply').click();
  await stale.waitForFunction(() => /changed|another|conflict|review/i.test(document.querySelector('#wb-backup-status').textContent));
  assert.equal(await stale.evaluate(key => localStorage.getItem(key), KEY), external);
  await preserved(stale);
  await staleContext.close();
  await ctx.close();
  console.log('PASS ' + engine + ': an intervening tab write prevents stale backup application');

  // A project library is valid even when its compatibility working copy is absent
  // or partial. Opening the current UI must not fill missing files with defaults.
  const libraryFiles = { ...files, html: files.html.replace('My saved project', 'Library-owned code'), css: '.card { color: purple; padding: 37px; }' };
  const library = { version: 1, activeId: 'library-only-project', futureLibraryField: 'keep', items: [{
    id: 'library-only-project', name: 'Existing library project', createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T01:00:00.000Z', files: libraryFiles, futureProjectField: 'keep'
  }] };
  for (const partial of [false, true]) {
    const compatible = { version: 1, language: 'html', view: 'practice', projects: library };
    if (partial) compatible.project = { html: libraryFiles.html.replace('Library-owned code', 'Partial working copy') };
    const libraryContext = await context({ ...untouched, [KEY]: JSON.stringify(compatible) });
    const libraryPage = await libraryContext.newPage(); setPage(libraryPage);
    const libraryErrors = []; libraryPage.on('pageerror', error => libraryErrors.push(error.message));
    await libraryPage.goto(origin + SECTION);
    const expected = partial ? compatible.project.html : libraryFiles.html;
    assert.equal(await libraryPage.locator('#wb-editor').inputValue(), expected);
    const edited = expected.replace('Keep this code.', 'Edited and retained.');
    await libraryPage.locator('#wb-editor').fill(edited);
    await libraryPage.locator('.wb-file-tabs [data-file="css"]').click();
    assert.equal(await libraryPage.locator('#wb-editor').inputValue(), libraryFiles.css);
    const afterEdit = await libraryPage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    assert.deepEqual(afterEdit.project, { ...libraryFiles, html: edited });
    assert.deepEqual(afterEdit.projects.items[0].files, afterEdit.project);
    assert.equal(afterEdit.projects.futureLibraryField, 'keep');
    assert.equal(afterEdit.projects.items[0].futureProjectField, 'keep');
    await libraryPage.reload();
    assert.equal(await libraryPage.locator('#wb-editor').inputValue(), edited);
    assert.deepEqual((await libraryPage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).project, afterEdit.project);
    await preserved(libraryPage);
    assert.deepEqual(libraryErrors, []);
    await libraryContext.close();
  }
  console.log('PASS ' + engine + ': library-only and partial working-copy records preserve active code through edit, save and reload');

  // A cached Phase 4 page can receive the current controller first. It cannot
  // manage projects yet, but it must retain that opaque extension when saving.
  const phase4Markup = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8')
    .replace(/<div class="wb-project-bar"[\s\S]*?<\/div>/, '')
    .replace(/<section data-screen="projects"[\s\S]*?(?=<section data-screen="library")/, '')
    .replace(/<button\b[^>]*\bdata-view="projects"[^>]*>[\s\S]*?<\/button>/g, '')
    .replace(/<script\b[^>]*\bsrc="studio-(?:projects|project-ui)\.js(?:\?[^"]*)?"[^>]*><\/script>/g, '');
  assert(!/id="wb-project-list"|data-view="projects"|src="studio-(?:projects|project-ui)\.js/.test(phase4Markup), 'cached fixture excludes Phase 5 UI and modules');
  const cachedRecord = { version: 1, language: 'html', view: 'projects', project: libraryFiles, projects: library };
  const cachedContext = await context({ ...untouched, [KEY]: JSON.stringify(cachedRecord) });
  await cachedContext.route(origin + SECTION, route => route.fulfill({ status: 200, contentType: 'text/html', body: phase4Markup }));
  const cached = await cachedContext.newPage(); setPage(cached);
  const cachedErrors = []; cached.on('pageerror', error => cachedErrors.push(error.message));
  await cached.goto(origin + SECTION);
  await cached.locator('#wb-title').waitFor({ state: 'visible' });
  assert.equal(await cached.locator('#wb-project-list').count(), 0);
  await cached.locator('.wb-app-tabs [data-view="practice"]').click();
  const cachedEdit = libraryFiles.html.replace('Library-owned code', 'Changed through cached page');
  await cached.locator('#wb-editor').fill(cachedEdit);
  const cachedSaved = await cached.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.equal(cachedSaved.project.html, cachedEdit);
  assert.deepEqual(cachedSaved.projects, library, 'a controller without project modules retains the opaque project library');
  await cached.reload();
  assert.equal(await cached.locator('#wb-editor').inputValue(), cachedEdit);
  assert.deepEqual((await cached.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).projects, library);
  assert.deepEqual(cachedErrors, []);
  await preserved(cached);
  await cachedContext.close();
  console.log('PASS ' + engine + ': cached Phase 4 markup keeps editing while preserving newer project records');
};
