import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { createHash, webcrypto } from "node:crypto";

// Execute the real worker with deterministic network/cache failures. This models
// the Cache/worker protocol; real Chromium and physical-device gates are separate.
const source = await readFile(
  new URL("../learn/sw.js", import.meta.url),
  "utf8",
);
const root = "https://study.example.invalid/Commonplace/";
const url = (p) => new URL(p, root).href;
function cacheStorage() {
  const data = new Map();
  const key = (r) => (typeof r === "string" ? r : r.url || r.href);
  return {
    data,
    keys: async () => [...data.keys()],
    delete: async (name) => data.delete(name),
    async open(name) {
      if (!data.has(name)) data.set(name, new Map());
      const rows = data.get(name);
      return {
        match: async (r) => rows.get(key(r))?.clone(),
        put: async (r, response) => {
          rows.set(key(r), response.clone());
        },
        delete: async (r) => rows.delete(key(r)),
        keys: async () => [...rows.keys()].map((u) => new Request(u)),
      };
    },
  };
}
function worker(caches, version, changed = false) {
  const bodies = new Map([
    [url("platform/learn/index.html"), "<main>Public shell</main>"],
    [
      url("platform/learn/learn.css"),
      changed ? "body{color:blue}" : "body{color:black}",
    ],
    [url("platform/learn/bootstrap.mjs"), "/* public bootstrap */"],
  ]);
  const events = {},
    requests = [],
    fail = new Set();
  let skipped = 0,
    claimed = 0;
  const assets = [...bodies].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([href, body]) => ({
      path: href.slice(root.length),
      bytes: Buffer.byteLength(body),
      sha256: createHash("sha256").update(body).digest("hex"),
    }));
  version = createHash("sha256").update(JSON.stringify(assets)).digest("hex").slice(0, 16);
  const self = {
    location: { href: url("platform/learn/sw.js") },
    CP_SHELL: {
      version,
      assets,
    },
    addEventListener: (name, fn) => {
      events[name] = fn;
    },
    skipWaiting: async () => {
      skipped++;
    },
    clients: {
      matchAll: async () => [],
      claim: async () => {
        claimed++;
      },
    },
  };
  vm.runInNewContext(source, {
    self,
    caches,
    URL,
    Response,
    AbortController,
    Uint8Array,
    TextEncoder,
    crypto: webcrypto,
    importScripts() {},
    fetch: async (r) => {
      const href = typeof r === "string" ? r : r.url;
      requests.push(href);
      if (fail.has(href)) throw Error("Synthetic disconnected network");
      return new Response(bodies.get(href) || "network", { status: 200 });
    },
  });
  return {
    cacheName: "cp-u8-shell-" + version,
    fail,
    requests,
    skipped: () => skipped,
    claimed: () => claimed,
    async save() {
      const messages = [];
      let task;
      events.message({
        data: { type: "SAVE_SHELL" },
        ports: [{ postMessage: (m) => messages.push(m) }],
        waitUntil: (p) => {
          task = p;
        },
      });
      await task;
      return messages;
    },
    async activate() {
      let task;
      events.activate({
        waitUntil: (p) => {
          task = p;
        },
      });
      await task;
    },
    fetch(path, method = "GET", mode = "navigate") {
      let response;
      events.fetch({
        request: { url: url(path), method, mode },
        respondWith: (p) => {
          response = p;
        },
      });
      return response;
    },
  };
}
test("U9 incomplete public shell never reports ready or serves partial bytes; resume reuses verified files", async () => {
  const caches = cacheStorage(),
    w = worker(caches, "first");
  w.fail.add(url("platform/learn/learn.css"));
  assert.equal((await w.save()).at(-1).type, "error");
  assert.equal(w.skipped(), 0);
  const cache = await caches.open(w.cacheName);
  assert.equal(
    await cache.match(url("platform/learn/.shell-ready")),
    undefined,
  );
  w.fail.add(url("platform/learn/index.html"));
  await assert.rejects(
    () => w.fetch("platform/learn/index.html"),
    /disconnected/,
  );
  w.fail.clear();
  w.requests.length = 0;
  assert.equal((await w.save()).at(-1).type, "ready");
  assert.deepEqual(w.requests, [url("platform/learn/learn.css")]);
  assert.equal(w.skipped(), 1);
});
test("U9 failed update keeps old shell usable; complete update reuses runtime and leaves legacy caches untouched", async () => {
  const caches = cacheStorage(),
    old = worker(caches, "old");
  await (
    await caches.open("commonplace-python-existing")
  ).put(url("Coding/Python/index.html"), new Response("Old personal study"));
  await old.save();
  await old.activate();
  const update = worker(caches, "new", true);
  update.fail.add(url("platform/learn/learn.css"));
  assert.equal((await update.save()).at(-1).type, "error");
  assert.ok((await caches.keys()).includes(old.cacheName));
  assert.equal(
    await (await old.fetch("platform/learn/index.html")).text(),
    "<main>Public shell</main>",
  );
  update.fail.clear();
  update.requests.length = 0;
  assert.equal((await update.save()).at(-1).type, "ready");
  assert.deepEqual(update.requests, [url("platform/learn/learn.css")]);
  await update.activate();
  assert.deepEqual((await caches.keys()).sort(), [
    "commonplace-python-existing",
    old.cacheName,
    update.cacheName,
  ].sort());
  assert.equal(
    await (
      await (
        await caches.open("commonplace-python-existing")
      ).match(url("Coding/Python/index.html"))
    ).text(),
    "Old personal study",
  );
});
test("U9 worker ignores APIs/private files and does not store OAuth callback URLs", async () => {
  const caches = cacheStorage(),
    w = worker(caches, "boundary");
  await w.save();
  for (const path of [
    "rest/v1/cp_learning_profiles",
    "functions/v1/material-files",
    "storage/v1/object/cp-materials/private",
    "platform/admin/index.html",
  ])
    assert.equal(w.fetch(path), undefined);
  assert.equal(w.fetch("platform/learn/index.html", "POST"), undefined);
  const callback =
    "platform/learn/?code=synthetic-callback&state=synthetic-state";
  assert.equal(
    await (await w.fetch(callback)).text(),
    "<main>Public shell</main>",
  );
  const keys = await (await caches.open(w.cacheName)).keys();
  assert.ok(
    keys.every((r) => !r.url.includes("code=") && !r.url.includes("state=")),
  );
});
