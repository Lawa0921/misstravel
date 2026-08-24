import { expect, test } from '@playwright/test';

test.describe('山霧景深互動', () => {
  test('照片光影不得使用近似 @ 的等高線圖樣', async ({ page }) => {
    await page.goto('/rooms/');

    const roomImageEffect = await page.locator('.room-image').first().evaluate((element) =>
      getComputedStyle(element, '::before').backgroundImage,
    );
    expect(roomImageEffect).not.toBe('none');
    expect(roomImageEffect).not.toContain('image/svg+xml');

    await page.goto('/');
    expect(await page.locator('#tiles .tile').first().evaluate((element) =>
      getComputedStyle(element, '::after').backgroundImage,
    )).not.toContain('image/svg+xml');
  });

  test('首頁卡片應在捲入後浮現並回應指標位置', async ({ page }) => {
    await page.goto('/');

    const tile = page.locator('#tiles .tile').first();
    await tile.scrollIntoViewIfNeeded();
    await expect(tile).toHaveAttribute('data-motion-card', '');
    await expect(tile).toHaveClass(/is-revealed/);

    const box = await tile.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height * 0.25);

    await expect.poll(() => tile.evaluate((element) =>
      element.style.getPropertyValue('--motion-x'),
    )).not.toBe('50%');
    await expect.poll(() => tile.evaluate((element) =>
      element.style.getPropertyValue('--motion-rotate-x'),
    )).toMatch(/deg$/);

    await tile.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      element.dispatchEvent(new PointerEvent('pointermove', {
        clientX: rect.right - 1,
        clientY: rect.top + 1,
      }));
      element.dispatchEvent(new PointerEvent('pointerleave'));
    });
    await expect.poll(() => tile.evaluate((element) =>
      element.style.getPropertyValue('--motion-rotate-x'),
    )).toBe('0deg');
    await expect.poll(() => tile.evaluate((element) =>
      element.style.getPropertyValue('--motion-rotate-y'),
    )).toBe('0deg');
  });

  test('房型與圖集應共用同一套互動語言', async ({ page }) => {
    await page.goto('/rooms/');
    await expect(page.locator('.room-card').first()).toHaveAttribute('data-motion-card', '');

    await page.goto('/galleries/');
    await expect(page.locator('.item').first()).toHaveAttribute('data-motion-card', '');
  });

  test('快速跳捲後圖集不得留下透明卡片', async ({ page }) => {
    await page.addInitScript(() => {
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
        root = null;
        rootMargin = '';
        scrollMargin = '';
        thresholds = [];
      };
    });
    await page.goto('/galleries/');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1600);

    await expect(page.locator('.item:not(.is-revealed)')).toHaveCount(0);
  });

  test('減少動畫偏好下應停用景深轉動', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/rooms/');

    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('.room-card').first()).toHaveClass(/is-revealed/);
    await expect(page.locator('.room-card').first()).toHaveCSS('transform', 'none');
  });
});

test.describe('主選單鍵盤操作', () => {
  test('Tab 焦點應鎖在選單內，Escape 後回到 Menu', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('#menu-toggle');
    const menu = page.locator('#menu');
    const close = page.locator('#menu-close');
    const lastLink = menu.locator('a').last();

    await toggle.click();
    await expect(menu).toHaveClass(/is-visible/);
    await expect(menu).toHaveAttribute('aria-hidden', 'false');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(close).toBeFocused();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await lastLink.focus();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(lastLink).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveClass(/is-visible/);
    await expect(menu).toHaveAttribute('aria-hidden', 'true');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('手機寬度下選單仍可正常開關並恢復焦點', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const toggle = page.locator('#menu-toggle');
    const menu = page.locator('#menu');

    await toggle.click();
    await expect(menu).toHaveClass(/is-visible/);
    await expect(page.locator('#menu-close')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveClass(/is-visible/);
    await expect(toggle).toBeFocused();
  });
});

test('圖集 Lightbox 應支援方向鍵、Escape 與焦點返回', async ({ page }) => {
  await page.goto('/galleries/');

  const firstImageLink = page.locator('[data-lightbox="photos"]').first();
  const lightbox = page.locator('#lightbox');
  const close = lightbox.locator('.lightbox-close');

  await firstImageLink.click();
  await expect(lightbox).toHaveClass(/active/);
  await expect(lightbox).toHaveAttribute('aria-hidden', 'false');
  await expect(close).toBeFocused();
  await expect(page.locator('#lightbox-current')).toHaveText('1');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#lightbox-current')).toHaveText('2');

  await page.keyboard.press('Escape');
  await expect(lightbox).not.toHaveClass(/active/);
  await expect(lightbox).toHaveAttribute('aria-hidden', 'true');
  await expect(firstImageLink).toBeFocused();
});

test('柑仔店 Modal 關閉後應恢復焦點與頁面捲動', async ({ page }) => {
  await page.goto('/sale_items/');

  const trigger = page.getByRole('button', { name: '烹飪組合' });
  const modal = page.locator('#sale_item_1');
  const close = modal.locator('.modal-close');

  await trigger.click();
  await expect(modal).toHaveClass(/active/);
  await expect(modal).toHaveAttribute('aria-hidden', 'false');
  await expect(close).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

  await page.keyboard.press('Escape');
  await expect(modal).not.toHaveClass(/active/);
  await expect(modal).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('房型輪播應延後非相鄰圖片請求並維持 ARIA 與鍵盤操作', async ({ page }) => {
  const requestedImages: string[] = [];
  const responseReads: Promise<void>[] = [];
  let sameOriginBytes = 0;

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/images/log_cabin_4/')) requestedImages.push(url.pathname);
  });

  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin !== 'http://127.0.0.1:4334') return;
    responseReads.push(
      response.body()
        .then((body) => { sameOriginBytes += body.byteLength; })
        .catch(() => undefined),
    );
  });

  await page.goto('/rooms/log_cabin_4/', { waitUntil: 'networkidle' });
  await Promise.all(responseReads);

  const carousel = page.locator('#room-carousel');
  const dots = carousel.locator('.dot');
  const images = carousel.locator('.carousel-slide img');
  const next = carousel.locator('.next');
  const deferredImage = '/images/log_cabin_4/log_cabin_4_1.webp';

  console.log(`log_cabin_4 initial same-origin resources: ${(sameOriginBytes / 1024 / 1024).toFixed(2)} MB`);
  expect(sameOriginBytes).toBeLessThan(2 * 1024 * 1024);
  expect(requestedImages).toEqual([]);
  await expect(carousel).toHaveAttribute('role', 'region');
  await expect(dots.first()).toHaveAttribute('aria-current', 'true');
  await expect(images.nth(2)).toHaveAttribute('data-src', deferredImage);
  expect(await images.nth(2).getAttribute('src')).toBeNull();

  await next.click();
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(images.nth(2)).toHaveAttribute('src', deferredImage);
  await expect.poll(() => requestedImages.includes(deferredImage)).toBe(true);

  await next.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(dots.first()).toHaveAttribute('aria-current', 'true');
});
