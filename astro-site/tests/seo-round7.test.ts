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

function readRawPage(path: string) {
  const filePath = join(distDir, path);
  if (!existsSync(filePath)) {
    throw new Error(`Page not found: ${filePath}`);
  }
  return readFileSync(filePath, 'utf-8');
}

beforeAll(() => {
  execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'pipe' });
}, 120000);

// 1. 無效 HTML 修正 - 不應有多餘 stray </div>
describe('1. HTML 結構有效性', () => {
  it('galleries 頁面 main 內不應有多餘的 stray </div>', () => {
    const $ = readPage('galleries/index.html');
    // main should directly contain section and lightbox - no stray tags
    const mainHtml = $('main#main').html() || '';
    // After section closes, the next element should be the lightbox div, not a stray </div>
    expect(mainHtml).not.toMatch(/<\/section>\s*<\/div>\s*<!--/);
  });

  it('rooms 詳情頁 main 內結構應有效', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    // main should contain inner div and main-content div
    const main = $('main#main');
    expect(main.length).toBe(1);
    // main-content should be inside main
    expect(main.find('#main-content').length).toBe(1);
  });

  it('guide 頁面不應有 stray </div>', () => {
    const html = readRawPage('infos/guide/index.html');
    // Count opening and closing div tags - they should match
    const openDivs = (html.match(/<div[\s>]/g) || []).length;
    const closeDivs = (html.match(/<\/div>/g) || []).length;
    expect(openDivs).toBe(closeDivs);
  });

  it('set-menu-info 頁面不應有 stray </div>', () => {
    const html = readRawPage('infos/set-menu-info/index.html');
    const openDivs = (html.match(/<div[\s>]/g) || []).length;
    const closeDivs = (html.match(/<\/div>/g) || []).length;
    expect(openDivs).toBe(closeDivs);
  });

  it('sale_items 頁面不應有 stray </div>', () => {
    const html = readRawPage('sale_items/index.html');
    const openDivs = (html.match(/<div[\s>]/g) || []).length;
    const closeDivs = (html.match(/<\/div>/g) || []).length;
    expect(openDivs).toBe(closeDivs);
  });
});

// 2. 剩餘圖片 decoding="async"
describe('2. 剩餘圖片 decoding="async"', () => {
  it('guide 頁面步驟圖片應有 decoding="async"', () => {
    const $ = readPage('infos/guide/index.html');
    const imgs = $('.step-image img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding')).toBe('async');
    });
  });

  it('set-menu-info 頁面合菜圖片應有 decoding="async"', () => {
    const $ = readPage('infos/set-menu-info/index.html');
    const imgs = $('.modal-body img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding')).toBe('async');
    });
  });

  it('sale_items 頁面商品圖片應有 decoding="async"', () => {
    const $ = readPage('sale_items/index.html');
    const imgs = $('.modal-body img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding')).toBe('async');
    });
  });
});

// 3. 404 頁面應使用 <main> 元素
describe('3. 404 頁面 main landmark', () => {
  it('404 頁面應使用 <main> 而非 <section> 作為主要內容容器', () => {
    const $ = readPage('404.html');
    expect($('main').length).toBeGreaterThanOrEqual(1);
  });
});

// 4. Lightbox 圖片應有 width/height
describe('4. Lightbox 圖片 CLS 優化', () => {
  it('galleries lightbox 圖片應有 width 和 height', () => {
    const $ = readPage('galleries/index.html');
    const lightboxImg = $('#lightbox-image');
    expect(lightboxImg.length).toBe(1);
    expect(lightboxImg.attr('width')).toBeDefined();
    expect(lightboxImg.attr('height')).toBeDefined();
  });
});

// 5. Google Fonts preload 應有 crossorigin
describe('5. Google Fonts preload crossorigin', () => {
  it('Google Fonts preload link 應有 crossorigin 屬性', () => {
    const $ = readPage('index.html');
    const preloadLinks = $('link[rel="preload"][as="style"]').filter((_, el) => {
      return ($(el).attr('href') || '').includes('fonts.googleapis.com');
    });
    expect(preloadLinks.length).toBeGreaterThan(0);
    preloadLinks.each((_, el) => {
      expect($(el).attr('crossorigin')).toBeDefined();
    });
  });
});

// 6. YouTube preconnect
describe('6. YouTube preconnect', () => {
  it('應有 YouTube 的 preconnect（不只 dns-prefetch）', () => {
    const $ = readPage('index.html');
    const preconnect = $('link[rel="preconnect"][href="https://www.youtube.com"]');
    expect(preconnect.length).toBe(1);
  });
});
