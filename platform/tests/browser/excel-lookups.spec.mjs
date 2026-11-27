import { test,expect } from "@playwright/test";
const route="/Office_work/Excel_study/Section_5_Lookups.html";
const c=(page,id)=>page.locator("#f4c-"+id);
const x='=XLOOKUP(E2,A2:A4,C2:C4)',v='=VLOOKUP(E2,A2:C4,3,FALSE)';
async function open(page){
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.goto(route);
  await expect(c(page,"scenario")).toHaveValue("jp-ph-trade");
  await expect(c(page,"lesson")).toHaveValue("xlookup-exact");
}
test("F4C guided exact lookup retrieves a price, updates on preview, and distinguishes zero and missing",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await open(page);
  await expect(c(page,"scenario").locator("option")).toHaveCount(5);
  await expect(c(page,"lesson").locator("option")).toHaveCount(2);
  await expect(c(page,"E2")).toHaveValue("JP-101");
  await c(page,"F2").fill(x);await c(page,"preview").click();
  await expect(c(page,"result")).toHaveText("1800 JPY");
  await expect(c(page,"match")).toContainText("C3");
  await expect(c(page,"cell-C3")).toHaveClass(/matched-amount/);
  await c(page,"C3").fill("0");
  await expect(c(page,"result")).toHaveText("—");
  await c(page,"preview").click();await expect(c(page,"result")).toHaveText("0 JPY");
  await c(page,"E2").fill("jp-204");await c(page,"preview").click();
  await expect(c(page,"result")).toHaveText("2400 JPY");
  await c(page,"E2").fill("MISSING-999");await c(page,"preview").click();
  await expect(c(page,"result")).toHaveText("#N/A");
  await expect(c(page,"match")).toContainText("No exact code match");
  await expect(c(page,"cell-C3")).not.toHaveClass(/matched-amount/);
  await expect(c(page,"history").locator(":scope > li")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("F4C independent lookup grading, exact matching, quizzes and retained history",async({page})=>{
  await open(page);await c(page,"independent").click();
  await expect(c(page,"hint")).toBeHidden();
  await c(page,"F2").fill(v);await c(page,"submit").click();
  await expect(c(page,"feedback")).toHaveText("Task score: 5 / 6");
  await expect(c(page,"progress")).toContainText("0 / 10");
  await c(page,"F2").fill(x);await c(page,"submit").click();
  await expect(c(page,"feedback")).toHaveText("Task score: 6 / 6");
  await expect(c(page,"result")).toHaveText("2650 JPY");
  await expect(c(page,"progress")).toContainText("1 / 10");
  await c(page,"lesson").selectOption("vlookup-exact");
  await expect(c(page,"F2")).toHaveValue("");
  await c(page,"F2").fill("=VLOOKUP(E2,A2:C4,3,TRUE)");await c(page,"preview").click();
  await expect(c(page,"result")).toHaveText("Check formula or inputs");
  await expect(c(page,"F2")).toHaveValue("=VLOOKUP(E2,A2:C4,3,TRUE)");
  await c(page,"F2").fill(v);await c(page,"submit").click();
  await expect(c(page,"feedback")).toHaveText("Task score: 6 / 6");
  await expect(c(page,"result")).toHaveText("1970 JPY");
  await expect(c(page,"progress")).toContainText("2 / 10");
  await c(page,"choices").locator("input").last().check();await c(page,"check-quiz").click();
  await expect(c(page,"quiz-feedback")).toContainText("Correct");
  await expect(c(page,"history").locator(":scope > li")).toHaveCount(3);
  await c(page,"scenario").selectOption("ph-customer-quote");
  await expect(c(page,"heading")).toContainText("PHP");
  await c(page,"reset").click();
  await expect(c(page,"history").locator(":scope > li")).toHaveCount(3);
  await expect(c(page,"progress")).toContainText("2 / 10");
});
test("F4C Section 5 links and responsive navigation",async({page})=>{
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.goto("/Office_work/Excel_study/index.html#practice");
  await page.getByRole("link",{name:"Open lookup practice"}).click();
  await expect(page).toHaveURL(/Section_5_Lookups\.html#f4c-practice$/);
  for(const width of [320,390,820,1280]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole("link",{name:"Section 5 · Conditional formatting"}).click();
  await expect(page).toHaveURL(/Section_5_Conditional_Formatting\.html$/);
  await page.getByRole("link",{name:"Lookup functions →",exact:true}).click();
  await expect(page).toHaveURL(/Section_5_Lookups\.html$/);
  await page.getByRole("link",{name:"Return to Practice"}).click();
  await expect(page).toHaveURL(/index\.html#practice$/);
});
