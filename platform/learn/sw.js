/* Only reviewed public application files enter this cache. Private lesson data,
   profiles, tokens, RPCs and tutorial bytes live outside CacheStorage. */
importScripts("./shell-manifest.js");
const root = new URL("../../", self.location.href),
  manifest = self.CP_SHELL;
const CACHE = "cp-u8-shell-" + manifest.version;
const allow = new Map(
  manifest.assets.map((a) => [new URL(a.path, root).href, a]),
);
const hash = async (bytes) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
let saving;
self.addEventListener("message", (event) => {
  if (event.data?.type !== "SAVE_SHELL" || !event.ports[0]) return;
  const port = event.ports[0];
  const controller = new AbortController();
  port.onmessage = ({ data }) => {
    if (data?.type === "cancel") controller.abort();
  };
  const run = async () => {
    const cache = await caches.open(CACHE);
    let done = 0,
      bytes = 0;
    const total = manifest.assets.reduce((n, a) => n + a.bytes, 0);
    for (const [url, a] of allow) {
      if (controller.signal.aborted) throw Error("Download paused");
      let response = await cache.match(url);
      if (!response) {
        for (const name of await caches.keys()) {
          if (name.startsWith("cp-u8-shell-") && name !== CACHE) {
            const saved = await (await caches.open(name)).match(url);
            if (
              saved &&
              (await hash(await saved.clone().arrayBuffer())) === a.sha256
            ) {
              response = saved;
              await cache.put(url, saved.clone());
              break;
            }
          }
        }
      }
      if (
        !response ||
        (await hash(await response.clone().arrayBuffer())) !== a.sha256
      ) {
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
    await cache.put(
      new URL("platform/learn/.shell-ready", root),
      new Response("ready"),
    );
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
      const cache = await caches.open(CACHE);
      if (await cache.match(new URL("platform/learn/.shell-ready", root)))
        for (const name of await caches.keys())
          if (name.startsWith("cp-u8-shell-") && name !== CACHE)
            await caches.delete(name);
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
  if (!allow.has(match)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const ready = await cache.match(
        new URL("platform/learn/.shell-ready", root),
      );
      const cached = ready && (await cache.match(match));
      return cached || fetch(request);
    })(),
  );
});
