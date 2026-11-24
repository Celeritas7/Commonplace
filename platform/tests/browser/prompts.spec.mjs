import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>page.on('dialog',d=>d.accept()));
async function open(page){await page.goto('/platform/admin/preview.html');await page.getByRole('button',{name:/Sample learner/}).click();await page.getByRole('button',{name:'Tutorial prompts',exact:true}).click();await expect(page.getByLabel('Topic',{exact:true})).toBeVisible();}
async function generate(page){await page.getByLabel('Topic',{exact:true}).fill('SUM');await page.getByLabel('Learning objective',{exact:true}).fill('Total shipment quantities');await page.getByRole('button',{name:'Generate prompt',exact:true}).click();await expect(page.getByLabel('Generated prompt preview')).toHaveValue(/DRAFT/);}
test('central prompt tab generates personalized drafts and copy requires review; edits invalidate output',async({page})=>{
 const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto('/platform/admin/preview.html');await page.getByRole('button',{name:/Sample learner/}).click();await page.getByRole('button',{name:'Professional profile',exact:true}).click();await page.getByRole('button',{name:'Use import-export beginner template'}).click();await page.getByRole('button',{name:'Save professional profile'}).click();await expect(page.getByText('Professional profile saved. Study permissions are unchanged.')).toBeVisible();
 await page.getByRole('button',{name:'Tutorial prompts',exact:true}).click();await generate(page);const output=page.getByLabel('Generated prompt preview');await expect(output).toHaveValue(/Philippines/);await expect(output).not.toHaveValue(/Sample learner/);
 await expect(page.getByRole('button',{name:'Copy prompt',exact:true})).toBeDisabled();await page.getByRole('checkbox',{name:/I reviewed the prompt/}).check();
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});});await page.getByRole('button',{name:'Copy prompt',exact:true}).click();await expect(page.getByText(/Prompt copied. Paste/)).toBeVisible();expect(await page.evaluate(()=>window.copied)).toContain('JPY');
 await page.getByLabel('Additional requirements').fill('Add an inventory checklist');await expect(output).toHaveValue('');await expect(page.getByRole('button',{name:'Copy prompt',exact:true})).toBeDisabled();
 expect(requests.every(url=>url.startsWith('http://127.0.0.1:4173/'))).toBe(true);expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
});
test('clipboard rejection gives a usable manual fallback and no false success',async({page})=>{
 await open(page);await generate(page);await page.getByRole('checkbox',{name:/I reviewed the prompt/}).check();await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});});
 await page.getByRole('button',{name:'Copy prompt',exact:true}).click();await expect(page.getByText('Clipboard access was blocked. Use Select prompt text and your device’s Copy command.')).toBeVisible();await page.getByRole('button',{name:'Select prompt text',exact:true}).click();expect(await page.getByLabel('Generated prompt preview').evaluate(n=>n.selectionEnd-n.selectionStart)).toBeGreaterThan(100);
});
async function isolated(page){await page.goto('/platform/');await page.evaluate(async()=>{
 const {mountPromptStudio}=await import('/platform/admin/prompt-studio.mjs');const root=document.createElement('div');document.body.replaceChildren(root);
 const f=window.promptFixture={revision:'1',deny:false,delay:false,release:null,denied:false};
 const api={async profile(){if(f.delay)await new Promise(r=>f.release=r);if(f.deny)throw Object.assign(Error('Administrator access is required.'),{code:'42501'});return {revision:f.revision,profile:{background:'Sales'},groups:[],group_ids:[]};}};
 f.dispose=mountPromptStudio(root,api,{user_id:'test-id',display_name:'Private Person',email:'person@example.invalid',allowed:['office.excel']},[{id:'office.excel',kind:'section',title:'Excel Study'}],{onDenied:()=>{f.denied=true;f.dispose();}});
 });await expect(page.getByLabel('Topic',{exact:true})).toBeVisible();}
test('fresh profile revision is checked before copying and stale prompts are cleared',async({page})=>{
 await isolated(page);await generate(page);await page.getByRole('checkbox',{name:/I reviewed the prompt/}).check();await page.evaluate(()=>window.promptFixture.revision='2');await page.getByRole('button',{name:'Copy prompt',exact:true}).click();await expect(page.getByText('The learner profile changed. Generate and review a fresh prompt.')).toBeVisible();await expect(page.getByLabel('Generated prompt preview')).toHaveValue('');
});
test('admin denial and disposed pending requests cannot reveal a generated prompt',async({page})=>{
 await isolated(page);await page.getByLabel('Topic',{exact:true}).fill('SUM');await page.getByLabel('Learning objective',{exact:true}).fill('Add numbers');await page.evaluate(()=>window.promptFixture.delay=true);await page.getByRole('button',{name:'Generate prompt',exact:true}).click();await page.evaluate(()=>{window.promptFixture.dispose();window.promptFixture.release();});await expect(page.getByLabel('Generated prompt preview')).toHaveCount(0);
 await isolated(page);await page.evaluate(()=>window.promptFixture.deny=true);await page.getByLabel('Topic',{exact:true}).fill('SUM');await page.getByLabel('Learning objective',{exact:true}).fill('Add numbers');await page.getByRole('button',{name:'Generate prompt',exact:true}).click();await expect(page.getByLabel('Generated prompt preview')).toHaveCount(0);expect(await page.evaluate(()=>window.promptFixture.denied)).toBe(true);
});
test('mobile prompt editor stays within viewport and displays no imported HTML',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);await page.getByLabel('Topic',{exact:true}).fill('<img src=x onerror="window.bad=true">');await page.getByLabel('Learning objective',{exact:true}).fill('Explain the topic');await page.getByRole('button',{name:'Generate prompt',exact:true}).click();await expect(page.getByLabel('Generated prompt preview')).toHaveValue(/<img/);await expect(page.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.bad)).toBeUndefined();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
