import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const rootDir = join(projectDir, '..');
const distDir = join(projectDir, 'dist');

function readProjectFile(path: string) {
  return readFileSync(join(projectDir, path), 'utf-8');
}

function readDistPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

describe('全站技術強化', () => {
  it('所有頁面應載入共用互動控制器', () => {
    ['index.html', 'galleries/index.html', 'sale_items/index.html'].forEach((path) => {
      const $ = readDistPage(path);
      const script = $('script[src^="/assets/interaction-accessibility."][src$=".js"]');
      expect(script.length, path).toBe(1);
      expect(script.attr('defer'), path).toBeDefined();
    });
  });

  it('所有頁面應載入雜湊後的共用 motion script', () => {
    const $ = readDistPage('index.html');
    const script = $('script[src^="/assets/motion-effects."][src$=".js"]');
    expect(script.length).toBe(1);
    expect(script.attr('defer')).toBeDefined();
  });

  it('首頁不得建立未使用的 Google Fonts 與 YouTube 連線', () => {
    const html = readFileSync(join(distDir, 'index.html'), 'utf-8');

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
    expect(html).not.toContain('rel="preconnect" href="https://www.youtube.com"');
    expect(html).not.toContain('rel="dns-prefetch" href="https://www.youtube.com"');
  });

  it('全站本機字型不得回退為完整 5 MB 級字集', () => {
    const fontPath = join(projectDir, 'public', 'fonts', 'setofont.woff2');
    const fontSize = statSync(fontPath).size;

    expect(fontSize).toBeLessThan(512 * 1024);
  });

  it('RSS 與 JSON Feed 宣告必須保留', () => {
    const $ = readDistPage('index.html');

    expect($('link[rel="alternate"][type="application/rss+xml"][href="/feed.xml"]').length).toBe(1);
    expect($('link[rel="alternate"][type="application/feed+json"][href="/feed.json"]').length).toBe(1);
  });

  it('互動控制器必須能真正關閉 Dialog、恢復焦點與解除捲動鎖', () => {
    const script = readFileSync(join(projectDir, 'src', 'scripts', 'interaction-accessibility.js'), 'utf-8');

    expect(script).toContain("dialog.classList.remove('active')");
    expect(script).toContain("dialog.setAttribute('aria-hidden', 'true')");
    expect(script).toContain("event.key === 'Escape'");
    expect(script).toContain('returnFocus.focus');
    expect(script).toContain('pendingBodyOverflow = document.body.style.overflow');
    expect(script).toContain("document.body.style.overflow = previousBodyOverflow");
    expect(script).toContain('}, true);');
    expect(script).toContain("control.setAttribute('aria-current'");
    expect(script).toContain("dialog.querySelectorAll('img[data-src]')");
  });

  it('room carousel 應提供只含延遲圖片的無 JavaScript 備援', () => {
    const $ = readDistPage('rooms/suite_1/index.html');
    const fallback = $('noscript.carousel-noscript');
    expect(fallback.length).toBe(1);
    const fallback$ = load(fallback.text());
    const fallbackImages = fallback$('img');
    expect(fallbackImages).toHaveLength($('.carousel-slide img[data-src]').length);
    expect(fallbackImages.length).toBeGreaterThan(0);
    fallbackImages.each((_, element) => {
      expect(fallback$(element).attr('src')).toBeDefined();
      expect(fallback$(element).attr('data-src')).toBeUndefined();
    });
  });

  it('主選單應在開啟時鎖定 Tab 焦點並於關閉後回到觸發按鈕', () => {
    const header = readProjectFile('src/components/Header.astro');

    expect(header).toContain('getMenuFocusableElements');
    expect(header).toContain("event.key !== 'Tab'");
    expect(header).toContain('menu.contains(activeElement)');
    expect(header).toContain('activeElement === first');
    expect(header).toContain('activeElement === last');
    expect(header).toContain('focusMenuCloseWhenVisible');
    expect(header).toContain('requestAnimationFrame');
    expect(header).toContain('menuToggle?.focus({ preventScroll: true })');
  });

  it('共用樣式應修正 Footer 位置並尊重 reduced motion', () => {
    const css = readProjectFile('src/styles/technical-hardening.css');

    expect(css).toContain('body > #wrapper');
    expect(css).toContain('min-height: 100vh');
    expect(css).toContain('body > #wrapper > main');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain(':focus-visible');
  });

  it('安全標頭不得保留過時 XSS Header 或已移除的字型來源', () => {
    const config = JSON.parse(readFileSync(join(rootDir, 'vercel.json'), 'utf-8'));
    const globalHeaders = config.headers.find((entry: { source: string }) => entry.source === '/(.*)').headers;
    const headers = new Map(globalHeaders.map((header: { key: string; value: string }) => [header.key, header.value]));
    const csp = headers.get('Content-Security-Policy') as string;

    expect(headers.has('X-XSS-Protection')).toBe(false);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('fonts.gstatic.com');
  });

  it('CI 必須執行 Astro template diagnostics、TypeScript 與真實瀏覽器測試', () => {
    const packageJson = JSON.parse(readProjectFile('package.json'));
    const workflow = readFileSync(join(rootDir, '.github', 'workflows', 'ci.yml'), 'utf-8');

    expect(packageJson.scripts['astro:check']).toBe('astro check');
    expect(packageJson.scripts.typecheck).toBe('astro sync && tsc --noEmit');
    expect(packageJson.scripts.verify).toContain('npm run astro:check');
    expect(packageJson.scripts.verify).toContain('npm run typecheck');
    expect(packageJson.scripts['test:e2e']).toBe('playwright test');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('run: npm run test:e2e');
  });
});
