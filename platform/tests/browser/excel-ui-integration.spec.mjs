import { test, expect } from "@playwright/test";

const home = "/Office_work/Excel_study/index.html";
const routes = [
  {section: 3, prefix: "f2", workbook: "F2", practice: "Open reference practice"},
  {section: 4, prefix: "f3", workbook: "F3", practice: "Open table practice"},
];

test.beforeEach(async ({page}) => {
  await page.route("**/*", route => route.request().url().startsWith("http://127.0.0.1:4173/") ? route.continue() : route.abort());
});

for (const {section, prefix, workbook, practice} of routes) {
  test("Section " + section + " inherits launcher navigation and workbook context", async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(home + "#workbooks");
    await page.getByRole("link", {name: "Open Section " + section + " tutorial files"}).click();
    await expect(page.locator("#" + prefix + "-workbook-title")).toBeVisible();
    const context = page.locator("#" + prefix + "-workbook-context");
    await expect(context).toHaveText("Japan–Philippines second-hand trading");
    await page.getByRole("link", {name:"Change example",exact:true}).click();
    await expect(page).toHaveURL(new RegExp("#" + prefix + "-scenario$"));
    await page.getByLabel("Professional example").selectOption("ph-customer-quote");
    await expect(context).toHaveText("Philippines customer quotation");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", {name:"Download practice workbook (.xlsx)",exact:true}).click();
    const file = await pending;
    expect(file.suggestedFilename()).toBe("Commonplace-Excel-ph-customer-quote-v1-" + workbook + "-practice.xlsx");
    await expect(page.locator("#" + prefix + "-history li")).toHaveCount(0);
    await page.getByRole("link", {name:/Back to Excel workbooks/}).click();
    await expect(page.getByRole("tab",{name:/Workbooks/})).toHaveAttribute("aria-selected","true");
    await page.reload();
    await expect(page.getByRole("tab",{name:/Workbooks/})).toHaveAttribute("aria-selected","true");
    await page.getByRole("tab",{name:/Practice/}).click();
    await page.getByRole("link",{name:practice}).click();
    const crumb = page.getByRole("navigation",{name:"Breadcrumb"});
    await expect(crumb.locator('[aria-current="page"]')).toHaveText("Section " + section);
    await expect(page.getByRole("navigation",{name:"Adjacent lessons"}).getByRole("link",{name:new RegExp("Section " + (section-1))})).toBeVisible();
    if (section===3) await expect(page.getByRole("navigation",{name:"Adjacent lessons"}).getByRole("link",{name:/Section 4/})).toBeVisible();
    await page.getByRole("link",{name:/Back to Excel practice/}).click();
    await expect(page.getByRole("tab",{name:/Practice/})).toHaveAttribute("aria-selected","true");
  });
}
