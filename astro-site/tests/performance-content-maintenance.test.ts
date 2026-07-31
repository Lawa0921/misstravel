import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const rootDir = join(projectDir, '..');
const distDir = join(projectDir, 'dist');

function page(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

describe('效能與內容維護', () => {
  it('一般頁面只應預載本機字型，不載入 Google Fonts 或全站 YouTube preconnect', () => {
    const $ = page('index.html');
    expect($('link[href*="fonts.googleapis.com"]').length).toBe(0);
    expect($('link[href*="fonts.gstatic.com"]').length).toBe(0);
    expect($('link[rel="preconnect"][href*="youtube.com"]').length).toBe(0);
    expect($('link[rel="preload"][as="font"][href="/fonts/setofont.woff2"]').length).toBe(1);
  });

  it('多年未維護公告應 noindex 並排除於 sitemap', () => {
    ['announcements/index.html', 'announcements/website/index.html'].forEach((path) => {
      expect(page(path)('meta[name="robots"]').attr('content'), path).toBe('noindex, follow');
    });
    const sitemap = readFileSync(join(distDir, 'sitemap-0.xml'), 'utf-8');
    expect(sitemap).not.toContain('/announcements/');
  });

  it('頁面 head 不應再宣告未維護的 RSS 與 JSON Feed', () => {
    const $ = page('index.html');
    expect($('link[type="application/rss+xml"]').length).toBe(0);
    expect($('link[type="application/feed+json"]').length).toBe(0);
  });

  it('短內容頁應由 wrapper flex 佈局將 Footer 推到底部', () => {
    const layout = readFileSync(join(projectDir, 'src', 'layouts', 'BaseLayout.astro'), 'utf-8');
    const css = readFileSync(join(projectDir, 'src', 'styles', 'performance-maintenance.css'), 'utf-8');
    expect(layout).toContain("performance-maintenance.css");
    expect(css).toContain('body > #wrapper');
    expect(css).toContain('min-height: 100vh');
    expect(css).toContain('#wrapper > #footer');
  });

  it('CSP 應移除外部字型來源並禁止 object 與 frame ancestors', () => {
    const config = JSON.parse(readFileSync(join(rootDir, 'vercel.json'), 'utf-8'));
    const headers = config.headers.find((item: { source: string }) => item.source === '/(.*)').headers;
    const csp = headers.find((item: { key: string }) => item.key === 'Content-Security-Policy').value;
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('fonts.gstatic.com');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers.some((item: { key: string }) => item.key === 'X-XSS-Protection')).toBe(false);
  });
});
