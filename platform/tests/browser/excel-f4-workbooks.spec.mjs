import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {unzipSync,strFromU8} from "fflate";
const root="/Office_work/Excel_study/";
async function download(page,id){
  const pending=page.waitForEvent("download");
  await page.locator("#"+id).click();
  const file=await pending;
  const archive=unzipSync(new Uint8Array(await readFile(await file.path())));
  return {name:file.suggestedFilename(),parts:Object.fromEntries(Object.entries(archive).map(([p,v])=>[p,strFromU8(v)]))};
}
test("F4D homepage opens native workbook panel with current example and both separate files",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  await page.goto(root+"index.html#workbooks");
  await page.getByRole("link",{name:"Open Section 5 tutorial files"}).click();
  await expect(page).toHaveURL(/Section_5_Study\.html#f4-workbook-title$/);
  await expect(page.locator("#f4-workbook-context")).toHaveText("Japan–Philippines second-hand trading");
  await expect(page.locator("#f4-workbook-units")).toContainText("IF: items");
  await expect(page.locator("#f4-workbook-units")).toContainText("XLOOKUP: JPY");
  await page.locator("#f4-change-example").click();
  await page.locator("#f4a-scenario").selectOption("ph-customer-quote");
  await expect(page.locator("#f4-workbook-context")).toHaveText("Philippines customer quotation");
  await expect(page.locator("#f4-workbook-units")).toHaveText("IF: PHP · Conditional formatting: PHP · XLOOKUP: PHP · VLOOKUP: PHP");
  await page.locator("#f4a-B2").fill("999999");
  await page.locator("#f4a-D2").fill('=IF(B2>=C2,"Ready","Review")');
  const p=await download(page,"f4-download");
  expect(p.name).toBe("Commonplace-Excel-ph-customer-quote-v1-F4-practice.xlsx");
  expect(p.parts["xl/worksheets/sheet2.xml"]).not.toContain("999999");
  expect(Object.values(p.parts).join("")).not.toContain("<f>");
  expect(p.parts["xl/worksheets/sheet3.xml"]).not.toContain("<conditionalFormatting");
  await page.getByText("After practice: review the solutions",{exact:true}).click();
  const s=await download(page,"f4-solution");
  expect(s.name).toBe("Commonplace-Excel-ph-customer-quote-v1-F4-solution.xlsx");
  expect(s.parts["xl/worksheets/sheet2.xml"]).toContain('t="str"><f>IF(');
  expect(s.parts["xl/worksheets/sheet3.xml"]).toContain('operator="lessThan"');
  expect(s.parts["xl/worksheets/sheet4.xml"]).toContain("_xlfn.XLOOKUP(E2,A2:A4,C2:C4)");
  expect(s.parts["xl/worksheets/sheet5.xml"]).toContain("VLOOKUP(E2,A2:C4,3,FALSE)");
  await expect(page.locator("#f4a-B2")).toHaveValue("999999");
  await expect(page.locator("#f4a-D2")).toHaveValue('=IF(B2>=C2,"Ready","Review")');
  await expect(page.locator("#f4a-history > li")).toHaveCount(0);
  await page.getByRole("link",{name:"Back to Excel workbooks"}).click();
  await expect(page).toHaveURL(/index\.html#workbooks$/);
  expect(errors).toEqual([]);
});
test("F4D downloads follow the active example from conditional and lookup pages at phone width",async({page})=>{
  await page.setViewportSize({width:390,height:850});
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:4173/")?r.continue():r.abort());
  for(const [path,prefix] of [["Section_5_Conditional_Formatting.html","f4b"],["Section_5_Lookups.html","f4c"]]){
    await page.goto(root+path);
    await page.locator("#"+prefix+"-scenario").selectOption("mechanical-engineering");
    await expect(page.locator("#f4-workbook-context")).toHaveText("Mechanical engineering");
    await expect(page.locator("#f4-workbook-units")).toContainText("IF: pieces");
    await expect(page.locator("#f4-workbook-units")).toContainText("VLOOKUP: JPY");
    const f=await download(page,"f4-download");
    expect(f.name).toBe("Commonplace-Excel-mechanical-engineering-v1-F4-practice.xlsx");
    expect(f.parts["xl/workbook.xml"]).toContain('name="04 VLOOKUP"');
    await expect(page.locator("#"+prefix+"-history > li")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
