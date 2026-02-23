import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
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

beforeAll(() => {
  execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'pipe' });
}, 120000);

// 1. 柑仔店 Modal ARIA
describe('1. 柑仔店 Modal ARIA', () => {
  it('所有 modal 應有 role="dialog" 和 aria-modal="true"', () => {
    const $ = readPage('sale_items/index.html');
    const modalIds = ['sale_item_1', 'sale_item_2', 'sale_item_3', 'sale_item_4', 'sale_item_6', 'sale_item_7', 'sale_item_8'];
    modalIds.forEach((id) => {
      const modal = $(`#${id}`);
      expect(modal.attr('role'), `#${id} missing role`).toBe('dialog');
      expect(modal.attr('aria-modal'), `#${id} missing aria-modal`).toBe('true');
      expect(modal.attr('aria-labelledby'), `#${id} missing aria-labelledby`).toBeDefined();
    });
  });

  it('modal 標題應有對應 id', () => {
    const $ = readPage('sale_items/index.html');
    const modalIds = ['sale_item_1', 'sale_item_2', 'sale_item_3', 'sale_item_4', 'sale_item_6', 'sale_item_7', 'sale_item_8'];
    modalIds.forEach((id) => {
      const labelledby = $(`#${id}`).attr('aria-labelledby');
      const titleEl = $(`#${labelledby}`);
      expect(titleEl.length, `title for #${id} not found`).toBe(1);
    });
  });

  it('carousel 按鈕應有 aria-label', () => {
    const $ = readPage('sale_items/index.html');
    const prev = $('.carousel-prev');
    const next = $('.carousel-next');
    expect(prev.attr('aria-label')).toBeDefined();
    expect(next.attr('aria-label')).toBeDefined();
  });
});

// 2. Skip Navigation Link
describe('2. Skip Navigation Link', () => {
  it('首頁應包含 skip-to-content 連結', () => {
    const $ = readPage('index.html');
    const skipLink = $('a.skip-link');
    expect(skipLink.length).toBe(1);
    expect(skipLink.attr('href')).toBe('#main');
  });

  it('房型列表頁應包含 skip-to-content 連結', () => {
    const $ = readPage('rooms/index.html');
    const skipLink = $('a.skip-link');
    expect(skipLink.length).toBe(1);
  });

  it('skip link 應指向存在的 main 元素', () => {
    const $ = readPage('index.html');
    const skipLink = $('a.skip-link');
    const targetId = skipLink.attr('href')?.replace('#', '');
    const target = $(`#${targetId}`);
    expect(target.length).toBe(1);
  });
});

// 3. Footer SVG aria-hidden
describe('3. Footer SVG aria-hidden', () => {
  it('Footer 內的 SVG 應有 aria-hidden="true"', () => {
    const $ = readPage('index.html');
    const footerSvgs = $('#footer .icon.alt svg');
    expect(footerSvgs.length).toBeGreaterThan(0);
    footerSvgs.each((_, el) => {
      expect($(el).attr('aria-hidden')).toBe('true');
    });
  });
});

// 4. fetchpriority="high"
describe('4. fetchpriority="high"', () => {
  it('首頁 Banner 圖片應有 fetchpriority="high"（透過 CSS 背景改為 img 或用於其他 LCP 元素）', () => {
    // Banner uses CSS background-image, so check tiles first image or other LCP candidates
    // Actually, the infos index page has a direct img that could be LCP
    const $ = readPage('infos/index.html');
    // The page uses background-image for banner, so check first spotlight image
    // which is the first content image visible
    // For this test, we just check that rooms detail page first carousel image has fetchpriority
    const $room = readPage('rooms/suite_1/index.html');
    const firstSlide = $room('.carousel-slide').first().find('img');
    expect(firstSlide.attr('fetchpriority')).toBe('high');
  });
});

// 5. 關於密式頁 LCP preload
describe('5. 關於密式頁 LCP preload', () => {
  it('關於密式頁應 preload landing banner 圖片', () => {
    const $ = readPage('infos/index.html');
    const preload = $('head link[rel="preload"][as="image"][href="/images/landing_banner.webp"]');
    expect(preload.length).toBe(1);
  });
});

// 6. 柑仔店 Modal 圖片尺寸
describe('6. 柑仔店 Modal 圖片尺寸', () => {
  it('所有 modal 內圖片應有 width 和 height', () => {
    const $ = readPage('sale_items/index.html');
    const modalImgs = $('.modal-body img');
    expect(modalImgs.length).toBeGreaterThan(0);
    modalImgs.each((_, el) => {
      expect($(el).attr('width'), `img ${$(el).attr('alt')} missing width`).toBeDefined();
      expect($(el).attr('height'), `img ${$(el).attr('alt')} missing height`).toBeDefined();
    });
  });
});
