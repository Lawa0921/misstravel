import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { load } from 'cheerio';
import { join } from 'path';

const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  const filePath = join(distDir, path);
  if (!existsSync(filePath)) {
    throw new Error(`Page not found: ${filePath}`);
  }
  return load(readFileSync(filePath, 'utf-8'));
}

// 1. 全站圖片 decoding="async"
describe('1. 圖片 decoding="async"', () => {
  it('galleries 頁圖片應有 decoding="async"', () => {
    const $ = readPage('galleries/index.html');
    const imgs = $('.item img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding'), `missing decoding on ${$(el).attr('src')}`).toBe('async');
    });
  });

  it('rooms 列表頁圖片應有 decoding="async"', () => {
    const $ = readPage('rooms/index.html');
    const imgs = $('.room-image img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding'), `missing decoding on ${$(el).attr('src')}`).toBe('async');
    });
  });

  it('infos 列表頁圖片應有 decoding="async"', () => {
    const $ = readPage('infos/index.html');
    const imgs = $('.spotlights img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding'), `missing decoding on ${$(el).attr('src')}`).toBe('async');
    });
  });

  it('announcements 列表頁圖片應有 decoding="async"', () => {
    const $ = readPage('announcements/index.html');
    const imgs = $('.card-image img');
    if (imgs.length > 0) {
      imgs.each((_, el) => {
        expect($(el).attr('decoding'), `missing decoding on ${$(el).attr('src')}`).toBe('async');
      });
    }
  });
});

// 2. 公告詳情頁 featured image loading="lazy"
describe('2. 公告詳情頁 featured image lazy loading', () => {
  it('featured image 應有 loading="lazy"', () => {
    const $ = readPage('announcements/website/index.html');
    const img = $('.featured-image img');
    if (img.length > 0) {
      expect(img.attr('loading')).toBe('lazy');
    }
  });
});

// 3. map.md / menu.md 圖片 loading="lazy"
describe('3. 地圖與菜單頁圖片 lazy loading', () => {
  it('地圖頁圖片應有 loading="lazy"', () => {
    const $ = readPage('infos/map/index.html');
    const img = $('img[src="/images/map.webp"]');
    expect(img.attr('loading')).toBe('lazy');
  });

  it('菜單頁圖片應有 loading="lazy"', () => {
    const $ = readPage('infos/menu/index.html');
    const img = $('img[src="/images/menu.webp"]');
    expect(img.attr('loading')).toBe('lazy');
  });
});

// 4. 房間詳情頁 preloadImage
describe('4. 房間詳情頁 LCP preload', () => {
  it('房間詳情頁應有 preload link for mainImage', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    const preloadLinks = $('link[rel="preload"][as="image"]');
    const hrefs = preloadLinks.map((_, el) => $(el).attr('href')).get();
    expect(hrefs.some((h) => h && h.includes('campsite_1')), 'missing preload for room image').toBe(true);
  });
});

// 5. 未核准且含舊流程的 FAQPage 不得輸出
describe('5. FAQPage 結構化資料', () => {
  it('匯款資訊頁不得發布仍含舊流程的 FAQPage JSON-LD', () => {
    const $ = readPage('infos/account/index.html');
    const schemas = $('script[type="application/ld+json"]')
      .map((_, el) => JSON.parse($(el).html() || '{}'))
      .get();
    const serialized = JSON.stringify(schemas);

    expect(schemas.some((schema) => schema['@type'] === 'FAQPage')).toBe(false);
    expect(serialized).not.toContain('線上訂房查看空房位');
    expect(serialized).not.toContain('匯款後請來電或來信確認');
  });
});

// 6. Breadcrumb aria-current="page"
describe('6. Breadcrumb aria-current', () => {
  it('最後一個 breadcrumb 項目應有 aria-current="page"', () => {
    const $ = readPage('rooms/index.html');
    const lastItem = $('.breadcrumb-item.active');
    expect(lastItem.length).toBe(1);
    expect(lastItem.attr('aria-current')).toBe('page');
  });

  it('infos 頁最後項目也應有 aria-current="page"', () => {
    const $ = readPage('infos/index.html');
    const lastItem = $('.breadcrumb-item.active');
    expect(lastItem.length).toBe(1);
    expect(lastItem.attr('aria-current')).toBe('page');
  });
});

// 7. 外部連結 rel="noopener noreferrer"
describe('7. 外部連結 rel 屬性', () => {
  it('聯絡資訊頁外部連結應有 rel="noopener noreferrer"', () => {
    const $ = readPage('infos/contact-method/index.html');
    const externalLinks = $('a[href^="https://"]');
    externalLinks.each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href') || '';
      if (!href.includes('misstravel.me')) {
        expect($link.attr('target'), `missing target="_blank" on ${href}`).toBe('_blank');
        const rel = $link.attr('rel') || '';
        expect(rel.includes('noopener'), `missing noopener on ${href}`).toBe(true);
        expect(rel.includes('noreferrer'), `missing noreferrer on ${href}`).toBe(true);
      }
    });
  });
});

// 8. Content-Security-Policy header
describe('8. Content-Security-Policy header', () => {
  it('vercel.json 應包含 Content-Security-Policy 標頭', () => {
    const vercelJsonPath = join(distDir, '..', '..', 'vercel.json');
    const vercelConfig = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
    const globalHeaders = vercelConfig.headers.find(
      (h: { source: string }) => h.source === '/(.*)'
    );
    expect(globalHeaders, 'global headers not found').toBeDefined();
    const csp = globalHeaders.headers.find(
      (h: { key: string }) => h.key === 'Content-Security-Policy'
    );
    expect(csp, 'CSP header not found').toBeDefined();
    expect(csp.value).toContain('default-src');
  });
});
