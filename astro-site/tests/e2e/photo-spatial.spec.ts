import { expect, test, type Page } from '@playwright/test';

const room = '/rooms/suite_1/';
const flight = '[data-photo-flight]';
async function setup(page: Page, path = room) {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  const source = page.locator(path === room ? '.carousel-slide.active img' : '[data-lightbox="photos"] img').first();
  await source.scrollIntoViewIfNeeded();
  await expect.poll(() => source.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  // Pause only decorative WAAPI flights so assertions observe actual animation, not timing luck.
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (typeof options === 'object' && options?.id?.startsWith('photo-spatial-')) animation.pause();
      return animation;
    };
  });
}
async function assertFlight(page: Page, direction: string) {
  const clone = page.locator(flight);
  await expect(clone).toHaveAttribute('data-photo-flight', direction);
  await expect(clone).toHaveAttribute('aria-hidden', 'true');
  await expect(clone).toHaveAttribute('inert', '');
  expect(await clone.evaluate(el => {
    const animations = el.getAnimations({ subtree: true });
    return animations.some(a => a.id === `photo-spatial-${el.getAttribute('data-photo-flight')}` &&
      (a.effect as KeyframeEffect).getKeyframes().length === 2 && a.effect!.getTiming().duration === 320);
  })).toBe(true);
  const motion = await clone.evaluate(el => {
    const animations = el.getAnimations({ subtree: true });
    animations.forEach(a => { a.currentTime = 0; });
    const first = el.getBoundingClientRect();
    animations.forEach(a => { a.currentTime = 160; });
    const middle = el.getBoundingClientRect();
    const photo = el.querySelector('img')!;
    const box = photo.getBoundingClientRect();
    return { moved: Math.abs(first.width-middle.width)+Math.abs(first.x-middle.x)+Math.abs(first.y-middle.y), ratio: box.width/box.height, naturalRatio: photo.naturalWidth/photo.naturalHeight };
  });
  expect(motion.moved).toBeGreaterThan(1);
  expect(motion.ratio).toBeCloseTo(motion.naturalRatio, 2);
  expect(await clone.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(clone.locator('[id], [data-lightbox]')).toHaveCount(0);
  expect(await clone.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
}
for (const path of [room, '/galleries/']) {
  test(`loaded same-photo opening and closing flights: ${path}`, async ({ page }) => {
    await setup(page, path);
    const trigger = page.locator(path === room ? '.photo-expand' : '[data-lightbox="photos"]').first();
    await trigger.click();
    await assertFlight(page, 'open');
    const src = await page.locator('[data-viewer-image]').getAttribute('src');
    await expect(page.locator(`${flight} img`)).toHaveAttribute('src', new URL(src!,page.url()).href);
    await page.locator('.lightbox-close').click();
    await expect(page.locator('[data-photo-viewer]')).toHaveAttribute('aria-hidden', 'true');
    await expect(trigger).toBeFocused();
    await assertFlight(page, 'close');
    await page.evaluate(() => document.getAnimations().filter(a => a.id.startsWith('photo-spatial-')).forEach(a => a.finish()));
    await expect(page.locator(flight)).toHaveCount(0);
  });
}
for (const close of ['click', 'Escape']) {
  test(`room keeps successfully viewed photo and scroll/focus on ${close}`, async ({ page }) => {
    await setup(page);
    await page.locator('.photo-expand').click();
    await page.locator('.lightbox-next').click();
    await expect(page.locator('[data-viewer-current]')).toHaveText('2');
    await expect(page.locator(flight)).toHaveCount(0);
    const before = await page.evaluate(() => scrollY);
    if (close === 'click') await page.locator('.lightbox-close').click();
    else await page.keyboard.press('Escape');
    await assertFlight(page, 'close');
    await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index', '1');
    await expect(page.locator('.photo-expand')).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await page.locator('.photo-expand').click();
    await expect(page.locator('[data-viewer-current]')).toHaveText('2');
    await page.keyboard.press('Escape');
  });
}
test('rapid close/reopen and late loading never resurrect or replace the last photo', async ({ page }) => {
  await setup(page);
  const sources = await page.locator('[data-viewer-data]').evaluate(el => JSON.parse(el.textContent!) as {src:string}[]);
  const target = sources.length - 3;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${sources[target].src}`, async route => { await gate; await route.continue(); });
  await page.locator('.photo-expand').click();
  await expect(page.locator('[data-viewer-image]')).toBeVisible();
  await page.locator(`[data-viewer-index="${target}"]`).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index', '0');
  await page.locator('.photo-expand').click();
  const response = page.waitForResponse(r => new URL(r.url()).pathname === new URL(sources[target].src, page.url()).pathname);
  release();
  await (await response).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('[data-viewer-current]')).toHaveText('1');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator(flight)).toHaveCount(0);
  await expect(page.locator('[data-photo-viewer]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.photo-expand')).toBeFocused();
});
test('failed requested photo preserves the successful room selection', async ({ page }) => {
  await setup(page);
  const sources = await page.locator('[data-viewer-data]').evaluate(el => JSON.parse(el.textContent!) as {src:string}[]);
  const target = sources.length - 3;
  await page.route(`**${sources[target].src}`, route => route.abort());
  await page.locator('.photo-expand').click();
  await expect(page.locator('[data-viewer-image]')).toBeVisible();
  await page.locator(`[data-viewer-index="${target}"]`).click();
  await expect(page.locator('.viewer-loading')).toContainText('照片無法開啟');
  await page.keyboard.press('Escape');
  await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index', '0');
});
test('reduced motion changes, zoom and offscreen destinations suppress flights', async ({ page }) => {
  await setup(page, '/galleries/');
  await page.locator('[data-lightbox="photos"]').first().click();
  await assertFlight(page, 'open');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator(flight)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('[data-lightbox="photos"]').first().click();
  await expect(page.locator(flight)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.viewer-zoom').click();
  await page.keyboard.press('Escape');
  await expect(page.locator(flight)).toHaveCount(0);
  await page.locator('[data-lightbox="photos"]').first().click();
  await page.locator('[data-viewer-index]').last().click();
  const total = await page.locator('[data-viewer-index]').count();
  await expect(page.locator('[data-viewer-current]')).toHaveText(String(total));
  const scroll = await page.evaluate(() => scrollY);
  await page.keyboard.press('Escape');
  await expect(page.locator(flight)).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
});
test('unloaded source opens normally and resize removes decoration', async ({ page }) => {
  await setup(page);
  await page.locator('.carousel-slide.active img').evaluate((img: HTMLImageElement) => img.removeAttribute('src'));
  await page.locator('.photo-expand').click();
  await expect(page.locator('[data-photo-viewer]')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator(flight)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('.photo-expand').click();
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await expect(page.locator(flight)).toHaveCount(0);
});
test('without JavaScript original room photos and gallery image links remain available', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(new URL(room, baseURL).href);
  await expect(page.locator('.photo-expand')).toBeHidden();
  await expect(page.locator('.carousel-noscript img').first()).toBeVisible();
  await page.goto(new URL('/galleries/', baseURL).href);
  await expect(page.locator('[data-lightbox="photos"]').first()).toHaveAttribute('href', /\.webp$/);
  await expect(page.locator('[data-lightbox="photos"] img').first()).toBeVisible();
  await expect(page.locator(flight)).toHaveCount(0);
  await context.close();
});

test('same-task open/Escape closes once, releases scroll and cancels the queued opening frame', async ({ page }) => {
  await setup(page);
  await page.locator('.photo-expand').focus();
  const closes = await page.evaluate(() => {
    let count = 0;
    const viewer = document.querySelector('[data-photo-viewer]')!;
    viewer.addEventListener('viewer:close', () => count++);
    (document.querySelector('.photo-expand') as HTMLButtonElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return new Promise<number>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(count))));
  });
  expect(closes).toBe(1);
  await expect(page.locator('[data-photo-viewer]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.photo-expand')).toBeFocused();
  await expect(page.locator(flight)).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await page.locator('.photo-expand').click();
  await expect(page.locator('[data-photo-viewer]')).toHaveAttribute('aria-hidden', 'false');
});


test('a live image decode failure after preload restores the last successfully shown photo', async ({ page }) => {
  await setup(page);
  await page.locator('.photo-expand').click();
  await expect(page.locator('[data-viewer-current]')).toHaveText('1');
  const previous = await page.locator('[data-viewer-image]').getAttribute('src');
  const sources = await page.locator('[data-viewer-data]').evaluate(el => JSON.parse(el.textContent!) as {src: string}[]);
  // Fail only the live image assignment, not the detached preloader. This exercises
  // the second readiness check without changing the production readiness helper.
  await page.evaluate((target) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
    let failed = false;
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...descriptor,
      set(value: string) {
        if (!failed && this.matches('[data-viewer-image]') && value === target) {
          failed = true;
          descriptor.set!.call(this, 'data:image/png;base64,invalid');
        } else descriptor.set!.call(this, value);
      },
    });
  }, sources[1].src);
  await page.locator('[data-viewer-index="1"]').click();
  await expect(page.locator('.viewer-loading')).toContainText('照片無法開啟');
  await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', previous!);
  await expect(page.locator('[data-viewer-current]')).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('.carousel-slide.active')).toHaveAttribute('data-index', '0');
  await expect(page.locator('.photo-expand')).toBeFocused();
});
