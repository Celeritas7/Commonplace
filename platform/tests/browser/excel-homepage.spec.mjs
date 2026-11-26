import { test, expect } from "@playwright/test";

test("Excel homepage separates existing learning, practice, workbooks and planned content", async ({ page }) => {
  await page.route("**/*", route => route.request().url().startsWith("http://127.0.0.1:4173/") ? route.continue() : route.abort());
  await page.goto("/platform/content/preview.html");
  await page.goto("/Office_work/Excel_study/index.html");
  const tab = name => page.getByRole("tab", { name: new RegExp(name) });
  const pane = id => page.locator("#" + id);
  await expect(tab("Learn")).toHaveAttribute("aria-selected", "true");
  await expect(pane("learn")).toBeVisible();
  await expect(pane("practice")).toBeHidden();
  await expect(page.locator(".facts div").filter({ hasText: "Available sections" }).locator("strong")).toHaveText("3");
  await expect(pane("learn").locator(".count")).toHaveText("3 available");
  await expect(pane("learn").locator(".lesson")).toHaveCount(3);
  await expect(pane("learn").getByRole("link", { name: /01 · Cells, ranges/ })).toHaveAttribute("href", "Section_1_Study.html");
  await expect(pane("learn").getByRole("link", { name: /02 · Essential formulas/ })).toHaveAttribute("href", "Section_2_Study.html");
  await expect(pane("learn").getByRole("link", { name: /03 · References and business calculations/ })).toHaveAttribute("href", "Section_3_Study.html");

  await tab("Practice").click();
  await expect(pane("practice")).toBeVisible();
  await expect(pane("learn")).toBeHidden();
  await expect(pane("practice").getByRole("link", { name: "Worksheet simulator" })).toHaveAttribute("href", "Section_1_Study.html#excel-preview");
  await expect(pane("practice").getByRole("link", { name: "Guided practice" })).toHaveAttribute("href", "Section_1_Study.html#excel-guided");
  await expect(pane("practice").getByRole("link", { name: "Independent practice" })).toHaveAttribute("href", "Section_1_Study.html#excel-assessment");
  await expect(pane("practice").getByRole("link", { name: "Open formula practice" })).toHaveAttribute("href", "Section_2_Study.html#f1-guided");
  await expect(pane("practice").getByRole("link", { name: "Open reference practice" })).toHaveAttribute("href", "Section_3_Study.html#f2-choose-title");

  await tab("Practice").press("ArrowRight");
  await expect(tab("Workbooks")).toBeFocused();
  await expect(pane("workbooks")).toBeVisible();
  await expect(pane("workbooks").getByRole("link", { name: "Open Section 1 tutorial files" })).toHaveAttribute("href", "Section_1_Study.html#excel-tutorials");
  await expect(pane("workbooks").getByRole("link", { name: "Open Section 2 tutorial files" })).toHaveAttribute("href", "Section_2_Study.html#f1-tutorial");
  await expect(pane("workbooks").getByRole("link", { name: "Open Section 3 tutorial files" })).toHaveAttribute("href", "Section_3_Study.html#f2-workbook-title");
  await tab("Workbooks").press("End");
  await expect(tab("Roadmap")).toBeFocused();
  await expect(pane("roadmap")).toBeVisible();
  await expect(pane("roadmap").locator(".count")).toHaveText("4 planned sections");
  await expect(pane("roadmap").locator(".planned-item")).toHaveCount(4);
  await expect(pane("roadmap").getByRole("heading", { name: "References and business calculations" })).toHaveCount(0);
  await expect(pane("roadmap").getByRole("link")).toHaveCount(0);
  await tab("Roadmap").press("Home");
  await expect(tab("Learn")).toBeFocused();

  for (const width of [320, 390, 820, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["Learn", "Practice", "Workbooks", "Roadmap"]) {
      await tab(mode).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} at ${width}px`).toBe(true);
    }
  }
  await tab("Workbooks").click();
  await pane("workbooks").getByRole("link", { name: "Open Section 2 tutorial files" }).click();
  await expect(page).toHaveURL(/Section_2_Study\.html#f1-tutorial$/);
  await expect(page.locator("#f1-tutorial")).toBeVisible();
});

test("Excel homepage opens each F2 entry point without submitting a study attempt", async ({ page }) => {
  await page.route("**/*", route => route.request().url().startsWith("http://127.0.0.1:4173/") ? route.continue() : route.abort());
  await page.goto("/platform/content/preview.html");
  const entries = [
    { mode: "learn", name: /03 · References and business calculations/, hash: "", target: "#f2-choose-title" },
    { mode: "practice", name: "Open reference practice", hash: "#f2-choose-title", target: "#f2-choose-title" },
    { mode: "workbooks", name: "Open Section 3 tutorial files", hash: "#f2-workbook-title", target: "#f2-workbook-title" },
  ];
  for (const entry of entries) {
    await page.goto(`/Office_work/Excel_study/index.html#${entry.mode}`);
    await page.locator(`#${entry.mode}`).getByRole("link", { name: entry.name }).click();
    await expect(page).toHaveURL(`http://127.0.0.1:4173/Office_work/Excel_study/Section_3_Study.html${entry.hash}`);
    await expect(page.locator(entry.target)).toBeVisible();
    await expect(page.locator("#f2-scenario")).toHaveValue("jp-ph-trade");
    await expect(page.locator("#f2-lesson option")).toHaveCount(4);
    await expect(page.locator("#f2-history li")).toHaveCount(0);
    await expect(page.locator("#f2-progress")).toContainText("0 / 4");
    await expect(page.locator("#f2-guided")).toBeVisible();
    await expect(page.locator("#f2-independent")).toBeVisible();
    await expect(page.locator("#f2-results")).toBeEmpty();
  }
});
