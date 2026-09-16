import { expect, test } from '@playwright/test';
const cases = [
  { path: '/rooms/', selectors: ['.room-card', '.room-prices', '.room-image'] },
  { path: '/rooms/suite_1/', selectors: ['#main-content', '.notice-panel', '.booking-notice', '.related-card', '.room-summary'] },
  { path: '/rooms/campsite_1/', selectors: ['#main-content', '.notice-panel', '.booking-notice', '.related-card', '.room-summary'] },
];
for (const width of [390, 1440]) {
  test.describe(`Consistent dark presentation at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, contextOptions: { reducedMotion: 'reduce' } });
    for (const entry of cases) {
      test(`${entry.path} keeps every reading surface dark in both OS themes`, async ({ page }) => {
        for (const colorScheme of ['light', 'dark'] as const) {
          await page.emulateMedia({ colorScheme });
          await page.goto(entry.path);
          for (const selector of entry.selectors) {
            const surfaces = await page.locator(selector).all();
            expect(surfaces.length, `Expected ${selector} on ${entry.path}`).toBeGreaterThan(0);
            for (const surface of surfaces) {
              await expect(surface).toHaveCSS('background-color', /rgb\(36, 41, 67\)|rgb\(42, 47, 74\)/);
            }
          }
          await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 41, 67)');
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
      });
    }
    test('room card stays dark and legible on hover and keyboard focus', async ({ page }) => {
      await page.goto('/rooms/');
      const card = page.locator('.room-card').first();
      await card.hover();
      await expect(card).toHaveCSS('background-color', 'rgb(42, 47, 74)');
      await expect(card.locator('h3')).toHaveCSS('color', 'rgb(245, 240, 230)');
      await card.focus();
      await expect(card).toHaveCSS('background-color', 'rgb(42, 47, 74)');
      await expect(card).toHaveCSS('color', 'rgb(245, 240, 230)');
      await expect(card).toBeFocused();
    });
  });
}
