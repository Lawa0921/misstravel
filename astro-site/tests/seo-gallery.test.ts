import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  const filePath = join(distDir, path);
  if (!existsSync(filePath)) throw new Error(`Page not found: ${filePath}`);
  return load(readFileSync(filePath, 'utf-8'));
}

describe('SEO page titles', () => {
  it('uses a unique, Chinese, page-specific title without repeating the brand', () => {
    const home = readPage('index.html');
    const rooms = readPage('rooms/index.html');
    const room = readPage('rooms/campsite_1/index.html');
    const title = (page: ReturnType<typeof readPage>) => page('title').text();

    expect(title(home)).toContain('苗栗泰安');
    expect(title(home)).toContain('密式旅行');
    expect(title(home)).not.toContain('Misstravel');
    expect(title(rooms)).toContain('房型');
    expect(title(rooms).match(/密式旅行/g)).toHaveLength(1);
    expect(title(room).match(/密式旅行/g)).toHaveLength(1);
  });
});

describe('gallery image metadata and lightbox', () => {
  it('preserves every original image href and uses truthful alt metadata', () => {
    const $ = readPage('galleries/index.html');
    const links = $('[data-lightbox="photos"]');
    const images = $('.item img');

    expect(links).toHaveLength(36);
    expect(images).toHaveLength(36);
    links.each((index, element) => {
      const expected = `/images/galleries/gallery_${index + 1}.webp`;
      expect($(element).attr('href')).toBe(expected);
      expect($(element).attr('data-alt')).toBe($(element).find('img').attr('alt'));
    });
    expect(images.eq(12).attr('alt')).toContain('吐司');
    expect(images.eq(12).attr('alt')).toContain('沙拉');
    expect(images.eq(18).attr('alt')).toContain('多肉');
    expect(images.eq(18).attr('alt')).toContain('盆栽');
  });

  it('reuses the selected alt in the lightbox and ImageGallery schema', () => {
    const $ = readPage('galleries/index.html');
    const lightbox = $('#lightbox-image');
    const gallery = $('head script[type="application/ld+json"]')
      .map((_, element) => JSON.parse($(element).html() || '{}'))
      .get()
      .find((schema) => schema['@type'] === 'ImageGallery');

    expect(lightbox.attr('alt')).toBe($('.item img').eq(0).attr('alt'));
    expect(new Set($('.item img').map((_, el) => $(el).attr('alt')).get()).size).toBe(36);
    expect(gallery['@id']).toBe('https://www.misstravel.me/galleries/#imagegallery');
    expect(gallery.image).toHaveLength(36);
    expect(gallery.image[12].name).toBe($('.item img').eq(12).attr('alt'));
    expect(gallery.image[18].name).toBe($('.item img').eq(18).attr('alt'));
  });
});
