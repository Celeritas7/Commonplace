import {test,expect} from '@playwright/test';
test('same SUM concept renders trade, mechanical and finance examples and recalculates inputs',async({page})=>{
 await page.goto('/platform/content/preview.html');const title=await page.locator('#lesson h2').textContent();
 for(const [variant,result] of [['trade','B5: 25 items'],['mechanical','B5: 42 pieces'],['finance','B5: 100000 JPY']]){await page.getByLabel('Example background').selectOption(variant);await expect(page.locator('#lesson h2')).toHaveText(title);await page.getByRole('button',{name:'Calculate total'}).click();await expect(page.getByRole('status')).toHaveText(result);}
 await page.getByLabel('B2',{exact:true}).fill('10');await page.getByRole('button',{name:'Calculate total'}).click();await expect(page.getByRole('status')).toHaveText('B5: 20010 JPY');
 await page.getByLabel('B2',{exact:true}).fill('');await page.getByRole('button',{name:'Calculate total'}).click();await expect(page.getByRole('status')).toContainText('Enter a valid number');
});
test('scenario markup is plain text, with no scripts/links or persistent preview progress',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/platform/content/preview.html');
 await page.evaluate(async()=>{const {exampleBundle}=await import('/platform/content/examples.mjs');const {renderExcelPreview}=await import('/platform/content/render.mjs');const b=exampleBundle('trade');b.scenario.context='<img src=x onerror="window.executed=true">';b.dataset.rows[0][0]='<a href="javascript:alert(1)">Item</a>';renderExcelPreview(document.querySelector('#lesson'),b);});
 await expect(page.locator('#lesson img,#lesson a')).toHaveCount(0);expect(await page.evaluate(()=>window.executed)).toBeUndefined();expect(await page.evaluate(()=>localStorage.getItem('commonplace_excel_preview_v1'))).toBeNull();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('long imported cell text wraps without hiding or overflowing worksheet controls',async({page})=>{
 await page.goto('/platform/content/preview.html');
 const product='VeryLongUnbrokenImportedProductName'.repeat(8);
 await page.evaluate(async product=>{const {exampleBundle}=await import('/platform/content/examples.mjs');const {renderExcelPreview}=await import('/platform/content/render.mjs');const b=exampleBundle('trade');b.dataset.rows[0][0]=product;renderExcelPreview(document.querySelector('#lesson'),b);},product);
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});await expect(page.locator('#lesson')).toContainText(product);
  const bounds=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,controls:[...document.querySelectorAll('#lesson input')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};})}));
  expect(bounds.page).toBeLessThanOrEqual(bounds.viewport);for(const control of bounds.controls){expect(control.left).toBeGreaterThanOrEqual(0);expect(control.right).toBeLessThanOrEqual(bounds.viewport);expect(control.width).toBeGreaterThan(40);}
 }
 await page.getByLabel('B2',{exact:true}).fill('10');await page.getByRole('button',{name:'Calculate total'}).click();await expect(page.getByRole('status')).toHaveText('B5: 23 items');
});
test('existing Excel SUM exercise and saved study progress survive the new preview',async({page})=>{
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4173/')?route.continue():route.abort());
 await page.goto('/platform/content/preview.html');const saved=JSON.stringify({read:['cells'],open:[],tasks:['calculate']});await page.evaluate(s=>localStorage.setItem('commonplace_excel_preview_v1',s),saved);
 await page.goto('/Office_work/Excel_study/Section_1_Study.html');await page.getByRole('button',{name:'Apply formula',exact:true}).click();await expect(page.locator('#b5')).toHaveText('25');await expect(page.locator('[data-task=calculate]')).toBeChecked();
 await page.locator('#b2').fill('20');await page.getByRole('button',{name:'Apply formula',exact:true}).click();await expect(page.locator('#b5')).toHaveText('33');
 await page.goto('/platform/content/preview.html');await page.getByLabel('Example background').selectOption('mechanical');await page.getByRole('button',{name:'Calculate total'}).click();expect(await page.evaluate(()=>localStorage.getItem('commonplace_excel_preview_v1'))).toBe(saved);
});
