import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  const filePath = join(distDir, path);
  expect(existsSync(filePath), `Page not found: ${filePath}`).toBe(true);
  return load(readFileSync(filePath, 'utf-8'));
}

describe('首頁 Dusk Mountain editorial contract', () => {
  it('hero 應是 main 內唯一 h1，並以原生 banner 圖片提供 LCP 尺寸與優先級', () => {
    const $ = readPage('index.html');
    const hero = $('#main #banner');
    const heroImage = hero.find('img.hero-image');

    expect(hero.length).toBe(1);
    expect($('#main > #banner').length).toBe(1);
    expect($('h1')).toHaveLength(1);
    expect(heroImage.attr('src')).toBe('/images/banner.webp');
    expect(heroImage.attr('width')).toBe('1478');
    expect(heroImage.attr('height')).toBe('1108');
    expect(heroImage.attr('loading')).toBe('eager');
    expect(heroImage.attr('fetchpriority')).toBe('high');
    expect(heroImage.attr('alt')).toMatch(/密式旅行|苗栗|泰安/);
    expect($('head link[rel="preload"][as="image"][href="/images/banner.webp"]')).toHaveLength(1);
  });

  it('首頁應保留六張導覽 tile、可見照片與編號，且 tile 使用 h2', () => {
    const $ = readPage('index.html');
    const tiles = $('#tiles .tile');

    expect(tiles).toHaveLength(6);
    expect($('#tiles .tile h2')).toHaveLength(6);
    expect($('#tiles .tile h3')).toHaveLength(0);
    expect($('#tiles .tile-number')).toHaveLength(6);
    expect($('#tiles .tile img')).toHaveLength(6);
    expect($('#tiles .tile img[alt=""]')).toHaveLength(0);
    expect($('#tiles a[href="/rooms/"]')).toHaveLength(1);
    expect($('#tiles a[href*="roomcloud.cc"]')).toHaveLength(1);
  });

  it('desktop 導覽應提供房型、指南、圖集連結，並標示目前頁面', () => {
    const $ = readPage('index.html');
    const desktopNav = $('#desktop-nav');

    expect(desktopNav.attr('aria-label')).toBeDefined();
    expect(desktopNav.find('a[href="/rooms/"]')).toHaveLength(1);
    expect(desktopNav.find('a[href="/infos/guide/"]')).toHaveLength(1);
    expect(desktopNav.find('a[href="/galleries/"]')).toHaveLength(1);
    expect(desktopNav.find('[aria-current="page"]')).toHaveLength(1);
    expect($('#menu-toggle').attr('aria-controls')).toBe('menu');
    expect($('#menu').attr('aria-hidden')).toBe('true');
  });


  it.each([
    ['infos/guide/index.html', '/infos/guide/'],
    ['infos/index.html', '/infos/'],
    ['rooms/index.html', '/rooms/'],
    ['galleries/index.html', '/galleries/'],
  ])('%s 只應將真正目前頁面標示為 aria-current', (file, href) => {
    const $ = readPage(file);
    const current = $('#menu [aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current.attr('href')).toBe(href);
    expect($('#desktop-nav [aria-current="page"]').length).toBeLessThanOrEqual(1);
  });

  it('房型詳細頁不得將分類清單錯標成目前頁面', () => {
    const $ = readPage('rooms/suite_1/index.html');
    expect($('#menu [aria-current="page"]')).toHaveLength(0);
    expect($('#desktop-nav [aria-current="page"]')).toHaveLength(0);
  });

  it('首頁 footer 應保留訂房、LINE、社群與聯絡階層', () => {
    const $ = readPage('index.html');

    expect($('#footer')).toHaveLength(1);
    expect($('#footer [data-footer-contact]')).toHaveLength(1);
    expect($('#footer a[href*="roomcloud.cc"]')).toHaveLength(1);
    expect($('#footer a[href*="line.me"]')).toHaveLength(1);
    expect($('#footer a[href^="tel:"]')).toHaveLength(1);
    expect($('#footer a[href^="mailto:"]')).toHaveLength(1);
    expect($('#footer a[aria-label="Google 地圖位置"]')).toHaveLength(1);
  });
});
