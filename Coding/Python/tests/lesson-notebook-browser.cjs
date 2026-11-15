const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const repo=path.resolve(__dirname,'../../..');
(async()=>{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{
   for(const width of [390,820]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:true});
    const page=await context.newPage();
    await context.route('**/*',route=>{
     const url=new URL(route.request().url());
     if(url.origin!=='https://study.test')return route.abort();
     const file=path.resolve(repo,'.'+decodeURIComponent(url.pathname));
     if(!file.startsWith(repo+path.sep))return route.abort();
     // Isolate navigation from account services and Python runtime downloads.
     if(/gate\.js|reading-sync\.js|progress-backup\.js|sw-register\.js|pyodide\.js/.test(file))return route.fulfill({contentType:'application/javascript',body:''});
     if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
     let body=fs.readFileSync(file);
     if(file.endsWith('02_for_loops.html'))body=body.toString().replace('NotebookPlayer.mount({','NotebookPlayer.mount({autoload:false,');
     const ext=path.extname(file);return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff'})[ext]||'application/octet-stream'});
    });
    await page.goto('https://study.test/Coding/Python/lessons/Py_Lesson_0_3.html#s4');
    await page.locator('#s4 [data-notebook-overlay]').scrollIntoViewIfNeeded();
    const before=await page.evaluate(()=>scrollY);
    await page.locator('#s4 [data-notebook-overlay]').tap();
    assert.equal(await page.locator('dialog[open]').count(),1);
    const frame=page.frameLocator('.notebook-overlay iframe');
    await frame.locator('#np-u12').waitFor();
    await page.waitForTimeout(200);
    assert.match(await frame.locator('#np-u12').innerText(),/Cell 11/);
    const y=await frame.locator('#np-u12').evaluate(el=>el.getBoundingClientRect().top);
    assert(y>=0&&y<300,'exact exercise should be in view');
    assert.equal(await page.locator('.notebook-overlay a').getAttribute('href'),'https://study.test/Coding/Python/fundamentals/02_for_loops.html#np-u12');
    await page.getByRole('button',{name:'Back to lesson',exact:true}).tap();
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.waitForFunction(y=>Math.abs(scrollY-y)<5,before,{timeout:3000});
    await page.locator('#s4 [data-notebook-overlay]').tap();
    await frame.locator('#np-u12').waitFor();
    await frame.locator('#np-u12').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.goto('https://study.test/Coding/Python/fundamentals/02_for_loops.html#np-u12');
    await page.waitForTimeout(200);
    assert.match(await page.locator('#np-u12').innerText(),/Lesson 0.3/);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
    // Chromium supports routed top-level navigation with network emulation offline.
    // WebKit rejects that synthetic navigation before routing; it still runs
    // against local fixtures with every external network request blocked.
    if(name==='chromium')await context.setOffline(true);
    await page.goto('https://study.test/Coding/Python/lessons/Py_Lesson_0_3.html#s4');
    await page.locator('#s4 [data-notebook-overlay]').tap();
    await frame.locator('#np-u12').waitFor();
    await page.getByRole('button',{name:'Back to lesson',exact:true}).tap();
    console.log(`PASS ${name} ${width}px: modal, deep link, return position, Escape, layout and isolated local-asset opening`);
    await context.close();
   }
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
