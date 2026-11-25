import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("offline sample saves a pack, cold-reopens without network, restores work and synchronizes on reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/platform/learn/offline-preview.html");
  await expect(
    page.getByRole("heading", { name: "Excel Study", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Study offline / Resume download",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Ready offline ·/)).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Inventory note before leaving");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Resume saved study", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Excel Study", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Inventory note before leaving",
  );
  await page.getByLabel("Formula for B5", { exact: true }).fill("=SUM(B2:B4)");
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Inventory note written offline");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  await expect(page.getByText(/waiting to sync/)).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Resume saved study", exact: true })
    .click();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("25");
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Inventory note written offline",
  );
  await context.setOffline(false);
  await expect(
    page.getByText("No changes waiting to sync.", { exact: true }),
  ).toBeVisible();
  const caches = await page.evaluate(async () => {
    const all = [];
    for (const name of await window.caches.keys())
      for (const r of await (await window.caches.open(name)).keys())
        all.push(r.url);
    return all;
  });
  expect(
    caches.some(
      (u) =>
        u.includes("/rest/") ||
        u.includes("/functions/") ||
        u.includes("cp-materials"),
    ),
  ).toBe(false);
});
async function fixture(page, user = null) {
  await page.goto("/platform/learn/index.html");
  await page.evaluate(async (user) => {
    const { createOfflineSample } = await import(
        "/platform/learn/offline-sample.mjs"
      ),
      { createAccountStore } = await import("/platform/lib/account-store.mjs"),
      { mountOfflineLearning } = await import("/platform/offline/host.mjs");
    const f = await createOfflineSample("browser-u8");
    if (user) f.state.userId = user;
    f.store = createAccountStore(localStorage, f.namespace);
    window.u8 = f;
    f.host = await mountOfflineLearning(document.querySelector("#app"), {
      ...f,
      store: f.store,
      loadClient: async () => f.client,
      installShell: async () => {},
    });
  }, user);
  await expect(
    page.getByRole("heading", { name: "Excel Study", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Your notes", { exact: true })).toBeVisible();
  await page.getByText("Sync, backups and access", { exact: true }).click();
}
async function pack(page) {
  await page
    .getByRole("button", {
      name: "Study offline / Resume download",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Ready offline ·/)).toBeVisible();
}
test("switching accounts in another tab clears the old private view and never offers the previous owner pack", async ({
  page,
  context,
}) => {
  await fixture(page);
  await pack(page);
  await page.getByLabel("Your notes", { exact: true }).fill("A private note");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  const other = await context.newPage();
  await fixture(other, "10000000-0000-4000-8000-000000000003");
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(other.getByLabel("Your notes", { exact: true })).toHaveValue("");
  await context.setOffline(true);
  await other
    .getByRole("button", { name: "Resume saved study", exact: true })
    .click();
  await expect(other.locator("[data-private]")).toBeEmpty();
  await other.evaluate(() => u8.state.emit("SIGNED_OUT"));
  await expect(
    page.getByRole("button", { name: "Resume saved study", exact: true }),
  ).toBeDisabled();
  const old = await other.evaluate(async () =>
    (await u8.db.all("study"))
      .filter(
        (x) =>
          x.data.owner === "10000000-0000-4000-8000-000000000002" &&
          x.data.identity.kind === "note",
      )
      .map((x) => x.data.value.text),
  );
  expect(old).toContain("A private note");
});
test("offline/cloud conflicts are visible and both versions survive an explicit resolution and backup", async ({
  page,
  context,
}) => {
  await fixture(page);
  await pack(page);
  await page.getByLabel("Your notes", { exact: true }).fill("First note");
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await u8.db.all("sample")).some(
          (r) =>
            r.key.includes('"note"') && r.data.value?.text === "First note",
        ),
      ),
    )
    .toBe(true);
  await expect(
    page.getByText("No changes waiting to sync.", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByLabel("Your notes", { exact: true })).toBeVisible();
  await page.getByLabel("Your notes", { exact: true }).fill("Work at the cafe");
  await expect(page.getByText(/waiting to sync when/)).toBeVisible();
  await page.evaluate(async () => {
    const row = (await u8.db.all("sample")).find((r) =>
      r.key.includes('"note"'),
    );
    await u8.db.put("sample", row.key, {
      revision: String(BigInt(row.data.revision) + 1n),
      value: { version: 1, text: "Work on another device" },
    });
  });
  await context.setOffline(false);
  await expect(page.getByText(/saved conflict\(s\) need review/)).toBeVisible();
  await page.getByText(/· note conflict/).click();
  await expect(page.locator(".learn-conflict")).toHaveCount(2);
  await expect(page.locator(".learn-conflict").nth(0)).toContainText(
    "Work at the cafe",
  );
  await expect(page.locator(".learn-conflict").nth(1)).toContainText(
    "Work on another device",
  );
  await page
    .locator(".learn-conflict")
    .first()
    .getByRole("button", { name: "Keep this version" })
    .click();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Work at the cafe",
  );
  await expect(
    page.getByText("No changes waiting to sync.", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export study backup" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Commonplace-study-backup.json");
  expect(
    await page.evaluate(
      async () =>
        (await u8.db.all("study")).find((r) => r.data.identity.kind === "note")
          .data.history.length,
    ),
  ).toBeGreaterThan(0);
});
test("revocation blocks saved packs on reconnect while keeping queued notes and old keys", async ({
  page,
  context,
}) => {
  await fixture(page);
  await page.evaluate(() =>
    localStorage.setItem("commonplace_excel_preview_v1", "old personal work"),
  );
  await pack(page);
  await context.setOffline(true);
  await expect(page.getByLabel("Your notes", { exact: true })).toBeVisible();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Keep this pending note");
  await expect(page.getByText(/waiting to sync when/)).toBeVisible();
  await page.evaluate(() => (u8.state.status = "revoked"));
  await context.setOffline(false);
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(
    page.getByRole("button", { name: "Resume saved study", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(async () => (await u8.db.all("packs"))[0].data.phase),
  ).toBe("blocked");
  expect(
    await page.evaluate(
      async () =>
        (await u8.db.all("study")).find((r) => r.data.identity.kind === "note")
          .data.value.text,
    ),
  ).toBe("Keep this pending note");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("commonplace_excel_preview_v1"),
    ),
  ).toBe("old personal work");
});
test("expired saved permission fails closed without clearing saved materials or work", async ({
  page,
  context,
}) => {
  await page.clock.install();
  await fixture(page);
  await pack(page);
  await context.setOffline(true);
  await expect(page.getByLabel("Your notes", { exact: true })).toBeVisible();
  const future = await page.evaluate(() => Date.now() + 8 * 86400000);
  await page.clock.setSystemTime(future);
  await page
    .getByRole("button", { name: "Resume saved study", exact: true })
    .click();
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(page.getByText(/Offline permission expired/)).toBeVisible();
  expect(
    await page.evaluate(async () => (await u8.db.all("documents")).length),
  ).toBe(3);
});
test("interrupted tutorial download resumes saved lessons without re-downloading completed bytes", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(
    () =>
      (u8.state.hooks.download = () => {
        throw Error("Connection interrupted");
      }),
  );
  await page
    .getByRole("button", {
      name: "Study offline / Resume download",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Connection interrupted", { exact: true }),
  ).toBeVisible();
  const reads = await page.evaluate(
    () => u8.state.calls.filter((n) => n === "cp_read_material").length,
  );
  await page.evaluate(() => delete u8.state.hooks.download);
  await pack(page);
  expect(
    (await page.evaluate(
      () => u8.state.calls.filter((n) => n === "cp_read_material").length,
    )) - reads,
  ).toBeLessThanOrEqual(1);
  const files = await page.evaluate(
    () => u8.state.calls.filter((n) => n === "material-files").length,
  );
  await page
    .getByRole("button", { name: "Refresh online access", exact: true })
    .click();
  await expect(page.getByLabel("Your notes", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => u8.state.calls.filter((n) => n === "material-files").length,
    ),
  ).toBe(files);
});
test("backup restore keeps newer notes, is repeatable, and rejects another owner without writing", async ({
  page,
}) => {
  await fixture(page);
  await page.getByLabel("Your notes", { exact: true }).fill("Backup note");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  const backup = await page.evaluate(() =>
    u8.host.sync.backup({ userId: u8.state.userId, ticket: u8.store.ticket() }),
  );
  await page.getByLabel("Your notes", { exact: true }).fill("Newer note");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  const input = page.locator("input[type=file]");
  await input.setInputFiles({
    name: "study.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(page.getByText(/Restored 3 study record/)).toBeVisible();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Newer note",
  );
  await input.setInputFiles({
    name: "study.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(page.getByText(/Restored 0 study record/)).toBeVisible();
  const bad = JSON.parse(backup);
  bad.owner = "10000000-0000-4000-8000-000000000003";
  await input.setInputFiles({
    name: "wrong-owner.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bad)),
  });
  await expect(
    page.getByText(/Backup belongs to another account/),
  ).toBeVisible();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Newer note",
  );
});
test("the downloaded 1,002-record backup above 8 MiB imports through the picker and preserves saved packs", async ({
  page,
}) => {
  test.setTimeout(60000);
  await fixture(page);
  await pack(page);
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Note before backup");
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await page.getByLabel("Formula for B5", { exact: true }).fill("=SUM(B2:B4)");
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await expect(
    page.getByText("No changes waiting to sync.", { exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(async () => {
    const { ownedKey } = await import("/platform/offline/database.mjs");
    const { initialAttempt, studyIdentity } = await import(
      "/platform/learn/progress.mjs"
    );
    const existing = await u8.db.owned("study", u8.state.userId);
    const note = existing.find((r) => r.data.identity.kind === "note");
    await u8.db.update("study", note.key, (r) => {
      r.history = Array.from({ length: 1001 }, (_, i) => ({
        value: { version: 1, text: i + ":" + "界".repeat(3995) },
        conflicts: [],
      }));
      return r;
    });
    const template = u8.state.items.get(u8.state.ids.quiz);
    u8.backupExtraKeys = [];
    for (let i = 1; i <= 333; i++) {
      const m = {
        ...structuredClone(template),
        id: "40000000-0000-4000-8000-" + String(i).padStart(12, "0"),
      };
      u8.state.items.set(m.id, m);
      u8.state.allowed.add(m.id);
      for (const kind of ["progress", "note", "bookmark"]) {
        const identity = {
          section: "office.excel",
          kind,
          id: await studyIdentity(m, null),
        };
        const value =
          kind === "note"
            ? { version: 1, text: "Synthetic saved note " + i }
            : kind === "bookmark"
              ? { version: 1, bookmarked: true }
              : { ...initialAttempt(m), completed: true, responses: [0] };
        const key = ownedKey(
          u8.state.userId,
          identity.section,
          kind,
          identity.id,
        );
        await u8.db.put("study", key, {
          owner: u8.state.userId,
          identity,
          material: m.id,
          value,
          local_version: 1,
          base_revision: "0",
          base_value: null,
          dirty: true,
          pending: null,
          conflicts: [],
          history: [],
        });
        u8.backupExtraKeys.push(key);
      }
    }
    return {
      files: await Promise.all(
        (await u8.db.all("files")).map(async (r) => ({
          key: r.key,
          bytes: Array.from(new Uint8Array(await r.data.arrayBuffer())),
        })),
      ),
      documents: await u8.db.all("documents"),
      packKeys: (await u8.db.all("packs")).map((r) => r.key),
      downloads: u8.state.calls.filter((n) => n === "material-files").length,
    };
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export study backup" }).click();
  const file = await download,
    bytes = await readFile(await file.path());
  expect(file.suggestedFilename()).toBe("Commonplace-study-backup.json");
  expect(bytes.length).toBeGreaterThan(8 * 1024 * 1024);
  const backup = JSON.parse(bytes.toString("utf8"));
  expect(backup.version).toBe(1);
  expect(backup.records).toHaveLength(1002);
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Newer note on this device");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  // Remove only synthetic extra study rows; retain packs and current lesson work.
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("commonplace-u8:" + u8.namespace);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            tx = db.transaction("study", "readwrite");
          for (const key of u8.backupExtraKeys)
            tx.objectStore("study").delete(key);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
  const input = page.locator("input[type=file]");
  await input.setInputFiles({
    name: file.suggestedFilename(),
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(page.getByText(/Restored 1002 study record/)).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Newer note on this device",
  );
  await expect(
    page.getByRole("button", { name: "Bookmarked", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("25");
  const after = await page.evaluate(async () => {
    const rows = await u8.db.owned("study", u8.state.userId);
    const note = rows.find(
      (r) =>
        r.data.identity.kind === "note" && !u8.backupExtraKeys.includes(r.key),
    ).data;
    return {
      rows: rows.map((r) => ({
        identity: r.data.identity,
        value: r.data.value,
      })),
      keptConflict: note.conflicts.some(
        (c) => c.source === "backup" && c.value.text === "Note before backup",
      ),
      keptHistory: note.history.some(
        (h) => h.value.text === "1000:" + "界".repeat(3995),
      ),
      files: await Promise.all(
        (await u8.db.all("files")).map(async (r) => ({
          key: r.key,
          bytes: Array.from(new Uint8Array(await r.data.arrayBuffer())),
        })),
      ),
      documents: await u8.db.all("documents"),
      packKeys: (await u8.db.all("packs")).map((r) => r.key),
      downloads: u8.state.calls.filter((n) => n === "material-files").length,
    };
  });
  expect(after.rows).toHaveLength(1002);
  const recovered = new Map(
    after.rows.map((r) => [JSON.stringify(r.identity), r.value]),
  );
  for (const row of backup.records.filter((r) =>
    r.material.startsWith("40000000-"),
  ))
    expect(recovered.get(JSON.stringify(row.identity))).toEqual(row.value);
  expect(after.keptConflict).toBe(true);
  expect(after.keptHistory).toBe(true);
  for (const key of ["files", "documents", "packKeys", "downloads"])
    expect(after[key]).toEqual(before[key]);
  await input.setInputFiles({
    name: file.suggestedFilename(),
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(page.getByText(/Restored 0 study record/)).toBeVisible({
    timeout: 20000,
  });
});

test("the file picker rejects oversized backups before reading or changing saved study", async ({
  page,
}) => {
  await fixture(page);
  const before = await page.evaluate(async () => {
    u8.backupReads = 0;
    const original = File.prototype.text;
    File.prototype.text = function () {
      u8.backupReads++;
      return original.call(this);
    };
    return (await u8.db.all("study")).map((r) => ({
      key: r.key,
      value: r.data.value,
    }));
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "too-large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(32 * 1024 * 1024 + 1, 32),
  });
  await expect(page.getByText(/Study backup exceeds 32 MiB/)).toBeVisible();
  expect(await page.evaluate(() => u8.backupReads)).toBe(0);
  expect(
    await page.evaluate(async () =>
      (await u8.db.all("study")).map((r) => ({
        key: r.key,
        value: r.data.value,
      })),
    ),
  ).toEqual(before);
});

test("saved status waits for queued worksheet and note writes to become durable", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    const update = u8.db.update.bind(u8.db);
    let delayed = false;
    u8.db.update = async (name, key, fn) => {
      if (name === "study" && JSON.parse(key)[2] === "progress" && !delayed) {
        delayed = true;
        await new Promise((resolve) => {
          u8.releaseProgress = resolve;
        });
      }
      return update(name, key, fn);
    };
  });
  await page.getByLabel("Formula for B5", { exact: true }).fill("=SUM(B2:B4)");
  await expect.poll(() => page.evaluate(() => !!u8.releaseProgress)).toBe(true);
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await page.getByLabel("Your notes", { exact: true }).fill("Note saved first");
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await u8.db.all("study")).some(
          (r) => r.data.value.text === "Note saved first",
        ),
      ),
    )
    .toBe(true);
  await expect(page.locator(".learn-save-status")).toHaveText(
    "Saving on this device…",
  );
  await page.evaluate(() => u8.releaseProgress());
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  expect(
    await page.evaluate(
      async () =>
        (await u8.db.all("study")).find(
          (r) => r.data.identity.kind === "progress",
        ).data.value.worksheet.applied,
    ),
  ).toBe(true);
});
test("storage failure reports unsaved changes and preserves the last durable note", async ({
  page,
}) => {
  await fixture(page);
  await page.getByLabel("Your notes", { exact: true }).fill("Saved note");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  await page.evaluate(() => {
    const update = u8.db.update.bind(u8.db);
    u8.db.update = (name, key, fn) => {
      if (name === "study" && JSON.parse(key)[2] === "note")
        throw Error("Device storage is full. Copy this note before closing.");
      return update(name, key, fn);
    };
  });
  await page.getByLabel("Your notes", { exact: true }).fill("Unsaved new note");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Device storage is full",
  );
  expect(
    await page.evaluate(
      async () =>
        (await u8.db.all("study")).find((r) => r.data.identity.kind === "note")
          .data.value.text,
    ),
  ).toBe("Saved note");
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Unsaved new note",
  );
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await u8.db.all("study")).some(
          (r) => r.data.value.bookmarked === true,
        ),
      ),
    )
    .toBe(true);
  await expect(page.locator(".learn-save-status")).toContainText(
    "Device storage is full",
  );
});
