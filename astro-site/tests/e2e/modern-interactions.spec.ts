import { expect, test } from '@playwright/test';
for (const width of [390,1440]) {
  test(`navigation is a photo workspace with usable keyboard controls at ${width}`, async({page})=>{
    await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/infos/');await expect(page.locator('#menu img[src]')).toHaveCount(0);
    await page.locator('#menu-toggle').click();await expect(page.locator('#menu-close')).toBeFocused();
    await expect(page.locator('main')).toHaveAttribute('inert','');
    const room=page.locator('#menu a[href="/rooms/"]');await room.focus();
    await expect(page.locator('.preview-label')).toHaveText('房型展示');
    await expect(page.locator('[data-preview-image="1"]')).toHaveAttribute('data-active','');
    await expect(page.locator('#menu a')).toHaveCount(7);
    await page.locator('#menu a').last().focus();await page.keyboard.press('Tab');await expect(page.locator('#menu-close')).toBeFocused();
    await page.keyboard.press('Escape');await expect(page.locator('#menu-toggle')).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert','');
    await expect(page.locator('#menu')).toHaveAttribute('inert','');
  });
  test(`room comparison works without changing card navigation at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.goto('/rooms/');
    const buttons=page.locator('[data-compare-toggle]');await expect(buttons).toHaveCount(10);
    await expect(page.locator('a button')).toHaveCount(0);
    await buttons.nth(0).click();await expect(buttons.nth(0)).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#compare-open')).toBeDisabled();
    await buttons.nth(1).click();await expect(page.locator('#compare-open')).toBeEnabled();
    await buttons.nth(2).click();await buttons.nth(3).click();
    await expect(page.locator('#compare-count')).toHaveText('3');await expect(buttons.nth(3)).toHaveAttribute('aria-pressed','false');
    await expect(page.locator('#compare-feedback')).toContainText('最多比較三種房型');
    await page.locator('#compare-open').click();const dialog=page.locator('#room-compare');
    await expect(dialog).toHaveAttribute('aria-hidden','false');await expect(dialog.locator('.modal-close')).toBeFocused();
    await expect(dialog.locator('[data-compare-room]:visible')).toHaveCount(3);
    const first=dialog.locator('[data-compare-room="campsite_1"]');
    await expect(first).toContainText('三帳包區 · 12 人以下');await expect(first).toContainText('四帳包區（標準方案） · 16 人以下');
    await expect(first.locator('.compare-plan').nth(1)).toContainText('NT$2,400');
    await expect(first.locator('.compare-plan').first()).toContainText('NT$3,200');
    await expect(first.locator('a')).toHaveAttribute('href','/rooms/campsite_1/');
    await page.keyboard.press('Escape');await expect(page.locator('#compare-open')).toBeFocused();
    await page.reload();await expect(page.locator('#compare-count')).toHaveText('3');
    await page.locator('#compare-clear').click();await expect(page.locator('#compare-tray')).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  });
  test(`context rail tracks visible sections and preserves anchor navigation at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/rooms/');
    const rail=page.locator('[data-section-rail]');await rail.locator('a[href="#suite"]').click();
    await expect(page).toHaveURL(/#suite$/);await expect(rail.locator('[aria-current="location"]')).toHaveAttribute('href','#suite');
    await expect(rail).toBeInViewport();
    await page.goto('/rooms/suite_1/');await page.locator('.room-section-rail a[href="#room-info"]').click();
    await expect(page.locator('.room-section-rail a[href="#room-info"]')).toHaveAttribute('aria-current','location');
    await expect(page.locator('.room-content')).toBeVisible();await expect(page.locator('.booking-notice')).toBeVisible();
    const gap=await page.locator('#room-info').evaluate(e=>e.getBoundingClientRect().top-document.querySelector('.room-section-rail')!.getBoundingClientRect().bottom);expect(gap).toBeGreaterThanOrEqual(-2);
  });
  test(`photo viewer has thumbnails, zoom and focus restoration at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/galleries/');
    const trigger=page.locator('[data-lightbox="photos"]').nth(12);const alt=await trigger.getAttribute('data-alt');await trigger.click();
    const viewer=page.locator('#lightbox');const image=page.locator('#lightbox-image');await expect(image).toBeVisible();await expect(image).toHaveAttribute('alt',alt!);
    await expect(viewer.locator('.viewer-caption')).toHaveText(alt!);await expect(viewer.locator('[data-viewer-current]')).toHaveText('13');
    await viewer.locator('.viewer-zoom').click();await expect(viewer).toHaveClass(/is-zoomed/);await expect(viewer.locator('.viewer-zoom')).toHaveAttribute('aria-pressed','true');
    expect(await viewer.locator('.viewer-stage').evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
    await viewer.locator('.viewer-zoom').click();await viewer.locator('.lightbox-next').click();await expect(viewer.locator('[data-viewer-current]')).toHaveText('14');
    await viewer.locator('[data-viewer-index="0"]').click();await expect(viewer.locator('[data-viewer-current]')).toHaveText('1');
    await page.keyboard.press('Escape');await expect(viewer).toHaveAttribute('aria-hidden','true');await expect(trigger).toBeFocused();
    expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
  });
}

test('room photograph follows a horizontal mouse drag and ignores a vertical gesture',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/rooms/suite_1/');await page.evaluate(()=>document.fonts.ready);const track=page.locator('.carousel-track');await track.scrollIntoViewIfNeeded();const box=await track.boundingBox();
  await page.mouse.move(box!.x+box!.width*.6,box!.y+100);await page.mouse.down();await page.mouse.move(box!.x+box!.width*.35,box!.y+101,{steps:12});
  await expect(track).toHaveClass(/is-dragging/);await page.mouse.up();await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index','1');
  await expect(page.locator('[data-photo-position]')).toHaveText('02');
  await page.locator('.photo-expand').click();await expect(page.locator('#room-lightbox [data-viewer-current]')).toHaveText('2');await page.keyboard.press('Escape');
  const b=await track.boundingBox();await page.mouse.move(b!.x+200,b!.y+120);await page.mouse.down();await page.mouse.move(b!.x+202,b!.y+210,{steps:8});await page.mouse.up();
  await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index','1');
});
test('comparison storage is optional and controls are absent without JavaScript',async({browser,baseURL})=>{
  const denied=await browser.newContext();const p=await denied.newPage();await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('denied');};Storage.prototype.setItem=()=>{throw new Error('denied');};});
  await p.goto(new URL('/rooms/',baseURL).href);await p.locator('[data-compare-toggle]').nth(0).click();await p.locator('[data-compare-toggle]').nth(1).click();await expect(p.locator('#compare-open')).toBeEnabled();await denied.close();
  const nojs=await browser.newContext({javaScriptEnabled:false});const n=await nojs.newPage();await n.goto(new URL('/rooms/',baseURL).href);await expect(n.locator('[data-compare-toggle]').first()).toBeHidden();await expect(n.locator('a.room-card')).toHaveCount(10);
  await n.goto(new URL('/rooms/suite_1/',baseURL).href);await expect(n.locator('.photo-expand')).toBeHidden();await expect(n.locator('.room-content')).toBeVisible();await nojs.close();
});


test('comparison navigation returns to an unlocked page and keeps the selection',async({page})=>{
  await page.goto('/rooms/');await page.locator('[data-compare-toggle]').nth(0).click();await page.locator('[data-compare-toggle]').nth(1).click();
  await page.locator('#compare-open').click();await expect(page.locator('#header')).toHaveAttribute('inert','');
  await page.locator('[data-compare-room="campsite_1"] a').click();await page.waitForURL('**/rooms/campsite_1/');
  await page.goBack();await page.waitForURL('**/rooms/');await expect(page.locator('#room-compare')).not.toHaveClass(/active/);await expect(page.locator('#compare-count')).toHaveText('2');
  await expect(page.locator('#header')).not.toHaveAttribute('inert','');expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
});

test('a failed gallery image keeps the previous picture and navigation usable',async({page})=>{
  await page.goto('/galleries/');await page.locator('[data-lightbox="photos"]').nth(0).click();await expect(page.locator('#lightbox-image')).toHaveAttribute('src',/gallery_1.webp/);
  await page.route('**/galleries/gallery_2.webp',route=>route.abort());await page.locator('#lightbox .lightbox-next').click();
  await expect(page.locator('.viewer-loading')).toContainText('照片無法開啟');await expect(page.locator('#lightbox-image')).toHaveAttribute('src',/gallery_1.webp/);
  await page.locator('#lightbox [data-viewer-index="2"]').click();await expect(page.locator('#lightbox-image')).toHaveAttribute('src',/gallery_3.webp/);await page.keyboard.press('Escape');
  await expect(page.locator('#header')).not.toHaveAttribute('inert','');
});


test('real touch swipes change photos while vertical movement still scrolls the page',async({browser,baseURL})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto(new URL('/rooms/suite_1/#room-carousel',baseURL).href);
  await page.evaluate(()=>document.fonts.ready);await expect(page.locator('.carousel-slide.active img')).toBeVisible();
  const session=await context.newCDPSession(page);const track=page.locator('.carousel-track');const box=await track.boundingBox();
  const y=Math.min(box!.y+100,600),x=box!.x+box!.width*.78;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*20,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index','1');
  const before=await page.evaluate(()=>scrollY);const current=await track.boundingBox();const verticalY=Math.min(current!.y+170,600);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:verticalY}]});
  for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:verticalY-i*15}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+20);
  await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index','1');await context.close();
});


test('comparison traps Tab using visible rooms and does not cover footer actions',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/rooms/');await page.locator('[data-compare-toggle]').nth(0).click();await page.locator('[data-compare-toggle]').nth(1).click();await page.locator('#compare-open').click();
  const close=page.locator('#room-compare .modal-close');const last=page.locator('.compare-room:not([hidden]) .compare-detail').last();
  await last.focus();await page.keyboard.press('Tab');await expect(close).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(last).toBeFocused();await page.keyboard.press('Escape');
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const safe=await page.evaluate(()=>document.querySelector('#footer')!.getBoundingClientRect().bottom<=document.querySelector('#compare-tray')!.getBoundingClientRect().top);
  expect(safe).toBe(true);await expect(page.locator('.compare-chip:not([hidden]) span').first()).toBeVisible();
});
