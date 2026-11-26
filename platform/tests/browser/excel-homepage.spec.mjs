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
  await expect(pane("learn").getByRole("link", { name: /01 · Cells, ranges/ })).toHaveAttribute("href", "Section_1_Study.html");
  await expect(pane("learn").getByRole("link", { name: /02 · Essential formulas/ })).toHaveAttribute("href", "Section_2_Study.html");

  await tab("Practice").click();
  await expect(pane("practice")).toBeVisible();
  await expect(pane("learn")).toBeHidden();
  await expect(pane("practice").getByRole("link", { name: "Worksheet simulator" })).toHaveAttribute("href", "Section_1_Study.html#excel-preview");
  await expect(pane("practice").getByRole("link", { name: "Guided practice" })).toHaveAttribute("href", "Section_1_Study.html#excel-guided");
  await expect(pane("practice").getByRole("link", { name: "Independent practice" })).toHaveAttribute("href", "Section_1_Study.html#excel-assessment");
  await expect(pane("practice").getByRole("link", { name: "Open formula practice" })).toHaveAttribute("href", "Section_2_Study.html#f1-guided");

  await tab("Practice").press("ArrowRight");
  await expect(tab("Workbooks")).toBeFocused();
  await expect(pane("workbooks")).toBeVisible();
  await expect(pane("workbooks").getByRole("link", { name: "Open Section 1 tutorial files" })).toHaveAttribute("href", "Section_1_Study.html#excel-tutorials");
  await expect(pane("workbooks").getByRole("link", { name: "Open Section 2 tutorial files" })).toHaveAttribute("href", "Section_2_Study.html#f1-tutorial");
  await tab("Workbooks").press("End");
  await expect(tab("Roadmap")).toBeFocused();
  await expect(pane("roadmap")).toBeVisible();
  await expect(pane("roadmap").locator(".planned-item")).toHaveCount(5);
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
