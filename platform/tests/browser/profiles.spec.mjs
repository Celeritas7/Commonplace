import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('dialog',d=>d.accept());});
async function profile(page){await page.goto('/platform/admin/preview.html');await page.getByRole('button',{name:/Sample learner/}).click();await page.getByRole('button',{name:'Professional profile',exact:true}).click();await expect(page.getByLabel('Professional background')).toBeVisible();}
test('template, saved professional profile, groups and access remain independent',async({page})=>{
 await profile(page);await page.getByRole('button',{name:'Use import-export beginner template'}).click();
 await expect(page.getByLabel('Countries and markets')).toHaveValue('Japan\nPhilippines');await expect(page.getByLabel('Currencies and units')).toHaveValue('JPY\nPHP');
 await page.getByRole('button',{name:'Save professional profile'}).click();await expect(page.getByText('Professional profile saved. Study permissions are unchanged.')).toBeVisible();
 await page.getByLabel('Group name',{exact:true}).fill('Import-export professionals');await page.getByLabel('Group description').fill('Practical trade scenarios');
 await page.getByRole('button',{name:'Save group',exact:true}).click();await page.getByRole('checkbox',{name:'Import-export professionals'}).check();
 await page.getByRole('button',{name:'Save professional profile'}).click();await expect(page.getByRole('checkbox',{name:'Import-export professionals'})).toBeChecked();
 await page.getByRole('button',{name:'Reload profile',exact:true}).click();await expect(page.getByLabel('Professional background')).toHaveValue('Sales and brokerage');
 await page.getByRole('button',{name:'Study access',exact:true}).click();await expect(page.locator('.access-preview')).toContainText('Direct landing: Excel Study');await expect(page.getByRole('checkbox',{name:'VBA and Macros'})).not.toBeChecked();
});
test('oversized list is rejected without losing entered text, mobile profile remains within viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await profile(page);
 const text=Array(21).fill('Practice objective').join('\n');await page.getByLabel('Learning objectives',{exact:true}).fill(text);
 await page.getByRole('button',{name:'Save professional profile'}).click();await expect(page.getByText('Learning objectives: use up to 20 lines, 300 characters per line.')).toBeVisible();await expect(page.getByLabel('Learning objectives',{exact:true})).toHaveValue(text);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
async function isolated(page){await page.goto('/platform/');await page.evaluate(async()=>{
 const {mountProfileEditor}=await import('/platform/admin/profile-editor.mjs');const root=document.createElement('div');document.body.replaceChildren(root);
 const f=window.pf={conflict:false,hold:false,release:null,reads:0};
 const api={async profile(target){f.reads++;if(f.hold)await new Promise(r=>f.release=r);return {profile:{background:target},revision:'1',group_ids:[],groups:[]};},async saveProfile(){if(f.conflict)throw Object.assign(Error('Profile changed. Reload before saving.'),{code:'40001'});},async saveGroup(){}};
 f.mount=target=>{f.dispose?.();f.dispose=mountProfileEditor(root,api,target);};f.mount('Learner A');
 });await expect(page.getByLabel('Professional background')).toHaveValue('Learner A');}
test('stale profile save preserves draft and disables retries until reload',async({page})=>{
 await isolated(page);await page.getByLabel('Professional background').fill('Unsaved background');await page.evaluate(()=>window.pf.conflict=true);
 await page.getByRole('button',{name:'Save professional profile'}).click();await expect(page.getByText('Profile changed. Reload before saving.')).toBeVisible();await expect(page.getByLabel('Professional background')).toHaveValue('Unsaved background');await expect(page.getByRole('button',{name:'Save professional profile'})).toBeDisabled();
});
test('disposing an in-flight profile view prevents another learner seeing the late response',async({page})=>{
 await isolated(page);await page.evaluate(()=>{window.pf.hold=true;window.pf.mount('Learner A pending');});
 await page.evaluate(()=>{window.pf.hold=false;window.pf.mount('Learner B');window.pf.release();});
 await expect(page.getByLabel('Professional background')).toHaveValue('Learner B');await expect(page.getByText('Learner A pending',{exact:true})).toHaveCount(0);
});
