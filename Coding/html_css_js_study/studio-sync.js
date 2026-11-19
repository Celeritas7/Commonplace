/* Account-scoped, local-first sync. This engine never writes study storage. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WebStudioSync = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var EMPTY = { version: 1, study: null, legacy: null };
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + canonical(value[key]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  function create(options) {
    if (!options || typeof options.readLocal !== 'function' || !options.transport || !options.metadata || !options.merger) throw new Error('Sync adapters are required.');
    var merger = options.merger;
    var equal = merger.equal || function (a, b) { return canonical(a) === canonical(b); };
    var timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(5, options.timeoutMs) : 15000;
    var user = null, generation = 0, stopped = false, flight = null, state = { status: 'signed-out', pending: true, message: 'Saved on this device. Sign in to sync.' };
    var controllers = new Set(), applyPlans = new WeakMap();
    function online() { return options.online ? options.online() !== false : true; }
    function current(context) { return !stopped && context.generation === generation && context.userId === user; }
    function guard(context) { if (!current(context)) { var error = new Error('Sync account changed.'); error.cancelled = true; throw error; } }
    function emit(next, context) {
      if (context && !current(context)) return;
      state = Object.assign({ userId: user, generation: generation, pending: next.status !== 'synced' }, next);
      if (typeof options.onState === 'function') options.onState(copy(state));
    }
    function validate(snapshot) {
      var problem = merger.validate ? merger.validate(snapshot) : (!snapshot || snapshot.version !== 1 ? 'Unsupported cloud study record.' : null);
      if (problem) throw new Error(problem);
      return copy(snapshot);
    }
    function bounded(context, label, operation) {
      guard(context);
      var controller = new AbortController(), timer, rejectAbort;
      controllers.add(controller);
      var abort = new Promise(function (_, reject) { rejectAbort = function () { var error = new Error(label + ' was cancelled.'); error.cancelled = !current(context); reject(error); }; controller.signal.addEventListener('abort', rejectAbort, { once: true }); });
      var timeout = new Promise(function (_, reject) {
        timer = setTimeout(function () {
          var error = new Error(label + ' timed out. Your local work is safe; retry when connected.');
          reject(error); controller.abort();
        }, timeoutMs);
      });
      return Promise.race([Promise.resolve().then(function () { guard(context); return operation(controller.signal); }), abort, timeout]).then(function (value) { guard(context); return value; }).finally(function () {
        clearTimeout(timer); controller.signal.removeEventListener('abort', rejectAbort); controllers.delete(controller);
      });
    }
    async function local(context) { return validate(await bounded(context, 'Reading local work', function () { return options.readLocal(); })); }
    function remoteRecord(value) {
      if (value === null) return { revision: 0, snapshot: copy(EMPTY) };
      if (!value || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error('The cloud returned an invalid revision. Local work was kept.');
      return { revision: value.revision, snapshot: validate(value.snapshot) };
    }
    async function metadata(context) {
      var value = await bounded(context, 'Reading sync recovery data', function () { return options.metadata.get(context.userId); });
      if (value === null || value === undefined) return { version: 1, base: null, revision: 0 };
      if (!value || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Object.prototype.hasOwnProperty.call(value, 'base')) throw new Error('Sync recovery data could not be read. Local work is safe; export a backup before repairing sync.');
      if (value.base !== null) validate(value.base);
      return copy(value);
    }
    async function saveBase(context, snapshot, revision) {
      await bounded(context, 'Saving sync recovery data', function () { return options.metadata.set(context.userId, { version: 1, base: copy(snapshot), revision: revision }); });
    }
    async function perform(context) {
      try {
        guard(context);
        if (!online()) { emit({ status: 'offline', message: 'Saved on this device. Changes will sync when connected.' }, context); return copy(state); }
        emit({ status: 'syncing', message: 'Syncing saved work…' }, context);
        var meta = await metadata(context);
        for (var attempt = 0; attempt < 3; attempt++) {
          guard(context);
          if (!online()) { emit({ status: 'offline', message: 'Saved on this device. Changes will sync when connected.' }, context); return copy(state); }
          var captured = await local(context);
          var remote = remoteRecord(await bounded(context, 'Downloading saved work', function (signal) { return options.transport.read(context.userId, signal); }));
          var merged = merger.merge(meta.base, captured, remote.snapshot);
          if (!merged || !Array.isArray(merged.conflicts)) throw new Error('Cloud changes could not be safely combined. Your local work was kept.');
          var combined = validate(merged.snapshot), revision = remote.revision;
          if (!equal(combined, remote.snapshot)) {
            var written = await bounded(context, 'Uploading saved work', function (signal) { return options.transport.write(context.userId, remote.revision, copy(combined), signal); });
            if (written && written.conflict === true) continue;
            var confirmed = remoteRecord(written);
            if (confirmed.revision <= remote.revision || !equal(confirmed.snapshot, combined)) throw new Error('The cloud did not confirm this upload. Local changes remain pending; retry sync.');
            revision = confirmed.revision;
          }
          var latest = await local(context);
          if (!equal(latest, captured)) {
            // Never mark an edit made during an upload as synchronized. The
            // previous base remains valid for the next three-way comparison.
            emit({ status: 'pending', message: 'New local changes are waiting to sync.' }, context);
            return copy(state);
          }
          if (!equal(latest, combined)) {
            // A reviewed local apply must happen before advancing the base.
            // Repeated uploads or reopen therefore cannot hide remote work.
            emit({ status: 'incoming', message: 'Changes from another device are ready. Load synced work to use them.', snapshot: combined, capturedLocal: captured, revision: revision, conflicts: merged.conflicts.slice() }, context);
            return copy(state);
          }
          await saveBase(context, combined, revision);
          var afterMetadata = await local(context);
          if (!equal(afterMetadata, combined)) emit({ status: 'pending', message: 'New local changes are waiting to sync.' }, context);
          else emit({ status: 'synced', message: 'Synced to your account.', revision: revision, conflicts: merged.conflicts.slice() }, context);
          return copy(state);
        }
        throw new Error('Another device is saving at the same time. Your local work is safe; retry sync.');
      } catch (error) {
        if (!current(context) || error.cancelled) return { status: 'cancelled', pending: true };
        emit({ status: online() ? 'error' : 'offline', error: error.message || 'Sync failed.', message: online() ? 'Sync failed: ' + (error.message || 'Try again.') : 'Saved on this device. Changes will sync when connected.' }, context);
        return copy(state);
      }
    }
    function sync(settings) {
      if (stopped) return Promise.resolve({ status: 'stopped', pending: true });
      if (!user) { emit({ status: 'signed-out', message: 'Saved on this device. Sign in to sync.' }); return Promise.resolve(copy(state)); }
      if (flight) return flight;
      // Keep the current active project stable while a user reviews combined
      // work. Two devices must not repeatedly swap a conflict's primary copy.
      // Explicit refresh/application re-reads both sides before doing anything.
      if (state.status === 'incoming' && !(settings && settings.refreshIncoming)) return Promise.resolve(copy(state));
      var context = { userId: user, generation: generation };
      var running = perform(context);
      flight = running;
      running.finally(function () { if (flight === running) flight = null; });
      return running;
    }
    function setUser(id) {
      if (id !== null && (typeof id !== 'string' || !id)) throw new Error('A signed-in account ID is required.');
      if (stopped || id === user) return;
      user = id; generation++;
      for (var controller of controllers) controller.abort();
      controllers.clear(); flight = null; applyPlans = new WeakMap();
      emit({ status: !user ? 'signed-out' : online() ? 'pending' : 'offline', message: !user ? 'Saved on this device. Sign in to sync.' : online() ? 'Saved on this device. Waiting to sync.' : 'Saved on this device. Changes will sync when connected.' });
    }
    function changed() {
      if (stopped) return;
      applyPlans = new WeakMap();
      emit({ status: !user ? 'signed-out' : online() ? 'pending' : 'offline', message: !user ? 'Saved on this device. Sign in to sync.' : online() ? 'Local changes are waiting to sync.' : 'Saved on this device. Changes will sync when connected.' });
    }
    async function prepareApply() {
      var context = { userId: user, generation: generation };
      if (!user || stopped) return { ok: false, error: 'Sign in before loading synced work.' };
      var result = await sync({ refreshIncoming: true });
      if (!current(context)) return { ok: false, error: 'The signed-in account changed. Retry with the current account.' };
      if (result.status !== 'incoming') return { ok: false, error: result.status === 'synced' ? 'This device already has the synced work.' : result.error || result.message || 'Sync must finish before loading work.' };
      try {
        var latest = await local(context);
        if (!equal(latest, result.capturedLocal)) { changed(); return { ok: false, error: 'Local work changed. Retry sync before loading changes.' }; }
        var plan = { ok: true, snapshot: copy(result.snapshot), capturedLocal: latest, revision: result.revision, userId: user, generation: generation, conflicts: result.conflicts.slice() };
        applyPlans.set(plan, copy(plan));
        return plan;
      } catch (error) { return { ok: false, error: error.message }; }
    }
    async function applied(snapshot, plan) {
      var prepared = plan && applyPlans.get(plan);
      if (!prepared || !prepared.ok) return { ok: false, error: 'Prepare synced work again before acknowledging it.' };
      applyPlans.delete(plan);
      var context = { userId: prepared.userId, generation: prepared.generation };
      try {
        guard(context);
        if (!equal(snapshot, prepared.snapshot)) throw new Error('Applied work does not match the reviewed cloud changes.');
        var latest = await local(context);
        if (!equal(latest, snapshot)) throw new Error('Saved local work changed before cloud changes were acknowledged. Retry sync.');
        await saveBase(context, snapshot, prepared.revision);
        var after = await local(context);
        if (!equal(after, snapshot)) emit({ status: 'pending', message: 'New local changes are waiting to sync.' }, context);
        else emit({ status: 'synced', message: 'Synced to your account.', revision: prepared.revision, conflicts: prepared.conflicts.slice() }, context);
        return { ok: true };
      } catch (error) {
        if (current(context)) emit({ status: 'error', error: error.message, message: 'Sync acknowledgement failed: ' + error.message }, context);
        return { ok: false, error: error.message };
      }
    }
    function stop() { if (stopped) return; stopped = true; generation++; for (var controller of controllers) controller.abort(); controllers.clear(); flight = null; applyPlans = new WeakMap(); }
    return { setUser: setUser, sync: sync, changed: changed, prepareApply: prepareApply, applied: applied, stop: stop, getState: function () { return copy(state); } };
  }
  return { create: create };
});
