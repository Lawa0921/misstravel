import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import { siteConfig } from '../src/lib/config';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');

function readRoomPage(slug: string) {
  return load(readFileSync(join(distDir, 'rooms', slug, 'index.html'), 'utf-8'));
}

describe('房型詳情決策資訊', () => {
  it.each([
    ['campsite_1', '露營營位', '16 人', '平日 NT$2,400 起'],
    ['log_cabin_4', '露營木屋', '4 人', '平日 NT$1,200 起'],
    ['suite_3', '套房', '2 人', '平日 NT$1,600 起'],
  ])('%s 應在頁首顯示類型、人數與正確平日起價', (slug, category, people, price) => {
    const $ = readRoomPage(slug);
    const summary = $('.room-summary').text().replace(/\s+/g, ' ').trim();

    expect($('.room-summary')).toHaveLength(1);
    expect(summary).toContain(category);
    expect(summary).toContain(people);
    expect(summary).toContain(price);
  });

  it.each(['campsite_1', 'log_cabin_4', 'suite_3'])('%s 應提供官方空房查詢入口', (slug) => {
    const $ = readRoomPage(slug);
    const cta = $('.availability-cta');

    expect(cta).toHaveLength(1);
    expect(cta.text().trim()).toBe('查詢空房');
    expect(cta.attr('href')).toBe(siteConfig.booking.url);
    expect(cta.attr('target')).toBe('_blank');
    expect(cta.attr('rel')).toContain('noopener');
    expect(cta.attr('rel')).toContain('noreferrer');
  });

  it.each(['log_cabin_4', 'suite_3', 'campsite_3'])('%s 不應捏造標準方案名稱', (slug) => {
    const $ = readRoomPage(slug);
    expect($('.room-summary').text()).not.toContain('標準方案');
  });

  it('三至四帳包區摘要應把四帳標準價與三帳替代價分開標示', () => {
    const $ = readRoomPage('campsite_1');
    expect($('.summary-standard').text()).toContain('16 人以下');
    expect($('.summary-standard').text()).toContain('平日 NT$3,200 起');
    expect($('.summary-alternative').text()).toContain('三帳包區・12 人以下');
    expect($('.summary-alternative').text()).toContain('平日 NT$2,400 起');
    expect($('.summary-fact').first().hasClass('summary-alternative')).toBe(true);
    expect($('.summary-standard').text()).not.toContain('NT$2,400 起');
    expect($('.summary-alternative').text()).not.toContain('16 人');
  });
});
