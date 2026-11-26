import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";

const route = "/Office_work/Excel_study/Section_3_Study.html";
const source = (page) => page.locator("#f2-source-formula");
const formula = (page, cell) => page.locator(`[data-formula-cell="${cell}"]`);
const result = (page, cell) => page.locator(`[data-result-cell="${cell}"]`);

async function open(page) {
  await page.route("**/*", (request) => request.request().url().startsWith("http://127.0.0.1:4173/")
    ? request.continue() : request.abort());
  await page.goto(route);
  await expect(page.locator("#f2-scenario")).toHaveValue("jp-ph-trade");
  await expect(source(page)).toBeVisible();
}

async function start(page, lesson) {
  await page.locator("#f2-lesson").selectOption(lesson);
  await page.locator("#f2-independent").click();
  await expect(source(page)).toHaveValue("");
}

async function values(page) {
  return page.locator("[data-input-cell]").evaluateAll((inputs) =>
    Object.fromEntries(inputs.map((input) => [input.dataset.inputCell, Number(input.value)])));
}

async function copyAndSubmit(page, expression) {
  await source(page).fill(expression);
  await page.locator("#f2-copy").click();
  await page.locator("#f2-submit").click();
}

test("F2 independent tasks copy relative, absolute and mixed references with correct calculated results", async ({ page }) => {
  test.setTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  await expect(page.locator("#f2-scenario option")).toHaveCount(5);
  await expect(page.locator("#f2-lesson option")).toHaveCount(4);
  const cases = [
    {
      lesson: "relative-line-totals", expression: " = c3 * b3 ", maximum: 7,
      copied: { D4: "=C4*B4", D5: "=C5*B5" },
      expected: (v) => ({ D3: v.B3 * v.C3, D4: v.B4 * v.C4, D5: v.B5 * v.C5 }),
    },
    {
      lesson: "absolute-rate", expression: "=B3*$F$2", maximum: 7,
      copied: { C4: "=B4*$F$2", C5: "=B5*$F$2" },
      expected: (v) => ({ C3: v.B3 * v.F2, C4: v.B4 * v.F2, C5: v.B5 * v.F2 }),
    },
    {
      lesson: "mixed-quotation", expression: "=$B3*C$2", maximum: 9,
      copied: { D3: "=$B3*D$2", C4: "=$B4*C$2", D4: "=$B4*D$2" },
      expected: (v) => ({ C3: v.B3 * v.C2, D3: v.B3 * v.D2, C4: v.B4 * v.C2, D4: v.B4 * v.D2 }),
    },
    {
      lesson: "relative-unit-cost", expression: "=B3/C3", maximum: 7,
      copied: { D4: "=B4/C4", D5: "=B5/C5" },
      expected: (v) => ({ D3: v.B3 / v.C3, D4: v.B4 / v.C4, D5: v.B5 / v.C5 }),
    },
  ];
  for (const [index, item] of cases.entries()) {
    await start(page, item.lesson);
    const before = await values(page);
    await copyAndSubmit(page, item.expression);
    for (const [cell, expected] of Object.entries(item.copied))
      await expect(formula(page, cell)).toHaveValue(expected);
    for (const [cell, expected] of Object.entries(item.expected(before)))
      await expect(result(page, cell)).toHaveText(String(Number(expected.toPrecision(15))));
    await expect(page.locator("#f2-results")).toContainText(`Task score: ${item.maximum} / ${item.maximum}`);
    await expect(page.locator("#f2-results .review")).toHaveCount(0);
    await expect(page.locator("#f2-progress")).toContainText(`${index + 1} / 4`);
    expect(await values(page)).toEqual(before);
  }
  await expect(page.locator("#f2-history li")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("F2 wrong locks and invalid formulas retain independent credit and failed copying does not overwrite targets", async ({ page }) => {
  await open(page);
  await start(page, "absolute-rate");
  await copyAndSubmit(page, "=B3*F2");
  await expect(formula(page, "C4")).toHaveValue("=B4*F3");
  await expect(formula(page, "C5")).toHaveValue("=B5*F4");
  await expect(result(page, "C4")).toHaveText("0");
  await expect(result(page, "C5")).toHaveText("0");
  await expect(page.locator("#f2-results")).toContainText("Task score: 4 / 7");
  await expect(page.locator("#f2-results .correct")).toHaveCount(4);
  await expect(page.locator("#f2-progress")).toContainText("0 / 4");
  await copyAndSubmit(page, "=B3*$F$2");
  await expect(page.locator("#f2-results")).toContainText("Task score: 7 / 7");

  await start(page, "relative-line-totals");
  await source(page).fill("=B3*C3");
  await page.locator("#f2-copy").click();
  // Copy to D4 is in bounds, but D5 would reference row 13. Neither
  // destination may be replaced by a partially successful copy operation.
  await source(page).fill("=F11*F11");
  await page.locator("#f2-copy").click();
  await expect(formula(page, "D4")).toHaveValue("=B4*C4");
  await expect(formula(page, "D5")).toHaveValue("=B5*C5");
  await source(page).fill("=B 3*C3");
  await page.locator("#f2-copy").click();
  await expect(formula(page, "D4")).toHaveValue("=B4*C4");
  await expect(formula(page, "D5")).toHaveValue("=B5*C5");
  await page.locator("#f2-submit").click();
  await expect(result(page, "D3")).toHaveText("—");
  await expect(page.locator("#f2-results")).toContainText("Task score: 5 / 7");
  await expect(page.locator("#f2-results .correct")).toHaveCount(5);

  await start(page, "relative-unit-cost");
  await source(page).fill("=B3/C3");
  await page.locator("#f2-copy").click();
  await page.locator('[data-input-cell="C3"]').fill("0");
  await page.locator("#f2-submit").click();
  await expect(result(page, "D3")).toHaveText("#DIV/0!");
  await expect(page.locator("#f2-results")).toContainText("Task score: 5 / 7");
});

test("F2 quiz, session history and scenario progress remain distinct without changing existing reading state", async ({ page }) => {
  await open(page);
  const reading = JSON.stringify({ read: ["cells", "sum"], open: ["sum"], tasks: ["calculate"] });
  await page.evaluate((saved) => localStorage.setItem("commonplace_excel_preview_v1", saved), reading);
  const storageBefore = await page.evaluate(async () => ({
    local: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
    databases: (await indexedDB.databases()).map((database) => ({ name: database.name, version: database.version })),
  }));
  await page.locator("#f2-options input").first().check();
  await page.locator('#f2-quiz button[type="submit"]').click();
  await expect(page.locator("#f2-quiz-feedback")).not.toHaveText("");
  await expect(page.locator("#f2-progress")).toContainText("0 / 4");
  await expect(page.locator("#f2-history li")).toHaveCount(0);

  await start(page, "relative-line-totals");
  await copyAndSubmit(page, "=B3*C3");
  await expect(page.locator("#f2-progress")).toContainText("1 / 4");
  const oldHistory = await page.locator("#f2-history").textContent();
  await page.locator("#f2-scenario").selectOption("mechanical-engineering");
  await expect(source(page)).toHaveValue("");
  await expect(page.locator("#f2-progress")).toContainText("0 / 4");
  await expect(page.locator("#f2-history")).toHaveText(oldHistory);
  await source(page).fill("=B3*C3");
  await page.locator("#f2-copy").click();
  await page.locator("#f2-apply").click();
  await page.locator("#f2-reset").click();
  await expect(source(page)).toHaveValue("");
  await expect(page.locator("#f2-history li")).toHaveCount(1);
  await expect(page.locator("body")).toContainText(/session/i);
  await expect(page.locator("body")).toContainText(/reload/i);
  await page.reload();
  await expect(page.locator("#f2-history li")).toHaveCount(0);
  await expect(page.locator("#f2-progress")).toContainText("0 / 4");
  expect(await page.evaluate(() => localStorage.getItem("commonplace_excel_preview_v1"))).toBe(reading);
  expect(await page.evaluate(async () => ({
    local: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
    databases: (await indexedDB.databases()).map((database) => ({ name: database.name, version: database.version })),
  }))).toEqual(storageBefore);
});

test("F2 offers distinct selected-context workbooks and usable narrow-screen controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.locator("#f2-scenario").selectOption("mechanical-engineering");
  await page.locator("#f2-lesson").selectOption("mixed-quotation");
  await expect(source(page)).toHaveAccessibleName("Formula C3");
  await expect(page.locator("#f2-copy")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const files = {};
  for (const kind of ["practice", "solution"]) {
    const button = page.locator(kind === "practice" ? "#f2-download" : "#f2-solution");
    if (!(await button.isVisible()))
      await button.locator("xpath=ancestor::details").locator("summary").click();
    const downloading = page.waitForEvent("download");
    await button.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toContain("mechanical-engineering");
    expect(download.suggestedFilename()).toMatch(new RegExp(`${kind}\\.xlsx$`));
    const archive = unzipSync(new Uint8Array(await readFile(await download.path())));
    const sheets = Object.entries(archive).filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
    expect(sheets).toHaveLength(5);
    files[kind] = sheets.map(([, bytes]) => strFromU8(bytes)).join("\n");
  }
  expect(files.practice).not.toContain("<f>");
  for (const expression of ["B3*C3", "B4*C4", "B3*$F$2", "B5*$F$2", "$B3*C$2", "$B4*D$2", "B3/C3", "B5/C5"])
    expect(files.solution).toContain(`<f>${expression}</f>`);
});
