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
  it('使用自訂 image 的頁面應輸出圖片實際尺寸', () => {
    const $ = readPage('rooms/campsite_1/index.html');
    const ogWidth = $('meta[property="og:image:width"]').attr('content');
    const ogHeight = $('meta[property="og:image:height"]').attr('content');
    expect(ogWidth).toBe('945');
    expect(ogHeight).toBe('709');
  });
});

// 4. 唯一正式網域與部署責任分離
describe('4. 正式網域一致性', () => {
  it('canonical 與 Open Graph URL 應使用 www 主網域', () => {
    const $ = readPage('index.html');
    expect($('link[rel="canonical"]').attr('href')).toBe('https://www.misstravel.me/');
    expect($('meta[property="og:url"]').attr('content')).toBe('https://www.misstravel.me/');
  });

  it('sitemap 不應產生裸網域 URL', () => {
    const sitemap = readFileSync(join(distDir, 'sitemap-0.xml'), 'utf-8');
    expect(sitemap).toContain('https://www.misstravel.me/');
    expect(sitemap).not.toContain('<loc>https://misstravel.me/');
  });

  it('Vercel 應將裸網域永久轉址到 www', () => {
    const config = JSON.parse(
      readFileSync(join(distDir, '..', '..', 'vercel.json'), 'utf-8')
    );
    const redirect = config.redirects.find(
      (item: { destination?: string }) =>
        item.destination === 'https://www.misstravel.me/:path*'
    );

    expect(redirect).toBeDefined();
    expect(redirect.permanent).toBe(true);
    expect(redirect.has).toContainEqual({ type: 'host', value: 'misstravel.me' });
  });

  it('Vercel 應使用鎖檔安裝並只負責建置，完整驗證由 GitHub CI 執行', () => {
    const rootDir = join(distDir, '..', '..');
    const config = JSON.parse(readFileSync(join(rootDir, 'vercel.json'), 'utf-8'));
    const workflow = readFileSync(join(rootDir, '.github', 'workflows', 'ci.yml'), 'utf-8');

    expect(config.installCommand).toBe('cd astro-site && npm ci');
    expect(config.buildCommand).toBe('cd astro-site && npm run build');
    expect(workflow).toContain('run: npm run verify');
  });
});

// 5. VideoObject duration
describe('5. VideoObject schema 完整性', () => {
  it('VideoObject 應使用影片真實上傳日期與時長', () => {
    const $ = readPage('infos/video/index.html');
    const scripts = $('script[type="application/ld+json"]');
    let hasVideo = false;
    scripts.each((_, el) => {
      const json = JSON.parse($(el).html() || '{}');
      const schemas = Array.isArray(json) ? json : [json];
      for (const schema of schemas) {
        if (schema['@type'] === 'VideoObject') {
          hasVideo = true;
          expect(schema.uploadDate).toBe('2017-11-07T00:26:31-08:00');
          expect(schema.duration).toBe('PT2M37S');
        }
      }
    });
    expect(hasVideo, 'VideoObject schema not found').toBe(true);
  });
});

// 6. 相關房型 alt 文字改善
describe('6. 相關房型 alt 文字', () => {
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

// 7. Lightbox 圖片 decoding
describe('7. Lightbox 圖片 decoding', () => {
  it('galleries lightbox img 應有 decoding="async"', () => {
    const $ = readPage('galleries/index.html');
    const lightboxImg = $('#lightbox-image');
    expect(lightboxImg.attr('decoding')).toBe('async');
  });
});
