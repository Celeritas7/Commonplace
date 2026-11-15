const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  for (const [name, engine] of Object.entries({ chromium, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://drills.test/**', route => route.fulfill({contentType:'text/html',body:'<main class="page"></main>'}));
      await page.goto('https://drills.test/lesson');
      for (const file of ['lib/random/fd.js','lib/lesson-drills.js','lib/drills/0_2.js']) {
        await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
      }
      for (const offline of [false, true]) {
        await context.setOffline(offline);
        await page.evaluate(() => {
          document.querySelector('#sdrills')?.remove();
          localStorage.setItem('lsd:0_2', '{}');
          localStorage.setItem('unrelated-bookmarks', '["keep"]');
          LESSON_DRILLS.mount(LESSON_DRILL_DATA, '0_2');
        });
        assert.equal(await page.locator('#lsd-d2.is-lock').count(), 1);
        await page.locator('#lsd-h1 [data-t="where"]').tap();
        await page.locator('#lsd-h1 [data-t="python"]').tap();
        await page.locator('#lsd-h1 [data-a="check"]').tap();
        assert.equal(await page.locator('#lsd-h1 .fd-v.ok').count(), 1);
        assert.equal(await page.locator('#lsd-d2.is-lock').count(), 0);
        // Tap the code element inside the correct option, as on a touch device.
        await page.locator('#lsd-h2 [data-o="1"] code').tap();
        assert.equal(await page.locator('#lsd-h2 [data-o="1"].ok').count(), 1);
        assert.match(await page.locator('#lsd-h2 .fd-v.ok').innerText(), /Right/);
        assert.equal(await page.locator('.lsd-nav [data-a="next"]').isEnabled(), true);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage['lsd:0_2'])[0].d2), 1);
        // Navigate and deliberately choose wrong; retry/bank must remain usable.
        await page.locator('.lsd-nav [data-a="next"]').tap();
        await page.locator('.lsd-nav [data-a="skip"]').tap();
        await page.locator('#lsd-h2 [data-o="0"]').tap();
        assert.equal(await page.locator('#lsd-h2 [data-o="0"].no').count(), 1);
        assert.equal(await page.locator('#lsd-h2 [data-o="1"].ok').count(), 1);
        await page.locator('#lsd-h2 [data-a="bank"]').tap();
        assert.equal(await page.locator('#lsd-h2 [data-a="bank"]').isDisabled(), true);
        await page.locator('#lsd-h2 [data-a="retry"]').tap();
        await page.locator('#lsd-h2 [data-o="1"]').tap();
        assert.equal(await page.locator('#lsd-h2 .fd-v.ok').count(), 1);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage['lsd:0_2'])[1].d2), 1);
        // Wrong cloze also keeps feedback and permits a successful retry.
        await page.locator('#lsd-h1 [data-t="os"]').tap();
        await page.locator('#lsd-h1 [data-t="sys.executable"]').tap();
        await page.locator('#lsd-h1 [data-a="check"]').tap();
        assert.equal(await page.locator('#lsd-h1 .fd-v.no').count(), 1);
        await page.locator('#lsd-h1 [data-a="retry"]').tap();
        await page.locator('#lsd-h1 [data-t="sys"]').tap();
        await page.locator('#lsd-h1 [data-t="sys.executable"]').tap();
        await page.locator('#lsd-h1 [data-a="check"]').tap();
        assert.equal(await page.locator('#lsd-h1 .fd-v.ok').count(), 1);
        assert.equal(await page.locator('#lsd-h2 .fd-v.ok').count(), 1);
        await page.evaluate(() => { document.querySelector('#sdrills').remove(); LESSON_DRILLS.mount(LESSON_DRILL_DATA,'0_2'); });
        assert.match(await page.locator('.lsd-rail .lsd-pos').innerText(), /3 \/ 3/);
        assert.equal(await page.locator('.lsd-nav [data-a="next"]').count(), 0);
        assert.match(await page.locator('.lsd-done').innerText(), /2 of 3 pairs reviewed/);
        assert.equal(await page.evaluate(() => localStorage['unrelated-bookmarks']), '["keep"]');
        console.log(`PASS ${name} ${offline?'offline':'online'}: selection, feedback, unlock, retry, bank, navigation and saved progress`);
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
