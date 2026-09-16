import { expect, test } from '@playwright/test';
import sharp from 'sharp';
const sizes = [{width:390,dpr:1},{width:390,dpr:2},{width:390,dpr:3},{width:1440,dpr:1}];
for(const {width,dpr} of sizes) test(`responsive requests ${width} DPR${dpr}`,async({browser,baseURL})=>{
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:dpr});
  const page=await context.newPage();
  const requests:string[]=[];page.on('request',r=>{if(r.resourceType()==='image')requests.push(r.url());});
  for(const [route,selector] of [['/','.hero-image'],['/rooms/','.room-card img'],['/rooms/suite_1/','.carousel-slide.active img'],['/galleries/','.item img']]){
    requests.length=0;
    await page.goto(new URL(route,baseURL).href);
    const image=page.locator(selector).first();await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
    const data=await image.evaluate((i:HTMLImageElement)=>({src:i.src,current:i.currentSrc,width:i.getBoundingClientRect().width,natural:i.naturalWidth,original:i.dataset.originalSrc,fullWidth:Number(i.getAttribute('width'))}));
    expect(data.src).toBe(new URL(data.original!,baseURL).href);
    const response=await page.request.get(data.current);expect(response.ok()).toBe(true);
    const meta=await sharp(await response.body()).metadata();
    // naturalWidth is density-corrected for width descriptors; inspect actual file pixels too.
    expect(data.natural).toBeGreaterThan(0);
    expect(meta.width).toBeLessThanOrEqual(data.fullWidth);
    expect(meta.width!).toBeGreaterThanOrEqual(Math.min(data.width*dpr*.95,data.fullWidth));
    if(route==='/galleries/' || (width===390&&dpr===1)) expect(data.current).toContain('/generated-images/');
    if(route==='/'){
      expect(requests.filter(url=>url===data.src)).toHaveLength(0);
      expect(requests.filter(url=>url===data.current)).toHaveLength(1);
      await page.screenshot({path:`/tmp/misstravel-seo-performance-20260916/responsive-home-${width}-${dpr}.png`});
    }
  }
  requests.length=0;
  await page.locator('[data-lightbox="photos"]').first().click();
  const full=page.locator('[data-viewer-image]');
  await expect(full).toHaveAttribute('src','/images/galleries/gallery_1.webp');
  await expect.poll(()=>full.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  await expect.poll(()=>page.locator('.viewer-thumb img[src]').count()).toBeGreaterThan(0);
  const thumbs=await page.locator('.viewer-thumb img[src]').evaluateAll(imgs=>imgs.map(el=>({src:(el as HTMLImageElement).currentSrc,width:(el as HTMLImageElement).naturalWidth})));
  expect(thumbs.length).toBeLessThan(20);
  for(const thumb of thumbs){expect(thumb.src).toContain('/generated-images/');expect(thumb.src).toMatch(/-(96|192|384)\.webp$/);}
  expect(requests.filter(url=>new URL(url).pathname.startsWith('/images/galleries/'))).toEqual([new URL('/images/galleries/gallery_1.webp',baseURL).href]);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-lightbox="photos"]').first()).toBeFocused();
  await context.close();
});
test('opening animates the loaded derivative before a delayed original resolves',async({page})=>{
  await page.setViewportSize({width:390,height:1000});
  await page.goto('/galleries/');
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('.item').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.item').first()).toHaveCSS('opacity','1');
  const source=page.locator('.item img').first();
  await expect.poll(()=>source.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  const derivative=await source.evaluate((i:HTMLImageElement)=>i.currentSrc);
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/images/galleries/gallery_1.webp',async route=>{await gate;await route.continue();});
  await page.evaluate(()=>{const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const a=animate.call(this,frames,options);if(typeof options==='object'&&options?.id?.startsWith('photo-spatial-'))a.pause();return a;};});
  await page.locator('[data-lightbox="photos"]').first().click();
  await expect(page.locator('[data-photo-flight="open"] img')).toHaveAttribute('src',derivative);
  await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src',derivative);
  await expect(page.locator('[data-viewer-current]')).toHaveText('1');
  release();
  await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src','/images/galleries/gallery_1.webp');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-photo-flight="close"]')).toHaveCount(1);
});
test('no JavaScript retains original fallback and direct full image navigation',async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  await page.goto(new URL('/rooms/suite_1/',baseURL).href);
  await expect(page.locator('.carousel-slide.active img')).toHaveAttribute('src',/^\/images\//);
  await expect(page.locator('.carousel-noscript img').first()).toBeVisible();
  await page.goto(new URL('/galleries/',baseURL).href);
  await page.locator('[data-lightbox="photos"]').first().click();
  await expect(page).toHaveURL(/\/images\/galleries\/gallery_1.webp$/);
  await context.close();
});
test('compare collects the loaded derivative and keeps selection, focus and history',async({page})=>{
  await page.setViewportSize({width:1440,height:1400});await page.goto('/rooms/');
  const toggle=page.locator('[data-compare-toggle]').first();await toggle.scrollIntoViewIfNeeded();
  await page.locator('.room-option img').first().evaluate(async(i:HTMLImageElement)=>i.decode());
  const collected=await toggle.evaluate((button:HTMLButtonElement)=>{
    const source=button.closest('.room-option')!.querySelector('img')!;
    button.click();const clone=document.querySelector<HTMLImageElement>('[data-compare-decoration="flight"]');
    const chip=document.querySelector<HTMLImageElement>('.compare-chip:not([hidden]) img')!;
    return {source:source.currentSrc,original:source.dataset.originalSrc,clone:clone?.src,identity:clone?.dataset.originalSrc,chip:chip.dataset.originalSrc,animation:clone?.getAnimations()[0]?.id};
  });
  expect(collected.source).toContain('/generated-images/');
  expect(collected.clone).toBe(collected.source);expect(collected.identity).toBe(collected.original);expect(collected.chip).toBe(collected.original);expect(collected.animation).toBe('compare-collect');
  await page.locator('[data-compare-toggle]').nth(1).click();
  await page.locator('#compare-open').click();await page.locator('#room-compare .modal-close').click();
  await expect(page.locator('#compare-open')).toBeFocused();
  const saved=await page.evaluate(()=>sessionStorage.getItem('misstravel:compare:v1'));
  await page.goto('/rooms/suite_1/');await expect(page.locator('#compare-count')).toHaveText('2');
  await page.goBack();await expect(page.locator('#compare-count')).toHaveText('2');
  expect(await page.evaluate(()=>sessionStorage.getItem('misstravel:compare:v1'))).toBe(saved);
});
