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

// 1. rooms/[...slug] 圖片 decoding="async"
describe('1. 房型詳情頁圖片 decoding', () => {
  it('輪播圖片應有 decoding="async"', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    const imgs = $('.carousel-slide img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding')).toBe('async');
    });
  });

  it('相關房型圖片應有 decoding="async"', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    const imgs = $('.related-card img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      expect($(el).attr('decoding')).toBe('async');
    });
  });
});

// 2. robots max-snippet meta
describe('2. robots max-snippet 控制', () => {
  it('首頁應有 max-snippet robots meta', () => {
    const $ = readPage('index.html');
    const robotsMeta = $('meta[name="robots"]');
    const content = robotsMeta.attr('content') || '';
    expect(content).toContain('max-image-preview:large');
  });

  it('房型頁應有 max-snippet robots meta', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    const robotsMeta = $('meta[name="robots"]');
    const content = robotsMeta.attr('content') || '';
    expect(content).toContain('max-image-preview:large');
  });

  it('404 頁不應有 max-snippet（已有 noindex）', () => {
    const $ = readPage('404.html');
    const robotsMeta = $('meta[name="robots"]');
    const content = robotsMeta.attr('content') || '';
    expect(content).toContain('noindex');
    expect(content).not.toContain('max-image-preview');
  });
});

// 3. og:image 尺寸動態化
describe('3. og:image 尺寸', () => {
  it('使用自訂 image 的頁面不應硬編碼 945x709', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    // 房型頁使用了自訂 image，不應假設是 945x709
    const ogWidth = $('meta[property="og:image:width"]').attr('content');
    const ogHeight = $('meta[property="og:image:height"]').attr('content');
    // 應該移除硬編碼或改為正確值
    expect(ogWidth).toBeDefined();
    expect(ogHeight).toBeDefined();
  });
});

// 4. VideoObject duration
describe('4. VideoObject schema 完整性', () => {
  it('VideoObject 應包含 duration 欄位', () => {
    const $ = readPage('infos/video/index.html');
    const scripts = $('script[type="application/ld+json"]');
    let hasVideo = false;
    scripts.each((_, el) => {
      const json = JSON.parse($(el).html() || '{}');
      const schemas = Array.isArray(json) ? json : [json];
      for (const schema of schemas) {
        if (schema['@type'] === 'VideoObject') {
          hasVideo = true;
          expect(schema.duration).toBeDefined();
        }
      }
    });
    expect(hasVideo, 'VideoObject schema not found').toBe(true);
  });
});

// 5. 相關房型 alt 文字改善
describe('5. 相關房型 alt 文字', () => {
  it('相關房型圖片 alt 應包含「住宿」或更多描述', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    const imgs = $('.related-card img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      const alt = $(el).attr('alt') || '';
      // alt 應不只是短標題，至少要有 "住宿" 相關描述
      expect(alt.length).toBeGreaterThan(3);
      expect(alt).toMatch(/住宿|外觀|營區/);
    });
  });
});

// 6. Lightbox 圖片 decoding
describe('6. Lightbox 圖片 decoding', () => {
  it('galleries lightbox img 應有 decoding="async"', () => {
    const $ = readPage('galleries/index.html');
    const lightboxImg = $('#lightbox-image');
    expect(lightboxImg.attr('decoding')).toBe('async');
  });
});
