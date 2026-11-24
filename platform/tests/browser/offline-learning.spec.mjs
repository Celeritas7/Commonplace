import { test, expect } from "@playwright/test";
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
