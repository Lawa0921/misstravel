import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');

function page(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

describe('房型頁編輯式設計契約', () => {
  it('分類是 h2、卡片標題是 h3，讓頁面大綱反映住宿分類與選項層級', () => {
    const $ = page('rooms/index.html');

    expect($('.room-category > .category-heading h2')).toHaveLength(3);
    expect($('.room-card h3')).toHaveLength(10);
    expect($('.room-card h2')).toHaveLength(0);
  });

  it('分類錨點是可觸控的 pill，且共用全站深色設計 token', () => {
    const source = readFileSync(join(projectDir, 'src/pages/rooms/index.astro'), 'utf-8');

    expect(source).toContain('min-height: 44px');
    expect(source).toContain('background: var(--color-bg)');
    expect(source).toContain('background: var(--color-surface)');
    expect(source).not.toContain('--room-');
    expect(source).toContain('var(--color-champagne)');
    expect(source).toContain('var(--color-aqua)');
    expect(source).toContain('prefers-reduced-motion: reduce');
  });

  it('房型照片使用安全的房型照片描述，避免未驗證外觀敘述', () => {
    const $ = page('rooms/index.html');
    $('.room-card img').each((_, element) => {
      expect($(element).attr('alt')).toMatch(/房型照片$/);
      expect($(element).attr('alt')).not.toContain('外觀');
    });
  });

  it('詳情頁保留鍵盤輪播、等待圖片與無 JavaScript 圖片替代內容', () => {
    const source = readFileSync(join(projectDir, 'src/pages/rooms/[...slug].astro'), 'utf-8');

    const shared = readFileSync(join(projectDir, 'src/scripts/interaction-accessibility.js'), 'utf-8');
    expect(shared).toContain("event.key === 'ArrowLeft'");
    expect(shared).toContain("event.key === 'ArrowRight'");
    expect(source).not.toContain("carousel.addEventListener('keydown'");
    expect(source).toContain('waitForImage');
    expect(source).toContain('<noscript class="carousel-noscript">');
    expect(source).toContain('data-src');
  });
});
