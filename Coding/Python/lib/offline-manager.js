/* Download state is checked against Cache Storage, never a remembered success flag. */
(function () {
  'use strict';
  var busy = false;
  var message = document.getElementById('message');
  var root = new URL('../', document.currentScript.src).href;
  var workerPromise;
  function bounded(promise, milliseconds, text) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error(text)); }, milliseconds);
      promise.then(function (value) { clearTimeout(timer); resolve(value); }, function (error) { clearTimeout(timer); reject(error); });
    });
  }
  function worker() {
    if (!workerPromise) {
      // Start immediately: the page load event may be held up by unrelated resources.
      workerPromise = bounded(navigator.serviceWorker.register(root + 'sw.js', { scope: root, updateViaCache: 'none' })
        .then(function (reg) { return reg.active ? reg : navigator.serviceWorker.ready; }), 25000,
          'Offline setup could not start. Check your connection, then tap Retry setup below.')
        .then(function (reg) { return reg.active; })
        .catch(function (error) { workerPromise = null; throw error; });
    }
    return workerPromise;
  }
  async function rpc(type, pack, progress) {
    var active = await worker();
    return new Promise(function (resolve, reject) {
      var channel = new MessageChannel(), timer;
      function fail(error) { clearTimeout(timer); channel.port1.close(); workerPromise = null; reject(error); }
      function timeout() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          fail(new Error(type === 'offline-status' ? 'Offline storage did not respond. Tap Retry setup below.' : 'Download paused. Keep this screen open and tap download to resume.'));
        }, type === 'offline-status' ? 15000 : 90000);
      }
      timeout();
      channel.port1.onmessage = function (e) {
        timeout();
        if (e.data.progress) { if (progress) progress(e.data); return; }
        clearTimeout(timer); channel.port1.close();
        if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data);
      };
      try { active.postMessage({ type: type, pack: pack }, [channel.port2]); }
      catch (error) { fail(error); }
    });
  }
  function setupError(error) {
    message.textContent = error.message;
    ['basic', 'science'].forEach(function (pack) {
      document.getElementById(pack + '-status').textContent = 'Setup needs attention';
      var note = document.getElementById(pack + '-error');
      if (note) note.textContent = error.message;
    });
    var retry = document.getElementById('check');
    retry.textContent = 'Retry setup'; retry.disabled = false;
  }
  function render(state) {
    ['basic', 'science'].forEach(function (pack) {
      var s = state[pack];
      document.getElementById(pack + '-status').textContent = s.ready ? (pack === 'science' && !state.basic.ready ? 'Libraries saved · essentials needed' : 'Ready offline') : s.done ? 'Download incomplete · ' + s.done + ' / ' + s.total + ' files' : 'Not downloaded';
      document.getElementById(pack + '-progress').value = s.done / s.total;
      document.getElementById(pack + '-size').textContent = (s.bytes / 1e6).toFixed(1) + ' MB total · ' + (s.remainingBytes / 1e6).toFixed(1) + ' MB left';
      var button = document.getElementById(pack + '-download');
      button.textContent = s.ready ? 'Check saved download' : s.done ? 'Resume download' : 'Download ' + (pack === 'basic' ? 'essentials' : 'libraries');
      button.disabled = busy || (pack === 'science' && !state.basic.ready);
    });
  }
  async function check() {
    var state = await rpc('offline-status'); render(state);
    document.getElementById('check').textContent = 'Check downloads again';
    return state;
  }
  async function download(pack) {
    busy = true;
    var errorNote = document.getElementById(pack + "-error");
    if (errorNote) errorNote.textContent = "";
    document.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    message.textContent = 'Keep this screen open while downloading. Interrupted downloads can be resumed.';
    try {
      if (navigator.storage && navigator.storage.persist) await navigator.storage.persist().catch(function () {});
      await rpc('offline-download', pack, function (p) {
        document.getElementById(pack + '-status').textContent = 'Saving ' + p.done + ' / ' + p.total + ' files…';
        document.getElementById(pack + '-progress').value = p.done / p.total;
      });
      message.textContent = 'Download saved. Turn Wi-Fi off, reopen Python and run a code cell to check this iPad.';
    } catch (e) {
      message.textContent = e.message;
      if (errorNote) errorNote.textContent = e.message;
    }
    finally {
      busy = false; document.getElementById('check').disabled = false;
      try { await check(); } catch (e) { setupError(e); }
    }
  }
  ['basic', 'science'].forEach(function (p) { document.getElementById(p + '-download').onclick = function () { download(p); }; });
  document.getElementById('check').onclick = function () { check().catch(setupError); };
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    setupError(new Error('Open the hosted Python app in Safari using HTTPS to download for offline use.'));
    return;
  }
  check().catch(setupError);
  navigator.serviceWorker.addEventListener('controllerchange', function () { workerPromise = null; if (!busy) check().catch(setupError); });
})();
