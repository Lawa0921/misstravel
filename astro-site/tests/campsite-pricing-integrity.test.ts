import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');
const contentDir = join(projectDir, 'src', 'content', 'rooms');

const campsiteSlugs = ['campsite_1', 'campsite_2'] as const;

function readRoomSource(slug: string) {
  return readFileSync(join(contentDir, `${slug}.md`), 'utf-8');
}

function readPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

describe('3 至 4 帳包區價格完整性', () => {
  it.each(campsiteSlugs)('%s 應維持四帳標準價格與三帳替代方案', (slug) => {
    const source = readRoomSource(slug);

    expect(source).toContain('weekdayPrice: 3200');
    expect(source).toContain('holidayPrice: 4000');
    expect(source).toContain('standardPrice: 4800');
    expect(source).toContain("pricingNote: '四帳包區為標準方案，實際費用依帳數計算；三帳預訂將依三帳價格收費。'");
    expect(source).toContain("label: '四帳包區（標準方案）'");
    expect(source).toContain('isStandard: true');
    expect(source).toContain("label: '三帳包區'");
    expect(source).toContain('weekdayPrice: 2400');
    expect(source).toContain('holidayPrice: 3000');
    expect(source).toContain('standardPrice: 3600');
  });

  it('房型列表應以四帳為主價格，並同時說明三帳價格與計價基準', () => {
    const $ = readPage('rooms/index.html');

    for (const title of ['櫻花之盡', '沒日之嶺']) {
      const card = $('.room-card').filter((_, element) => $(element).find('h2').text().includes(title));
      const text = card.text().replace(/\s+/g, ' ');

      expect(card).toHaveLength(1);
      expect(text).toContain('四帳標準方案｜實際依帳數計價');
      expect(text).toContain('平日：3200');
      expect(text).toContain('假日：4000');
      expect(text).toContain('連假：4800');
      expect(text).toContain('三帳方案：平日 2400／假日 3000／連假 3600 元');
    }
  });

  it.each(campsiteSlugs)('%s 詳情頁應明確說明依帳數計價並列出兩種方案', (slug) => {
    const $ = readPage(`rooms/${slug}/index.html`);
    const text = $('main').text().replace(/\s+/g, ' ');

    expect(text).toContain('四帳包區為標準方案');
    expect(text).toContain('實際費用依預訂帳數計算');
    expect(text).toContain('線上訂位系統顯示四帳價格');
    expect(text).toContain('4 帳包區（標準方案，16 人以下）');
    expect(text).toContain('平日 3200 元、假日 4000 元、連續假日 4800 元');
    expect(text).toContain('3 帳包區（12 人以下）');
    expect(text).toContain('平日 2400 元、假日 3000 元、連續假日 3600 元');
  });

  it('其他住宿卡片不應出現帳數計價提示', () => {
    const $ = readPage('rooms/index.html');
    const normalCards = $('.room-card').filter((_, element) => {
      const title = $(element).find('h2').text();
      return !title.includes('櫻花之盡') && !title.includes('沒日之嶺');
    });

    expect(normalCards.length).toBeGreaterThan(0);
    normalCards.each((_, element) => {
      expect($(element).find('.pricing-basis')).toHaveLength(0);
      expect($(element).find('.alternative-price')).toHaveLength(0);
    });
  });
});
