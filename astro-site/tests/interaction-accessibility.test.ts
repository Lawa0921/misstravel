import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');

function page(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

describe('共用互動無障礙控制器', () => {
  it('所有代表頁面都應載入共用控制器', () => {
    [
      'infos/guide/index.html',
      'galleries/index.html',
      'sale_items/index.html',
      'rooms/campsite_1/index.html',
    ].forEach((path) => {
      const $ = page(path);
      expect($('script[src="/scripts/interaction-accessibility.js"]').length, path).toBe(1);
    });
  });

  it('所有 Modal 與 Lightbox 應具備 dialog 語意', () => {
    const pages = ['infos/guide/index.html', 'galleries/index.html', 'sale_items/index.html'];
    pages.forEach((path) => {
      const $ = page(path);
      $('.modal, .lightbox-overlay').each((_, element) => {
        expect($(element).attr('role'), path).toBe('dialog');
        expect($(element).attr('aria-modal'), path).toBe('true');
      });
    });
  });

  it('控制器應處理焦點移入、Tab 鎖定、Escape 與焦點返回', () => {
    const controller = readFileSync(join(projectDir, 'public', 'scripts', 'interaction-accessibility.js'), 'utf-8');
    expect(controller).toContain('focusableElements');
    expect(controller).toContain("event.key !== 'Tab'");
    expect(controller).toContain("event.key === 'Escape'");
    expect(controller).toContain('returnFocus.focus');
    expect(controller).toContain("aria-hidden");
  });

  it('輪播應具有鍵盤方向鍵與 ARIA 狀態同步', () => {
    const controller = readFileSync(join(projectDir, 'public', 'scripts', 'interaction-accessibility.js'), 'utf-8');
    expect(controller).toContain("event.key === 'ArrowLeft'");
    expect(controller).toContain("event.key === 'ArrowRight'");
    expect(controller).toContain("aria-current");
    expect(controller).toContain("aria-roledescription");
    expect(controller).toContain("aria-hidden");
  });

  it('應尊重 reduced motion 並提供清楚焦點樣式', () => {
    const css = readFileSync(join(projectDir, 'src', 'styles', 'interaction-accessibility.css'), 'utf-8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 3px solid');
  });
});
