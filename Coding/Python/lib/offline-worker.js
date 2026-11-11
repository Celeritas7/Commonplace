/* Imported by sw.js. Saved packs survive shell updates and resume per file. */
var PACK_CACHE = 'cp-python-downloads-v1';
var packDownloads = {};
function packURL(asset) { return new URL(asset.url, self.location.href).href; }
function packKey(asset) { var url = new URL(packURL(asset)); url.searchParams.set('__cp_revision', asset.revision); return url.href; }
var packAssets = Object.values(self.CP_OFFLINE_ASSETS).flat();
var packByURL = new Map(packAssets.map(function (a) { return [packURL(a), a]; }));
function requestedAsset(req) {
  var url = new URL(req.url); url.search = ''; url.hash = '';
  if (url.href === new URL('./', self.location.href).href) url = new URL('index.html', self.location.href);
  return packByURL.get(url.href);
}
async function savedPackResponse(req) {
  var asset = requestedAsset(req);
  if (!asset) return null;
  var cache = await caches.open(PACK_CACHE);
  return await cache.match(packKey(asset));
}
async function packStatus() {
  var cache = await caches.open(PACK_CACHE), result = {};
  for (var name of ['basic', 'science']) {
    var assets = self.CP_OFFLINE_ASSETS[name], done = 0, remaining = 0, bytes = 0;
    for (var asset of assets) {
      bytes += asset.bytes;
      if (await cache.match(packKey(asset))) done++; else remaining += asset.bytes;
    }
    result[name] = { done: done, total: assets.length, bytes: bytes, remainingBytes: remaining, ready: done === assets.length };
  }
  return result;
}
async function downloadPack(name, port) {
  if (!self.CP_OFFLINE_ASSETS[name]) throw new Error('Unknown download.');
  if (packDownloads[name]) throw new Error('This download is already running. Keep its screen open, then check again.');
  packDownloads[name] = true;
  try {
    var cache = await caches.open(PACK_CACHE), assets = self.CP_OFFLINE_ASSETS[name], done = 0;
    for (var asset of assets) {
      if (!(await cache.match(packKey(asset)))) {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 180000);
        var heartbeat = setInterval(function () { port.postMessage({ progress: true, done: done, total: assets.length }); }, 10000);
        try {
          var res = await fetch(packURL(asset), { cache: 'reload', signal: controller.signal });
          if (!res.ok || res.type === 'opaque') throw new Error('File unavailable');
          // A captive portal, stale deployment or truncated response must never count as ready.
          var data = await res.arrayBuffer();
          var hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
          if (hash !== asset.revision) throw new Error('The app is updating or the connection returned an unexpected file');
          await cache.put(packKey(asset), new Response(data, { status: 200, headers: res.headers }));
          // Only discard older copies after the replacement has saved successfully.
          var keys = await cache.keys(packURL(asset), { ignoreSearch: true });
          for (var key of keys) if (key.url !== packKey(asset)) await cache.delete(key);
        } catch (e) {
          if (e.name === 'QuotaExceededError') throw new Error('Not enough storage. Free some space on this device and resume. Saved practice has not been removed.');
          throw new Error('Download paused at ' + asset.url + '. ' + (e.message || 'Check your connection') + '. Reconnect and resume; saved files are kept.');
        } finally { clearTimeout(timeout); clearInterval(heartbeat); }
      }
      done++;
      port.postMessage({ progress: true, done: done, total: assets.length });
    }
  } finally { delete packDownloads[name]; }
}
self.addEventListener('message', function (event) {
  var data = event.data || {}, port = event.ports && event.ports[0];
  if (!port || !/^offline-(status|download)$/.test(data.type)) return;
  event.waitUntil((async function () {
    try {
      if (data.type === 'offline-download') await downloadPack(data.pack, port);
      port.postMessage(await packStatus());
    } catch (e) { port.postMessage({ error: e.message }); }
  })());
});
