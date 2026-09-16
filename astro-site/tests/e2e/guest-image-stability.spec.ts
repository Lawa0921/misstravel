import {expect,test} from '@playwright/test';
for(const width of [390,1440]) for(const slug of ['menu','map']) {
 test(`${slug} reserves the real image aspect ratio before loading at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve});
  let requested=false;
  await page.route(`**/images/${slug}.webp`,async route=>{requested=true;await gate;await route.continue();});
  try {
   await page.goto(`/infos/${slug}/`,{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>document.fonts.ready);
   const image=page.locator(`main img[src="/images/${slug}.webp"]`);
   await image.scrollIntoViewIfNeeded();
   await expect.poll(()=>requested).toBe(true);
   const before=await image.boundingBox();
   expect(await image.evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBe(0);
   release();
   await image.evaluate((e:HTMLImageElement)=>e.decode());
   const after=await image.boundingBox();
   console.log('MEDIA_GEOMETRY',JSON.stringify({slug,width,beforeHeight:before!.height,afterHeight:after!.height}));
   expect(Math.abs(after!.height-before!.height),JSON.stringify({before,after})).toBeLessThanOrEqual(1);
   const actual=await image.evaluate((e:HTMLImageElement)=>({width:e.naturalWidth,height:e.naturalHeight,declaredWidth:e.getAttribute('width'),declaredHeight:e.getAttribute('height')}));
   expect(actual.declaredWidth).toBe(String(actual.width));
   expect(actual.declaredHeight).toBe(String(actual.height));
  }finally{release();}
 });
}
