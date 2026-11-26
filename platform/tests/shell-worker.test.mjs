import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, webcrypto } from "node:crypto";
import vm from "node:vm";

// Exercise the actual worker across independent lifetimes and shared caches.
// These deterministic protocol tests complement the real-browser acceptance
// suite; they do not establish physical iPad Home Screen acceptance.
const source = await readFile(new URL("../learn/sw.js", import.meta.url), "utf8");
const root = "https://study.example.invalid/Commonplace/";
const href = (path) => new URL(path, root).href;
const readyURL = href("platform/learn/.shell-ready");
const digest = (body) => createHash("sha256").update(body).digest("hex");

function release(label, { extra = [] } = {}) {
  const bodies = new Map([
    ["platform/learn/index.html", `<main>${label} assigned learning</main>`],
    ["platform/learn/offline-preview.html", `<main>${label} Excel Test</main>`],
    ["platform/learn/learn.css", `body{--release:"${label}"}`],
    ["platform/learn/bootstrap.mjs", `export const release = "${label}";`],
    ["platform/offline/host.mjs", `export const host = "${label}";`],
    ...extra.map((path) => [path, `export const extra = "${label}";`]),
  ]);
  const assets = [...bodies].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, body]) => ({
    path,
    bytes: Buffer.byteLength(body),
    sha256: digest(body),
  }));
  const manifest = { version: digest(JSON.stringify(assets)).slice(0, 16), assets };
  return { bodies, manifest, cacheName: `cp-u8-shell-${manifest.version}` };
}

function memoryCaches(hooks = {}) {
  const entries = new Map();
  const key = (request) =>
    typeof request === "string" ? request : request.url || request.href;
  return {
    async keys() {
      return [...entries.keys()];
    },
    async has(name) {
      return entries.has(name);
    },
    async delete(name) {
      return entries.delete(name);
    },
    async open(name) {
      if (!entries.has(name)) entries.set(name, new Map());
      const rows = entries.get(name);
      return {
        async match(request) {
          return rows.get(key(request))?.clone();
        },
        async put(request, response) {
          rows.set(key(request), response.clone());
          await hooks.afterPut?.({ name, url: key(request) });
        },
        async delete(request) {
          return rows.delete(key(request));
        },
        async keys() {
          return [...rows.keys()].map((url) => new Request(url));
        },
      };
    },
  };
}

async function seedLegacy(caches, saved) {
  const cache = await caches.open(saved.cacheName);
  for (const [path, body] of saved.bodies)
    await cache.put(href(path), new Response(body));
  // This is the deployed pre-R1 completion format. Existing downloaded packs
  // must remain usable without a fresh network connection or a new download.
  await cache.put(readyURL, new Response("ready"));
}

function worker(caches, published, { clients = [] } = {}) {
  const events = new Map(), requests = [], fail = new Set(), overrides = new Map();
  let offline = false, skipped = 0;
  const windows = new Map(clients.map((id) => [id, {
    id,
    type: "window",
    url: href("platform/learn/offline-preview.html"),
    postMessage() {},
  }]));
  const self = {
    location: new URL("platform/learn/sw.js", root),
    registration: { scope: href("platform/learn/") },
    CP_SHELL: structuredClone(published.manifest),
    addEventListener: (name, listener) => events.set(name, listener),
    skipWaiting: async () => { skipped++; },
    clients: {
      claim: async () => {},
      matchAll: async () => [...windows.values()],
      get: async (id) => windows.get(id),
    },
  };
  vm.runInNewContext(source, {
    self, caches, URL, Request, Response, Headers, AbortController,
    Uint8Array, TextEncoder, TextDecoder, crypto: webcrypto,
    console, setTimeout, clearTimeout, importScripts() {},
    fetch: async (request) => {
      const url = typeof request === "string" ? request : request.url || request.href;
      requests.push(url);
      if (offline || fail.has(url)) throw Error("Synthetic network disconnected");
      const path = url.slice(root.length);
      const body = overrides.has(url) ? overrides.get(url) : published.bodies.get(path);
      return new Response(body ?? "Uncached network response", { status: body === undefined ? 404 : 200 });
    },
  });
  return {
    requests, fail, overrides, windows,
    setOffline(value = true) { offline = value; },
    skipped: () => skipped,
    async activate() {
      const tasks = [];
      events.get("activate")?.({ waitUntil: (task) => tasks.push(task) });
      await Promise.all(tasks);
    },
    async save({ clientId = "", onMessage } = {}) {
      const messages = [], tasks = [];
      const port = {
        onmessage: null,
        postMessage(message) {
          messages.push(message);
          onMessage?.(message, () => port.onmessage?.({ data: { type: "cancel" } }));
        },
      };
      events.get("message")({
        data: { type: "SAVE_SHELL" },
        ports: [port],
        source: clientId ? { id: clientId } : null,
        waitUntil: (task) => tasks.push(task),
      });
      await Promise.all(tasks);
      return messages;
    },
    fetch(path, { clientId = "", resultingClientId = "", method = "GET", mode = "cors" } = {}) {
      let response;
      const tasks = [];
      if (resultingClientId)
        windows.set(resultingClientId, { id: resultingClientId, type: "window", url: href(path), postMessage() {} });
      events.get("fetch")({
        request: { url: href(path), method, mode },
        clientId, resultingClientId,
        respondWith: (value) => { response = value; },
        waitUntil: (task) => tasks.push(task),
      });
      if (response === undefined) return undefined;
      return (async () => {
        const value = await response;
        await Promise.all(tasks);
        return value;
      })();
    },
  };
}

async function assertRelease(w, expected, clientId) {
  const paths = [...expected.bodies.keys()];
  for (const path of paths) {
    const response = await w.fetch(path, {
      clientId,
      mode: path.endsWith(".html") ? "navigate" : "cors",
      resultingClientId: path.endsWith(".html") ? clientId : "",
    });
    assert.ok(response, `Worker handles saved public file ${path}`);
    assert.equal(await response.text(), expected.bodies.get(path), path);
  }
}

test("R1 automatic activation with no new download serves the complete legacy shell without network", async () => {
  const caches = memoryCaches(), old = release("old"), next = release("new");
  await seedLegacy(caches, old);
  const update = worker(caches, next);
  update.setOffline();
  await update.activate();
  await assertRelease(update, old, "first-cold-launch");
  assert.deepEqual(update.requests, []);
  assert.ok(await caches.has(old.cacheName));

  // A new JavaScript global models worker eviction/restart, not just reopening
  // a page against a worker that remembers the successful choice in memory.
  const restarted = worker(caches, next);
  restarted.setOffline();
  await assertRelease(restarted, old, "second-cold-launch");
  assert.deepEqual(restarted.requests, []);
});

test("R1 an interrupted automatically activated update never mixes its partial shell with the saved revision", async () => {
  const caches = memoryCaches(), old = release("old"), next = release("new");
  await seedLegacy(caches, old);
  const update = worker(caches, next);
  update.fail.add(href("platform/learn/learn.css"));
  assert.equal((await update.save()).at(-1).type, "error");
  assert.equal(update.skipped(), 0);
  update.requests.length = 0;
  update.setOffline();
  await update.activate();
  await assertRelease(update, old, "after-interruption");
  assert.deepEqual(update.requests, []);
  assert.ok(await caches.has(old.cacheName));
});

test("R1 fallback follows the saved revision's asset list when the update changes public modules", async () => {
  const caches = memoryCaches();
  const old = release("old", { extra: ["platform/learn/previous-module.mjs"] });
  const next = release("new", { extra: ["platform/learn/replacement-module.mjs"] });
  await seedLegacy(caches, old);
  const update = worker(caches, next);
  update.setOffline();
  await update.activate();
  await assertRelease(update, old, "older-module-graph");
  const missing = await Promise.allSettled([
    update.fetch("platform/learn/replacement-module.mjs", { clientId: "older-module-graph" }),
  ]);
  assert.ok(
    missing[0].status === "rejected" || missing[0].value?.ok === false,
    "A page pinned to the older shell must not receive a newer module",
  );
  assert.deepEqual(update.requests, []);
});

test("R1 bad update bytes and cancellation retain the last complete offline shell", async () => {
  for (const failure of ["hash", "cancel"]) {
    const caches = memoryCaches(), old = release("old"), next = release("new");
    await seedLegacy(caches, old);
    const update = worker(caches, next);
    if (failure === "hash")
      update.overrides.set(href("platform/learn/learn.css"), "corrupted public CSS");
    const messages = await update.save({
      onMessage(message, cancel) {
        if (failure === "cancel" && message.type === "progress") cancel();
      },
    });
    assert.equal(messages.at(-1).type, "error", failure);
    assert.equal(update.skipped(), 0, failure);
    assert.ok(await caches.has(old.cacheName), failure);
    update.requests.length = 0;
    update.setOffline();
    await update.activate();
    await assertRelease(update, old, `${failure}-launch`);
    assert.deepEqual(update.requests, [], failure);
  }
});

test("R1 a verified update serves new navigations while the open page keeps one saved revision across worker restart", async () => {
  const caches = memoryCaches(), old = release("old"), next = release("new");
  await seedLegacy(caches, old);
  const update = worker(caches, next);
  await update.activate();
  assert.equal(
    await (await update.fetch("platform/learn/offline-preview.html", { mode: "navigate", resultingClientId: "open-old-page" })).text(),
    old.bodies.get("platform/learn/offline-preview.html"),
  );
  assert.equal((await update.save({ clientId: "open-old-page" })).at(-1).type, "ready");
  update.requests.length = 0;
  update.setOffline();
  assert.equal(
    await (await update.fetch("platform/offline/host.mjs", { clientId: "open-old-page" })).text(),
    old.bodies.get("platform/offline/host.mjs"),
  );
  await assertRelease(update, next, "new-page");
  assert.deepEqual(update.requests, []);

  const restarted = worker(caches, next, { clients: ["open-old-page", "new-page"] });
  restarted.setOffline();
  assert.equal(
    await (await restarted.fetch("platform/offline/host.mjs", { clientId: "open-old-page" })).text(),
    old.bodies.get("platform/offline/host.mjs"),
  );
  assert.equal(
    await (await restarted.fetch("platform/offline/host.mjs", { clientId: "new-page" })).text(),
    next.bodies.get("platform/offline/host.mjs"),
  );
  assert.deepEqual(restarted.requests, []);
  assert.ok(await caches.has(old.cacheName));
});

test("R1 a waiting update pins existing legacy pages and pages opened during download before activation", async () => {
  const caches = memoryCaches(), old = release("old"), next = release("new");
  await seedLegacy(caches, old);
  // These pages were loaded by the deployed legacy worker and have no R1 pin.
  const update = worker(caches, next, { clients: ["legacy-open-page"] });
  const messages = await update.save({
    clientId: "legacy-open-page",
    onMessage(message) {
      if (message.type === "progress") update.windows.set("opened-during-download", {
        id: "opened-during-download", type: "window",
        url: href("platform/learn/offline-preview.html"), postMessage() {},
      });
    },
  });
  assert.equal(messages.at(-1).type, "ready");
  await update.activate();
  const restarted = worker(caches, next, { clients: ["legacy-open-page", "opened-during-download"] });
  restarted.setOffline();
  for (const clientId of ["legacy-open-page", "opened-during-download"])
    assert.equal(
      await (await restarted.fetch("platform/offline/host.mjs", { clientId })).text(),
      old.bodies.get("platform/offline/host.mjs"), clientId,
    );
  await assertRelease(restarted, next, "after-update-reopen");
  assert.deepEqual(restarted.requests, []);
});

test("R1 a legacy page opened after the final download scan keeps its predecessor through activation and restart", async () => {
  const old = release("old"), next = release("new");
  let update, appeared = false;
  const caches = memoryCaches({
    afterPut({ name, url }) {
      if (name !== next.cacheName || url !== readyURL) return;
      // The legacy active worker can serve an old document after the waiting
      // update's final client scan but before skipWaiting/claim takes over.
      appeared = true;
      update.windows.set("late-legacy-page", {
        id: "late-legacy-page", type: "window",
        url: href("platform/learn/offline-preview.html"), postMessage() {},
      });
    },
  });
  await seedLegacy(caches, old);
  update = worker(caches, next);
  assert.equal((await update.save()).at(-1).type, "ready");
  assert.equal(appeared, true);
  await update.activate();
  update.setOffline();
  update.requests.length = 0;
  assert.equal(
    await (await update.fetch("platform/offline/host.mjs", { clientId: "late-legacy-page" })).text(),
    old.bodies.get("platform/offline/host.mjs"),
  );
  const restarted = worker(caches, next, { clients: ["late-legacy-page"] });
  restarted.setOffline();
  assert.equal(
    await (await restarted.fetch("platform/learn/bootstrap.mjs", { clientId: "late-legacy-page" })).text(),
    old.bodies.get("platform/learn/bootstrap.mjs"),
  );
  await assertRelease(restarted, next, "new-document-after-handover");
  assert.deepEqual(update.requests, []);
  assert.deepEqual(restarted.requests, []);
});

test("R1 resuming a failed update reuses verified files and promotes only the completed revision", async () => {
  const caches = memoryCaches(), old = release("old"), next = release("new");
  await seedLegacy(caches, old);
  const update = worker(caches, next);
  update.fail.add(href("platform/learn/learn.css"));
  assert.equal((await update.save()).at(-1).type, "error");
  update.fail.clear();
  update.requests.length = 0;
  assert.equal((await update.save()).at(-1).type, "ready");
  assert.deepEqual(update.requests, [
    href("platform/learn/learn.css"),
    href("platform/learn/offline-preview.html"),
    href("platform/offline/host.mjs"),
  ]);
  assert.equal(update.skipped(), 1);
  await update.activate();
  update.setOffline();
  update.requests.length = 0;
  await assertRelease(update, next, "complete-update");
  assert.deepEqual(update.requests, []);
});

test("R1 a forged completion marker cannot make an incomplete cache supersede a verified legacy shell", async () => {
  const caches = memoryCaches(), old = release("old"), next = release("new");
  await seedLegacy(caches, old);
  const partial = await caches.open(next.cacheName);
  await partial.put(href("platform/learn/index.html"), new Response(next.bodies.get("platform/learn/index.html")));
  await partial.put(readyURL, new Response("ready"));
  const update = worker(caches, next);
  update.setOffline();
  await update.activate();
  await assertRelease(update, old, "partial-marker");
  assert.deepEqual(update.requests, []);
  assert.ok(await caches.has(old.cacheName));
});

test("R1 cold restart rejects a damaged completed update and reuses the intact previous revision", async () => {
  for (const damage of ["missing", "corrupt"]) {
    const caches = memoryCaches(), old = release("old"), next = release("new");
    await seedLegacy(caches, old);
    const update = worker(caches, next);
    assert.equal((await update.save()).at(-1).type, "ready");
    const current = await caches.open(next.cacheName);
    if (damage === "missing") await current.delete(href("platform/offline/host.mjs"));
    else await current.put(href("platform/offline/host.mjs"), new Response("damaged module"));
    const restarted = worker(caches, next);
    restarted.setOffline();
    await restarted.activate();
    await assertRelease(restarted, old, `${damage}-launch`);
    assert.deepEqual(restarted.requests, [], damage);
    assert.ok(await caches.has(old.cacheName), damage);
  }
});

test("R1 fresh navigation rechecks the whole warm shell after dependency eviction or corruption", async () => {
  for (const damage of ["missing", "corrupt"]) {
    const caches = memoryCaches(), old = release("old"), next = release("new");
    await seedLegacy(caches, old);
    const update = worker(caches, next);
    assert.equal((await update.save()).at(-1).type, "ready");
    await update.activate();
    await assertRelease(update, next, "open-new-page");
    const current = await caches.open(next.cacheName);
    if (damage === "missing") await current.delete(href("platform/offline/host.mjs"));
    else await current.put(href("platform/offline/host.mjs"), new Response("damaged module"));
    update.setOffline();
    update.requests.length = 0;

    // The worker remains alive and previously verified this release. An intact
    // HTML response alone must not make a now-incomplete release selectable.
    await assertRelease(update, old, `fresh-${damage}-navigation`);
    const pinned = await Promise.allSettled([
      update.fetch("platform/offline/host.mjs", { clientId: "open-new-page" }),
    ]);
    assert.ok(
      pinned[0].status === "rejected" || pinned[0].value?.ok === false,
      "An existing new document must fail locally rather than load an old dependency",
    );
    assert.deepEqual(update.requests, [], damage);
    assert.ok(await caches.has(old.cacheName), damage);
  }
});

test("R1 cache fallback stays within reviewed public GET assets and preserves unrelated study packs", async () => {
  const caches = memoryCaches(), old = release("old"), next = release("new");
  await seedLegacy(caches, old);
  const unrelated = await caches.open("commonplace-python-existing");
  await unrelated.put(href("Coding/Python/index.html"), new Response("existing Python pack"));
  const oldCache = await caches.open(old.cacheName);
  await oldCache.put(href("rest/v1/cp_learning_profiles"), new Response("must never be served"));
  const update = worker(caches, next);
  update.setOffline();
  await update.activate();
  for (const path of [
    "rest/v1/cp_learning_profiles",
    "functions/v1/material-files",
    "storage/v1/object/cp-materials/private",
    "platform/admin/index.html",
    "https://other.example.invalid/platform/learn/index.html",
    "platform/learn/bootstrap.mjs?token=synthetic-private-query",
  ]) assert.equal(update.fetch(path), undefined, path);
  assert.equal(update.fetch("platform/learn/index.html", { method: "POST" }), undefined);
  assert.equal(await (await unrelated.match(href("Coding/Python/index.html"))).text(), "existing Python pack");
  assert.deepEqual(update.requests, []);
});
