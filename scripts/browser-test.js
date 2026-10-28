// Install Playwright separately and supply NODE_PATH when running this optional check.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({headless:true});
  const dir = path.resolve(process.env.DISPATCH_ARTIFACTS || 'artifacts/browser');
  fs.mkdirSync(dir,{recursive:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(process.env.DISPATCH_URL || 'http://127.0.0.1:3480');
    await page.locator('#tasks .task').first().waitFor();
    assert.equal(await page.title(),'Codex Dispatch');
    assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
    await page.locator('#languageSelect').selectOption('en');
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.locator('#tasks textarea').first().fill('Unsaved draft must survive polling');
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('#tasks textarea').first().inputValue(),'Unsaved draft must survive polling');
    await page.reload();
    await page.locator('#tasks .task').first().waitFor();
    for (const width of [1440,1024,390]) {
      await page.setViewportSize({width,height:width===390?844:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
      await page.screenshot({path:path.join(dir,`viewport-${width}.png`),fullPage:true});
    }
    await page.locator('#languageSelect').selectOption('zh-CN');
    await page.locator('[data-filter="error"]').click();
    assert.equal(await page.locator('#tasks .task').count(),0);
    await page.locator('[data-filter="all"]').click();
    assert.ok(await page.locator('#tasks .task').count()>0);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,widths:[1440,1024,390],i18n:true,draftPreserved:true,filters:true,consoleErrors:errors}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
