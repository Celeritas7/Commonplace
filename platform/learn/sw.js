/* Only reviewed public application files enter this cache. Private lesson data,
   profiles, tokens, RPCs and tutorial bytes live outside CacheStorage. */
importScripts("./shell-manifest.js");
const root = new URL("../../", self.location.href),
  manifest = self.CP_SHELL;
const PREFIX = "cp-u8-shell-",
  CACHE = PREFIX + manifest.version,
  READY = new URL("platform/learn/.shell-ready", root).href,
  PREVIOUS = new URL("platform/learn/.shell-previous", root).href,
  CLIENTS = "cp-u8-shell-clients-v1";
const allow = new Map(
  manifest.assets.map((a) => [new URL(a.path, root).href, a]),
);
const hash = async (bytes) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const versionOf = async (assets) =>
  (await hash(new TextEncoder().encode(JSON.stringify(assets)))).slice(0, 16);
const isShell = (name) =>
  name.startsWith(PREFIX) && /^[a-f0-9]{16}$/.test(name.slice(PREFIX.length));
const verified = new Map(), pins = new Map(), durablePins = new Set();
async function matches(response, asset) {
  if (!response?.ok || response.type === "opaque") return false;
  const bytes = await response.clone().arrayBuffer();
  return bytes.byteLength === asset.bytes && (await hash(bytes)) === asset.sha256;
}

// Browser activation is independent of SAVE_SHELL. Select a whole completed
// release, including on a cold worker restart, rather than individual fallbacks.
async function readShell(name) {
  if (!isShell(name)) return null;
  if (!verified.has(name)) verified.set(name, (async () => {
    if (!(await caches.keys()).includes(name)) return null;
    const cache = await caches.open(name), marker = await cache.match(READY);
    if (!marker) return null;
    const text = await marker.text();
    let assets;
    if (text === "ready") {
      // Deployed U8/E3 caches have no manifest copy. Reconstruct their exact
      // sorted descriptor list and check the build digest in the cache name.
      // Missing, extra or damaged bytes cannot pass as a complete legacy pack.
      assets = [];
      const urls = (await cache.keys()).map((r) => r.url)
        .filter((url) => url !== READY).sort();
      for (const url of urls) {
        const parsed = new URL(url);
        if (!url.startsWith(root.href) || parsed.search || parsed.hash) return null;
        const response = await cache.match(url);
        if (!response?.ok || response.type === "opaque") return null;
        const bytes = await response.arrayBuffer();
        assets.push({ path: decodeURI(url.slice(root.href.length)),
          bytes: bytes.byteLength, sha256: await hash(bytes) });
      }
    } else {
      const saved = JSON.parse(text);
      if (saved.version !== name.slice(PREFIX.length)) return null;
      assets = saved.assets;
    }
    if (!Array.isArray(assets) || !assets.length ||
        (await versionOf(assets)) !== name.slice(PREFIX.length)) return null;
    const entries = new Map();
    for (const asset of assets) {
      if (typeof asset.path !== "string" || !Number.isSafeInteger(asset.bytes) ||
          asset.bytes < 0 || !/^[a-f0-9]{64}$/.test(asset.sha256)) return null;
      const url = new URL(asset.path, root);
      if (!url.href.startsWith(root.href) || url.search || url.hash ||
          url.href === READY || entries.has(url.href)) return null;
      if (text !== "ready" && !(await matches(await cache.match(url.href), asset)))
        return null;
      entries.set(url.href, asset);
    }
    return { name, cache, entries };
  })().catch(() => null));
  return verified.get(name);
}
async function selectShell(fresh = false) {
  // Recheck the whole release for a new document, even if an earlier request
  // verified it: storage eviction can remove a different dependency meanwhile.
  if (fresh) verified.clear();
  const names = (await caches.keys()).filter(isShell).reverse();
  for (const name of [CACHE, ...names.filter((n) => n !== CACHE)]) {
    const shell = await readShell(name);
    if (shell) return shell;
  }
  return null;
}
async function previousShell() {
  const current = await readShell(CACHE);
  const previous = current && await current.cache.match(PREVIOUS);
  return previous ? readShell(await previous.text()) : null;
}
const pinURL = (id) => new URL(
  "platform/learn/.shell-client/" + encodeURIComponent(id), root,
).href;
async function pinnedName(id) {
  if (!id) return null;
  if (pins.has(id)) return pins.get(id);
  const response = await (await caches.open(CLIENTS)).match(pinURL(id));
  const name = response && await response.text();
  if (isShell(name || "")) {
    pins.set(id, name); durablePins.add(id); return name;
  }
  return null;
}
async function pin(id, name, required = false) {
  if (!id) return;
  if (pins.get(id) === name && durablePins.has(id)) return;
  pins.set(id, name);
  try {
    await (await caches.open(CLIENTS)).put(pinURL(id), new Response(name));
    durablePins.add(id);
  } catch (error) {
    durablePins.delete(id);
    // A full device must still read its existing shell. Promotion, however,
    // must stop if open pages cannot retain their revision across a restart.
    if (required) throw error;
  }
}
async function pinOpenPages(shell) {
  if (!shell) return;
  const scope = new URL("platform/learn/", root).href;
  for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true }))
    if (client.url.startsWith(scope))
      await pin(client.id, await pinnedName(client.id) || shell.name, true);
}
let saving;
self.addEventListener("message", (event) => {
  if (event.data?.type !== "SAVE_SHELL" || !event.ports[0]) return;
  const port = event.ports[0];
  const controller = new AbortController();
  port.onmessage = ({ data }) => {
    if (data?.type === "cancel") controller.abort();
  };
  const run = async () => {
    // Old pages must keep their module graph even after skipWaiting/claim or
    // a worker restart. Publish the completion marker only after these pins.
    const previous = await selectShell(true);
    await pinOpenPages(previous);
    const cache = await caches.open(CACHE);
    if (previous && previous.name !== CACHE)
      await cache.put(PREVIOUS, new Response(previous.name));
    let done = 0,
      bytes = 0;
    const total = manifest.assets.reduce((n, a) => n + a.bytes, 0);
    for (const [url, a] of allow) {
      if (controller.signal.aborted) throw Error("Download paused");
      let response = await cache.match(url);
      if (!response) {
        for (const name of await caches.keys()) {
          if (isShell(name) && name !== CACHE) {
            const saved = await (await caches.open(name)).match(url);
            if (await matches(saved, a)) {
              response = saved;
              await cache.put(url, saved.clone());
              break;
            }
          }
        }
      }
      if (!(await matches(response, a))) {
        response = await fetch(url, {
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
        });
        if (!response.ok || response.type === "opaque")
          throw Error("Application file unavailable. Resume the download.");
        const data = await response.clone().arrayBuffer();
        if (data.byteLength !== a.bytes || (await hash(data)) !== a.sha256)
          throw Error("Application update changed. Reopen online and resume.");
        await cache.put(url, response);
      }
      done++;
      bytes += a.bytes;
      port.postMessage({
        type: "progress",
        done,
        count: allow.size,
        bytes,
        total,
      });
    }
    if (controller.signal.aborted) throw Error("Download paused");
    // Include pages opened during a long download before making it selectable.
    await pinOpenPages(await selectShell());
    await cache.put(
      READY,
      new Response(JSON.stringify(manifest)),
    );
    verified.delete(CACHE);
    if (!(await readShell(CACHE))) throw Error("Application verification failed");
    await self.skipWaiting();
    port.postMessage({ type: "ready" });
  };
  if (saving) {
    port.postMessage({
      type: "error",
      message:
        "A study application download is already running. Retry when it finishes.",
    });
    return;
  }
  saving = run()
    .catch(() =>
      port.postMessage({
        type: "error",
        message:
          "Application download interrupted. Resume to reuse completed files.",
      }),
    )
    .finally(() => (saving = null));
  event.waitUntil(saving);
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Natural activation can precede a download. Prior complete releases
      // remain available for both recovery and pages still using their code.
      // A pre-R1 page can appear after the final download scan. Its old worker
      // could not write a pin, so keep a durable predecessor for that handover.
      await pinOpenPages(await previousShell() || await selectShell());
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== root.origin) return;
  let match = url.href;
  if (
    request.mode === "navigate" &&
    (url.pathname === new URL("platform/learn/", root).pathname ||
      url.pathname === new URL("platform/learn/index.html", root).pathname)
  )
    match = new URL("platform/learn/index.html", root).href;
  // Old releases may reference a public module removed from the new manifest.
  // Only these public application namespaces need that compatibility lookup;
  // API, Storage, auth/admin and unrelated study requests remain untouched.
  const relative = url.pathname.slice(root.pathname.length);
  const previousPublicFile = url.pathname.startsWith(root.pathname) &&
    /^(?:platform\/(?:learn|offline|lib|content|materials)\/|Office_work\/Excel_study\/|icons\/)/.test(relative) &&
    /\.(?:html|mjs|js|css|webmanifest|png|svg|ico|woff2?)$/.test(url.pathname) &&
    !url.search;
  if (!allow.has(match) && !previousPublicFile) return;
  event.respondWith(
    (async () => {
      const navigation = request.mode === "navigate";
      const name = !navigation && await pinnedName(event.clientId);
      let shell;
      if (navigation) shell = await selectShell(true);
      else if (name) shell = await readShell(name);
      else shell = (event.clientId && await previousShell()) || await selectShell();
      if (!shell && !name) return fetch(request); // First download still needed.
      if (shell?.entries.has(match)) {
        let cached = await shell.cache.match(match);
        if (!(await matches(cached, shell.entries.get(match)))) {
          verified.delete(shell.name);
          // A fresh document may choose another whole complete release. An
          // open document must not silently change its dependencies mid-page.
          if (navigation) {
            shell = await selectShell();
            cached = shell?.entries.has(match) && await shell.cache.match(match);
          } else cached = null;
        }
        if (cached && await matches(cached, shell.entries.get(match))) {
          await pin(navigation ? event.resultingClientId : event.clientId, shell.name);
          return cached;
        }
      } else if (shell && !allow.has(match)) return fetch(request);
      return new Response("Saved application file unavailable. Reopen online and resume the download.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })(),
  );
});
