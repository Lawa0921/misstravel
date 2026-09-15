import { expect, test, type Page } from '@playwright/test';

type TransitionAudit = { started: boolean; ready: boolean; finished: boolean; skipped: boolean; names: string[] };
declare global { interface Window { __navigationAudit: TransitionAudit } }

async function observeTransitions(page: Page) {
  await page.addInitScript(() => {
    const state: TransitionAudit = { started: false, ready: false, finished: false, skipped: false, names: [] };
    window.__navigationAudit = state;
    window.addEventListener('pagereveal', (event) => {
      const transition = (event as Event & { viewTransition?: ViewTransition }).viewTransition;
      if (!transition) return;
      state.started = true;
      transition.ready.then(() => {
        state.ready = true;
        state.names = document.getAnimations().map((animation) => (animation as CSSAnimation).animationName || '');
      }).catch(() => { state.skipped = true; });
      transition.finished.then(() => { state.finished = true; });
    });
    // Observe after application listeners: an init-script listener alone runs
    // before the page's cleanup and would measure an intermediate, not captured state.
    document.addEventListener('DOMContentLoaded', () => {
      window.addEventListener('pageswap', () => {
        const menu = document.getElementById('menu');
        sessionStorage.setItem('navigation-menu-snapshot', JSON.stringify({
          visible: menu?.classList.contains('is-visible'),
          opacity: menu ? getComputedStyle(menu).opacity : null,
          overflow: document.body.style.overflow,
        }));
      });
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/beacon.min.js*', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
});

for (const width of [390, 1440]) {
  test(`header has an unframed menu with keyboard focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/infos/');
    const toggle = page.locator('#menu-toggle');
    await expect(toggle).toHaveCSS('border-top-width', '0px');
    await expect(toggle).toHaveCSS('box-shadow', 'none');
    const box = await toggle.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await toggle.focus();
    await expect(toggle).toHaveCSS('outline-style', 'solid');
    await expect(toggle).toHaveCSS('outline-width', '2px');
    await page.keyboard.press('Enter');
    await expect(page.locator('#menu-close')).toBeFocused();
    await expect(page.locator('#menu-close')).toHaveCSS('border-top-width', '0px');
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    if (width === 1440) {
      const nav = page.locator('#desktop-nav');
      await expect(nav.locator('a')).toHaveText(['首頁', '房型展示', '關於密式', '密式圖集']);
      await expect(nav.getByRole('link', { name: '關於密式' })).toHaveAttribute('href', '/infos/');
      await expect(nav.locator('[aria-current="page"]')).toHaveText('關於密式');
      await expect(nav.locator('a[href="/infos/guide/"]')).toHaveCount(0);
      await expect(page.locator('#menu a[href="/infos/guide/"]')).toHaveCount(1);
    }
  });
}

for (const reduced of [false, true]) {
  test(`native document navigation ${reduced ? 'disables motion' : 'runs the designed transition'}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await observeTransitions(page);
    await page.goto('/infos/');
    await page.locator('#desktop-nav a[href="/rooms/"]').click();
    await page.waitForURL('**/rooms/');
    await expect(page.locator('h1')).toHaveText('房型展示');
    if (reduced) {
      await expect.poll(() => page.evaluate(() => window.__navigationAudit.started)).toBe(false);
      await expect(page.locator('#header')).toHaveCSS('view-transition-name', 'none');
    } else {
      await expect.poll(() => page.evaluate(() => window.__navigationAudit.ready)).toBe(true);
      const state = await page.evaluate(() => window.__navigationAudit);
      expect(state.skipped).toBe(false);
      expect(state.names).toContain('mist-page-in');
      expect(state.names).toContain('mist-page-out');
      await expect.poll(() => page.evaluate(() => window.__navigationAudit.finished)).toBe(true);
    }
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 41, 67)');
    await expect(page.locator('#room-carousel')).toHaveCount(0);
    const arrived = await page.evaluate(() => window.__navigationAudit);
    await page.locator('a[href="#suite"]').click();
    await expect(page).toHaveURL(/#suite$/);
    expect(await page.evaluate(() => window.__navigationAudit)).toEqual(arrived);
  });
}

test('menu link leaves no fading overlay or scroll lock in the page snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeTransitions(page);
  await page.goto('/infos/');
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#menu-close')).toBeFocused();
  await page.locator('#menu a[href="/rooms/"]').click();
  await page.waitForURL('**/rooms/');
  await expect.poll(() => page.evaluate(() => window.__navigationAudit.finished)).toBe(true);
  const old = await page.evaluate(() => JSON.parse(sessionStorage.getItem('navigation-menu-snapshot')!));
  expect(old).toEqual({ visible: false, opacity: '0', overflow: '' });
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/infos/');
  await expect(page.locator('#menu')).not.toHaveClass(/is-visible/);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('native history restores reading position and interactions remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/infos/');
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  await page.locator('#desktop-nav a[href="/rooms/"]').click();
  await page.waitForURL('**/rooms/');
  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/infos/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(600);
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#menu-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-toggle')).toBeFocused();
});

test('JavaScript-disabled navigation and original booking target remain intact', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(new URL('/rooms/', baseURL).href);
  await page.locator('#desktop-nav a[href="/infos/"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/infos/');
  await expect(page.locator('h1')).toHaveText('關於密式');
  const booking = page.locator('#footer a[href="https://roomcloud.cc/hotels/misstravel/booking"]');
  await expect(booking).toHaveAttribute('target', '_blank');
  await expect(booking).toHaveAttribute('rel', /noopener/);
  await context.close();
});
