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

// 1. guide.astro 圖片 width/height
describe('1. 交通指引圖片 width/height', () => {
  it('所有 guide step 圖片應有 width 和 height 屬性', () => {
    const $ = readPage('infos/guide/index.html');
    const imgs = $('.step-image img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.each((_, el) => {
      const $img = $(el);
      expect($img.attr('width'), `missing width on ${$img.attr('src')}`).toBeDefined();
      expect($img.attr('height'), `missing height on ${$img.attr('src')}`).toBeDefined();
    });
  });
});

// 2. set-menu-info.astro 圖片 width/height + loading="lazy"
describe('2. 代訂合菜圖片 width/height 與 lazy loading', () => {
  it('所有 modal 圖片應有 width 和 height 屬性', () => {
    const $ = readPage('infos/set-menu-info/index.html');
    const imgs = $('.modal-body > img');
    expect(imgs.length).toBe(3);
    imgs.each((_, el) => {
      const $img = $(el);
      expect($img.attr('width'), `missing width on ${$img.attr('src')}`).toBeDefined();
      expect($img.attr('height'), `missing height on ${$img.attr('src')}`).toBeDefined();
    });
  });

  it('所有 modal 圖片應有 loading="lazy"', () => {
    const $ = readPage('infos/set-menu-info/index.html');
    const imgs = $('.modal-body > img');
    imgs.each((_, el) => {
      const $img = $(el);
      expect($img.attr('loading'), `missing loading on ${$img.attr('src')}`).toBe('lazy');
    });
  });
});

// 3. video iframe title 與 lazy loading
describe('3. 園區影片 iframe title 與 lazy loading', () => {
  it('iframe 應有描述性 title（非通用 "YouTube video player"）', () => {
    const $ = readPage('infos/video/index.html');
    const iframe = $('iframe');
    expect(iframe.length).toBe(1);
    const title = iframe.attr('title') || '';
    expect(title).not.toBe('YouTube video player');
    expect(title).toContain('密式旅行');
  });

  it('iframe 應有 loading="lazy"', () => {
    const $ = readPage('infos/video/index.html');
    const iframe = $('iframe');
    expect(iframe.attr('loading')).toBe('lazy');
  });
});

// 4. VideoObject schema
describe('4. VideoObject 結構化資料', () => {
  it('影片頁應包含 VideoObject JSON-LD', () => {
    const $ = readPage('infos/video/index.html');
    const scripts = $('script[type="application/ld+json"]');
    let hasVideoObject = false;
    scripts.each((_, el) => {
      const json = JSON.parse($(el).html() || '{}');
      const schemas = Array.isArray(json) ? json : [json];
      for (const schema of schemas) {
        if (schema['@type'] === 'VideoObject') {
          hasVideoObject = true;
          expect(schema.name).toBeDefined();
          expect(schema.thumbnailUrl).toBeDefined();
          expect(schema.uploadDate).toBeDefined();
          expect(schema.embedUrl).toContain('youtube.com');
        }
      }
    });
    expect(hasVideoObject, 'VideoObject schema not found').toBe(true);
  });
});

// 5. DNS prefetch
describe('5. DNS prefetch', () => {
  it('首頁應包含 dns-prefetch for youtube.com', () => {
    const $ = readPage('index.html');
    const dnsPrefetch = $('link[rel="dns-prefetch"]');
    const hrefs = dnsPrefetch.map((_, el) => $(el).attr('href')).get();
    expect(hrefs).toContain('https://www.youtube.com');
  });
});

// 6. map.md 和 menu.md 圖片 width/height
describe('6. 園區地圖與菜單圖片 width/height', () => {
  it('地圖頁圖片應有 width 和 height', () => {
    const $ = readPage('infos/map/index.html');
    const img = $('img[src="/images/map.webp"]');
    expect(img.length).toBe(1);
    expect(img.attr('width'), 'missing width on map image').toBeDefined();
    expect(img.attr('height'), 'missing height on map image').toBeDefined();
  });

  it('菜單頁圖片應有 width 和 height', () => {
    const $ = readPage('infos/menu/index.html');
    const img = $('img[src="/images/menu.webp"]');
    expect(img.length).toBe(1);
    expect(img.attr('width'), 'missing width on menu image').toBeDefined();
    expect(img.attr('height'), 'missing height on menu image').toBeDefined();
  });
});

// 7. site.webmanifest 完善
describe('7. site.webmanifest 完善', () => {
  it('webmanifest 應包含 start_url、lang、description', () => {
    const manifestPath = join(distDir, '..', 'public', 'site.webmanifest');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.start_url, 'missing start_url').toBeDefined();
    expect(manifest.lang, 'missing lang').toBeDefined();
    expect(manifest.description, 'missing description').toBeDefined();
  });
});

// 8. galleries lightbox 初始 alt
describe('8. 圖集 lightbox 初始 alt', () => {
  it('lightbox img 應有非空 alt 屬性', () => {
    const $ = readPage('galleries/index.html');
    const lightboxImg = $('#lightbox-image');
    expect(lightboxImg.length).toBe(1);
    const alt = lightboxImg.attr('alt') || '';
    expect(alt.length, 'lightbox img alt should not be empty').toBeGreaterThan(0);
  });
});
