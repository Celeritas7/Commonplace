import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";

const root = new URL("../../../", import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

// A separate origin avoids other browser tests' registrations. Both revisions
// run the real learner and real worker; only public HTML/CSS fixture bytes vary.
async function updatingSite() {
  const scope = { self: {} };
  runInNewContext(
    await readFile(new URL("platform/learn/shell-manifest.js", root), "utf8"),
    scope,
  );
  const original = new Map(
    await Promise.all(
      scope.self.CP_SHELL.assets.map(async ({ path }) => [
        path,
        await readFile(new URL(path, root)),
      ]),
    ),
  );
  const worker = await readFile(new URL("platform/learn/sw.js", root), "utf8");
  function revision(label) {
    const bodies = new Map(original);
    for (const path of [
      "platform/learn/index.html",
      "platform/learn/offline-preview.html",
    ])
      bodies.set(path, Buffer.from(bodies.get(path).toString().replace(
        '<html lang="en">',
        `<html lang="en" data-r1-shell="${label}">`,
      )));
    const css = "platform/learn/learn.css";
    bodies.set(css, Buffer.concat([
      bodies.get(css), Buffer.from(`\n/* R1 ${label} public shell */\n`),
    ]));
    const assets = [...bodies].map(([path, bytes]) => ({
      path, bytes: bytes.length, sha256: digest(bytes),
    }));
    const version = digest(JSON.stringify(assets)).slice(0, 16);
    return { label, bodies, version, manifest: { version, assets } };
  }
  const old = revision("old"), next = revision("new"), requests = [];
  let current = old, rejectAssets = false;
  const server = createServer((request, response) => {
    const path = new URL(request.url, "http://127.0.0.1").pathname.slice(1);
    response.setHeader("Cache-Control", "no-store");
    if (path === "r1-control.html") {
      response.setHeader("Content-Type", "text/html");
      response.end("<!doctype html><title>Update observer</title>");
      return;
    }
    if (path === "platform/learn/sw.js") {
      response.setHeader("Content-Type", "application/javascript");
      response.end(worker + `\n// R1 ${current.label} worker revision\n`);
      return;
    }
    if (path === "platform/learn/shell-manifest.js") {
      response.setHeader("Content-Type", "application/javascript");
      response.end("self.CP_SHELL=" + JSON.stringify(current.manifest) + ";");
      return;
    }
    if (current.bodies.has(path)) {
      requests.push(path);
      if (rejectAssets) {
        response.writeHead(503, { "Content-Type": "text/plain" });
        response.end("Synthetic unavailable transport");
        return;
      }
      const extension = path.split(".").at(-1);
      response.setHeader("Content-Type", {
        html: "text/html", css: "text/css", js: "application/javascript",
        mjs: "application/javascript", png: "image/png",
        webmanifest: "application/manifest+json",
      }[extension] || "application/octet-stream");
      response.end(current.bodies.get(path));
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    old, next, requests,
    publishUpdate() { current = next; },
    rejectPublicAssets() { rejectAssets = true; requests.length = 0; },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(
        (error) => error ? reject(error) : resolve(),
      ));
    },
  };
}

async function savedPack(page) {
  return page.evaluate(async () => {
    const { openOwnedDatabase } = await import("/platform/offline/database.mjs");
    const db = await openOwnedDatabase("sample-u8");
    try {
      return {
        packs: (await db.all("packs")).map((row) => ({
          key: row.key, phase: row.data.phase,
        })),
        documents: await db.all("documents"),
        files: await Promise.all((await db.all("files")).map(async (row) => ({
          key: row.key,
          bytes: Array.from(new Uint8Array(await row.data.arrayBuffer())),
        }))),
      };
    } finally { db.close(); }
  });
}

test("an automatically activated incomplete Excel shell cold-reopens the previous complete revision without network", async ({
  page, context,
}) => {
  test.setTimeout(90000);
  const site = await updatingSite();
  let current = page, monitor;
  try {
    const launch = site.origin + "/platform/learn/offline-preview.html";
    await page.goto(launch);
    await expect(page.getByRole("heading", { name: "Excel Study", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Study offline / Resume download", exact: true }).click();
    await expect(page.getByText(/Ready offline ·/)).toBeVisible({ timeout: 30000 });
    await page.getByLabel("Formula for B5", { exact: true }).fill("=SUM(B2:B4)");
    await page.getByRole("button", { name: "Apply formula", exact: true }).click();
    await page.getByRole("button", { name: "Bookmark", exact: true }).click();
    await page.getByLabel("Your notes", { exact: true }).fill("R1 saved trading inventory note");
    await expect(page.locator(".learn-save-status")).toContainText("Saved on this device");
    await expect(page.getByText("No changes waiting to sync.", { exact: true })).toBeVisible();
    const before = await savedPack(page);
    expect(before.packs).toHaveLength(1);
    expect(before.packs[0].phase).toBe("ready");

    // The deployed pre-R1 cache used this marker with no saved manifest. Keep
    // its complete bytes and cache name to exercise the compatible upgrade path.
    await page.evaluate(async (version) => {
      const cache = await caches.open("cp-u8-shell-" + version);
      await cache.put(new URL(".shell-ready", location.href), new Response("ready"));
    }, site.old.version);

    monitor = await context.newPage();
    await monitor.goto(site.origin + "/r1-control.html");
    site.publishUpdate();
    await monitor.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/platform/learn/");
      await registration.update();
    });
    await expect.poll(() => monitor.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/platform/learn/");
      window.r1Waiting = registration.waiting;
      return window.r1Waiting?.state;
    }), { timeout: 15000 }).toBe("installed");
    // No SAVE_SHELL or skipWaiting: closing the last controlled tab is enough
    // for the browser to activate the new worker, whose own shell is incomplete.
    await page.close();
    await expect.poll(() => monitor.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/platform/learn/");
      return registration.active === window.r1Waiting &&
        registration.active.state === "activated" && !registration.waiting;
    }), { timeout: 15000 }).toBe(true);
    expect(await monitor.evaluate(async (version) => {
      const cache = await caches.open("cp-u8-shell-" + version);
      return !!(await cache.match(new URL("/platform/learn/.shell-ready", location.href)));
    }, site.next.version)).toBe(false);

    // navigator.onLine stays true, but the server rejects every shell asset.
    // A successful launch with zero requests proves the cached pack is first.
    site.rejectPublicAssets();
    current = await context.newPage();
    await current.goto(launch);
    await expect(current.locator("html")).toHaveAttribute("data-r1-shell", "old");
    await expect(current.getByRole("heading", { name: "Excel Study", exact: true })).toBeVisible();
    await expect(current.getByLabel("Your notes", { exact: true })).toHaveValue("R1 saved trading inventory note");
    await expect(current.getByLabel("B5 total", { exact: true })).toHaveText("25");
    await expect(current.getByRole("button", { name: "Bookmarked", exact: true })).toBeVisible();
    expect(site.requests).toEqual([]);
    expect(await savedPack(current)).toEqual(before);

    // Start the true-offline cold launch with no learner tab alive. Closing the
    // monitor first can focus the learner and begin permission renewal; taking
    // that tab offline or closing it mid-renewal deliberately blocks its pack.
    // The snapshot above includes its ready phase as well as all saved bytes.
    await current.close();
    await monitor.close();
    await context.setOffline(true);
    current = await context.newPage();
    await current.goto(launch);
    await expect(current.locator("html")).toHaveAttribute("data-r1-shell", "old");
    await current.getByRole("button", { name: "Resume saved study", exact: true }).click();
    await expect(current.getByLabel("Your notes", { exact: true })).toHaveValue("R1 saved trading inventory note");
    await expect(current.getByLabel("B5 total", { exact: true })).toHaveText("25");
    await expect(current.getByRole("button", { name: "Bookmarked", exact: true })).toBeVisible();
    expect(await savedPack(current)).toEqual(before);
    expect(await current.evaluate(() => fetch("/r1-uncached-probe").then(
      () => "unexpected network", () => "offline",
    ))).toBe("offline");
    expect(site.requests).toEqual([]);
  } finally {
    await current.close().catch(() => {});
    await monitor?.close().catch(() => {});
    await site.close();
  }
});
