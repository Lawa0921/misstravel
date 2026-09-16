import {expect,test} from '@playwright/test';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseFrontmatter} from 'astro/markdown';
const rooms=readdirSync(join(process.cwd(),'src/content/rooms')).filter(f=>f.endsWith('.md')&&!f.startsWith('_')).map(f=>({slug:f.slice(0,-3),data:parseFrontmatter(readFileSync(join(process.cwd(),'src/content/rooms',f),'utf8')).frontmatter}));
for(const [width,columns] of [[360,2],[390,2],[768,3],[1440,4]]) {
 test(`gallery uses ${columns} real columns at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/galleries/');
  const grid=page.locator('.row.photos');const items=grid.locator(':scope > .item');await expect(items).toHaveCount(36);
  const dimensions=await grid.evaluate(e=>({cols:getComputedStyle(e).gridTemplateColumns.split(' ').length,width:e.getBoundingClientRect().width,children:[...e.children].map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,width:n.getBoundingClientRect().width,span:getComputedStyle(n).gridColumnEnd}))}));
  expect(dimensions.cols).toBe(columns);
  expect(new Set(dimensions.children.slice(0,columns).map(n=>Math.round(n.y))).size).toBe(1);
  expect(Math.max(...dimensions.children.map(n=>n.width))).toBeLessThan(dimensions.width/columns+1);
 });
}
for(const room of rooms) {
 test(`${room.slug} shows its selected main image first without losing photos`,async({page})=>{
  await page.goto(`/rooms/${room.slug}/`);
  await expect(page.locator('.carousel-slide img').first()).toHaveAttribute('src',room.data.mainImage);
  const actual=await page.locator('.carousel-slide img').evaluateAll(es=>es.map(e=>e.getAttribute('src')||e.getAttribute('data-src')));
  expect([...actual].sort()).toEqual([...new Set([room.data.mainImage,...room.data.images])].sort());
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute('href',room.data.mainImage);
 });
}

for (const width of [390, 1440]) {
  test(`carousel controls are large enough and do not crop images at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/rooms/campsite_1/');
    const dots = page.locator('.carousel-dots .dot');
    for (const dot of await dots.all()) {
      const box = await dot.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.carousel-slide img').first()).toHaveCSS('object-fit', 'contain');
    await dots.last().click();
    await expect(dots.last()).toHaveAttribute('aria-current', 'true');
    await expect(dots.last()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

for (const width of [390, 1440]) {
  test(`refund table uses its full width at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/infos/account/');
    const table = page.locator('.info-content table');
    await expect(table).toHaveCSS('display', 'table');
    const size = await table.evaluate(e => ({ table: e.getBoundingClientRect().width, row: e.querySelector('tr')!.getBoundingClientRect().width }));
    expect(Math.abs(size.table - size.row)).toBeLessThan(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

for (const width of [360,390,768,1440]) {
  test(`next-button navigation keeps the full-width control strip usable at ${width}px`, async ({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/rooms/campsite_1/');
    const carousel=page.locator('#room-carousel'),strip=page.locator('.carousel-dots');
    const outer=await carousel.boundingBox(),inner=await strip.boundingBox();
    expect(Math.abs(outer!.width-inner!.width)).toBeLessThan(3);
    const next=page.locator('.carousel-btn.next');
    const count=await strip.locator('.dot').count();
    for(let i=1;i<count;i++) {
      await next.click();
      const dot=strip.locator('.dot').nth(i);
      await expect(dot).toHaveAttribute('aria-current','true');
      const visible=await dot.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement!.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;});
      expect(visible,`selected photo ${i+1}`).toBe(true);
    }
  });
  test(`campsite headings keep original text and do not strand the final name character at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    for(const room of rooms.filter(r=>r.slug.startsWith('campsite_'))) {
      await page.goto(`/rooms/${room.slug}/`);
      await expect(page.locator('h1')).toHaveText(room.data.title);
      const name=page.locator('.room-heading-name');
      const dims=await name.evaluate(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)}));
      expect(dims.height).toBeLessThan(dims.line+2);
    }
  });
}
