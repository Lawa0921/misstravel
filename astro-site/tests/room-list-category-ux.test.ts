import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');

function readRoomsPage() {
  return load(readFileSync(join(distDir, 'rooms', 'index.html'), 'utf-8'));
}

describe('房型列表三分類導覽', () => {
  it('應提供露營營位、露營木屋與套房三個快速導覽入口', () => {
    const $ = readRoomsPage();
    const links = $('.category-nav .category-link')
      .toArray()
      .map((element) => ({
        href: $(element).attr('href'),
        text: $(element).text().replace(/\s+/g, ' ').trim(),
      }));

    expect(links).toEqual([
      { href: '#campsite', text: '🏕️ 露營營位 3 種選擇' },
      { href: '#cabin', text: '🏡 露營木屋 4 種選擇' },
      { href: '#suite', text: '🛏️ 套房 3 種選擇' },
    ]);
  });

  it('所有房型應只出現在自己的分類區塊一次', () => {
    const $ = readRoomsPage();
    const expected = {
      campsite: { count: 3, prefix: '/rooms/campsite_' },
      cabin: { count: 4, prefix: '/rooms/log_cabin_' },
      suite: { count: 3, prefix: '/rooms/suite_' },
    } as const;

    expect($('.room-card')).toHaveLength(10);

    for (const [category, expectation] of Object.entries(expected)) {
      const cards = $(`#${category} .room-card`);
      expect(cards, `${category} 房型數量`).toHaveLength(expectation.count);
      cards.each((_, element) => {
        expect($(element).attr('href')).toMatch(new RegExp(`^${expectation.prefix}`));
        expect($(element).find('h3')).toHaveLength(1);
      });
    }
  });

  it('房型列表應使用 category 判斷營位，不再依賴舊 isCampsite', () => {
    const source = readFileSync(join(projectDir, 'src', 'pages', 'rooms', 'index.astro'), 'utf-8');
    expect(source).toContain("room.data.category === 'campsite'");
    expect(source).not.toContain('room.data.isCampsite');
  });

  it('頁面搜尋描述應使用露營營位而不是露營車位', () => {
    const $ = readRoomsPage();
    const description = $('meta[name="description"]').attr('content') || '';
    expect(description).toContain('露營營位');
    expect(description).not.toContain('露營車位');
  });
});