import {test,expect} from "@playwright/test";
const root="/Office_work/Excel_study/",route=root+"Section_6_PivotTables.html";
const c=(page,id)=>page.locator("#f5b-"+id);
async function open(page){
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.goto(route);
  await expect(c(page,"scenario")).toHaveValue("jp-ph-trade");
}
async function layout(page,rows="group",columns="none",values="sum-amount",filter="all"){
  await c(page,"rows").selectOption(rows);
  await c(page,"columns").selectOption(columns);
  await c(page,"values").selectOption(values);
  await c(page,"filter").selectOption(filter);
}
test("F5B real controls keep cached results until valid Refresh and retain source data",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await open(page);
  await expect(c(page,"scenario").locator("option")).toHaveCount(5);
  await expect(c(page,"lesson").locator("option")).toHaveCount(3);
  await layout(page);await c(page,"apply").click();
  await expect(c(page,"grand-total")).toHaveText("9200");
  await expect(c(page,"result").getByRole("row").filter({hasText:"Cebu"})).toContainText("5800");
  await c(page,"D2").fill("1900");
  await expect(c(page,"source-status")).toContainText("Refresh required");
  await expect(c(page,"grand-total")).toHaveText("9200");
  await c(page,"filter").selectOption("Ready");
  await c(page,"apply").click();
  await expect(c(page,"grand-total")).toHaveText("4200");
  await expect(c(page,"source-status")).toContainText("Refresh required");
  await c(page,"D2").fill("bad");await c(page,"refresh").click();
  await expect(c(page,"feedback")).toContainText("Refresh failed");
  await expect(c(page,"grand-total")).toHaveText("4200");
  await expect(c(page,"D2")).toHaveValue("bad");
  await c(page,"D2").fill("1900");await c(page,"refresh").click();
  await expect(c(page,"grand-total")).toHaveText("4300");
  await expect(c(page,"source-status")).toContainText("snapshot is current");
  await c(page,"columns").selectOption("status");await c(page,"apply").click();
  await expect(c(page,"feedback")).toContainText("Layout not applied");
  await expect(c(page,"grand-total")).toHaveText("4300");
  await c(page,"clear").click();
  await expect(c(page,"active")).toHaveText("No PivotTable created.");
  await expect(c(page,"D2")).toHaveValue("1900");
  await expect(c(page,"history").locator(":scope > li")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("F5B independent layout, refresh, partial credit and separate quiz/history",async({page})=>{
  await open(page);await c(page,"independent").click();
  await expect(c(page,"hint")).toBeHidden();
  await layout(page,"group","none","count-records");await c(page,"apply").click();await c(page,"submit").click();
  await expect(c(page,"feedback")).toContainText("Task score: 5 / 7");
  await expect(c(page,"progress")).toContainText("0 / 15");
  await layout(page);await c(page,"apply").click();
  await c(page,"D2").fill("999");
  await c(page,"submit").click();
  await expect(c(page,"feedback")).toContainText("Task score: 4 / 7");
  await c(page,"refresh").click();await c(page,"submit").click();
  await expect(c(page,"feedback")).toContainText("Task score: 6 / 7");
  await c(page,"reset").click();await layout(page);await c(page,"apply").click();
  // Unapplied draft must not change the submitted layout.
  await c(page,"values").selectOption("count-records");await c(page,"submit").click();
  await expect(c(page,"feedback")).toContainText("Task score: 7 / 7");
  await expect(c(page,"progress")).toContainText("1 / 15");
  await c(page,"lesson").selectOption("pivot-status-count");
  await layout(page,"group","status","count-records");await c(page,"apply").click();await c(page,"submit").click();
  await expect(c(page,"grand-total")).toHaveText("6");
  await expect(c(page,"result").getByRole("columnheader",{name:"Ready",exact:true})).toBeVisible();
  await expect(c(page,"feedback")).toContainText("Task score: 7 / 7");
  await expect(c(page,"progress")).toContainText("2 / 15");
  await c(page,"choices").locator("input").nth(1).check();await c(page,"check-quiz").click();
  await expect(c(page,"quiz-feedback")).toContainText("Correct");
  await c(page,"lesson").selectOption("pivot-filtered-total");
  await layout(page,"group","none","sum-amount","Ready");await c(page,"apply").click();await c(page,"submit").click();
  await expect(c(page,"feedback")).toContainText("Task score: 7 / 7");
  await expect(c(page,"progress")).toContainText("3 / 15");
  await expect(c(page,"history").locator(":scope > li")).toHaveCount(6);
  await c(page,"scenario").selectOption("mechanical-engineering");
  await expect(c(page,"amount-heading")).toContainText("pieces");
  await expect(c(page,"history").locator(":scope > li")).toHaveCount(6);
});
test("F5B launcher and responsive PivotTable navigation",async({page})=>{
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.setViewportSize({width:390,height:844});
  await page.goto(root+"index.html");
  await expect(page.getByRole("img",{name:"Excel-inspired workbook and spreadsheet grid"})).toBeVisible();
  await expect(page.locator("#excel-modes .mode svg use")).toHaveCount(4);
  const section6=page.locator('#learn .lesson[href="Section_6_Study.html"]');
  await expect(section6.locator(".mini svg use")).toHaveAttribute("href","#m-report");
  await expect(section6).toContainText("PivotTables");
  await page.getByRole("tab",{name:"Roadmap",exact:true}).click();
  await expect(page.locator("#roadmap .note")).toContainText("conditional summary formulas and PivotTables");
  await page.getByRole("tab",{name:"Workbooks",exact:true}).click();
  await expect(page.locator("#workbooks .note")).toContainText("Section 6 workbooks are planned");
  await page.getByRole("tab",{name:"Practice",exact:true}).click();
  await expect(page).toHaveURL(/#practice$/);
  await expect(page.getByRole("link",{name:"Open summary practice"})).toBeVisible();
  await page.getByRole("link",{name:"Open PivotTable practice"}).click();
  await expect(page).toHaveURL(/Section_6_PivotTables\.html#f5b-practice$/);
  await layout(page,"group","status","count-records");await c(page,"apply").click();
  for(const width of [320,390,820,1280]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole("link",{name:"Section 6 · Conditional summaries"}).click();
  await expect(page).toHaveURL(/Section_6_Study\.html$/);
  await page.getByRole("link",{name:"PivotTables →",exact:true}).click();
  await expect(page).toHaveURL(/Section_6_PivotTables\.html$/);
  await page.getByRole("link",{name:"Return to Practice"}).click();
  await expect(page).toHaveURL(/index\.html#practice$/);
});
