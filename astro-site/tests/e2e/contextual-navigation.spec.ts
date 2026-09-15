import { expect, test, type Page } from '@playwright/test';

type FrameAudit = { ready: boolean; finished: boolean; skipped: boolean; reason?: string; names: string[];
  oldRoot: string; rootTransform: string; rootFrames: Record<string, unknown>[][];
  photoSources: string[]; photoDuration: string; readyCards: boolean; headerAnimations: string[]; incomingPhotoReady: boolean };
declare global { interface Window { __contextualAudit: FrameAudit } }
async function observe(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('pagereveal', (event) => {
      const state: FrameAudit = {ready:false,finished:false,skipped:false,names:[],oldRoot:'',rootTransform:'',rootFrames:[],photoSources:[],photoDuration:'',readyCards:true,headerAnimations:[],incomingPhotoReady:false};
      const pending=JSON.parse(sessionStorage.getItem('misstravel:room-transition:v1')||'null');
      const image=[...document.querySelectorAll<HTMLImageElement>('[data-room-photo]')].find(i=>i.dataset.roomPhoto===(location.pathname==='/rooms/'?pending?.from:location.pathname)&&!i.closest('[aria-hidden="true"]'));
      if(image){const b=image.getBoundingClientRect();const top=document.getElementById('header')?.getBoundingClientRect().bottom||0;state.incomingPhotoReady=image.complete&&image.naturalWidth>0&&b.width>0&&b.height>0&&Math.min(b.bottom,innerHeight)-Math.max(b.top,top)>=Math.min(b.height*0.5,120)&&b.right>0&&b.left<innerWidth;}
      window.__contextualAudit = state;
      const vt = (event as Event & {viewTransition?: ViewTransition}).viewTransition;
      if (!vt) { state.finished=true; return; }
      vt.ready.then(() => {
        state.ready=true;
        const animations=document.getAnimations() as CSSAnimation[];
        state.names=animations.map(a=>a.animationName||'');
        state.headerAnimations=state.names.filter(n=>n.includes('site-header'));
        state.oldRoot=getComputedStyle(document.documentElement,'::view-transition-old(root)').display;
        state.rootTransform=getComputedStyle(document.documentElement,'::view-transition-new(root)').transform;
        state.rootFrames=animations.filter(a=>a.animationName==='content-settle').map(a=>(a.effect as KeyframeEffect).getKeyframes());
        state.photoSources=[...document.querySelectorAll<HTMLImageElement>('img[data-room-photo]')].filter(i=>i.style.viewTransitionName==='room-photo').map(i=>i.currentSrc||i.src);
        state.photoDuration=getComputedStyle(document.documentElement,'::view-transition-group(room-photo)').animationDuration;
        state.readyCards=[...document.querySelectorAll<HTMLElement>('[data-route-ready]')].every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).filter==='none');
      }).catch((error)=>{state.skipped=true;state.reason=String(error);});
      vt.finished.then(()=>{state.finished=true;});
    });
  });
}
test.beforeEach(async({page})=>{
  // Network blocking excludes analytics without disabling the browser HTTP cache,
  // unlike request interception, which changes real navigation image readiness.
  const network=await page.context().newCDPSession(page);
  await network.send('Network.enable');
  await network.send('Network.setBlockedURLs',{urls:['https://static.cloudflareinsights.com/*']});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await observe(page);
});
async function finished(page: Page) {
  await expect.poll(()=>page.evaluate(()=>window.__contextualAudit?.finished)).toBe(true);
  return page.evaluate(()=>window.__contextualAudit);
}
const slugs=['campsite_1','campsite_2','campsite_3','log_cabin_1','log_cabin_2','log_cabin_3','log_cabin_4','suite_1','suite_2','suite_3'];
for(const width of [390,1440]) {
  test(`ordinary navigation has no overlaid text, travel or second reveal at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.goto('/infos/');
    if(width===1440)await page.locator('#desktop-nav a[href="/rooms/"]').click();
    else{await page.locator('#menu-toggle').click();await page.locator('#menu a[href="/rooms/"]').click();}
    await page.waitForURL('**/rooms/');const state=await finished(page);
    expect(state.ready,JSON.stringify(state)).toBe(true);expect(state.skipped).toBe(false);
    expect(state.oldRoot).toBe('none');expect(state.rootTransform).toBe('none');
    expect(state.headerAnimations).toEqual([]);expect(state.photoSources).toEqual([]);
    expect(state.readyCards).toBe(true);expect(state.names).toContain('content-settle');
    expect(state.names.some(n=>n.startsWith('mist-page-'))).toBe(false);
    for(const frames of state.rootFrames)for(const frame of frames){
      expect(frame.transform).toBeUndefined();expect(frame.filter).toBeUndefined();
      expect(Number(frame.opacity)).toBeGreaterThanOrEqual(0.86);
    }
  });
  for(const slug of slugs) {
    test(`${slug}: selected photo continuity and native back/fallback at ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:900});await page.goto('/rooms/');
      const card=page.locator(`a.room-card[href="/rooms/${slug}/"]`);
      await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(i=>(i as HTMLImageElement).decode());
      await expect(card).toHaveCSS('opacity','1');
      const imageURL=await card.locator('img').evaluate(i=>(i as HTMLImageElement).src);
      const listScroll=await page.evaluate(()=>scrollY);
      await card.click();await page.waitForURL(`**/rooms/${slug}/`);
      const enter=await finished(page);
      expect(enter.ready,JSON.stringify(enter)).toBe(true);expect(enter.skipped).toBe(false);
      expect(enter.photoSources).toEqual([imageURL]);expect(enter.photoDuration).toBe('0.3s');
      expect(enter.oldRoot).toBe('none');expect(enter.headerAnimations).toEqual([]);
      expect(enter.names).toContain('-ua-view-transition-group-anim-room-photo');
      expect(await page.locator('[style*="view-transition-name"]').count()).toBe(0);
      await page.goBack();await page.waitForURL('**/rooms/');const back=await finished(page);
      if(back.incomingPhotoReady){
        expect(back.ready,JSON.stringify(back)).toBe(true);expect(back.photoSources).toEqual([imageURL]);
      }else{
        // Some native history restores happen after pagereveal. Never scroll the
        // user just to manufacture a transition: explicitly assert safe fallback.
        expect(back.skipped,JSON.stringify(back)).toBe(true);expect(back.photoSources).toEqual([]);
        await expect(page.locator('main')).toBeVisible();
      }
      await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-listScroll)).toBeLessThan(4);
      expect(await page.locator('img[data-room-photo][loading="eager"]').count()).toBe(1);
      expect(await page.evaluate(()=>sessionStorage.getItem('misstravel:room-transition:v1'))).toBeNull();
      expect(await page.locator('[style*="view-transition-name"]').count()).toBe(0);
    });
  }
}

test('unavailable tab storage keeps native navigation working without a fabricated shared photo',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('blocked','SecurityError');};});
  await page.goto('/rooms/');await page.locator('a.room-card[href="/rooms/campsite_1/"]').click();
  await page.waitForURL('**/rooms/campsite_1/');const state=await finished(page);
  expect(state.photoSources).toEqual([]);await expect(page.locator('h1')).toBeVisible();
});

test('returning from reading deep in a room does not fly an off-screen image across the page',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/rooms/suite_1/');
  await page.locator('.room-content').scrollIntoViewIfNeeded();
  await page.locator('#desktop-nav a[href="/rooms/"]').click();await page.waitForURL('**/rooms/');
  expect((await finished(page)).photoSources).toEqual([]);
});
