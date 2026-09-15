import { expect, test } from '@playwright/test';
const routes=['/infos/','/infos/account/','/infos/roles/','/infos/contact-method/','/infos/guide/','/infos/set-menu-info/','/infos/map/','/infos/menu/','/infos/video/','/sale_items/','/announcements/','/announcements/website/','/404.html'];
for(const width of [360,390,768,1440]) {
  test(`all visitor interfaces are usable at ${width}px`,async({page})=>{
    test.setTimeout(90_000);
    await page.setViewportSize({width,height:900});
    await page.route('**/beacon.min.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
    for(const path of routes) {
      await page.goto(path,{waitUntil:'domcontentloaded'});
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
      if(['/infos/guide/','/sale_items/','/infos/set-menu-info/'].includes(path)) {
        const choices=page.locator('button[data-modal]');
        for(const choice of await choices.all()) {
          const box=await choice.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
          await expect(choice).toHaveCSS('background-color','rgb(42, 47, 74)');
        }
      }
    }
  });
}
for(const width of [390,1440]) {
  test(`every dialog opens, remains readable and restores focus at ${width}px`,async({page})=>{
    test.setTimeout(120_000);await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
    for(const path of ['/infos/guide/','/infos/set-menu-info/','/sale_items/']) {
      await page.goto(path);
      for(const trigger of await page.locator('button[data-modal]').all()) {
        const id=await trigger.getAttribute('data-modal');await trigger.click();const dialog=page.locator(`#${id}`);
        await expect(dialog).toHaveAttribute('aria-hidden','false');
        await expect(dialog.locator('.modal-close')).toBeFocused();
        expect(await dialog.evaluate(el=>el.scrollWidth<=innerWidth+1)).toBe(true);
        await dialog.locator('.modal-content').evaluate(el=>{el.scrollTop=el.scrollHeight;});
        await expect(dialog.locator('.modal-close')).toBeInViewport();
        await page.keyboard.press('Escape');await expect(dialog).not.toHaveClass(/active/);await expect(trigger).toBeFocused();
      }
    }
  });
}
test('without JavaScript the guide, rental and meal information is still available',async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();
  for(const path of ['/infos/guide/','/infos/set-menu-info/','/sale_items/']) {
    await page.goto(new URL(path,baseURL!).href);
    for(const dialog of await page.locator('.modal').all()) await expect(dialog).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.goto(new URL('/infos/guide/',baseURL!).href);
  expect(await page.locator('.guide-step img[src]').count()).toBe(await page.locator('.guide-step').count());
  await context.close();
});
