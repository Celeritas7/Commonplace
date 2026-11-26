import { test, expect } from "@playwright/test";

test("R3 personal controls use the shared versioned curriculum loaded as classic scripts and modules", async ({ page }) => {
  await page.route("**/*", (route) => route.request().url().startsWith("http://127.0.0.1:4173/")
    ? route.continue() : route.abort());
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/Office_work/Excel_study/Section_2_Study.html");
  await page.getByLabel("Professional example").selectOption("jp-ph-trade");
  await page.getByLabel("Formula skill").selectOption("count");
  await page.getByRole("button", { name: "Start independent task", exact: true }).click();
  await page.getByLabel("Formula for B5", { exact: true }).fill("=count( $B2 : B$4 )");
  await page.getByRole("button", { name: "Submit task", exact: true }).click();
  await expect(page.getByLabel("B5 result", { exact: true })).toHaveText("2");
  await expect(page.getByText("Task score: 3 / 3", { exact: true })).toBeVisible();
  const shared = await page.evaluate(async () => {
    const classic = window.CommonplaceExcelCurriculum;
    const before = classic.resolveLesson({ id: "count", version: 1 });
    const { curriculum } = await import("/Office_work/Excel_study/curriculum.mjs");
    let rejected = false;
    try { curriculum.resolveLesson({ id: "count", version: 2 }); } catch { rejected = true; }
    return { before, after: curriculum.resolveLesson({ id: "count", version: 1 }), rejected,
      result: curriculum.evaluateFormula({ id: "personal-formulas", version: 1 }, "=COUNT(B2:B4)", ["6", "", "9"]).result };
  });
  expect(shared.before).toEqual(shared.after);
  expect(shared.before.runtime).toEqual({ id: "personal-formulas", version: 1 });
  expect(shared.before.rubric).toEqual({ id: "formula-foundations", version: 1 });
  expect(shared.result).toBe(2);
  expect(shared.rejected).toBe(true);
  expect(errors).toEqual([]);
});

async function savedWork(page) {
  return page.evaluate(async () => {
    const { openOwnedDatabase } = await import("/platform/offline/database.mjs");
    const db = await openOwnedDatabase("sample-u8");
    try {
      return {
        packs: (await db.all("packs")).map((row) => row.key),
        documents: await db.all("documents"),
        files: await Promise.all((await db.all("files")).map(async (row) => ({ key: row.key,
          bytes: Array.from(new Uint8Array(await row.data.arrayBuffer())) }))),
        records: (await db.all("study")).map((row) => ({ key: row.key, identity: row.data.identity, value: row.data.value })),
      };
    } finally { db.close(); }
  });
}

test("R3 central shared curriculum cold-reopens offline without changing material bytes or saved work", async ({ page, context }) => {
  test.setTimeout(60000);
  await page.goto("/platform/learn/offline-preview.html");
  await expect(page.getByRole("heading", { name: "Excel Study", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Study offline / Resume download", exact: true }).click();
  await expect(page.getByText(/Ready offline ·/)).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Start guided SUM (reset worksheet)", exact: true }).click();
  await page.getByLabel("Formula for B5", { exact: true }).fill("=sum( $B2 : B$4 )");
  await page.getByRole("button", { name: "Apply formula", exact: true }).click();
  await expect(page.getByText(/Guided steps: .*Submission complete/)).toBeVisible();
  await expect(page.getByText("Guided: 1 passed / 1 submitted · Independent: 0 passed / 0 submitted", { exact: true })).toBeVisible();
  await page.getByLabel("Your notes", { exact: true }).fill("Keep the Manila shipment workbook history");
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(page.locator(".learn-save-status")).toContainText("Saved on this device");
  await expect.poll(async () => {
    const { records } = await savedWork(page);
    return {
      note: records.find((row) => row.identity.kind === "note")?.value.text,
      bookmark: records.find((row) => row.identity.kind === "bookmark")?.value.bookmarked,
      attempts: records.find((row) => row.identity.kind === "progress")?.value.worksheet?.attempts?.length,
    };
  }).toEqual({ note: "Keep the Manila shipment workbook history", bookmark: true, attempts: 1 });
  const before = await savedWork(page);
  expect(before.documents).toHaveLength(3);
  expect(before.files).toHaveLength(1);
  await context.setOffline(true);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/platform/learn/offline-preview.html");
  await reopened.getByRole("button", { name: "Resume saved study", exact: true }).click();
  await expect(reopened.getByLabel("B5 total", { exact: true })).toHaveText("25");
  await expect(reopened.getByText(/Guided steps: .*Submission complete/)).toBeVisible();
  await expect(reopened.getByText("Guided: 1 passed / 1 submitted · Independent: 0 passed / 0 submitted", { exact: true })).toBeVisible();
  await expect(reopened.getByLabel("Your notes", { exact: true })).toHaveValue("Keep the Manila shipment workbook history");
  await expect(reopened.getByRole("button", { name: "Bookmarked", exact: true })).toBeVisible();
  const runtime = await reopened.evaluate(async () => {
    const { curriculum } = await import("/Office_work/Excel_study/curriculum.mjs");
    const ref = { id: "assigned-sum", version: 1 };
    let unsupported = false;
    try { curriculum.evaluateFormula(ref, "=COUNT(B2:B4)", ["12", "8", "5"]); } catch { unsupported = true; }
    return { version: curriculum.resolveRuntime(ref).version,
      total: curriculum.evaluateFormula(ref, "=SUM(B2:B4)", ["12", "8", "5"]).result, unsupported };
  });
  expect(runtime).toEqual({ version: 1, total: 25, unsupported: true });
  expect(await savedWork(reopened)).toEqual(before);
  expect(await reopened.evaluate(() => fetch("/r3-uncached-probe").then(() => false, () => true))).toBe(true);
});
