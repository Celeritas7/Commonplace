import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('dialog',dialog=>dialog.accept());});
test('disabled entry performs no auth/database request and exposes no live editor',async({page})=>{
 const calls=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/'))calls.push(r.url());});
 await page.goto('/platform/admin/');await expect(page.getByText('Live account management has not been activated.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Review & save access'})).toHaveCount(0);expect(calls).toEqual([]);
});
test('Excel-only preview, reviewed parent selection, revocation and reload',async({page})=>{
 await page.goto('/platform/admin/preview.html');await page.getByRole('button',{name:/Sample learner/}).click();
 const preview=page.locator('.access-preview');await expect(preview).toContainText('Direct landing: Excel Study');await expect(preview).not.toContainText('VBA');
 await page.getByRole('checkbox',{name:'Office Work',exact:true}).check();await expect(preview).toContainText('VBA and Macros');
 await page.getByRole('checkbox',{name:'VBA and Macros',exact:true}).uncheck();
 await page.getByRole('button',{name:'Review & save access'}).click();await expect(page.getByRole('status')).toContainText('Access saved');
 await page.getByLabel('Account status').selectOption('revoked');await expect(preview).toContainText('No study sections');
 await page.getByRole('button',{name:'Review & save access'}).click();await expect(page.getByRole('status')).toContainText('Access saved');
 await page.getByRole('button',{name:'Reload access'}).click();await expect(page.getByLabel('Account status')).toHaveValue('revoked');
});
test('administrator role is protected and narrow mobile viewport has no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/platform/admin/preview.html');
 await page.getByRole('button',{name:/Administrator.*Preview/}).click();await expect(page.getByText('Its role and access cannot be changed here.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Review & save access'})).toHaveCount(0);
 await page.getByRole('button',{name:/Sample learner/}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
async function fixture(page){
 await page.goto('/platform/admin/preview.html');
 await page.evaluate(async()=>{
  const {mountAdminStudio}=await import('/platform/admin/studio.mjs');
  const member={user_id:'fixture',display_name:'<img src=x onerror="window.injected=true">',email:'fixture@example.invalid',role:'learner',status:'active',revision:'0',allowed:['office.excel']};
  const state=window.fixture={deny:false,conflict:false,delay:false,release:null,saves:0};
  mountAdminStudio(document.querySelector('#app'),{
   async load(){if(state.delay)await new Promise(r=>state.release=r);if(state.deny)throw Object.assign(Error('Administrator access is required.'),{code:'42501'});return {members:[member],sections:[{id:'office',parent_id:null,kind:'hub',title:'Office Work'},{id:'office.excel',parent_id:'office',kind:'section',title:'Excel Study'}]};},
   async save(){if(state.conflict)throw Object.assign(Error('Access changed in another tab. Reload before saving.'),{code:'40001'});state.saves++;},
   onInvalidate(fn){state.invalidate=fn;return ()=>{};},dispose(){}
  });
 });
}
test('untrusted names render as text; conflict retains draft and blocks retries',async({page})=>{
 await fixture(page);await page.getByRole('button',{name:/fixture@example.invalid/}).click();expect(await page.evaluate(()=>window.injected)).toBeUndefined();
 await page.locator('.editor').getByLabel('Display name').fill('Unsaved change');await page.evaluate(()=>window.fixture.conflict=true);
 await page.getByRole('button',{name:'Review & save access'}).click();await expect(page.getByRole('status')).toContainText('another tab');
 await expect(page.getByRole('button',{name:'Review & save access'})).toBeDisabled();await expect(page.locator('.editor').getByLabel('Display name')).toHaveValue('Unsaved change');
});
test('account change during pending load clears all private rows and permits reload',async({page})=>{
 await fixture(page);await page.evaluate(()=>window.fixture.delay=true);await page.getByRole('button',{name:'Reload access'}).click();
 await page.evaluate(()=>{window.fixture.invalidate();window.fixture.release();});
 await expect(page.locator('#workspace')).toBeEmpty();await expect(page.getByRole('button',{name:'Reload access'})).toBeEnabled();
 await page.evaluate(()=>{window.fixture.delay=false;window.fixture.deny=true;});await page.getByRole('button',{name:'Reload access'}).click();
 await expect(page.getByRole('status')).toContainText('Administrator access');await expect(page.locator('#workspace')).toBeEmpty();
});
test('learner navigation has no admin tools or denied links and single leaf lands directly',async({page})=>{
 await page.goto('/platform/');const result=await page.evaluate(async()=>{
  const {mountLearnerNavigation}=await import('/platform/lib/learner-navigation.mjs');const root=document.createElement('div');document.body.replaceChildren(root);const opened=[];
  const sections=[{id:'office',kind:'hub',title:'Office Work'},{id:'office.excel',kind:'section',title:'Excel Study'}];
  mountLearnerNavigation(root,{role:'learner',sections},{openSection:id=>opened.push(id),openAdmin:()=>{throw Error('No admin');}});
  return {opened,text:root.textContent,links:root.querySelectorAll('a,button').length};
 });expect(result).toEqual({opened:['office.excel'],text:'',links:0});
});

test("signup completion uses the displayed admission revision and clears stale or signed-out views", async ({page}) => {
  await page.goto("/platform/");
  await page.evaluate(async () => {
    const {mountAdminStudio} = await import("/platform/admin/studio.mjs");
    const {createAdminAPI} = await import("/platform/admin/api.mjs");
    const row = {id:"fixture-admission",revision:2,email:"learner@example.invalid",claimed_user_id:"fixture-reservation",state:"verified",expires_at:"2027-01-01T00:00:00Z"};
    const state = window.signupTest = {calls:[],stale:true};
    const client = {
      auth: {
        getUser:async()=>({data:{user:{id:"admin"}}}),
        onAuthStateChange(fn){state.event=fn;return {data:{subscription:{unsubscribe(){}}}};},
      },
      async rpc(name,args) {
        if(name==="cp_admin_directory")return {data:{members:[],sections:[]}};
        if(name==="cp_admin_signup_directory")return {data:[{...row}]};
        if(name==="cp_admin_complete_signup"){
          state.calls.push(args);
          row.revision++;
          if(state.stale){state.stale=false;return {error:{code:"40001"}};}
          row.state="completed";return {data:row.claimed_user_id};
        }
        throw Error("Unexpected RPC");
      },
    };
    const root=document.createElement("main");document.body.replaceChildren(root);
    mountAdminStudio(root,createAdminAPI({client,enabled:true,online:()=>true}));
  });
  await page.getByRole("button",{name:"Signup requests",exact:true}).click();
  await expect(page.getByText("Reserved Auth ID: fixture-reservation")).toBeVisible();
  await page.getByLabel("Learner display name").fill("Fixture");
  await page.getByRole("button",{name:"Register suspended learner"}).click();
  await expect(page.getByText("This record changed in another tab.",{exact:false})).toBeVisible();
  await expect(page.getByRole("button",{name:"Register suspended learner"})).toHaveCount(0);
  await page.getByRole("button",{name:"Reload signup requests"}).click();
  await page.getByLabel("Learner display name").fill("Fixture");
  await page.getByRole("button",{name:"Register suspended learner"}).click();
  await expect(page.getByText("Registered",{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.signupTest.calls)).toEqual([2,3].map(expected_revision=>({
    admission:"fixture-admission",expected_revision,learner_name:"Fixture",
  })));
  await page.evaluate(()=>window.signupTest.event("SIGNED_OUT",null));
  await expect(page.locator("#workspace")).toBeEmpty();
});
