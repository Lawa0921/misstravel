import { test, expect } from '@playwright/test';

const key = 'misstravel:compare:v1';
test('collection is immediate, decorative, and cancellable with visible endpoints', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto('/rooms/');
  const toggle = page.locator('[data-compare-toggle]').first();
  await toggle.scrollIntoViewIfNeeded();
  await page.locator('.room-option img').first().evaluate(async (img: HTMLImageElement) => img.decode());
  await expect(toggle.locator('xpath=ancestor::a')).toHaveCount(0);
  const result = await toggle.evaluate((button: HTMLButtonElement) => {
    button.click();
    const clone = document.querySelector('[data-compare-decoration="flight"]');
    return { pressed: button.getAttribute('aria-pressed'), count: document.querySelector('#compare-count')?.textContent,
      hidden: clone?.getAttribute('aria-hidden'), inert: clone?.hasAttribute('inert'),
      animation: clone?.getAnimations()[0]?.id, interactive: clone?.matches('[id], [tabindex], [href]') };
  });
  expect(result).toEqual({ pressed: 'true', count: '1', hidden: 'true', inert: true, animation: 'compare-collect', interactive: false });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect(page.locator('[data-compare-decoration="flight"]')).toHaveCount(0);
});

test('panel removal retains useful focus and closes below two', async ({ page }) => {
  await page.goto('/rooms/');
  for (const button of (await page.locator('[data-compare-toggle]').all()).slice(0, 3)) await button.click();
  await page.locator('#compare-open').click();
  const removes = page.locator('[data-compare-panel-remove]:visible');
  await removes.first().click();
  await expect(removes).toHaveCount(2);
  await expect(page.locator('#room-compare')).toHaveClass(/active/);
  expect(await page.evaluate(() => !!document.activeElement?.matches('[data-compare-panel-remove], #room-compare .modal-close'))).toBe(true);
  await removes.first().click();
  await expect(page.locator('#room-compare')).not.toHaveClass(/active/);
  await expect(page.locator('.compare-chip:visible').first()).toBeFocused();
  await expect(page.locator('#header')).not.toHaveAttribute('inert');
});

test('single control retains valid other rooms, deduplicates and reloads on pageshow', async ({ page }) => {
  await page.addInitScript((storageKey) => {
    sessionStorage.setItem(storageKey, JSON.stringify(['campsite_1', 'campsite_1', 'unknown', 'campsite_2']));
    // Emulate the detail-page control contract before the bundled script executes.
    new MutationObserver(() => document.querySelectorAll('[data-compare-toggle]').forEach((el, i) => { if (i) el.remove(); })).observe(document, { childList: true, subtree: true });
  }, key);
  await page.goto('/rooms/');
  await expect(page.locator('[data-compare-toggle]')).toHaveCount(1);
  await expect(page.locator('#compare-count')).toHaveText('2');
  await page.evaluate((storageKey) => { sessionStorage.setItem(storageKey, '["campsite_2"]'); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }, key);
  await expect(page.locator('#compare-count')).toHaveText('1');
});

test('denied storage and reduced motion keep controls immediate without a flight', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('denied'); } }); });
  await page.goto('/rooms/');
  await page.locator('[data-compare-toggle]').first().click();
  await expect(page.locator('[data-compare-toggle]').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-compare-decoration="flight"]')).toHaveCount(0);
  await page.locator('[data-compare-toggle]').nth(1).click();
  await expect(page.locator('#compare-open')).toBeEnabled();
});

for (const width of [320, 390]) test(`tray clears footer at ${width}px and 200% text`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/rooms/');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  for (const button of (await page.locator('[data-compare-toggle]').all()).slice(0, 3)) await button.click();
  await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--compare-clearance')) >= document.querySelector('#compare-tray')!.getBoundingClientRect().height)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => document.querySelector('#footer')!.getBoundingClientRect().bottom <= document.querySelector('#compare-tray')!.getBoundingClientRect().top)).toBe(true);
  await expect(page.locator('.compare-chip:visible span').first()).toBeVisible();
});

test('saved selections survive real list/detail navigation and history', async ({ page }) => {
  await page.goto('/rooms/');
  await page.locator('[data-compare-toggle]').nth(0).click();
  await page.locator('[data-compare-toggle]').nth(1).click();
  await page.locator('a.room-card').first().click();
  await page.waitForURL('**/rooms/campsite_1/');
  // Coordinator mounts CompareAction and RoomCompare on the detail page.
  await expect(page.locator('[data-compare-toggle]')).toHaveCount(1);
  await expect(page.locator('#compare-count')).toHaveText('2');
  await page.reload();
  await expect(page.locator('#compare-count')).toHaveText('2');
  await page.locator('#compare-open').click();
  await page.locator('[data-compare-panel-remove]:visible').first().click();
  await expect(page.locator('#compare-count')).toHaveText('1');
  await page.goBack();
  await expect(page.locator('#compare-count')).toHaveText('1');
  await expect(page.locator('#room-compare')).not.toHaveClass(/active/);
});

test('offscreen source falls back immediately and no-JS controls remain hidden', async ({ page, browser, baseURL }) => {
  await page.goto('/rooms/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('[data-compare-toggle]').first().evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('#compare-count')).toHaveText('1');
  await expect(page.locator('[data-compare-decoration="flight"]')).toHaveCount(0);
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const nojs = await context.newPage();
    await nojs.goto(new URL('/rooms/', baseURL).href);
    await expect(nojs.locator('[data-compare-toggle]').first()).toBeHidden();
    await expect(nojs.locator('#compare-tray')).toBeHidden();
    await expect(nojs.locator('a.room-card')).toHaveCount(10);
  } finally { await context.close(); }
});
