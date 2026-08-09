import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');

function readPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

describe('首頁住宿方式入口', () => {
  it('應在原有 tiles 前提供三種住宿方式', () => {
    const $ = readPage('index.html');
    const stayChoices = $('.stay-choices');
    const tiles = $('#tiles');

    expect(stayChoices).toHaveLength(1);
    expect(tiles).toHaveLength(1);
    expect(stayChoices.index()).toBeLessThan(tiles.index());

    const links = $('.stay-card')
      .toArray()
      .map((element) => ({
        href: $(element).attr('href'),
        text: $(element).text().replace(/\s+/g, ' ').trim(),
      }));

    expect(links).toHaveLength(3);
    expect(links[0].href).toBe('/rooms/#campsite');
    expect(links[0].text).toContain('露營營位');
    expect(links[0].text).toContain('3 種選擇');
    expect(links[1].href).toBe('/rooms/#cabin');
    expect(links[1].text).toContain('露營木屋');
    expect(links[1].text).toContain('4 種選擇');
    expect(links[2].href).toBe('/rooms/#suite');
    expect(links[2].text).toContain('套房');
    expect(links[2].text).toContain('3 種選擇');
  });

  it('三個首頁住宿入口應使用真實房型圖片', () => {
    const $ = readPage('index.html');
    const images = $('.stay-card img');

    expect(images).toHaveLength(3);
    images.each((_, element) => {
      expect($(element).attr('src')).toMatch(/^\/images\//);
      expect($(element).attr('alt')).toContain('代表住宿實景');
      expect($(element).attr('loading')).toBe('lazy');
    });
  });

  it('應呈現已存在於官網內容的園區特色並連到關於密式', () => {
    const $ = readPage('index.html');
    const highlights = $('.home-highlights').text().replace(/\s+/g, ' ');

    for (const label of ['泰安山景', '上百款桌遊', '兒童遊戲室', '沙坑']) {
      expect(highlights).toContain(label);
    }

    expect($('.home-highlights a[href="/infos/"]')).toHaveLength(1);
  });

  it('原本六張首頁功能 tiles 應完整保留', () => {
    const $ = readPage('index.html');
    expect($('#tiles .tile')).toHaveLength(6);
  });
});