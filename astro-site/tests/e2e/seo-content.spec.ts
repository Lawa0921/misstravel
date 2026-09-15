import { expect, test } from '@playwright/test';

test('room metadata and operating copy resolve without client-side price hydration', async ({ page }) => {
  await page.goto('/rooms/campsite_1/');
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toContain('三帳12人以下平日2400元');
  expect(description).toContain('四帳16人以下平日3200元');
  await expect(page.locator('.room-content')).toContainText('平日 3200 元、假日 4000 元、連續假日 4800 元');
  await expect(page.locator('.room-content')).not.toContainText('{{');
  const nodes = await page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.map(el => JSON.parse(el.textContent!)));
  expect(nodes.filter(n => n['@type'] === 'Accommodation')).toHaveLength(1);
  expect(nodes.filter(n => n['@type'] === 'LodgingBusiness')).toHaveLength(1);
});

test('the reviewed second suite photograph remains accessible without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/rooms/suite_1/');
  const second = page.locator('noscript.carousel-noscript img').first();
  await expect(second).toHaveAttribute('src', '/images/suite_1/suite_1_1.webp?v=20260702');
  await expect(second).toHaveAttribute('alt', '密式之眼近雲樓平台旁的衛浴入口');
  await expect(second).toBeVisible();
  await expect(page.locator('.room-content')).toContainText('此房型平日無附早餐');
  await context.close();
});

test('image sitemap responds as XML and lists original photographic URLs', async ({ request }) => {
  const response = await request.get('/image-sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('xml');
  const xml = await response.text();
  expect(xml).toContain('/images/suite_1/suite_1_4.webp?v=20260702');
  expect(xml).toContain('/images/galleries/gallery_36.webp');
  expect(xml).not.toContain('booking_announcement.webp');
});
