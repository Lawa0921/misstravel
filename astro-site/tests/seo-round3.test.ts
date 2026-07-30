import { describe, it, expect, beforeAll } from 'vitest';
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

function getJsonLd($: ReturnType<typeof load>) {
  const scripts: any[] = [];
  $('head script[type="application/ld+json"]').each((_, el) => {
    try {
      scripts.push(JSON.parse($(el).html()!));
    } catch {}
  });
  return scripts;
}

// 1. 標題層級（Heading Hierarchy）
describe('1. 標題層級', () => {
  it('首頁 tiles 應使用 h2', () => {
    const $ = readPage('index.html');
    const tileH2 = $('.tile h2');
    const tileH3 = $('.tile h3');
    expect(tileH2.length).toBeGreaterThan(0);
    expect(tileH3.length).toBe(0);
  });

  it('房型列表卡片應使用 h2', () => {
    const $ = readPage('rooms/index.html');
    const cardH2 = $('.room-card h2');
    const cardH3 = $('.room-card h3');
    expect(cardH2.length).toBeGreaterThan(0);
    expect(cardH3.length).toBe(0);
  });

  it('房間詳情頁訂位須知與平日假日定義應使用 h3', () => {
    const $ = readPage('rooms/suite_1/index.html');
    const bookingH3 = $('.booking-notice h3');
    const dayDefH3 = $('.day-definition h3');
    expect(bookingH3.length).toBe(1);
    expect(dayDefH3.length).toBe(1);
    // 不應有 h4
    const bookingH4 = $('.booking-notice h4');
    const dayDefH4 = $('.day-definition h4');
    expect(bookingH4.length).toBe(0);
    expect(dayDefH4.length).toBe(0);
  });

  it('公告列表卡片應使用 h2', () => {
    const $ = readPage('announcements/index.html');
    const cardH2 = $('.card-body h2');
    const cardH3 = $('.card-body h3');
    expect(cardH2.length).toBeGreaterThan(0);
    expect(cardH3.length).toBe(0);
  });
});

// 2. LCP preload
describe('2. LCP preload', () => {
  it('首頁應 preload banner 圖片', () => {
    const $ = readPage('index.html');
    const preload = $('head link[rel="preload"][as="image"][href="/images/banner.webp"]');
    expect(preload.length).toBe(1);
  });
});

// 3. WebSite schema
describe('3. WebSite schema', () => {
  it('首頁應包含 WebSite JSON-LD', () => {
    const $ = readPage('index.html');
    const schemas = getJsonLd($);
    const website = schemas.find((s) => s['@type'] === 'WebSite');
    expect(website).toBeDefined();
    expect(website.name).toBe('密式旅行');
    expect(website.url).toBe('https://www.misstravel.me');
    expect(website.inLanguage).toBe('zh-TW');
  });
});

// 4. Article OG 標籤
describe('4. Article OG 標籤', () => {
  it('公告詳情頁應包含 article:published_time', () => {
    const $ = readPage('announcements/website/index.html');
    const publishedTime = $('meta[property="article:published_time"]').attr('content');
    expect(publishedTime).toBeDefined();
    expect(publishedTime!.length).toBeGreaterThan(0);
  });

  it('公告詳情頁應包含 article:author', () => {
    const $ = readPage('announcements/website/index.html');
    const author = $('meta[property="article:author"]').attr('content');
    expect(author).toBeDefined();
    expect(author).toBe('密式旅行');
  });

  it('公告詳情頁應包含 article:tag', () => {
    const $ = readPage('announcements/website/index.html');
    const tags = $('meta[property="article:tag"]');
    expect(tags.length).toBeGreaterThan(0);
  });
});

// 5. Modal ARIA
describe('5. Modal ARIA', () => {
  it('交通指引頁 modal 應有 role="dialog" 和 aria-modal', () => {
    const $ = readPage('infos/guide/index.html');
    const modal1 = $('#guide_1');
    expect(modal1.attr('role')).toBe('dialog');
    expect(modal1.attr('aria-modal')).toBe('true');
    expect(modal1.attr('aria-labelledby')).toBeDefined();
  });

  it('交通指引頁 modal 標題應有對應 id', () => {
    const $ = readPage('infos/guide/index.html');
    const labelledby = $('#guide_1').attr('aria-labelledby');
    const titleEl = $(`#${labelledby}`);
    expect(titleEl.length).toBe(1);
  });

  it('代訂合菜頁 modal 應有 role="dialog" 和 aria-modal', () => {
    const $ = readPage('infos/set-menu-info/index.html');
    const modal1 = $('#set_menu_1');
    expect(modal1.attr('role')).toBe('dialog');
    expect(modal1.attr('aria-modal')).toBe('true');
    expect(modal1.attr('aria-labelledby')).toBeDefined();
  });

  it('圖集頁 lightbox 應有 role="dialog" 和 aria-modal', () => {
    const $ = readPage('galleries/index.html');
    const lightbox = $('#lightbox');
    expect(lightbox.attr('role')).toBe('dialog');
    expect(lightbox.attr('aria-modal')).toBe('true');
    expect(lightbox.attr('aria-label')).toBeDefined();
  });
});

// 6. Nav 語意
describe('6. Nav 語意', () => {
  it('選單開關應為 button 元素', () => {
    const $ = readPage('index.html');
    const menuToggle = $('#menu-toggle');
    expect(menuToggle.prop('tagName')?.toLowerCase()).toBe('button');
  });

  it('選單開關應有 aria-expanded', () => {
    const $ = readPage('index.html');
    const menuToggle = $('#menu-toggle');
    expect(menuToggle.attr('aria-expanded')).toBeDefined();
  });

  it('選單關閉按鈕應為 button 元素', () => {
    const $ = readPage('index.html');
    const menuClose = $('#menu-close');
    expect(menuClose.prop('tagName')?.toLowerCase()).toBe('button');
  });

  it('nav 應有 aria-label', () => {
    const $ = readPage('index.html');
    const headerNav = $('#header nav');
    const menuNav = $('nav#menu');
    expect(headerNav.attr('aria-label')).toBeDefined();
    expect(menuNav.attr('aria-label')).toBeDefined();
  });
});

// 7. Sitemap lastmod
describe('7. Sitemap lastmod', () => {
  it('sitemap.xml 應包含 lastmod 標籤', () => {
    const sitemapPath = join(distDir, 'sitemap-0.xml');
    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf-8');
    expect(content).toContain('<lastmod>');
  });
});

// 8. 安全標頭
describe('8. 安全標頭', () => {
  let vercelConfig: any;

  beforeAll(() => {
    const configPath = join(__dirname, '..', '..', 'vercel.json');
    vercelConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  });

  it('應包含 Strict-Transport-Security', () => {
    const globalHeaders = vercelConfig.headers.find((h: any) => h.source === '/(.*)');
    const hsts = globalHeaders.headers.find((h: any) => h.key === 'Strict-Transport-Security');
    expect(hsts).toBeDefined();
    expect(hsts.value).toContain('max-age=');
    expect(hsts.value).toContain('includeSubDomains');
  });

  it('應包含 Referrer-Policy', () => {
    const globalHeaders = vercelConfig.headers.find((h: any) => h.source === '/(.*)');
    const referrer = globalHeaders.headers.find((h: any) => h.key === 'Referrer-Policy');
    expect(referrer).toBeDefined();
    expect(referrer.value).toBe('strict-origin-when-cross-origin');
  });

  it('應包含 Permissions-Policy', () => {
    const globalHeaders = vercelConfig.headers.find((h: any) => h.source === '/(.*)');
    const permissions = globalHeaders.headers.find((h: any) => h.key === 'Permissions-Policy');
    expect(permissions).toBeDefined();
    expect(permissions.value).toContain('camera=()');
    expect(permissions.value).toContain('microphone=()');
    expect(permissions.value).toContain('geolocation=()');
  });
});

// 9. 字型快取
describe('9. 字型快取', () => {
  it('vercel.json 應包含 /fonts/ 快取規則', () => {
    const configPath = join(__dirname, '..', '..', 'vercel.json');
    const vercelConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    const fontHeaders = vercelConfig.headers.find((h: any) => h.source === '/fonts/(.*)');
    expect(fontHeaders).toBeDefined();
    const cacheControl = fontHeaders.headers.find((h: any) => h.key === 'Cache-Control');
    expect(cacheControl).toBeDefined();
    expect(cacheControl.value).toContain('max-age=31536000');
    expect(cacheControl.value).toContain('immutable');
  });

  it('圖片快取不應在檔名可原地替換時標示 immutable', () => {
    const configPath = join(__dirname, '..', '..', 'vercel.json');
    const vercelConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    const imageHeaders = vercelConfig.headers.find((h: any) => h.source === '/images/(.*)');
    const cacheControl = imageHeaders.headers.find((h: any) => h.key === 'Cache-Control');
    expect(cacheControl.value).not.toContain('immutable');
    expect(cacheControl.value).toContain('stale-while-revalidate');
  });
});
