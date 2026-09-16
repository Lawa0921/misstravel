import { expect, test, type Page } from '@playwright/test';

async function unscrollablePage(page: Page) {
  const state = await page.evaluate(async () => {
    let maximum = 0;
    for (let frame = 0; frame < 18; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      maximum = Math.max(maximum, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    }
    window.scrollTo({left: 100, top: scrollY, behavior: 'instant'});
    const left = scrollX;
    const rootOverflow = getComputedStyle(document.documentElement).overflowX;
    const bodyOverflow = getComputedStyle(document.body).overflowX;
    window.scrollTo({left: 0, top: scrollY, behavior: 'instant'});
    return { maximum, left, rootOverflow, bodyOverflow };
  });
  expect(state.maximum, JSON.stringify(state)).toBe(0);
  expect(state.left).toBe(0);
  // Fix the overflowing component, not the page scrollbar or all horizontal regions.
  expect(state.rootOverflow).not.toMatch(/hidden|clip/);
  expect(state.bodyOverflow).not.toMatch(/hidden|clip/);
}

for (const width of [390, 768, 932, 1020, 1021, 1067, 1440, 1920]) {
  test(`homepage edge cards never create document overflow during pointer or keyboard motion at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await unscrollablePage(page);
    const cards = page.locator('#tiles .tile');
    for (const tile of await cards.all()) {
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toHaveCSS('opacity','1');
      const box = (await tile.boundingBox())!;
      for (const [x,y] of [[.08,.15],[.92,.85]]) {
        await page.mouse.move(box.x + box.width*x,box.y + box.height*y);
        await unscrollablePage(page);
      }
      await tile.locator('a').focus();
      await unscrollablePage(page);
    }
    // The inner image still responds; the text and clickable card bounds do not tilt.
    await expect(cards.last()).toHaveCSS('transform','none');
    expect(await cards.last().locator('img').evaluate(e=>getComputedStyle(e).transform)).not.toBe('none');
  });
}

test('reduced motion keeps homepage photos still and full-card navigation usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const tile=page.locator('#tiles .tile').first();
  await tile.hover();await unscrollablePage(page);
  await expect(tile).toHaveCSS('transform','none');
  await expect(tile.locator('img')).toHaveCSS('transform','none');
  const box=(await tile.boundingBox())!;
  await page.mouse.click(box.x+box.width/2,box.y+40);
  await page.waitForURL('**/infos/');
});
