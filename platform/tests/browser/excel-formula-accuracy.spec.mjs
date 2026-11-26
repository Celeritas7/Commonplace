import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("R2 personal formula lessons reject token splits and give independent partial credit", async ({ page }) => {
  await page.route("**/*", (route) => route.request().url().startsWith("http://127.0.0.1:4173/")
    ? route.continue() : route.abort());
  await page.goto("/Office_work/Excel_study/Section_2_Study.html");
  const reading = JSON.stringify({ read: ["cells"], open: [], tasks: ["calculate"] });
  await page.evaluate((saved) => localStorage.setItem("commonplace_excel_preview_v1", saved), reading);
  await page.getByLabel("Professional example").selectOption("jp-ph-trade");
  await page.getByLabel("Formula skill").selectOption("count");
  await page.getByRole("button", { name: "Start independent task", exact: true }).click();
  const formula = page.getByLabel("Formula for B5", { exact: true });
  const submit = page.getByRole("button", { name: "Submit task", exact: true });
  for (const malformed of ["=C O U N T(B2:B4)", "=COUNT(B 2:B4)"]) {
    await formula.fill(malformed);
    await submit.click();
    await expect(page.getByLabel("B5 result", { exact: true })).toHaveText("—");
    await expect(page.getByText("Task score: 1 / 3", { exact: true })).toBeVisible();
    await expect(page.locator("#f1-result")).toContainText("Correct: Original exercise inputs preserved");
  }
  await formula.fill("=SUM(B2:B4)");
  await submit.click();
  await expect(page.getByText("Task score: 2 / 3", { exact: true })).toBeVisible();
  await expect(page.locator("#f1-progress")).toContainText("0 / 5 independent formula skills passed");
  await formula.fill(" =count( $B$4 : b$2 ) ");
  await submit.click();
  await expect(page.getByLabel("B5 result", { exact: true })).toHaveText("2");
  await expect(page.getByText("Task score: 3 / 3", { exact: true })).toBeVisible();
  await expect(page.locator("#f1-progress")).toContainText("1 / 5 independent formula skills passed");
  expect(await page.evaluate(() => localStorage.getItem("commonplace_excel_preview_v1"))).toBe(reading);
});

test("R2 Section 1 calculations and independent assessment use the same corrected formula syntax", async ({ page }) => {
  await page.route("**/*", (route) => route.request().url().startsWith("http://127.0.0.1:4173/")
    ? route.continue() : route.abort());
  await page.goto("/Office_work/Excel_study/Section_1_Study.html");
  await page.locator("#scenario-picker").selectOption("jp-ph-trade");
  // Applying a scenario is explicit; merely changing the picker leaves the
  // currently applied worksheet intact until the learner confirms that choice.
  await page.locator("#scenario-apply").click();
  await page.getByRole("button", { name: "Start assessment", exact: true }).click();
  await page.locator("#b3").fill("7");
  await page.locator('[data-cell="B5"]').click();
  const formula = page.getByLabel("Formula for B5", { exact: true });
  await formula.fill("=S U M(B 2:B4)");
  await page.getByRole("button", { name: "Apply formula", exact: true }).click();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("—");
  await page.getByRole("button", { name: "Submit worksheet", exact: true }).click();
  await expect(page.locator("[data-assessment-results]")).toContainText("Score: 2 / 4");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.locator("#b3").fill("7");
  await page.locator('[data-cell="B5"]').click();
  await formula.fill("=sum( $B$4 : B2 )");
  await page.getByRole("button", { name: "Apply formula", exact: true }).click();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("22");
  await page.getByRole("button", { name: "Submit worksheet", exact: true }).click();
  await expect(page.locator("[data-assessment-results]")).toContainText("Score: 4 / 4");
  await expect(page.locator("[data-assessment-history]")).toContainText("2 submitted attempts");
});

async function progressRow(page) {
  return page.evaluate(async () => {
    const { openOwnedDatabase } = await import("/platform/offline/database.mjs");
    const db = await openOwnedDatabase("sample-u8");
    try {
      return (await db.all("study")).find((row) => row.data.identity.kind === "progress" && row.data.value.worksheet);
    } finally { db.close(); }
  });
}

test("R2 legacy formula history stays readable with new rejected/accepted attempts through offline reopen and backup", async ({ page, context }) => {
  test.setTimeout(60000);
  await page.goto("/platform/learn/offline-preview.html");
  await expect(page.getByRole("heading", { name: "Excel Study", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Study offline / Resume download", exact: true }).click();
  await expect(page.getByText(/Ready offline ·/)).toBeVisible({ timeout: 30000 });
  await page.getByLabel("Your notes", { exact: true }).fill("Keep the Manila shipment note");
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(page.locator(".learn-save-status")).toContainText("Saved on this device");
  await context.setOffline(true);
  const legacy = {
    id: "90000000-0000-4000-8000-000000000001",
    submitted_at: "2026-11-26T14:00:00.000Z", values: ["12", "8", "5"],
    formula: "=S U M(B 2:B4)", accepted: true, result: 25,
  };
  await page.evaluate(async (attempt) => {
    const { openOwnedDatabase } = await import("/platform/offline/database.mjs");
    const db = await openOwnedDatabase("sample-u8");
    try {
      const row = (await db.all("study")).find((row) => row.data.identity.kind === "progress" && row.data.value.worksheet);
      await db.update("study", row.key, (saved) => {
        saved.value.completed = true;
        saved.value.worksheet = { values: [...attempt.values], formula: attempt.formula, applied: true, attempts: [attempt] };
        saved.local_version++;
        saved.dirty = true;
        return saved;
      });
    } finally { db.close(); }
  }, legacy);
  await page.reload();
  await page.getByRole("button", { name: "Resume saved study", exact: true }).click();
  await expect(page.getByText("Calculation history (1/40)", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Formula for B5", { exact: true })).toHaveValue(legacy.formula);
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("—");
  await expect(page.getByText(/Review the saved formula with the current checks\. Earlier submissions are kept\./)).toBeVisible();
  await expect(page.getByText("Scores below use the current formula and input checks. Earlier recorded outcomes remain unchanged in Calculation history.", { exact: true })).toBeVisible();
  await page.getByText("Calculation history (1/40)", { exact: true }).click();
  await expect(page.getByText(/Earlier recorded outcome: Result: 25 · Current check: Formula or values need correction/)).toBeVisible();
  expect((await progressRow(page)).data.value.worksheet.attempts).toEqual([legacy]);
  await page.getByRole("button", { name: "Apply formula", exact: true }).click();
  await expect(page.locator(".learn-save-status")).toContainText("Saved on this device");
  await page.getByLabel("Formula for B5", { exact: true }).fill("=sum($B$2:$B$4)");
  await page.getByRole("button", { name: "Apply formula", exact: true }).click();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("25");
  await expect(page.locator(".learn-save-status")).toContainText("Saved on this device");
  const before = (await progressRow(page)).data.value.worksheet.attempts;
  expect(before).toHaveLength(3);
  expect(before[0]).toEqual(legacy);
  expect(before.map((entry) => entry.accepted)).toEqual([true, false, true]);
  expect(before.slice(1).map((entry) => entry.evaluation_version)).toEqual([2, 2]);
  await page.reload();
  await page.getByRole("button", { name: "Resume saved study", exact: true }).click();
  await expect(page.getByText("Calculation history (3/40)", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue("Keep the Manila shipment note");
  await expect(page.getByRole("button", { name: "Bookmarked", exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("No changes waiting to sync.", { exact: true })).toBeVisible();
  expect((await progressRow(page)).data.value.worksheet.attempts).toEqual(before);
  if (!(await page.getByRole("button", { name: "Export study backup", exact: true }).isVisible()))
    await page.getByText("Sync, backups and access", { exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export study backup", exact: true }).click();
  const file = await downloading;
  const backup = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(backup.records.find((row) => row.identity.kind === "progress" && row.value.worksheet).value.worksheet.attempts).toEqual(before);
});
