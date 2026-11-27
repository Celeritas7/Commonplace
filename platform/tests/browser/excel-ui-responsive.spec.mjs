import { test, expect } from "@playwright/test";

const home="/Office_work/Excel_study/index.html";
const section1="/Office_work/Excel_study/Section_1_Study.html";
const section2="/Office_work/Excel_study/Section_2_Study.html";
const modes=["Learn","Practice","Workbooks","Roadmap"];
const tab=(page,name)=>page.getByRole("tab",{name:new RegExp(name)});

test.beforeEach(async ({page})=>{
  await page.route("**/*",route=>route.request().url().startsWith("http://127.0.0.1:4173/")?route.continue():route.abort());
});

test("Excel launcher prioritizes study controls on phone and split-screen widths",async ({page})=>{
  for(const [width,height] of [[320,568],[390,844],[600,800],[720,900],[768,1024],[820,1180],[1024,768],[1280,900]]){
    await page.setViewportSize({width,height});
    await page.goto(home);
    const demo=page.locator(".hero .demo");
    if(width<=720)await expect(demo).toBeHidden();
    else await expect(demo).toBeVisible();
    const controls=await page.locator("#excel-modes").boundingBox();
    expect(controls.y+controls.height).toBeLessThanOrEqual(height);
    for(const mode of modes){
      const target=tab(page,mode);
      await target.click();
      await expect(target).toHaveAttribute("aria-selected","true");
      const size=await target.boundingBox();
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),mode+" at "+width).toBe(true);
    }
  }
});

test("Section 1 shortcuts clear the sticky reading bar on phone and iPad",async ({page})=>{
  for(const [width,height] of [[390,844],[820,1180],[1024,768]]){
    await page.setViewportSize({width,height});
    for(const id of ["excel-guided","excel-assessment","excel-preview","excel-tutorials","scenario-picker"]){
      await page.goto(section1+"#"+id);
      await expect(page.locator("#"+id)).toBeVisible();
      await expect.poll(()=>page.evaluate(id=>{
        const target=document.getElementById(id).getBoundingClientRect();
        const bar=document.querySelector(".progressbar").getBoundingClientRect();
        return target.top>=bar.bottom+4 && target.top<innerHeight-40;
      },id),{message:id+" at "+width}).toBe(true);
    }
  }
  // The offset follows actual bar height after rotation/resizing as well.
  await page.setViewportSize({width:320,height:568});
  await expect.poll(()=>page.evaluate(()=>{
    const bar=document.querySelector(".progressbar").getBoundingClientRect();
    return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)>=bar.height+10;
  })).toBe(true);
  await page.goto(section1+"#excel-guided");
  await expect.poll(()=>page.evaluate(()=>document.getElementById("excel-guided").getBoundingClientRect().top>=document.querySelector(".progressbar").getBoundingClientRect().bottom+4)).toBe(true);
});

test("Released lessons share a breadcrumb and retain adjacent navigation",async ({page})=>{
  for(const [url,current] of [[section1,"Section 1"],[section2,"Section 2"]]){
    await page.setViewportSize({width:390,height:844});
    await page.goto(url);
    const crumb=page.getByRole("navigation",{name:"Breadcrumb"});
    await expect(crumb.getByRole("link",{name:"Commonplace",exact:true})).toBeVisible();
    await expect(crumb.getByRole("link",{name:"Office Work",exact:true})).toBeVisible();
    await expect(crumb.locator('[aria-current="page"]')).toHaveText(current);
    await crumb.getByRole("link",{name:"Excel Study",exact:true}).click();
    await expect(tab(page,"Learn")).toHaveAttribute("aria-selected","true");
  }
  await page.goto(section2);
  await page.getByRole("navigation",{name:"Adjacent lessons"}).getByRole("link",{name:/Section 1/}).click();
  await expect(page).toHaveURL(/Section_1_Study\.html$/);
});
