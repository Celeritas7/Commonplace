import {test,expect} from '@playwright/test';

test('same-owner refresh preserves access edits, profile edits and reviewed prompts; account changes clear them',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());await page.goto('/platform/');
 await page.evaluate(async()=>{
  const {mountAdminStudio}=await import('/platform/admin/studio.mjs');
  const {createAdminAPI}=await import('/platform/admin/api.mjs');
  const owner='10000000-0000-4000-8000-000000000001';
  const member={user_id:'10000000-0000-4000-8000-000000000002',display_name:'Review learner',email:'review@example.invalid',role:'learner',status:'active',revision:'0',allowed:['office.excel']};
  const state=window.authFixture={user:owner,event:null};
  const client={auth:{onAuthStateChange(fn){state.event=fn;return {data:{subscription:{unsubscribe(){}}}};},async getUser(){return {data:{user:state.user?{id:state.user}:null}};}},async rpc(name){
   if(name==='cp_admin_directory')return {data:{members:[member],sections:[{id:'office',kind:'hub',title:'Office Work',parent_id:null},{id:'office.excel',kind:'section',title:'Excel Study',parent_id:'office'}]}};
   if(name==='cp_admin_profile')return {data:{profile:{learning_objectives:['Track inventory']},revision:'0',groups:[],group_ids:[]}};
   throw Error('Unexpected write');
  }};
  const root=document.createElement('div');document.body.replaceChildren(root);mountAdminStudio(root,createAdminAPI({enabled:true,client,online:()=>true}));
 });
 const refresh=type=>page.evaluate(type=>window.authFixture.event(type,{user:{id:window.authFixture.user}}),type);
 await page.getByRole('button',{name:/Review learner/}).click();
 await page.locator('.editor').getByLabel('Display name',{exact:true}).fill('Unsaved access edit');await refresh('TOKEN_REFRESHED');
 await expect(page.locator('.editor').getByLabel('Display name',{exact:true})).toHaveValue('Unsaved access edit');
 await page.getByRole('button',{name:'Professional profile',exact:true}).click();
 await page.getByLabel('Current occupation',{exact:true}).fill('Unsaved professional profile');await refresh('SIGNED_IN');
 await expect(page.getByLabel('Current occupation',{exact:true})).toHaveValue('Unsaved professional profile');
 await page.getByRole('button',{name:'Tutorial prompts',exact:true}).click();
 await page.getByLabel('Topic',{exact:true}).fill('SUM');await page.getByRole('button',{name:'Generate prompt',exact:true}).click();
 const output=page.getByLabel('Generated prompt preview');await expect(output).not.toHaveValue('');
 const text=await output.inputValue();await page.getByRole('checkbox',{name:/I reviewed the prompt/}).check();await refresh('TOKEN_REFRESHED');
 await expect(output).toHaveValue(text);await expect(page.getByRole('button',{name:'Copy prompt',exact:true})).toBeEnabled();
 await page.evaluate(()=>{window.authFixture.user='10000000-0000-4000-8000-000000000003';window.authFixture.event('SIGNED_IN',{user:{id:window.authFixture.user}});});
 await expect(page.locator('#workspace')).toBeEmpty();await expect(page.locator('#notice')).toContainText('Account changed');
 await page.getByRole('button',{name:'Reload access'}).click();await expect(page.getByRole('button',{name:/Review learner/})).toBeVisible();
 await refresh('SIGNED_OUT');await expect(page.locator('#workspace')).toBeEmpty();
});

test('browser Web Crypto progress keys fit real account storage and backup restoration',async({page})=>{
 await page.goto('/platform/');const result=await page.evaluate(async()=>{
  const {progressIdentity}=await import('/platform/content/contracts.mjs');
  const {longLesson}=await import('/platform/tests/fixtures/long-lesson.mjs');
  const {createAccountStore}=await import('/platform/lib/account-store.mjs');
  const f=longLesson(),id=await progressIdentity(f.assignment,f.bundle,f.activityId);
  const store=createAccountStore(localStorage,'review-browser');store.switchAccount('10000000-0000-4000-8000-000000000002');
  store.put(store.ticket(),{section:'office.excel',kind:'progress',id,value:{done:true}});
  const backup=store.exportBackup(store.ticket()),restored=createAccountStore(sessionStorage,'review-browser');restored.switchAccount(store.ticket().owner);
  const imported=restored.importBackup(restored.ticket(),backup);
  return {id,records:restored.list(restored.ticket()),imported};
 });
 expect(result.id).toMatch(/^cp-content-v1:sha256:[0-9a-f]{64}$/);expect(result.id.length).toBeLessThanOrEqual(160);
 expect(result.records).toEqual([{section:'office.excel',kind:'progress',id:result.id,value:{done:true}}]);expect(result.imported).toEqual({added:1,retained:0});
});
