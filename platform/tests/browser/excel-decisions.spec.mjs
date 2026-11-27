import { test, expect } from "@playwright/test";

const route = "/Office_work/Excel_study/Section_5_Study.html";
const control = (page, id) => page.locator("#f4a-" + id);
async function open(page) {
  await page.route("**/*", r => r.request().url().startsWith("http://127.0.0.1:4173/") ? r.continue() : r.abort());
  await page.goto(route);
  await expect(control(page,"scenario")).toHaveValue("jp-ph-trade");
}
async function enter(page) {
  for (const row of [2,3,4]) await control(page,"D"+row).fill('=IF(B'+row+'>=C'+row+',"Ready","Review")');
}
test("F4A guided and independent IF decisions use real worksheet inputs and retain history", async ({page}) => {
  const errors=[]; page.on("pageerror", e=>errors.push(e.message));
  await open(page);
  await expect(control(page,"scenario").locator("option")).toHaveCount(5);
  await expect(control(page,"hint")).toBeVisible();
  await enter(page); await control(page,"preview").click();
  await expect(control(page,"result-2")).toHaveText("Ready");
  await expect(control(page,"result-3")).toHaveText("Review");
  await expect(control(page,"result-4")).toHaveText("Ready");
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(0);
  await control(page,"B2").fill("1"); await control(page,"preview").click();
  await expect(control(page,"result-2")).toHaveText("Review");
  await control(page,"independent").click();
  await expect(control(page,"hint")).toBeHidden();
  await expect(control(page,"D2")).toHaveValue("");
  await enter(page); await control(page,"submit").click();
  await expect(control(page,"feedback")).toHaveText("Task score: 7 / 7");
  await expect(control(page,"progress")).toContainText("1 / 5");
  await control(page,"scenario").selectOption("mechanical-engineering");
  await expect(control(page,"context")).toContainText("Mechanical engineering");
  await enter(page); await control(page,"submit").click();
  await expect(control(page,"progress")).toContainText("2 / 5");
  await control(page,"reset").click();
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(2);
  await expect(control(page,"D2")).toHaveValue("");
  expect(errors).toEqual([]);
});
test("F4A invalid input, wrong equality and quiz remain separate", async ({page}) => {
  await open(page); await control(page,"independent").click(); await enter(page);
  await control(page,"D4").fill('=IF(B4>C4,"Ready","Review")');
  await control(page,"submit").click();
  await expect(control(page,"feedback")).toHaveText("Task score: 5 / 7");
  await expect(control(page,"progress")).toContainText("0 / 5");
  await control(page,"D2").fill('=I F(B2>=C2,"Ready","Review")');
  await control(page,"B3").fill("text");
  await control(page,"preview").click();
  await expect(control(page,"result-2")).toHaveText("Check formula/input");
  await expect(control(page,"result-3")).toHaveText("Check formula/input");
  await expect(control(page,"D2")).toHaveValue('=I F(B2>=C2,"Ready","Review")');
  await expect(control(page,"B3")).toHaveValue("text");
  await control(page,"choices").locator("input").first().check();
  await control(page,"check-quiz").click();
  await expect(control(page,"quiz-feedback")).toContainText("Correct");
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(1);
  await expect(control(page,"progress")).toContainText("0 / 5");
});
test("F4A links and narrow layout do not create a submission", async ({page}) => {
  await page.route("**/*", r => r.request().url().startsWith("http://127.0.0.1:4173/") ? r.continue() : r.abort());
  await page.goto("/Office_work/Excel_study/index.html#practice");
  await page.getByRole("link",{name:"Open IF practice"}).click();
  await expect(page).toHaveURL(/Section_5_Study\.html#f4a-practice$/);
  await expect(control(page,"history").locator(":scope > li")).toHaveCount(0);
  for (const width of [320,390,820,1280]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole("link",{name:"Return to Practice"}).click();
  await expect(page).toHaveURL(/index\.html#practice$/);
});
