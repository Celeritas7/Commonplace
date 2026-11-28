import {test,expect} from "@playwright/test";
const root="/Office_work/Excel_study/",route=root+"Section_6_Charts.html";
const c=(page,id)=>page.locator("#f5c-"+id);
async function open(page){
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.goto(route);await expect(c(page,"scenario")).toHaveValue("jp-ph-trade");
}
async function config(page,type="column",category="group",measure="sum-amount",filter="all"){
  for(const [k,v] of Object.entries({type,category,measure,filter}))await c(page,k).selectOption(v);
}
test("F5C build feedback, actual SVG and stale or invalid source",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));await open(page);
  await c(page,"build").click();await expect(c(page,"build-feedback")).toContainText("Choose the chart type");
  await expect(c(page,"type")).toHaveAttribute("aria-invalid","true");
  await config(page);await c(page,"build").click();
  await expect(c(page,"total")).toHaveText("Report total: 9200 JPY");
  await expect(c(page,"chart").locator("rect[data-category]")).toHaveCount(2);
  await expect(c(page,"data").getByRole("row").filter({hasText:"Cebu"})).toContainText("5800");
  await c(page,"insight").selectOption("row:0");await c(page,"submit").click();await expect(c(page,"feedback")).toHaveText("Report score: 7 / 7");
  await c(page,"D2").fill("bad");await expect(c(page,"source-status")).toContainText("Source needs correction");
  await c(page,"build").click();await expect(c(page,"build-feedback")).toContainText("Previous chart retained");
  await expect(c(page,"total")).toHaveText("Report total: 9200 JPY");
  await c(page,"D2").fill("1900");await expect(c(page,"source-status")).toContainText("out of date");
  await c(page,"build").click();await expect(c(page,"total")).toHaveText("Report total: 9300 JPY");
  await expect(c(page,"insight")).toHaveValue("");
  await c(page,"clear").click();await expect(c(page,"report")).toBeHidden();
  await expect(c(page,"D2")).toHaveValue("1900");await expect(c(page,"history").locator(":scope > li")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("F5C count units, filtered report, independent conclusions and session history",async({page})=>{
  await open(page);
  await c(page,"lesson").selectOption("chart-status-counts");await config(page,"bar","status","count-records");
  await c(page,"build").click();await expect(c(page,"total")).toHaveText("Report total: 6 records");
  await expect(c(page,"chart").locator("rect[data-category]")).toHaveCount(3);
  await c(page,"filter").selectOption("Ready");await c(page,"build").click();
  await expect(c(page,"build-feedback")).toContainText("For a Status category, use All statuses");
  await expect(c(page,"total")).toHaveText("Report total: 6 records");
  await c(page,"lesson").selectOption("chart-ready-report");
  await config(page,"bar","group","sum-amount","Ready");await c(page,"build").click();
  await expect(c(page,"scope")).toContainText("Ready only");await expect(c(page,"total")).toHaveText("Report total: 4200 JPY");
  for(let i=2;i<=7;i++)await c(page,"B"+i).selectOption("Pending");
  await c(page,"build").click();await expect(c(page,"chart")).toContainText("No records match");
  await c(page,"insight").selectOption("none");await c(page,"submit").click();await expect(c(page,"feedback")).toHaveText("Report score: 7 / 7");
  await c(page,"independent").click();await expect(c(page,"hint")).toBeHidden();
  await config(page,"bar","group","sum-amount","Ready");await c(page,"build").click();
  await c(page,"insight").selectOption("row:1");await c(page,"submit").click();await expect(c(page,"feedback")).toHaveText("Report score: 8 / 8");
  await expect(c(page,"progress")).toContainText("1 / 15");
  await c(page,"scenario").selectOption("mechanical-engineering");await config(page,"bar","group","sum-amount","Ready");await c(page,"build").click();await expect(c(page,"total")).toContainText("pieces");
  await expect(c(page,"history").locator(":scope > li")).toHaveCount(2);
});
test("F5C navigation and phone/tablet layout keep chart and source scrolling contained",async({page})=>{
  await open(page);await config(page);await c(page,"build").click();
  for(const width of [320,390,820,1280]){
    await page.setViewportSize({width,height:860});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await expect(c(page,"chart")).toBeVisible();
  }
  await page.getByRole("link",{name:"Return to Practice"}).click();
  await expect(page).toHaveURL(/index\.html#practice$/);
  await page.getByRole("link",{name:"Open chart and report practice"}).click();
  await expect(page).toHaveURL(/Section_6_Charts\.html#f5c-practice$/);
});
