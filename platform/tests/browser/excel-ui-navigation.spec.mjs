import { test, expect } from "@playwright/test";

const home = "/Office_work/Excel_study/index.html";
const tab = (page, name) => page.getByRole("tab", { name: new RegExp(name) });

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => route.request().url().startsWith("http://127.0.0.1:4173/") ? route.continue() : route.abort());
});

test("Excel modes survive reload and follow browser history and direct URLs", async ({ page }) => {
  await page.setViewportSize({width:1280,height:1000});
  await page.goto(home);
  await expect(tab(page,"Learn")).toHaveAttribute("aria-selected","true");
  await tab(page,"Practice").click();
  await expect(page).toHaveURL(/#practice$/);
  await expect(page.locator("#practice")).toBeVisible();
  await tab(page,"Practice").press("ArrowRight");
  await expect(page).toHaveURL(/#workbooks$/);
  await expect(tab(page,"Workbooks")).toBeFocused();
  await page.goBack();
  await expect(tab(page,"Practice")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#workbooks")).toBeHidden();
  await page.goForward();
  await expect(tab(page,"Workbooks")).toHaveAttribute("aria-selected","true");
  await page.reload();
  await expect(tab(page,"Workbooks")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#workbooks")).toBeVisible();
  await page.goto(home+"#roadmap");
  await expect(tab(page,"Roadmap")).toHaveAttribute("aria-selected","true");
  await page.goto(home+"#unknown");
  await expect(tab(page,"Learn")).toHaveAttribute("aria-selected","true");
});

test("Section 1 workbook label follows the applied example, not a pending choice", async ({ page }) => {
  await page.goto(home+"#workbooks");
  await page.getByRole("link", {name:"Open Section 1 tutorial files"}).click();
  const workbook=page.locator("#excel-tutorials");
  const context=workbook.locator("[data-tutorial-context]");
  await expect(context).toContainText("General office");
  await workbook.getByRole("link",{name:"Change example"}).click();
  await expect(page).toHaveURL(/#scenario-picker$/);
  await page.getByLabel("Choose a work context").selectOption("jp-ph-trade");
  await expect(context).toContainText("General office");
  await page.getByRole("button",{name:"Apply example (reset worksheet)"}).click();
  await expect(context).toContainText("Japan–Philippines second-hand trading");
  await workbook.getByRole("link",{name:/Back to Excel workbooks/}).click();
  await expect(tab(page,"Workbooks")).toHaveAttribute("aria-selected","true");
  await page.goto("/Office_work/Excel_study/Section_1_Study.html");
  await page.getByRole("navigation",{name:"Breadcrumb"}).getByRole("link",{name:"Excel Study",exact:true}).click();
  await expect(tab(page,"Learn")).toHaveAttribute("aria-selected","true");
});

test("Section 2 workbook context matches the active example and returns to the selected mode", async ({ page }) => {
  await page.goto(home+"#workbooks");
  await page.getByRole("link",{name:"Open Section 2 tutorial files"}).click();
  const workbook=page.locator("#f1-tutorial");
  const context=page.locator("#f1-workbook-context");
  await expect(context).toHaveText("General office · items");
  await workbook.getByRole("link",{name:"Change example"}).click();
  await expect(page).toHaveURL(/#f1-scenario$/);
  await page.getByLabel("Professional example").selectOption("ph-customer-quote");
  await expect(context).toHaveText("Philippines customer quotation · PHP");
  const pending=page.waitForEvent("download");
  await workbook.getByRole("button",{name:"Download practice workbook (.xlsx)",exact:true}).click();
  const download=await pending;
  expect(download.suggestedFilename()).toBe("Commonplace-Excel-ph-customer-quote-v1-F1-practice.xlsx");
  await workbook.getByRole("link",{name:/Back to Excel workbooks/}).click();
  await expect(tab(page,"Workbooks")).toHaveAttribute("aria-selected","true");
  await tab(page,"Practice").click();
  await page.getByRole("link",{name:"Open formula practice"}).click();
  await page.getByRole("link",{name:/Back to Excel practice/}).click();
  await expect(tab(page,"Practice")).toHaveAttribute("aria-selected","true");
});
