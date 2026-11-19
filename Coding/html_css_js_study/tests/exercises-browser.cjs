'use strict';
// Real DOM/CSS/event grading and the local feedback workflow. Invoked by browser.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = async function exerciseAcceptance({ context, origin, SECTION, KEY, untouched, engine, setPage }) {
  const seed = { version: 1, language: 'html', view: 'book', lessons: {
    'html-elements': { part: 0, note: 'Keep my exercise review note.', bookmarks: [2], read: true,
      answers: [1, 2, 0, 1, 2], question: 4, submitted: true }
  } };
  const ctx = await context({ ...untouched, [KEY]: JSON.stringify(seed) });
  const page = await ctx.newPage(); setPage(page); page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + SECTION);
  await page.locator('#wb-title').waitFor({ state: 'visible' });
  const catalog = await page.evaluate(() => window.WebStudioExercises.list);
  const def = language => catalog.find(exercise => exercise.language === language);
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const project = async () => (await saved()).project;
  const currentRecord = async language => (await saved()).exercises?.[def(language).id];
  const latest = async language => (await currentRecord(language))?.attempts.at(-1);
  const exerciseView = async language => {
    await page.locator('.wb-language-tabs [data-language="' + language + '"]').click();
    await page.locator('.wb-app-tabs [data-view="practice"]').click();
    await page.locator('#wb-exercise-panel').waitFor({ state: 'visible' });
  };
  const edit = async (file, value) => {
    await page.locator('.wb-file-tabs [data-file="' + file + '"]').click();
    await page.locator('#wb-editor').fill(value);
  };
  const editFiles = async files => { for (const file of ['html', 'css', 'js']) await edit(file, files[file]); };
  const check = async (language, status) => {
    const count = (await currentRecord(language))?.totalAttempts || 0;
    await page.locator('#wb-check-exercise').click();
    await page.waitForFunction(({ key, id, count }) => JSON.parse(localStorage.getItem(key)).exercises?.[id]?.totalAttempts === count + 1,
      { key: KEY, id: def(language).id, count });
    assert(await page.locator('#wb-check-exercise').isEnabled());
    const attempt = await latest(language);
    assert.equal(attempt.status, status, language + ': ' + JSON.stringify(attempt));
    assert.deepEqual(attempt.files, await project(), 'attempt must describe the checked code');
    const rows = page.locator('#wb-exercise-results .wb-check-row');
    assert.equal(await rows.count(), attempt.checks.length, 'every returned check must appear beside its button');
    for (let i = 0; i < attempt.checks.length; i++) {
      assert(await rows.nth(i).isVisible(), 'feedback rows must be visible after checking');
      const feedback = await rows.nth(i).textContent();
      assert(feedback.includes('Expected: ' + attempt.checks[i].expected));
      assert(feedback.includes('Observed: ' + attempt.checks[i].actual));
    }
    if (status === 'passed') assert(attempt.checks.every(row => row.passed));
    return attempt;
  };
  const preserved = async () => {
    assert.deepEqual(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(untouched)), untouched);
    const lesson = (await saved()).lessons['html-elements'];
    for (const field of ['note', 'bookmarks', 'read', 'answers', 'question', 'submitted']) assert.deepEqual(lesson[field], seed.lessons['html-elements'][field], 'preserve lesson ' + field);
  };

  await exerciseView('html');
  await page.locator('#wb-practice-confirm').check();
  assert.equal((await currentRecord('html')).attempts.length, 0, 'visual review and a passed quiz cannot create an exercise pass');
  const failedHTML = await check('html', 'failed');
  assert(failedHTML.checks.some(row => row.id === 'button' && !row.passed));
  assert.equal(failedHTML.assisted, false);
  const beforeHelp = await project();
  await page.locator('#wb-exercise-hint').click();
  await page.locator('#wb-exercise-solution > summary').click();
  await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).exercises[id].solutionViewed, { key: KEY, id: def('html').id });
  assert.deepEqual(await project(), beforeHelp, 'hints and solutions must not replace the learner’s code');
  assert.equal((await currentRecord('html')).totalAttempts, 1, 'viewing help is not a check');
  await page.locator('#wb-exercise-solution > summary').click();
  await page.locator('#wb-mistakes-link').click();
  assert.equal(await page.locator('#wb-mistakes-list [data-retry-exercise="html-reading-card"]').count(), 1);
  await page.locator('#wb-mistakes-list [data-retry-exercise="html-reading-card"]').click();
  assert.deepEqual(await project(), beforeHelp, 'retry opens current code without replacing it');
  await editFiles(def('html').solution);
  assert.equal((await check('html', 'passed')).assisted, true);
  assert(await page.locator('#wb-practice-confirm').isChecked(), 'automatic check does not change self review');
  await page.locator('#wb-mistakes-link').click();
  assert.equal(await page.locator('#wb-mistakes-list [data-retry-exercise="html-reading-card"]').count(), 0);
  assert.equal(await page.locator('#wb-mistakes-resolved [data-retry-exercise="html-reading-card"]').count(), 1);
  await preserved();
  console.log('PASS ' + engine + ': failed HTML checks, progressive help, real passes and Mistake Bank resolution remain separate from quiz/visual review');

  await exerciseView('css');
  const beforeStarter = await project();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#wb-exercise-starter').click();
  assert.deepEqual(await project(), beforeStarter, 'cancel loading a starter keeps all files');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#wb-exercise-starter').click();
  assert.deepEqual(await project(), def('css').starter);
  await check('css', 'failed');
  await editFiles(def('css').solution); await check('css', 'passed');
  await edit('css', def('css').solution.css + '\n/* padding: 32px; */\n.card { padding: 8px; }');
  const overridden = await check('css', 'failed');
  const padding = overridden.checks.find(row => row.id === 'padding');
  assert.equal(padding.passed, false); assert.match(padding.actual, /8px/);
  await edit('html', def('css').solution.html.replace('class="card"', 'class="different"'));
  const missing = await check('css', 'failed');
  assert.equal(missing.checks.find(row => row.id === 'card').passed, false);
  console.log('PASS ' + engine + ': CSS grading uses computed styles and matched elements, not source text or comments');

  await exerciseView('js');
  await editFiles(def('js').solution); await check('js', 'passed');
  await edit('js', 'document.querySelector("#counter").addEventListener("click", () => { document.querySelector("#counter").textContent = "Clicks: 4"; });');
  const staticLabel = await check('js', 'failed');
  assert.equal(staticLabel.checks.find(row => row.id === 'click-1').passed, false);
  assert.equal(staticLabel.checks.find(row => row.id === 'click-3').passed, false);
  await editFiles({ ...def('js').solution, html: def('js').solution.html.replace('id="counter"', 'id="counter" disabled') });
  const disabled = await check('js', 'failed');
  assert.equal(disabled.checks.find(row => row.id === 'button').passed, false);
  for (const js of ['const = ;', 'throw new Error("Exercise runtime fixture");', 'while (true) {}',
    'document.querySelector("#counter").addEventListener("click", () => { throw new Error("Click-handler fixture"); });']) {
    await editFiles({ ...def('js').solution, js });
    const errored = await check('js', 'error');
    assert(errored.error.length > 0); assert.equal(errored.checks.length, 0);
  }
  await editFiles(def('js').solution);
  const beforeCancel = (await currentRecord('js')).totalAttempts;
  // Dispatch both actions in one task, before async document hashing finishes.
  // A late result must not be recorded against the newly edited files.
  await page.locator('.wb-file-tabs [data-file="js"]').click();
  await page.evaluate(() => {
    document.querySelector('#wb-check-exercise').click();
    const editor = document.querySelector('#wb-editor'); editor.value += '\n// Edited during the pending check';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert(await page.locator('#wb-check-exercise').isEnabled());
  await page.evaluate(() => { document.querySelector('#wb-check-exercise').click(); document.querySelector('#wb-stop').click(); });
  assert(await page.locator('#wb-check-exercise').isEnabled());
  assert.equal((await currentRecord('js')).totalAttempts, beforeCancel);
  await check('js', 'passed');
  assert.equal((await currentRecord('js')).totalAttempts, beforeCancel + 1, 'cancelled checks cannot add late attempts');
  console.log('PASS ' + engine + ': JavaScript grading exercises repeated clicks; syntax/runtime/loop errors cannot pass, and edits/Stop cancel pending checks');

  // Restore code is an explicit operation; all learning and legacy data stays intact.
  await exerciseView('html');
  const beforeRestore = await project(), beforeLessons = (await saved()).lessons;
  await page.locator('#wb-exercise-history > summary').click();
  await page.locator('#wb-attempt-history .wb-attempt > summary').first().click();
  const restore = page.locator('#wb-attempt-history [data-restore-attempt="' + (await latest('html')).id + '"]');
  page.once('dialog', dialog => dialog.dismiss()); await restore.click();
  assert.deepEqual(await project(), beforeRestore);
  page.once('dialog', dialog => dialog.accept()); await restore.click();
  assert.deepEqual(await project(), def('html').solution);
  assert.deepEqual((await saved()).lessons, beforeLessons);
  await preserved();
  const beforeReload = await saved();
  await page.reload(); await page.locator('#wb-exercise-panel').waitFor({ state: 'visible' });
  assert.deepEqual((await saved()).exercises, beforeReload.exercises);
  assert.deepEqual(await project(), beforeReload.project);
  assert.match(await page.locator('#wb-history-summary').textContent(), /2/);

  // Numeric history retention is bounded while the lifetime count keeps growing.
  for (let i = 0; i < 20; i++) await check('html', 'passed');
  const bounded = await currentRecord('html');
  assert.equal(bounded.attempts.length, 20); assert.equal(bounded.totalAttempts, 22);
  assert.notEqual(bounded.attempts[0].id, failedHTML.id);
  await preserved();
  for (const width of [320, 390, 810]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'exercise feedback overflow at ' + width);
    await page.locator('#wb-mistakes-link').click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mistake Bank overflow at ' + width);
    await page.locator('[data-screen="mistakes"] [data-view="practice"]').click();
  }
  await page.locator('.wb-app-tabs [data-view="notes"]').click();
  const downloadPending = page.waitForEvent('download'); await page.locator('#wb-export').click();
  const download = await downloadPending;
  const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.deepEqual(backup.currentDraft.exercises, (await saved()).exercises);
  assert.deepEqual(JSON.parse(backup.records[KEY]).exercises, (await saved()).exercises);
  assert(!JSON.stringify(backup).includes('FAKE-TEST-AUTH-DO-NOT-EXPORT'));
  await preserved();
  assert.deepEqual(errors, [], 'exercise UI must not emit uncaught errors');
  console.log('PASS ' + engine + ': retained attempt snapshots, confirmed restore, reload, scoped export and mobile feedback preserve study data');
  await ctx.close();
};
