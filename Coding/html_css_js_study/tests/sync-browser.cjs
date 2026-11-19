'use strict';
// Browser integration acceptance against an isolated, revisioned cloud fixture.
// Real authorization/RLS is covered separately by sync-rls.sql. No real session,
// production credential, or learner data is sent by this suite.
const assert = require('node:assert/strict');

module.exports = async function syncAcceptance({ context, origin, SECTION, KEY, untouched, engine, setPage }) {
  const LEGACY = 'commonplace_wdb_v1';
  const OWNER = 'commonplace_web_studio_owner_v1';
  const USER = 'd94f846a-21bf-4ec7-9a69-25ec70bb7d17';
  const OTHER = 'ab90119f-adb0-4e3c-a603-84c4e2ccebf0';
  const clone = value => JSON.parse(JSON.stringify(value));
  const rows = new Map(), requests = [], contexts = [];
  let unavailable = false;
  const files = { html: '<main><h1>Cloud starter</h1><p>Keep both versions.</p></main>', css: 'main { padding: 24px; }', js: 'console.log("Cloud starter");' };
  const record = { version: 1, language: 'html', view: 'book', project: files,
    projects: { version: 1, activeId: 'study-project', items: [{ id: 'study-project', name: 'Cloud study project', createdAt: '2026-11-19T01:00:00.000Z', updatedAt: '2026-11-19T01:00:00.000Z', files }] },
    lessons: { 'html-elements': { note: 'Original account note.', bookmarks: [2], read: true } },
    exercises: { 'html-reading-card': { totalAttempts: 1, hintsSeen: 1, solutionViewed: false, attempts: [{ id: 'cloud-browser-attempt', at: '2026-11-19T01:00:00.000Z', exerciseVersion: 1, status: 'failed', assisted: false, checks: [{ id: 'button', passed: false, expected: 'Start reading', actual: 'Missing button' }], files }] } },
    compatibleFutureField: 'Keep opaque compatible data' };

  async function makeContext(seed, user = USER) {
    const ctx = await context(seed); contexts.push(ctx);
    await ctx.route(origin + '/__web_studio_cloud', async route => {
      const req = route.request().postDataJSON(); requests.push(clone(req));
      if (unavailable) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, error: { message: 'Cloud is unavailable in this test. Retry after reconnecting.' } }) }); return;
      }
      let data;
      if (req.kind === 'read') data = rows.has(req.user) ? clone(rows.get(req.user)) : null;
      else if (req.kind === 'write') {
        assert.equal(req.name, 'web_studio_sync_write');
        assert.equal(req.params.expected_owner, req.user, 'write must bind the snapshot owner to the authenticated identity');
        const previous = rows.get(req.user), revision = previous?.revision || 0;
        if (req.params.expected_revision !== revision) data = { conflict: true, revision, snapshot: previous?.snapshot || null };
        else {
          const next = { revision: revision + 1, snapshot: clone(req.params.new_snapshot) };
          rows.set(req.user, next); data = { conflict: false, ...clone(next) };
        }
      } else throw new Error('Unexpected cloud fixture operation ' + req.kind);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, error: null }) });
    });
    await ctx.addInitScript(({ origin, user }) => {
      if (window !== window.top || location.origin !== origin) return;
      const ACCOUNT = 'web-studio-test-account';
      if (sessionStorage.getItem(ACCOUNT) === null) sessionStorage.setItem(ACCOUNT, JSON.stringify(user));
      const currentUser = () => JSON.parse(sessionStorage.getItem(ACCOUNT));
      const session = () => currentUser() ? { user: { id: currentUser(), email: 'learner@example.test' }, access_token: 'TEST-ONLY-DO-NOT-EXPORT' } : null;
      const authListeners = [];
      window.__webStudioTestAuth = id => {
        sessionStorage.setItem(ACCOUNT, JSON.stringify(id));
        authListeners.forEach(callback => callback(id ? 'SIGNED_IN' : 'SIGNED_OUT', session()));
      };
      function query(payload) {
        let signal, promise;
        const builder = {
          select() { return builder; },
          eq(key, value) { if (key === 'user_id') payload.user = value; return builder; },
          maybeSingle() { return builder; },
          abortSignal(value) { signal = value; return builder; },
          then(resolve, reject) {
            if (!promise) promise = Promise.resolve().then(async () => {
              if (!navigator.onLine) throw new TypeError('Offline cloud fixture');
              const response = await fetch('/__web_studio_cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
              return response.json();
            });
            return promise.then(resolve, reject);
          }
        };
        return builder;
      }
      window.__cpSupabase = {
        auth: {
          getSession: async () => ({ data: { session: session() }, error: null }),
          onAuthStateChange(callback) { authListeners.push(callback); return { data: { subscription: { unsubscribe() {} } } }; }
        },
        from(name) {
          if (name !== 'commonplace_web_studio') throw new Error('Unexpected table ' + name);
          return query({ kind: 'read', user: currentUser() });
        },
        rpc(name, params) { return query({ kind: 'write', name, params, user: currentUser() }); }
      };
    }, { origin, user });
    return ctx;
  }
  async function open(ctx) {
    const page = await ctx.newPage(); setPage(page); page.setDefaultTimeout(16000);
    await page.goto(origin + SECTION); await page.locator('#wb-save-status').waitFor({ state: 'visible' });
    return page;
  }
  async function state(page, value) {
    await page.waitForFunction(value => document.querySelector('#wb-sync-status')?.dataset.state === value, value, { timeout: 20000 });
  }
  async function remoteHas(predicate, message, user = USER) {
    const until = Date.now() + 20000;
    while (Date.now() < until) {
      if (predicate(rows.get(user))) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.fail(message);
  }
  async function saved(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY); }
  async function setNote(page, value) {
    await page.locator('.wb-app-tabs [data-view="notes"]').click(); await page.locator('#wb-note-editor').fill(value);
  }
  async function setCode(page, value) {
    await page.locator('.wb-app-tabs [data-view="practice"]').click();
    await page.locator('.wb-file-tabs [data-file="html"]').click(); await page.locator('#wb-editor').fill(value);
  }
  async function accountPanel(page) {
    if (!await page.locator('.wb-sync-details').evaluate(el => el.open)) await page.locator('.wb-sync-details > summary').click();
  }
  async function sync(page) { await accountPanel(page); await page.locator('#wb-sync-now').click(); }
  async function apply(page) {
    await accountPanel(page);
    await page.locator('#wb-sync-apply').waitFor({ state: 'visible' });
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('#wb-sync-apply').click()]);
    await page.locator('#wb-save-status').waitFor({ state: 'visible' });
  }
  async function sharedUnchanged(page) {
    const keys = Object.keys(untouched).filter(key => key !== LEGACY);
    assert.deepEqual(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), keys), Object.fromEntries(keys.map(key => [key, untouched[key]])));
  }

  try {
    const aContext = await makeContext({ ...untouched, [KEY]: JSON.stringify(record) });
    let a = await open(aContext);
    await remoteHas(row => row?.snapshot.study?.project?.html === files.html, 'Existing local code should upload on the first signed-in visit');
    await state(a, 'synced');
    assert.equal(await a.evaluate(key => localStorage.getItem(key), OWNER), USER);
    await sharedUnchanged(a);
    const first = clone(rows.get(USER));
    assert.equal(first.snapshot.study.lessons['html-elements'].note, 'Original account note.');
    assert.deepEqual(first.snapshot.study.exercises, record.exercises);
    assert.equal(first.snapshot.legacy.notes.l123, 'Keep the original tracker note.');
    assert.equal(first.snapshot.study.compatibleFutureField, record.compatibleFutureField);
    const cloudJSON = JSON.stringify(first.snapshot);
    assert(!cloudJSON.includes('FAKE-TEST-AUTH-DO-NOT-EXPORT'));
    assert(!cloudJSON.includes('TEST-ONLY-DO-NOT-EXPORT'));
    assert(!cloudJSON.includes('Keep highlight'));
    console.log('PASS ' + engine + ': first account sync uploads existing projects, notes, progress, exercise records and course tracker without unrelated data');

    const bContext = await makeContext(Object.fromEntries(Object.entries(untouched).filter(([key]) => key !== LEGACY)));
    const b = await open(bContext);
    await state(b, 'incoming');
    await apply(b);
    await state(b, 'synced');
    assert.equal((await saved(b)).project.html, files.html);
    assert.equal((await saved(b)).lessons['html-elements'].note, 'Original account note.');
    assert.deepEqual((await saved(b)).exercises, record.exercises);
    assert.equal(await b.evaluate(key => JSON.parse(localStorage.getItem(key)).notes.l123, LEGACY), 'Keep the original tracker note.');
    await sharedUnchanged(b);
    for (const width of [320, 390, 810]) {
      await b.setViewportSize({ width, height: 1000 });
      assert(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sync controls overflow at ' + width);
    }
    console.log('PASS ' + engine + ': a second browser receives reviewed cloud work, reloads it safely and retains compact sync controls');

    await aContext.setOffline(true); await bContext.setOffline(true);
    const aHTML = '<main><h1>Desktop offline version</h1><p>Keep this edit.</p></main>';
    const bHTML = '<main><h1>iPad offline version</h1><p>Keep this edit too.</p></main>';
    await setCode(a, aHTML); await setNote(a, 'A note written on the desktop while offline.');
    await setCode(b, bHTML); await setNote(b, 'A note written on the iPad while offline.');
    assert.equal((await saved(a)).project.html, aHTML);
    assert.equal((await saved(b)).project.html, bHTML);
    assert.equal(rows.get(USER).snapshot.study.project.html, files.html, 'offline edits must wait locally');
    await aContext.setOffline(false); await sync(a);
    await remoteHas(row => row?.snapshot.study?.projects?.items?.some(project => project.files.html === aHTML), 'Desktop edit should upload after reconnect');
    await bContext.setOffline(false); await sync(b);
    await state(b, 'incoming');
    assert.equal((await saved(b)).project.html, bHTML, 'receiving cloud work cannot silently replace the open draft');
    await apply(b); await state(b, 'synced');
    const merged = await saved(b);
    assert(merged.projects.items.some(project => project.files.html === aHTML));
    assert(merged.projects.items.some(project => project.files.html === bHTML));
    assert.match(merged.lessons['html-elements'].note, /desktop while offline/);
    assert.match(merged.lessons['html-elements'].note, /iPad while offline/);
    assert.deepEqual(merged.exercises, record.exercises);
    await sync(a); await state(a, 'incoming'); await apply(a); await state(a, 'synced');
    const aMerged = await saved(a);
    assert(aMerged.projects.items.some(project => project.files.html === aHTML));
    assert(aMerged.projects.items.some(project => project.files.html === bHTML));
    const count = aMerged.projects.items.length;
    await sync(a); await state(a, 'synced');
    assert.equal((await saved(a)).projects.items.length, count, 'retry must not create repeated conflict copies');
    await sharedUnchanged(a); await sharedUnchanged(b);
    console.log('PASS ' + engine + ': offline edits reconnect with both code versions and both notes preserved, without duplicate conflict copies on retry');

    // Pending uploads survive page closure because the saved record, not a
    // transient in-memory queue, is the source of unsynchronized work.
    await aContext.setOffline(true);
    await setNote(a, 'Offline note retained after closing this page.');
    const beforeClose = clone(rows.get(USER));
    await a.close(); await aContext.setOffline(false); a = await open(aContext);
    await remoteHas(row => row?.snapshot.study?.lessons?.['html-elements']?.note?.includes('retained after closing'), 'Saved offline changes should upload after a later reopening');
    assert.notDeepEqual(rows.get(USER).snapshot, beforeClose.snapshot);
    await state(a, 'synced');
    console.log('PASS ' + engine + ': queued local work survives closing and synchronizes on a later connected reopening');

    unavailable = true; await sync(a); await state(a, 'error');
    assert.equal((await saved(a)).lessons['html-elements'].note, 'Offline note retained after closing this page.');
    assert.match(await a.locator('#wb-sync-status').textContent(), /retry|unavailable|failed|error/i);
    unavailable = false; await sync(a); await state(a, 'synced');
    const goodRow = clone(rows.get(USER));
    rows.set(USER, { revision: goodRow.revision + 1, snapshot: { version: 999, study: null, legacy: null } });
    await sync(a); await state(a, 'error');
    assert.equal((await saved(a)).lessons['html-elements'].note, 'Offline note retained after closing this page.');
    rows.set(USER, goodRow); await sync(a); await state(a, 'synced');
    console.log('PASS ' + engine + ': cloud errors and invalid remote records preserve local work and offer a successful retry');

    const beforeAccountChange = await saved(a);
    await a.evaluate(id => window.__webStudioTestAuth(id), OTHER);
    await a.waitForFunction(() => /another account|different account|original account|belongs to|bound to/i.test(document.querySelector('#wb-sync-status').textContent), null, { timeout: 16000 });
    assert.equal(rows.has(OTHER), false, 'another account must never receive queued work from the bound account');
    assert.equal(await a.evaluate(key => localStorage.getItem(key), OWNER), USER);
    assert.deepEqual(await saved(a), beforeAccountChange);
    await a.evaluate(() => window.__webStudioTestAuth(null)); await state(a, 'signed-out');
    assert.deepEqual(await saved(a), beforeAccountChange);
    await a.evaluate(id => window.__webStudioTestAuth(id), USER); await state(a, 'synced');
    await sharedUnchanged(a);
    assert(requests.every(request => request.user === USER), 'the bound account alone may access this device’s sync data');
    console.log('PASS ' + engine + ': sign-out preserves saved work and account switching cannot leak or rebind queued data');

    // A download/cache failure may deliver the page without its sync engine.
    // Saving and preview stay usable, and the visible recovery action reloads
    // the missing file instead of leaving a permanent checking state.
    const MISSING_USER = '8ebc0509-f83e-45f9-a027-4d02f2a560eb';
    const missingContext = await makeContext({ ...untouched, [KEY]: JSON.stringify(record) }, MISSING_USER);
    await missingContext.route('**/studio-sync.js*', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* Missing sync module fixture. */' }));
    const missing = await open(missingContext), missingErrors = [];
    missing.on('pageerror', error => missingErrors.push(error.message));
    await state(missing, 'error');
    assert.match(await missing.locator('#wb-sync-status').textContent(), /files could not load|reload/i);
    await setNote(missing, 'A local note still saves when sync files are missing.');
    assert.equal((await saved(missing)).lessons['html-elements'].note, 'A local note still saves when sync files are missing.');
    assert.equal(rows.has(MISSING_USER), false);
    await setCode(missing, '<main><h1>Local work still runs</h1></main>');
    await missing.locator('#wb-run').click();
    assert.equal(await missing.frameLocator('#wb-preview-host iframe').locator('h1').textContent(), 'Local work still runs');
    await missingContext.unroute('**/studio-sync.js*');
    await accountPanel(missing);
    assert.match(await missing.locator('#wb-sync-now').textContent(), /Reload/i);
    await Promise.all([missing.waitForNavigation({ waitUntil: 'load' }), missing.locator('#wb-sync-now').click()]);
    await state(missing, 'synced');
    assert.equal(rows.get(MISSING_USER).snapshot.study.lessons['html-elements'].note, 'A local note still saves when sync files are missing.');
    assert.equal(rows.get(MISSING_USER).snapshot.study.project.html, '<main><h1>Local work still runs</h1></main>');
    assert.deepEqual(missingErrors, []);
    await sharedUnchanged(missing);
    console.log('PASS ' + engine + ': a missing sync module leaves local editing and execution usable and recovers through Reload sync files');

    // The original course tracker can be the only saved account record. Merely
    // opening sync controls or loading it must not manufacture a default project
    // that later competes with the learner’s actual code on another device.
    const LEGACY_USER = '7bf812fa-e2cb-4651-9288-f393a148ae20';
    const legacyOnly = { done: { l123: 1 }, star: { l7: 1 }, notes: { l123: 'A course-only account note.' }, open: {}, hide: {}, show: 'all' };
    rows.set(LEGACY_USER, { revision: 1, snapshot: { version: 1, study: null, legacy: clone(legacyOnly) } });
    const legacyContext = await makeContext(Object.fromEntries(Object.entries(untouched).filter(([key]) => key !== LEGACY)), LEGACY_USER);
    const legacyPage = await open(legacyContext);
    await state(legacyPage, 'incoming');
    assert.equal(await saved(legacyPage), null);
    await accountPanel(legacyPage);
    assert.equal(await saved(legacyPage), null, 'opening account controls must not create a default native study record');
    await apply(legacyPage); await state(legacyPage, 'synced');
    assert.equal(await saved(legacyPage), null, 'loading a course-only snapshot must retain the absent native record');
    assert.deepEqual(await legacyPage.evaluate(key => JSON.parse(localStorage.getItem(key)), LEGACY), legacyOnly);
    await sync(legacyPage); await state(legacyPage, 'synced');
    assert.equal(await saved(legacyPage), null);
    assert.equal(rows.get(LEGACY_USER).snapshot.study, null);
    await setNote(legacyPage, 'My first native lesson note.');
    await remoteHas(row => row?.snapshot.study?.lessons?.['html-elements']?.note === 'My first native lesson note.', 'A genuine native lesson edit should start and synchronize the native record', LEGACY_USER);
    assert.equal((await saved(legacyPage)).lessons['html-elements'].note, 'My first native lesson note.');
    await sharedUnchanged(legacyPage);
    console.log('PASS ' + engine + ': a course-only account stays course-only through sync and begins native storage only after a learner edit');

    // Hold the acknowledgement after the guarded local write. The previous
    // editor remains on screen during this real async boundary, but must be
    // inert so typing cannot create an unpersisted draft just before reload.
    const DELAY_USER = '6fcc3ee4-c487-4313-88fb-397be57d57ca';
    const delayedLocal = clone(record); delayedLocal.view = 'practice'; delayedLocal.lessons['html-elements'].note = '';
    rows.set(DELAY_USER, { revision: 1, snapshot: { version: 1, study: clone(record), legacy: null } });
    const delayedContext = await makeContext({ [KEY]: JSON.stringify(delayedLocal) }, DELAY_USER);
    await delayedContext.addInitScript(() => {
      if (window !== window.top) return;
      let syncAPI;
      Object.defineProperty(window, 'WebStudioSync', {
        configurable: true,
        get() { return syncAPI; },
        set(api) {
          const create = api.create;
          api.create = options => {
            const value = create(options), acknowledge = value.applied;
            value.applied = async (...args) => {
              window.__webStudioAckPending = true;
              await new Promise(resolve => { window.__releaseWebStudioAck = resolve; });
              return acknowledge(...args);
            };
            return value;
          };
          syncAPI = api;
        }
      });
    });
    const delayed = await open(delayedContext);
    await state(delayed, 'incoming'); await delayed.locator('#wb-editor').waitFor({ state: 'visible' });
    const beforeTyping = await delayed.locator('#wb-editor').inputValue();
    await accountPanel(delayed); await delayed.locator('#wb-sync-apply').click();
    await delayed.waitForFunction(() => window.__webStudioAckPending === true);
    assert(await delayed.locator('#web-book').evaluate(element => element.inert));
    const committed = await saved(delayed);
    assert.equal(committed.lessons['html-elements'].note, 'Original account note.');
    await delayed.locator('#wb-editor').click({ force: true });
    await delayed.keyboard.type('This must not become a lost edit.');
    assert.equal(await delayed.locator('#wb-editor').inputValue(), beforeTyping);
    assert.deepEqual(await saved(delayed), committed);
    assert.equal(await delayed.locator('#wb-editor').evaluate(element => document.activeElement === element), false);
    await Promise.all([delayed.waitForNavigation({ waitUntil: 'load' }), delayed.evaluate(() => window.__releaseWebStudioAck())]);
    await state(delayed, 'synced');
    assert.deepEqual(await saved(delayed), committed);
    console.log('PASS ' + engine + ': committed cloud work blocks editing through a delayed acknowledgement and reloads without losing a late draft');

  } finally {
    for (const ctx of contexts) await ctx.close();
  }
};
