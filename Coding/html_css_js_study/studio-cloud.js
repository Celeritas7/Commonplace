/* Account sync adapter. Credentials stay in Commonplace's existing auth client;
 * only the two Web Studio study records enter the account-owned snapshot. */
(function (root) {
  'use strict';
  var OWNER = 'commonplace_web_studio_owner_v1';
  var URL = 'https://wylxvmkcrexwfpjpbhyy.supabase.co';
  var KEY = 'sb_publishable_e3pDOuxIdstaC7s0a680kQ_R10TrAyv';
  var SDK = new URL('../../_lib/supabase.js', document.currentScript.src).href;
  function bounded(promise, ms, message) {
    var timer; return Promise.race([promise, new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error(message)); }, ms); })]).finally(function () { clearTimeout(timer); });
  }
  function metadata() {
    var dbPromise;
    function open() {
      if (!dbPromise) dbPromise = bounded(new Promise(function (resolve, reject) {
        var request = indexedDB.open('commonplace-web-studio-sync', 1);
        request.onupgradeneeded = function () { request.result.createObjectStore('accounts'); };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(new Error('Sync recovery storage is unavailable. Local study data is unchanged.')); };
        request.onblocked = function () { reject(new Error('Another tab is blocking sync storage. Close the older Web Studio tab and retry.')); };
      }), 8000, 'Sync storage timed out. Retry sync.').catch(function (error) { dbPromise = null; throw error; });
      return dbPromise;
    }
    async function run(mode, key, value) {
      var db = await open();
      return bounded(new Promise(function (resolve, reject) {
        var tx = db.transaction('accounts', mode), store = tx.objectStore('accounts');
        var request = mode === 'readonly' ? store.get(key) : store.put(value, key);
        tx.oncomplete = function () { resolve(request.result || null); };
        tx.onabort = tx.onerror = function () { reject(new Error('Sync recovery state could not be saved. Browser storage may be full; your local work is kept.')); };
      }), 8000, 'Sync storage timed out. Retry sync.');
    }
    return { get: function (id) { return run('readonly', id); }, set: function (id, value) { return run('readwrite', id, value); } };
  }
  function getClient() {
    if (root.__cpSupabase) return Promise.resolve(root.__cpSupabase);
    return bounded(new Promise(function (resolve, reject) {
      function create() {
        try { resolve(root.__cpSupabase || (root.__cpSupabase = root.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }))); }
        catch (_) { reject(new Error('Account sync could not start. Retry while connected.')); }
      }
      if (root.supabase?.createClient) return create();
      var script = document.createElement('script'); script.src = SDK;
      script.onload = create; script.onerror = function () { reject(new Error('The sign-in library could not load. Your study work still saves here. Retry while connected.')); };
      document.head.appendChild(script);
    }), 15000, 'Sign-in setup timed out. Retry sync while connected.');
  }
  function mount(options) {
    if (!root.WebStudioSync || !root.WebStudioSyncMerge) return null;
    var el = options.root.querySelector('#wb-sync-status'); if (!el) return null;
    var account = options.root.querySelector('#wb-sync-account'), retry = options.root.querySelector('#wb-sync-now'), apply = options.root.querySelector('#wb-sync-apply');
    var summary = options.root.querySelector('.wb-sync-details summary');
    var engine, client, userId = null, setup = null, stopped = false, applying = false, timer, sessionGeneration = 0;
    var state = { state: 'pending' }, lastLocal = null, committedSnapshot = null;
    function paint(next) {
      state = next; var kind = next.state || next.status || 'pending'; el.dataset.state = kind;
      var messages = {
        'signed-out': 'Saved on this device. Sign in to Commonplace to sync with your account.',
        offline: 'Offline · saved work will sync when this app reconnects.',
        syncing: 'Syncing saved work…', pending: 'Saved work is waiting to sync.',
        incoming: 'Your account has merged work ready. Load synced work to use it here.',
        synced: 'Synced to your account.', error: 'Sync did not finish. Your local work is kept. Retry sync.'
      };
      el.textContent = next.error || next.message || messages[kind] || messages.pending;
      if (kind === 'incoming' && next.conflicts?.length) el.textContent += ' ' + next.conflicts.join(' ');
      summary.textContent = kind === 'synced' ? 'Account · synced' : kind === 'incoming' ? 'Account · new work' : kind === 'error' ? 'Account · retry sync' : kind === 'offline' ? 'Account · offline' : 'Account sync';
      apply.hidden = kind !== 'incoming'; apply.disabled = applying;
      retry.disabled = applying || kind === 'syncing';
    }
    function fail(error) { paint({ state: 'error', error: error?.message || String(error) }); }
    function owned(id) {
      var owner = localStorage.getItem(OWNER);
      if (owner && owner !== id) throw new Error('This browser’s study work belongs to a different account. Sign back in to that account. Nothing has been uploaded or replaced.');
      if (!owner) { localStorage.setItem(OWNER, id); if (localStorage.getItem(OWNER) !== id) throw new Error('Account ownership could not be saved. Sync is paused.'); }
    }
    function guard(id) {
      if (!id || id !== userId || localStorage.getItem(OWNER) !== id) throw new Error('The signed-in account changed. Sync paused to protect your work.');
    }
    function readLocal() {
      guard(userId);
      if (applying && committedSnapshot) return committedSnapshot;
      if (options.isLocked()) throw new Error('Finish the backup review or recovery before syncing.');
      return options.readLocal();
    }
    async function sessionChanged(session) {
      if(session?.user?.id && session.user.id === userId) { sync(); return; }
      var generation = ++sessionGeneration;
      userId = null; engine?.setUser(null);
      if (!session?.user?.id) { account.textContent = 'Commonplace account · signed out'; paint({ state: 'signed-out' }); return; }
      try {
        owned(session.user.id); if (generation !== sessionGeneration) return;
        userId = session.user.id; account.textContent = 'Commonplace account · ' + (session.user.email || 'signed in');
        engine.setUser(userId); await engine.sync();
      } catch (error) { if (generation === sessionGeneration) fail(error); }
    }
    async function start() {
      if (setup) return setup;
      setup = (async function () {
        client = await getClient();
        if (!engine) {
          engine = root.WebStudioSync.create({ readLocal: readLocal, merger: root.WebStudioSyncMerge, metadata: metadata(), onState: paint, online: function () { return navigator.onLine; }, timeoutMs: 15000,
            transport: {
              read: async function (id, signal) {
                guard(id);
                var result = await client.from('commonplace_web_studio').select('revision,snapshot').eq('user_id', id).maybeSingle().abortSignal(signal);
                guard(id); if (result.error) throw new Error(result.error.message || 'Account download failed. Retry sync.'); return result.data;
              },
              write: async function (id, revision, snapshot, signal) {
                guard(id);
                var result = await client.rpc('web_studio_sync_write', { expected_revision: revision, new_snapshot: snapshot, expected_owner: id }).abortSignal(signal);
                guard(id); if (result.error) throw new Error(result.error.message || 'Account upload failed. Retry sync.'); return result.data;
              }
            }
          });
          // Never await Supabase calls inside onAuthStateChange: it owns an auth lock.
          client.auth.onAuthStateChange(function (_, session) {
            if((session?.user?.id || null) !== userId) { sessionGeneration++; userId=null; engine.setUser(null); }
            setTimeout(function () { if (!stopped) sessionChanged(session); }, 0);
          });
        }
        var generation = sessionGeneration;
        var result = await bounded(client.auth.getSession(), 15000, 'Checking sign-in timed out. Your work is kept; retry sync.');
        if (result.error) throw new Error(result.error.message || 'Sign-in needs attention.');
        if (generation === sessionGeneration) await sessionChanged(result.data.session);
      })().catch(fail).finally(function () { setup = null; });
      return setup;
    }
    async function sync(force) {
      clearTimeout(timer);
      if (!engine || !userId) return start();
      if (applying || options.isLocked()) return;
      try { guard(userId); await engine.sync({ refreshIncoming: force === true }); } catch (error) { fail(error); }
    }
    function changed() {
      if (!engine || !userId || applying || options.isLocked()) return;
      try {
        var local = options.readLocal(); if (root.WebStudioSyncMerge.equal(local, lastLocal)) return;
        lastLocal = local; engine.changed(); clearTimeout(timer); timer = setTimeout(sync, 1200);
      } catch (error) { fail(error); }
    }
    retry.onclick = function () { sync(true); };
    apply.onclick = async function () {
      if (applying || !engine || !userId) return;
      applying = true; committedSnapshot = null; apply.disabled = true; retry.disabled = true;
      var appliedLocal = false;
      try {
        guard(userId); if (!options.flush()) throw new Error('Save the current work successfully before loading account changes. Export a backup if storage is full.');
        var prepared = await engine.prepareApply();
        if (!prepared?.ok) throw new Error(prepared?.error || 'Account changes could not be prepared. Retry sync.');
        guard(prepared.userId); if (prepared.userId !== userId) throw new Error('Account changed. Retry sync.');
        var actual = options.applyLocal(prepared.snapshot, prepared.capturedLocal); appliedLocal = true; committedSnapshot = actual;
        await engine.applied(actual, prepared);
        options.reload();
      } catch (error) {
        // Once the guarded local write succeeds, the old in-memory editors must
        // never autosave over it, even when metadata storage fails afterward.
        if (appliedLocal) options.reload(); else fail(error);
      } finally { applying = false; apply.disabled = false; retry.disabled = false; }
    };
    root.addEventListener('web-studio-saved', changed);
    root.addEventListener('online', sync);
    root.addEventListener('offline', function () { if (userId) { engine?.changed(); paint({ state: 'offline' }); } });
    root.addEventListener('storage', function (event) {
      if (event.key === OWNER) { sessionGeneration++; userId = null; engine?.setUser(null); fail(new Error('Study account ownership changed in another tab. Reload before syncing.')); }
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) sync(); });
    var interval = setInterval(function () { if (!document.hidden && navigator.onLine) sync(); }, 60000);
    start();
    return { changed: changed, sync: sync, stop: function () { stopped = true; clearTimeout(timer); clearInterval(interval); engine?.stop(); } };
  }
  root.WebStudioCloud = { mount: mount };
})(window);
