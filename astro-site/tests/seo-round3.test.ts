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

describe('1. 標題層級', () => {
  it('首頁 tiles 應使用 h2', () => {
    const $ = readPage('index.html');
    expect($('.tile h2').length).toBeGreaterThan(0);
    expect($('.tile h3').length).toBe(0);
  });

  it('房型列表卡片應使用 h2', () => {
    const $ = readPage('rooms/index.html');
    expect($('.room-card h2').length).toBeGreaterThan(0);
    expect($('.room-card h3').length).toBe(0);
  });

  it('房間詳情頁訂位須知與平日假日定義應使用 h3', () => {
    const $ = readPage('rooms/suite_1/index.html');
    expect($('.booking-notice h3').length).toBe(1);
    expect($('.day-definition h3').length).toBe(1);
    expect($('.booking-notice h4').length).toBe(0);
    expect($('.day-definition h4').length).toBe(0);
  });

  it('公告列表卡片應使用 h2', () => {
    const $ = readPage('announcements/index.html');
    expect($('.card-body h2').length).toBeGreaterThan(0);
    expect($('.card-body h3').length).toBe(0);
  });
});

describe('2. LCP preload', () => {
  it('首頁應 preload banner 圖片', () => {
    const $ = readPage('index.html');
    expect($('head link[rel="preload"][as="image"][href="/images/banner.webp"]').length).toBe(1);
  });
});

describe('3. WebSite schema', () => {
  it('首頁應包含 WebSite JSON-LD', () => {
    const $ = readPage('index.html');
    const website = getJsonLd($).find((schema) => schema['@type'] === 'WebSite');
    expect(website).toBeDefined();
    expect(website.name).toBe('密式旅行');
    expect(website.url).toBe('https://www.misstravel.me');
    expect(website.inLanguage).toBe('zh-TW');
  });
});

describe('4. Article OG 標籤', () => {
  it('公告詳情頁應包含 article:published_time', () => {
    const $ = readPage('announcements/website/index.html');
    const value = $('meta[property="article:published_time"]').attr('content');
    expect(value).toBeDefined();
    expect(value!.length).toBeGreaterThan(0);
  });

  it('公告詳情頁應包含 article:author', () => {
    const $ = readPage('announcements/website/index.html');
    expect($('meta[property="article:author"]').attr('content')).toBe('密式旅行');
  });

  it('公告詳情頁應包含 article:tag', () => {
    const $ = readPage('announcements/website/index.html');
    expect($('meta[property="article:tag"]').length).toBeGreaterThan(0);
  });
});

describe('5. Modal ARIA', () => {
  it('交通指引頁 modal 應有 role="dialog" 和 aria-modal', () => {
    const $ = readPage('infos/guide/index.html');
    const modal = $('#guide_1');
    expect(modal.attr('role')).toBe('dialog');
    expect(modal.attr('aria-modal')).toBe('true');
    expect(modal.attr('aria-labelledby')).toBeDefined();
  });

  it('交通指引頁 modal 標題應有對應 id', () => {
    const $ = readPage('infos/guide/index.html');
    const labelledby = $('#guide_1').attr('aria-labelledby');
    expect($(`#${labelledby}`).length).toBe(1);
  });

  it('代訂合菜頁 modal 應有 role="dialog" 和 aria-modal', () => {
    const $ = readPage('infos/set-menu-info/index.html');
    const modal = $('#set_menu_1');
    expect(modal.attr('role')).toBe('dialog');
    expect(modal.attr('aria-modal')).toBe('true');
    expect(modal.attr('aria-labelledby')).toBeDefined();
  });

  it('圖集頁 lightbox 應有 role="dialog" 和 aria-modal', () => {
    const $ = readPage('galleries/index.html');
    const lightbox = $('#lightbox');
    expect(lightbox.attr('role')).toBe('dialog');
    expect(lightbox.attr('aria-modal')).toBe('true');
    expect(lightbox.attr('aria-label')).toBeDefined();
  });
});

describe('6. Nav 語意', () => {
  it('選單開關應為 button 元素', () => {
    const $ = readPage('index.html');
    expect($('#menu-toggle').prop('tagName')?.toLowerCase()).toBe('button');
  });

  it('選單開關應有 aria-expanded', () => {
    const $ = readPage('index.html');
    expect($('#menu-toggle').attr('aria-expanded')).toBeDefined();
  });

  it('選單關閉按鈕應為 button 元素', () => {
    const $ = readPage('index.html');
    expect($('#menu-close').prop('tagName')?.toLowerCase()).toBe('button');
  });

  it('nav 應有 aria-label', () => {
    const $ = readPage('index.html');
    expect($('#header nav').attr('aria-label')).toBeDefined();
    expect($('nav#menu').attr('aria-label')).toBeDefined();
  });
});

describe('7. Sitemap 更新訊號', () => {
  it('沒有可靠來源時不應捏造 lastmod', () => {
    const sitemapPath = join(distDir, 'sitemap-0.xml');
    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf-8');
    expect(content).not.toContain('<lastmod>');
  });
});

describe('8. 安全標頭', () => {
  let vercelConfig: any;

  beforeAll(() => {
    vercelConfig = JSON.parse(readFileSync(join(__dirname, '..', '..', 'vercel.json'), 'utf-8'));
  });

  it('應包含 Strict-Transport-Security', () => {
    const headers = vercelConfig.headers.find((item: any) => item.source === '/(.*)').headers;
    const hsts = headers.find((item: any) => item.key === 'Strict-Transport-Security');
    expect(hsts).toBeDefined();
    expect(hsts.value).toContain('max-age=');
    expect(hsts.value).toContain('includeSubDomains');
  });

  it('應包含 Referrer-Policy', () => {
    const headers = vercelConfig.headers.find((item: any) => item.source === '/(.*)').headers;
    expect(headers.find((item: any) => item.key === 'Referrer-Policy').value).toBe('strict-origin-when-cross-origin');
  });

  it('應包含 Permissions-Policy', () => {
    const headers = vercelConfig.headers.find((item: any) => item.source === '/(.*)').headers;
    const value = headers.find((item: any) => item.key === 'Permissions-Policy').value;
    expect(value).toContain('camera=()');
    expect(value).toContain('microphone=()');
    expect(value).toContain('geolocation=()');
  });
});

describe('9. 字型快取', () => {
  it('vercel.json 應包含 /fonts/ 快取規則', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '..', '..', 'vercel.json'), 'utf-8'));
    const headers = config.headers.find((item: any) => item.source === '/fonts/(.*)');
    expect(headers).toBeDefined();
    const value = headers.headers.find((item: any) => item.key === 'Cache-Control').value;
    expect(value).toContain('max-age=31536000');
    expect(value).toContain('immutable');
  });

  it('圖片快取不應在檔名可原地替換時標示 immutable', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '..', '..', 'vercel.json'), 'utf-8'));
    const headers = config.headers.find((item: any) => item.source === '/images/(.*)');
    const value = headers.headers.find((item: any) => item.key === 'Cache-Control').value;
    expect(value).not.toContain('immutable');
    expect(value).toContain('stale-while-revalidate');
  });
});
