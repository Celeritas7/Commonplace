import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";

const route = "/Office_work/Excel_study/Section_4_Study.html";
const control = (page, id) => page.locator("#f3-" + id);
const cell = (page, id, column) => page.locator(`[data-row-id="${id}"] [data-column="${column}"]`);

async function open(page) {
  await page.route("**/*", request => request.request().url().startsWith("http://127.0.0.1:4173/")
    ? request.continue() : request.abort());
  await page.goto(route);
  await expect(control(page, "scenario")).toHaveValue("jp-ph-trade");
  await expect(page.locator("#f3-sheet [data-row-id]")).toHaveCount(6);
}

async function start(page, lesson, mode = "independent") {
  await control(page, "lesson").selectOption(lesson);
  await control(page, mode).click();
  await expect(control(page, "results")).toBeEmpty();
}

async function rows(page) {
  return page.locator("#f3-sheet [data-row-id]").evaluateAll(elements => elements
    .filter(row => !row.hidden && getComputedStyle(row).display !== "none")
    .map(row => ({ id: row.dataset.rowId, ...Object.fromEntries([...row.querySelectorAll("[data-column]")]
      .map(td => [td.dataset.column, td.dataset.rawValue])) })));
}

async function reveal(locator) {
  const details = locator.locator("xpath=ancestor::details[not(@open)]");
  while (await details.count()) await details.first().locator(":scope > summary").click();
}

async function click(page, id) {
  const button = control(page, id);
  await reveal(button);
  await button.click();
}

async function setFormat(page, column, format) {
  await reveal(control(page, "format-column"));
  await control(page, "format-column").selectOption(column);
  await control(page, "number-format").selectOption(format);
  await click(page, "format");
}

async function edit(page, id, column, value) {
  await reveal(control(page, "edit-row"));
  await control(page, "edit-row").selectOption(id);
  await control(page, "edit-column").selectOption(column);
  await control(page, "edit-value").fill(value);
  await click(page, "edit");
}

async function filter(page, status = "Ready", minimum = "5") {
  await reveal(control(page, "filter-status"));
  await control(page, "filter-status").selectOption(status);
  await control(page, "filter-minimum").fill(minimum);
  await click(page, "filter");
}

async function enableValidation(page) {
  await reveal(control(page, "validation-quantity"));
  await control(page, "validation-quantity").check();
  await control(page, "validation-status").check();
  await click(page, "validation");
}

async function complete(page, lesson) {
  if (lesson === "number-formats") {
    for (const [column, format] of Object.entries({ quantity: "integer", unitPrice: "jpy", discount: "percent", shipDate: "date" }))
      await setFormat(page, column, format);
  } else if (lesson === "create-table") {
    await reveal(control(page, "table-name"));
    await control(page, "table-name").fill("PracticeItems");
    await control(page, "table-range").fill("A1:G7");
    await control(page, "table-headers").check();
    await control(page, "table-banded").check();
    await click(page, "create-table");
  } else if (lesson === "sort-records") {
    await reveal(control(page, "sort-column"));
    await control(page, "sort-column").selectOption("quantity");
    await control(page, "sort-direction").selectOption("asc");
    await click(page, "sort");
  } else if (lesson === "filter-records") {
    await filter(page);
  } else {
    await enableValidation(page);
    await click(page, "check-values");
  }
}

test("F3 independently completes all five table skills with stable records and separate criterion scores", async ({ page }) => {
  test.setTimeout(30000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await open(page);
  await expect(control(page, "scenario").locator("option")).toHaveCount(5);
  await expect(control(page, "lesson").locator("option")).toHaveCount(5);
  const cases = [
    ["number-formats", 6], ["create-table", 5], ["sort-records", 5],
    ["filter-records", 5], ["validate-entry", 6],
  ];
  for (const [index, [lesson, maximum]] of cases.entries()) {
    await start(page, lesson);
    const original = await rows(page);
    await complete(page, lesson);
    const expected = lesson === "filter-records"
      ? original.filter(row => row.status === "Ready" && Number(row.quantity) >= 5)
      : lesson === "sort-records"
        ? [...original].sort((a, b) => Number(a.quantity) - Number(b.quantity)) : original;
    expect(await rows(page)).toEqual(expected);
    await click(page, "submit");
    await expect(control(page, "results")).toContainText(`Task score: ${maximum} / ${maximum}`);
    await expect(control(page, "results").locator(".review")).toHaveCount(0);
    await expect(control(page, "progress")).toContainText(`${index + 1} / 5`);
  }
  await expect(control(page, "history").locator("li")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("R5 F3 table-name case variants receive equivalent credit and retain their original submitted spelling", async ({ page }) => {
  await open(page);
  await start(page, "create-table");
  const original = await rows(page);
  const result = control(page, "results"), history = control(page, "history").locator("pre");
  await click(page, "submit");
  await expect(result).toContainText("Task score: 2 / 5");
  await expect(result.locator('[data-criterion="record-identities"]')).toHaveClass(/correct/);
  await expect(result.locator('[data-criterion="original-records"]')).toHaveClass(/correct/);
  let previous = await history.allTextContents();

  for (const name of ["PracticeItems", "practiceitems", "PRACTICEITEMS", "pRaCtIcEiTeMs", "OtherItems"]) {
    await control(page, "table-name").fill(name);
    await click(page, "create-table");
    await expect(control(page, "table-status")).toContainText(`Table: ${name} · A1:G7`);
    expect(await rows(page)).toEqual(original);
    await click(page, "submit");
    const differentName = name === "OtherItems";
    await expect(result).toContainText(`Task score: ${differentName ? 4 : 5} / 5`);
    await expect(result.locator(".review")).toHaveCount(differentName ? 1 : 0);
    await expect(result.locator('[data-criterion="table-name"]')).toHaveClass(differentName ? /review/ : /correct/);
    const current = await history.allTextContents();
    expect(current.slice(1)).toEqual(previous);
    expect(JSON.parse(current[0]).worksheet.table.name).toBe(name);
    previous = current;
  }

  await control(page, "table-name").fill("practiceitems");
  await control(page, "table-banded").uncheck();
  await click(page, "create-table");
  await click(page, "submit");
  await expect(result).toContainText("Task score: 4 / 5");
  await expect(result.locator(".review")).toHaveCount(1);
  await expect(result.locator('[data-criterion="table-name"]')).toHaveClass(/correct/);
  await expect(result.locator('[data-criterion="table-banding"]')).toHaveClass(/review/);
  expect((await history.allTextContents()).slice(1)).toEqual(previous);
});

test("R5 F3 table-name control and guidance agree on the 32-character practice limit", async ({ page }) => {
  await open(page);
  await start(page, "create-table");
  const input = control(page, "table-name");
  await expect(input).toHaveAttribute("maxlength", "32");
  await expect(input).toHaveAttribute("aria-describedby", "f3-table-name-help");
  await expect(input).toHaveAccessibleDescription(/1[–-]32 characters/);
  await expect(control(page, "table-name-help")).toContainText(/cell references|cell-reference/);
  await expect(control(page, "table-name-help")).toContainText(/case/i);
  const original = await rows(page);

  for (const length of [31, 32]) {
    const name = "N".repeat(length);
    await input.fill(name);
    await click(page, "create-table");
    await expect(input).toHaveValue(name);
    await expect(control(page, "feedback")).toContainText("Table settings applied");
    await expect(control(page, "table-status")).toContainText(`Table: ${name} · A1:G7`);
    expect(await rows(page)).toEqual(original);
  }
  await input.press("End");
  await input.pressSequentially("X");
  await expect(input).toHaveValue("N".repeat(32));
});

test("R5 F3 rejected table names preserve worksheet state, typed drafts and prior submission evidence", async ({ page }) => {
  test.setTimeout(30000);
  await open(page);
  await start(page, "create-table");
  const original = await rows(page);
  await complete(page, "create-table");
  await setFormat(page, "unitPrice", "jpy");
  await complete(page, "sort-records");
  await filter(page);
  await enableValidation(page);
  await click(page, "submit");
  await expect(control(page, "results")).toContainText("Task score: 5 / 5");
  await reveal(control(page, "edit-value"));
  await control(page, "edit-value").fill("123.5");
  await control(page, "filter-minimum").fill("42");
  const preserved = {
    rows: await rows(page), sheet: await control(page, "sheet").innerHTML(),
    status: await control(page, "table-status").textContent(),
    visible: await control(page, "visible-count").textContent(),
    rules: await control(page, "rule-status").textContent(),
    result: await control(page, "results").textContent(),
    history: await control(page, "history").textContent(),
  };
  for (const name of ["", "Two Words", "1Items", "A1", "R1C1", "r", "c", "Stock.Items", "\\Stock", "在庫"]) {
    await control(page, "table-name").fill(name);
    await click(page, "create-table");
    await expect(control(page, "feedback")).toContainText("Change not applied.");
    await expect(control(page, "feedback")).toContainText(/1[–-]32/);
    await expect(control(page, "table-name")).toHaveValue(name);
    await expect(control(page, "edit-value")).toHaveValue("123.5");
    await expect(control(page, "filter-minimum")).toHaveValue("42");
    expect(await rows(page)).toEqual(preserved.rows);
    expect(await control(page, "sheet").innerHTML()).toBe(preserved.sheet);
    await expect(control(page, "table-status")).toHaveText(preserved.status);
    await expect(control(page, "visible-count")).toHaveText(preserved.visible);
    await expect(control(page, "rule-status")).toHaveText(preserved.rules);
    await expect(control(page, "results")).toHaveText(preserved.result);
    await expect(control(page, "history")).toHaveText(preserved.history);
  }
  await click(page, "clear-filter");
  expect(await rows(page)).toEqual([...original].sort((a, b) => Number(a.quantity) - Number(b.quantity)));
  await expect(control(page, "history")).toHaveText(preserved.history);
});

test("F3 number formats preserve raw values and independently grade missing formats and changed inputs", async ({ page }) => {
  await open(page);
  const original = await rows(page), first = original[0];
  expect(Number(first.discount)).toBe(0.05);
  await setFormat(page, "discount", "percent");
  await expect(cell(page, first.id, "discount")).toHaveText("5.0%");
  await setFormat(page, "unitPrice", "jpy");
  await expect(cell(page, first.id, "unitPrice")).toContainText("JPY");
  await setFormat(page, "unitPrice", "php");
  await expect(cell(page, first.id, "unitPrice")).toContainText("PHP");
  await expect(cell(page, first.id, "unitPrice")).toHaveAttribute("data-raw-value", first.unitPrice);
  await setFormat(page, "shipDate", "date");
  const expectedDate = new Date((Number(first.shipDate) - 25569) * 86400000).toISOString().slice(0, 10);
  await expect(cell(page, first.id, "shipDate")).toHaveText(expectedDate);
  expect(await rows(page)).toEqual(original);

  await start(page, "number-formats");
  await click(page, "submit");
  await expect(control(page, "results")).toContainText("Task score: 2 / 6");
  await expect(control(page, "results").locator('[data-criterion="original-records"]')).toHaveClass(/correct/);
  await complete(page, "number-formats");
  const independent = await rows(page);
  await edit(page, independent[0].id, "quantity", "99");
  await click(page, "submit");
  await expect(control(page, "results")).toContainText("Task score: 5 / 6");
  await expect(control(page, "results").locator('[data-criterion="original-records"]')).toHaveClass(/review/);
  await expect(control(page, "results").locator('[data-criterion="format:quantity"]')).toHaveClass(/correct/);
  await expect(control(page, "progress")).toContainText("0 / 5");
});

test("F3 sorts entire numeric records, keeps filtered rows and reapplies filters only when requested", async ({ page }) => {
  await open(page);
  await start(page, "sort-records", "guided");
  const original = await rows(page);
  expect(original.map(row => Number(row.quantity))).toEqual([10, 2, 100, 6, 0, 20]);
  await complete(page, "sort-records");
  const sorted = [...original].sort((a, b) => Number(a.quantity) - Number(b.quantity));
  expect(await rows(page)).toEqual(sorted);
  await filter(page);
  const matches = sorted.filter(row => row.status === "Ready" && Number(row.quantity) >= 5);
  expect(await rows(page)).toEqual(matches);
  await click(page, "clear-filter");
  expect(await rows(page)).toEqual(sorted);

  await filter(page);
  const target = matches[0];
  await edit(page, target.id, "status", "Reserved");
  // Excel-style filter selection stays in place until Reapply, even after the
  // selected record no longer matches. The edit stays attached to the same ID.
  expect((await rows(page)).map(row => row.id)).toEqual(matches.map(row => row.id));
  await expect(cell(page, target.id, "status")).toHaveText("Reserved");
  await click(page, "reapply-filter");
  expect((await rows(page)).map(row => row.id)).toEqual(matches.filter(row => row.id !== target.id).map(row => row.id));
  await click(page, "clear-filter");
  expect(await rows(page)).toEqual(sorted.map(row => row.id === target.id ? { ...row, status: "Reserved" } : row));
  await filter(page, "Shipped", "1000");
  await expect(page.locator("#f3-sheet [data-row-id]")).toHaveCount(0);
  await click(page, "clear-filter");
  await expect(page.locator("#f3-sheet [data-row-id]")).toHaveCount(6);
});

test("F3 validation blocks invalid new entries atomically and reports earlier invalid values without rewriting them", async ({ page }) => {
  await open(page);
  await start(page, "validate-entry");
  const original = await rows(page), target = original[0];
  await enableValidation(page);
  for (const value of ["-1", "2.5", "", "10001"]) {
    await edit(page, target.id, "quantity", value);
    expect(await rows(page)).toEqual(original);
    await expect(control(page, "edit-value")).toHaveValue(value);
  }
  await edit(page, target.id, "status", "Delivered");
  expect(await rows(page)).toEqual(original);
  await expect(control(page, "edit-value")).toHaveValue("Delivered");
  await edit(page, target.id, "quantity", "10000");
  await expect(cell(page, target.id, "quantity")).toHaveAttribute("data-raw-value", "10000");
  await edit(page, target.id, "quantity", "0");
  await expect(cell(page, target.id, "quantity")).toHaveAttribute("data-raw-value", "0");
  await click(page, "reset");
  expect(await rows(page)).toEqual(original);
  await edit(page, target.id, "quantity", "-2");
  await enableValidation(page);
  await expect(cell(page, target.id, "quantity")).toHaveAttribute("data-raw-value", "-2");
  await click(page, "check-values");
  await expect(control(page, "validation-results")).toContainText(target.id);
  await click(page, "submit");
  await expect(control(page, "results")).toContainText("Task score: 4 / 6");
  await expect(control(page, "results").locator('[data-criterion="validation:quantity"]')).toHaveClass(/correct/);
  await expect(control(page, "results").locator('[data-criterion="valid-quantities"]')).toHaveClass(/review/);
  await edit(page, target.id, "quantity", target.quantity);
  await click(page, "check-values");
  await click(page, "submit");
  await expect(control(page, "results")).toContainText("Task score: 6 / 6");
});

test("F3 keeps quizzes, independent progress and session evidence separate without changing existing storage", async ({ page }) => {
  await open(page);
  const saved = JSON.stringify({ read: ["cells", "sum"], open: ["sum"], tasks: ["calculate"] });
  await page.evaluate(value => localStorage.setItem("commonplace_excel_preview_v1", value), saved);
  const inventory = () => page.evaluate(async () => ({
    local: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
    databases: (await indexedDB.databases()).map(({ name, version }) => ({ name, version })),
  }));
  const before = await inventory();
  await control(page, "options").locator("input").first().check();
  await control(page, "quiz").locator('button[type="submit"]').click();
  await expect(control(page, "quiz-feedback")).not.toHaveText("");
  await expect(control(page, "progress")).toContainText("0 / 5");
  await expect(control(page, "history").locator("li")).toHaveCount(0);
  await start(page, "create-table");
  await complete(page, "create-table");
  await click(page, "submit");
  await expect(control(page, "progress")).toContainText("1 / 5");
  const history = await control(page, "history").textContent();
  await control(page, "scenario").selectOption("mechanical-engineering");
  await expect(control(page, "progress")).toContainText("0 / 5");
  await expect(control(page, "history")).toHaveText(history);
  await complete(page, "create-table");
  await click(page, "reset");
  await expect(control(page, "history").locator("li")).toHaveCount(1);
  await control(page, "scenario").selectOption("jp-ph-trade");
  await expect(control(page, "progress")).toContainText("1 / 5");
  await expect(page.locator("body")).toContainText(/session/i);
  await expect(page.locator("body")).toContainText(/reload/i);
  await page.reload();
  await expect(control(page, "history").locator("li")).toHaveCount(0);
  await expect(control(page, "progress")).toContainText("0 / 5");
  expect(await inventory()).toEqual(before);
});

test("F3 downloads actual native tables, retained filtered rows and validation rules from a usable narrow layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await control(page, "scenario").selectOption("mechanical-engineering");
  await start(page, "validate-entry");
  await reveal(control(page, "edit-value"));
  await expect(control(page, "edit-value")).toHaveAccessibleName(/value/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
  const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
  const files = {};
  for (const kind of ["practice", "solution"]) {
    const button = control(page, kind === "practice" ? "download" : "solution");
    await reveal(button);
    const downloading = page.waitForEvent("download");
    await button.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`Commonplace-Excel-mechanical-engineering-v1-F3-${kind}.xlsx`);
    const archive = unzipSync(new Uint8Array(await readFile(await download.path())));
    files[kind] = Object.fromEntries(Object.entries(archive).map(([name, bytes]) => [name, strFromU8(bytes)]));
    const sheets = Object.keys(files[kind]).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
    expect(sheets).toHaveLength(6);
    const tables = Object.keys(files[kind]).filter(name => /^xl\/tables\/table\d+\.xml$/.test(name))
      .map(name => parser.parse(files[kind][name]).table);
    expect(tables).toHaveLength(kind === "practice" ? 3 : 4);
    expect(new Set(tables.map(table => table["@_name"])).size).toBe(tables.length);
    expect(tables.every(table => table["@_ref"] === "A1:G7")).toBe(true);
    const validation = parser.parse(files[kind]["xl/worksheets/sheet6.xml"]).worksheet;
    const rules = list(validation.dataValidations?.dataValidation);
    expect(rules).toHaveLength(kind === "practice" ? 0 : 2);
    if (kind === "solution") {
      expect(rules.map(rule => [rule["@_type"], rule["@_sqref"]]).sort())
        .toEqual([["list", "C2:C7"], ["whole", "D2:D7"]]);
      expect(rules.every(rule => rule["@_errorStyle"] === "stop" && String(rule["@_allowBlank"]) === "0")).toBe(true);
      const filtered = parser.parse(files[kind]["xl/worksheets/sheet5.xml"]).worksheet;
      const records = list(filtered.sheetData.row).filter(row => Number(row["@_r"]) >= 2 && Number(row["@_r"]) <= 7);
      expect(records).toHaveLength(6);
      expect(records.filter(row => String(row["@_hidden"]) === "1")).toHaveLength(4);
      const filterTable = tables.find(table => table["@_name"] === "FilterItems");
      expect(list(filterTable.autoFilter.filterColumn).map(column => String(column["@_colId"])).sort()).toEqual(["2", "3"]);
      expect(files[kind]["xl/worksheets/sheet5.xml"]).toContain("Bearings");
    }
    const formats = parser.parse(files[kind]["xl/worksheets/sheet2.xml"]).worksheet;
    const second = list(formats.sheetData.row).find(row => String(row["@_r"]) === "2");
    const date = list(second.c).find(value => value["@_r"] === "G2");
    expect(date["@_t"]).not.toBe("inlineStr");
    expect(Number(date.v)).toBeGreaterThan(46000);
  }
  expect(files.practice["xl/worksheets/sheet3.xml"]).not.toContain("<tableParts");
  expect(files.solution["xl/worksheets/sheet3.xml"]).toContain("<tableParts");
});
