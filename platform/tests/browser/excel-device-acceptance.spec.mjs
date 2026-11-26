import { test, expect } from "@playwright/test";

test("Excel Test has a distinct install entry and survives three cold offline launches",async({page,context})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:820,height:1180});
  await page.goto("/platform/learn/offline-preview.html");
  await expect(page.getByRole("heading",{name:"Excel Study",exact:true})).toBeVisible();
  const entry=await page.evaluate(async()=>{
    const href=document.querySelector('link[rel="manifest"]').href;
    const preview=await (await fetch(href)).json();
    const liveHref=new URL("manifest.webmanifest",href).href;
    const live=await (await fetch(liveHref)).json();
    return {preview,live,launch:new URL(preview.start_url,href).href};
  });
  expect(entry.preview.id).not.toBe(entry.live.id);
  expect(entry.preview.display).toBe("standalone");
  expect(new URL(entry.launch).pathname).toBe("/platform/learn/offline-preview.html");
  await page.getByRole("button",{name:"Study offline / Resume download",exact:true}).click();
  await expect(page.getByText(/Ready offline ·/)).toBeVisible({timeout:30000});
  expect(await page.evaluate(()=>navigator.serviceWorker.controller?.state)).toBe("activated");
  await page.getByRole("button",{name:"Start heading formatting (reset worksheet)",exact:true}).click();
  await page.locator('[data-cell="A1"]').click();
  for(const name of ["Bold","Fill Color","Borders"])await page.getByRole("button",{name,exact:true}).click();
  await page.getByRole("button",{name:"Submit formatting",exact:true}).click();
  await expect(page.getByText("Last formatting submission: 4 / 4",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Bookmark",exact:true}).click();
  await page.getByLabel("Your notes",{exact:true}).fill("E3 fictional device test");
  await expect(page.locator(".learn-save-status")).toContainText("Saved on this device");
  await context.setOffline(true);
  let current=page;
  for(let i=0;i<3;i++){
    await current.close();
    current=await context.newPage();
    await current.setViewportSize({width:820,height:1180});
    await current.goto(entry.launch);
    await expect(current.getByRole("button",{name:"Resume saved study",exact:true})).toBeEnabled();
    await current.getByRole("button",{name:"Resume saved study",exact:true}).click();
    await expect(current.getByRole("heading",{name:"Excel Study",exact:true})).toBeVisible();
    await expect(current.getByLabel("Your notes",{exact:true})).toHaveValue("E3 fictional device test");
    await expect(current.getByRole("button",{name:"Bookmarked",exact:true})).toBeVisible();
    await expect(current.getByText("Last formatting submission: 4 / 4",{exact:true})).toBeVisible();
    if(i===0){
      await expect(current.locator('[data-cell="A1"]')).toHaveAttribute("data-practice-fill","true");
      await current.getByRole("button",{name:"Start clipboard practice (reset worksheet)",exact:true}).click();
      await current.locator('[data-cell="B2"]').click();
      await current.getByRole("button",{name:"Copy",exact:true}).click();
      await current.locator('[data-cell="B3"]').click();
      await current.getByRole("button",{name:"Paste",exact:true}).click();
      await current.locator('[data-cell="B5"]').click();
      await current.getByLabel("Formula for B5",{exact:true}).fill("=SUM(B2:B4)");
      await current.getByRole("button",{name:"Apply formula",exact:true}).click();
      await expect(current.getByLabel("B5 total",{exact:true})).toHaveText("29");
      await expect(current.locator(".learn-save-status")).toContainText("Saved on this device");
      await expect(current.getByText(/waiting to sync when you reconnect/)).toBeVisible();
    }
    await expect(current.getByText("Last clipboard submission: 5 / 5",{exact:true})).toBeVisible();
  }
  await context.setOffline(false);
  await expect(current.getByText("No changes waiting to sync.",{exact:true})).toBeVisible();
  await expect(current.getByText("Last clipboard submission: 5 / 5",{exact:true})).toBeVisible();
});
