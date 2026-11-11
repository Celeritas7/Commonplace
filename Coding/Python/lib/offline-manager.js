/* Download state is checked against Cache Storage, never a remembered success flag. */
(function () {
  'use strict';
  var busy = false;
  var message = document.getElementById('message');
  function rpc(type, pack, progress) {
    return new Promise(function (resolve, reject) {
      var channel = new MessageChannel();
      var timer;
      function timeout() { clearTimeout(timer); timer = setTimeout(function () { channel.port1.close(); reject(new Error('Download paused. Keep this screen open and tap download to resume.')); }, 90000); }
      timeout();
      channel.port1.onmessage = function (e) {
        timeout();
        if (e.data.progress) { if (progress) progress(e.data); return; }
        clearTimeout(timer); channel.port1.close();
        if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data);
      };
      navigator.serviceWorker.ready.then(function (reg) {
        reg.active.postMessage({ type: type, pack: pack }, [channel.port2]);
      }).catch(reject);
    });
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
  async function check() { var state = await rpc('offline-status'); render(state); return state; }
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
      try { await check(); } catch (e) { message.textContent = e.message; }
    }
  }
  ['basic', 'science'].forEach(function (p) { document.getElementById(p + '-download').onclick = function () { download(p); }; });
  document.getElementById('check').onclick = function () { check().catch(function (e) { message.textContent = e.message; }); };
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    message.textContent = 'Open the hosted Python app in Safari using HTTPS to download for offline use.';
    return;
  }
  check().catch(function (e) { message.textContent = e.message; });
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (!busy) check().catch(function () {}); });
})();
