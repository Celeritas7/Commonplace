import { test,expect } from "@playwright/test";
const route="/Office_work/Excel_study/Section_5_Conditional_Formatting.html";
const control=(page,id)=>page.locator("#f4b-"+id);
async function open(page){
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.goto(route);
  await expect(control(page,"scenario")).toHaveValue("jp-ph-trade");
}
async function setRule(page,threshold,range="B2:B4",operator="lt",style="red"){
  await control(page,"range").selectOption(range);
  await control(page,"operator").selectOption(operator);
  await control(page,"threshold").fill(threshold);
  await control(page,"style").selectOption(style);
}
test("F4B real worksheet highlights only strict matches and updates without rewriting values",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await open(page);
  await expect(control(page,"scenario").locator("option")).toHaveCount(5);
  await setRule(page,"5");
  await expect(control(page,"draft-status")).toContainText("Unapplied");
  await expect(control(page,"cell-3")).not.toHaveClass(/highlight-red/);
  await control(page,"apply").click();
  await expect(control(page,"cell-3")).toHaveClass(/highlight-red/);
  await expect(control(page,"state-3")).toHaveText("Highlighted");
  await expect(control(page,"cell-4")).not.toHaveClass(/highlight-red/);
  await expect(control(page,"B3")).toHaveValue("3");
  await control(page,"B2").fill("4");
  await expect(control(page,"cell-2")).toHaveClass(/highlight-red/);
  await control(page,"B3").fill("5");
  await expect(control(page,"cell-3")).not.toHaveClass(/highlight-red/);
  await control(page,"threshold").fill("invalid");
  await control(page,"apply").click();
  await expect(control(page,"feedback")).toContainText("Previous applied rule retained");
  await expect(control(page,"threshold")).toHaveValue("invalid");
  await expect(control(page,"cell-2")).toHaveClass(/highlight-red/);
  await expect(control(page,"active")).toContainText("less than 5");
  await control(page,"B2").fill("text");
  await expect(control(page,"state-2")).toHaveText("Invalid value");
  await expect(control(page,"B2")).toHaveAttribute("aria-invalid","true");
  await expect(control(page,"cell-2")).not.toHaveClass(/highlight-red/);
  await control(page,"clear").click();
  await expect(control(page,"active")).toHaveText("No rule applied.");
  await expect(control(page,"B2")).toHaveValue("text");
  await expect(control(page,"B3")).toHaveValue("5");
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("F4B submission grades the applied rule, independent criteria, and preserves attempts",async({page})=>{
  await open(page);await control(page,"independent").click();
  await expect(control(page,"hint")).toBeHidden();
  await setRule(page,"7","B4");
  await control(page,"apply").click();await control(page,"submit").click();
  await expect(control(page,"feedback")).toContainText("Task score: 5 / 6");
  await expect(control(page,"progress")).toContainText("0 / 5");
  await setRule(page,"7");await control(page,"apply").click();
  await control(page,"operator").selectOption("lte");
  await expect(control(page,"draft-status")).toContainText("Unapplied");
  await control(page,"submit").click();
  await expect(control(page,"feedback")).toContainText("Task score: 6 / 6");
  await expect(control(page,"progress")).toContainText("1 / 5");
  await control(page,"apply").click();await control(page,"submit").click();
  await expect(control(page,"feedback")).toContainText("Task score: 4 / 6");
  await expect(control(page,"cell-2")).toHaveClass(/highlight-red/);
  await control(page,"choices").locator("input").first().check();await control(page,"check-quiz").click();
  await expect(control(page,"quiz-feedback")).toContainText("Correct");
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(3);
  await control(page,"scenario").selectOption("mechanical-engineering");
  await expect(control(page,"task")).toContainText("15 pieces");
  await expect(control(page,"active")).toHaveText("No rule applied.");
  await setRule(page,"15");await control(page,"apply").click();await control(page,"submit").click();
  await expect(control(page,"progress")).toContainText("2 / 5");
  await control(page,"reset").click();
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(4);
  await control(page,"history").locator("summary").nth(2).click();
  await expect(control(page,"history").locator("li").filter({hasText:"Japan–Philippines second-hand trading · independent · 6/6"}).first()).toContainText("Highlighted: B4");
});
test("F4B section links, responsive layout and practice return",async({page})=>{
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.goto("/Office_work/Excel_study/index.html#practice");
  await page.getByRole("link",{name:"Open conditional formatting practice"}).click();
  await expect(page).toHaveURL(/Section_5_Conditional_Formatting\.html#f4b-practice$/);
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(0);
  for(const width of [320,390,820,1280]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole("link",{name:"Section 5 · IF decisions"}).click();
  await expect(page).toHaveURL(/Section_5_Study\.html$/);
  await page.getByRole("link",{name:"Conditional formatting →",exact:true}).click();
  await expect(page).toHaveURL(/Section_5_Conditional_Formatting\.html$/);
  await page.getByRole("link",{name:"Return to Practice"}).click();
  await expect(page).toHaveURL(/index\.html#practice$/);
});
