import { expect, test } from '@playwright/test';
const original='/images/galleries/gallery_1.webp';
async function delayed(page:any){
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/galleries/');await page.evaluate(()=>document.fonts.ready);
 const tile=page.locator('.item').first();await tile.scrollIntoViewIfNeeded();await expect(tile).toHaveCSS('opacity','1');
 await tile.locator('img').evaluate((i:HTMLImageElement)=>i.decode());
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**'+original,async(route:any)=>{await gate;await route.continue();});
 return release;
}
test('progressive full image keeps its display geometry after high-resolution decoding',async({page})=>{
 const release=await delayed(page);await page.locator('[data-lightbox="photos"]').first().click();
 const photo=page.locator('[data-viewer-image]');await expect(photo).toHaveAttribute('src',/generated-images/);
 await page.waitForTimeout(400);const before=(await photo.boundingBox())!;release();
 await expect(photo).toHaveAttribute('src',original);await photo.evaluate((i:HTMLImageElement)=>i.decode());const after=(await photo.boundingBox())!;
 for(const key of ['x','y','width','height'] as const)expect(Math.abs(before[key]-after[key]),JSON.stringify({before,after})).toBeLessThanOrEqual(1);
});
test('a delayed full-resolution upgrade never resets active zoom and pan',async({page})=>{
 const release=await delayed(page);await page.locator('[data-lightbox="photos"]').first().click();
 const photo=page.locator('[data-viewer-image]');await expect(photo).toHaveAttribute('src',/generated-images/);
 await page.locator('.viewer-zoom').click();await expect(page.locator('.viewer-zoom')).toHaveAttribute('aria-pressed','true');
 await page.locator('.viewer-stage').evaluate(e=>{e.scrollLeft=80;e.scrollTop=60;});
 const before=await page.locator('.viewer-stage').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));release();
 await expect(photo).toHaveAttribute('src',original);await photo.evaluate((i:HTMLImageElement)=>i.decode());
 await expect(page.locator('.viewer-zoom')).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('.viewer-stage').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}))).toEqual(before);
});
