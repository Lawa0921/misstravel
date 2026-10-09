import { expect, test } from '@playwright/test';
import { load } from 'cheerio';

test('leading room cards remain visible when reveal JavaScript is delayed', async ({ page }) => {
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.dataset.motion = 'ready';
  }));
  await page.route('**/assets/*.js', route => route.abort());
  await page.goto('/rooms/');
  for (let i = 0; i < 2; i++) {
    const card = page.locator('.room-card').nth(i);
    await expect(card).toHaveCSS('opacity', '1');
    await expect(card.locator('img')).toHaveAttribute('loading', 'eager');
  }
});

test('carousel waits for its first image before speculative neighbour downloads', async ({ page }) => {
  const html = await (await page.request.get('/rooms/log_cabin_2/')).text();
  const $ = load(html); const first = $('.carousel-slide img').first();
  const sources = [first.attr('src')!, ...(first.attr('srcset') || '').split(',').map(s => s.trim().split(' ')[0])];
  let release!: () => void; const gate = new Promise<void>(resolve => release = resolve);
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'image' && sources.includes(new URL(route.request().url()).pathname)) await gate;
    await route.continue();
  });
  try {
    await page.goto('/rooms/log_cabin_2/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#room-carousel')).toHaveAttribute('data-a11y-ready', 'true');
    await page.waitForTimeout(300);
    await expect(page.locator('.carousel-slide img[src]')).toHaveCount(1);
  } finally { release(); }
  await expect(page.locator('.carousel-slide img[src]')).toHaveCount(3);
});

test('carousel changes only the two affected slide states and ignores drag styling', async ({ page }) => {
  await page.goto('/rooms/log_cabin_2/');
  const carousel = page.locator('#room-carousel');
  await carousel.scrollIntoViewIfNeeded();
  await expect(page.locator('.carousel-slide img').nth(1)).toHaveAttribute('src', /\/images\//);
  await page.locator('.carousel-slide img').nth(1).evaluate(async (image: HTMLImageElement) => image.decode());
  await page.evaluate(() => {
    (window as any).__ariaChanges = [];
    new MutationObserver(records => (window as any).__ariaChanges.push(...records.map(r => r.attributeName)))
      .observe(document.querySelector('#room-carousel')!, { subtree: true, attributes: true, attributeFilter: ['aria-hidden', 'aria-current'] });
  });
  await carousel.locator('.next').click();
  await expect(carousel.locator('.carousel-slide.active')).toHaveAttribute('data-index', '1');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).__ariaChanges.length)).toBeLessThanOrEqual(4);
  await page.evaluate(() => {
    (window as any).__ariaChanges = [];
    document.querySelector<HTMLElement>('.carousel-track')!.style.transform = 'translateX(-100%)';
  });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).__ariaChanges.length)).toBe(0);
  await carousel.focus(); await page.keyboard.press('ArrowLeft');
  await expect(carousel.locator('.carousel-slide.active')).toHaveAttribute('data-index', '0');
  await expect(carousel.locator('.dot').first()).toHaveAttribute('aria-current', 'true');
});

for (const [width, dpr] of [[390, 1], [390, 2], [1440, 1]]) {
  test(`first-room responsive preload makes one selected image request at ${width}px DPR${dpr}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr });
    try {
      const page = await context.newPage(); const requests: string[] = [];
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.setBlockedURLs', { urls: ['*static.cloudflareinsights.com/*'] });
      page.on('request', request => { if (request.resourceType() === 'image') requests.push(request.url()); });
      await page.goto(new URL('/rooms/', baseURL).href);
      const image = page.locator('.room-card img').first();
      await image.evaluate(async (image: HTMLImageElement) => image.decode());
      const chosen = await image.evaluate((image: HTMLImageElement) => ({ current: image.currentSrc, original: image.src }));
      await page.waitForLoadState('networkidle');
      expect(requests.filter(url => url === chosen.current)).toHaveLength(1);
      if (chosen.current !== chosen.original) expect(requests.filter(url => url === chosen.original)).toHaveLength(0);
      expect(await image.getAttribute('fetchpriority')).toBe('high');
    } finally { await context.close(); }
  });
}
