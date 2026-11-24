import { test, expect } from "@playwright/test";

async function mount(page) {
  await page.evaluate(async () => {
    const { createOfflineSample } = await import(
      "/platform/learn/offline-sample.mjs"
    );
    const { createAccountStore } = await import(
      "/platform/lib/account-store.mjs"
    );
    const { mountOfflineLearning } = await import("/platform/offline/host.mjs");
    const f = await createOfflineSample("acceptance-u9");
    window.u9 = f;
    f.host = await mountOfflineLearning(document.querySelector("#app"), {
      ...f,
      store: createAccountStore(localStorage, f.namespace),
      loadClient: async () => f.client,
      installShell: async () => {},
    });
  });
  await expect(page.getByLabel("Your notes", { exact: true })).toBeVisible();
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
test("U9 failed online verification blocks cached fallback, retains work, and recovers without clearing storage", async ({
  page,
  context,
}) => {
  await page.goto("/platform/learn/index.html");
  await mount(page);
  await pack(page);
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Retained through a failed connection");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  await page.evaluate(() => {
    u9.state.hooks.verify = () => {
      throw Error("Synthetic transport failure");
    };
  });
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(
    page.getByRole("button", { name: "Resume saved study", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(async () => (await u9.db.all("packs"))[0].data.phase),
  ).toBe("blocked");
  expect(
    await page.evaluate(
      async () =>
        (await u9.db.all("study")).find((r) => r.data.identity.kind === "note")
          .data.value.text,
    ),
  ).toBe("Retained through a failed connection");
  await context.setOffline(true);
  await expect(page.locator("[data-private]")).toBeEmpty();
  await page.evaluate(() => {
    delete u9.state.hooks.verify;
  });
  await context.setOffline(false);
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Retained through a failed connection",
  );
  expect(
    await page.evaluate(async () => (await u9.db.all("packs"))[0].data.phase),
  ).toBe("ready");
});
test("U9 disabling the host preserves queued study and re-enabling reconciles it for the same owner", async ({
  page,
}) => {
  await page.goto("/platform/learn/index.html");
  await mount(page);
  await pack(page);
  await page.evaluate(() => {
    localStorage.setItem("cp_py_read", "legacy study kept");
    u9.state.hooks.cp_sync_write = () => {
      throw Error("Synthetic upload interruption");
    };
  });
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Keep this pending recovery note");
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  await expect(page.getByText(/change\(s\) waiting to sync/)).toBeVisible();
  const snapshot = await page.evaluate(
    async () =>
      (await u9.db.all("study")).find((r) => r.data.identity.kind === "note")
        .data,
  );
  // The real entry is still deployment=null. Reloading removes the test host;
  // no migration, storage clear, or artificial reassignment is performed.
  await page.reload();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveCount(0);
  const kept = await page.evaluate(async () => {
    const { openOwnedDatabase } = await import(
      "/platform/offline/database.mjs"
    );
    const db = await openOwnedDatabase("acceptance-u9");
    try {
      return (await db.all("study")).find(
        (r) => r.data.identity.kind === "note",
      ).data;
    } finally {
      db.close();
    }
  });
  expect(kept.value).toEqual(snapshot.value);
  expect(kept.pending).toEqual(snapshot.pending);
  expect(kept.owner).toBe(snapshot.owner);
  await mount(page);
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Keep this pending recovery note",
  );
  await expect(
    page.getByText("No changes waiting to sync.", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("cp_py_read"))).toBe(
    "legacy study kept",
  );
});
