import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { load } from 'cheerio';
import sharp from 'sharp';
import { resolveSiteUrl } from '../src/lib/config';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');
const publicDir = join(projectDir, 'public');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const htmlFiles = () => walk(distDir).filter((path) => path.endsWith('.html'));

function displayPath(path: string) {
  return relative(distDir, path).split(sep).join('/');
}

function visitJson(value: unknown, callback: (key: string, value: unknown) => void) {
  if (Array.isArray(value)) {
    value.forEach((item) => visitJson(item, callback));
    return;
  }
  if (!value || typeof value !== 'object') return;

  Object.entries(value).forEach(([key, item]) => {
    callback(key, item);
    visitJson(item, callback);
  });
}

describe('全站產物完整性', () => {
  it('每個頁面的 canonical、Open Graph 與 Twitter URL 應唯一且使用 www', () => {
    expect(htmlFiles()).toHaveLength(26);

    htmlFiles().forEach((file) => {
      const page = displayPath(file);
      const $ = load(readFileSync(file, 'utf-8'));
      const canonicalTags = $('link[rel="canonical"]');
      const canonical = canonicalTags.attr('href');

      expect(canonicalTags.length, page).toBe(1);
      expect(canonical, page).toMatch(/^https:\/\/www\.misstravel\.me\//);
      expect($('meta[property="og:url"]').attr('content'), page).toBe(canonical);
      expect($('meta[name="twitter:url"]').attr('content'), page).toBe(canonical);
    });
  });

  it('每個本機 Open Graph 圖片應存在，且 metadata 符合實際檔案', async () => {
    const mimeTypes: Record<string, string> = {
      avif: 'image/avif',
      gif: 'image/gif',
      heif: 'image/heif',
      jpeg: 'image/jpeg',
      png: 'image/png',
      svg: 'image/svg+xml',
      tiff: 'image/tiff',
      webp: 'image/webp',
    };

    for (const file of htmlFiles()) {
      const page = displayPath(file);
      const $ = load(readFileSync(file, 'utf-8'));
      const imageUrl = $('meta[property="og:image"]').attr('content');

      expect(imageUrl, page).toMatch(/^https:\/\/www\.misstravel\.me\//);

      const url = new URL(imageUrl!);
      const imageFile = join(publicDir, decodeURIComponent(url.pathname));
      expect(existsSync(imageFile), `${page}: ${url.pathname}`).toBe(true);

      const metadata = await sharp(imageFile).metadata();
      expect($('meta[property="og:image:width"]').attr('content'), page)
        .toBe(String(metadata.width));
      expect($('meta[property="og:image:height"]').attr('content'), page)
        .toBe(String(metadata.height));
      expect($('meta[property="og:image:type"]').attr('content'), page)
        .toBe(mimeTypes[metadata.format!]);
    }
  });

  it('所有 JSON-LD 應可解析，且不得殘留裸網域或捏造庫存', () => {
    let schemaCount = 0;

    htmlFiles().forEach((file) => {
      const page = displayPath(file);
      const $ = load(readFileSync(file, 'utf-8'));

      $('script[type="application/ld+json"]').each((index, element) => {
        const label = `${page} JSON-LD #${index + 1}`;
        const schema = JSON.parse($(element).html() || '');
        schemaCount += 1;

        visitJson(schema, (key, value) => {
          if (typeof value === 'string') {
            expect(value, label).not.toContain('https://misstravel.me');
            expect(value, label).not.toBe('https://schema.org/InStock');
          }
          expect(key, label).not.toBe('offerCount');
          expect(key, label).not.toBe('numberOfRooms');
        });
      });
    });

    expect(schemaCount).toBeGreaterThanOrEqual(htmlFiles().length);
  });

  it('圖集應用 36 張縮圖載入、原圖連結與原圖 ImageGallery schema', async () => {
    const galleryPath = join(distDir, 'galleries', 'index.html');
    const $ = load(readFileSync(galleryPath, 'utf-8'));
    const links = $('[data-lightbox="photos"]');

    expect(links).toHaveLength(36);

    links.each((index, element) => {
      const number = index + 1;
      expect($(element).attr('href')).toBe(`/images/galleries/gallery_${number}.webp`);
      expect($(element).find('img').attr('src'))
        .toBe(`/images/galleries/thumbs/gallery_${number}.webp`);
    });

    const schemas = $('script[type="application/ld+json"]')
      .toArray()
      .map((element) => JSON.parse($(element).html() || '{}'));
    const gallery = schemas.find((schema) => schema['@type'] === 'ImageGallery');

    expect(gallery).toBeDefined();
    expect(gallery.image).toHaveLength(36);
    gallery.image.forEach((image: { contentUrl: string }, index: number) => {
      expect(image.contentUrl).toBe(
        `https://www.misstravel.me/images/galleries/gallery_${index + 1}.webp`,
      );
    });

    let totalThumbnailBytes = 0;
    for (let number = 1; number <= 36; number += 1) {
      const sourcePath = join(publicDir, 'images', 'galleries', `gallery_${number}.webp`);
      const thumbPath = join(publicDir, 'images', 'galleries', 'thumbs', `gallery_${number}.webp`);
      expect(existsSync(thumbPath), `missing gallery thumbnail ${number}`).toBe(true);

      const thumbnail = await sharp(thumbPath).metadata();
      expect(thumbnail.width, `thumbnail ${number} width`).toBe(480);
      expect(thumbnail.height, `thumbnail ${number} height`).toBe(360);
      const thumbnailBytes = readFileSync(thumbPath).byteLength;
      totalThumbnailBytes += thumbnailBytes;
      expect(thumbnailBytes, `thumbnail ${number} bytes`)
        .toBeLessThan(readFileSync(sourcePath).byteLength);
    }
    expect(totalThumbnailBytes).toBeLessThan(1 * 1024 * 1024);
  });

  it('sitemap、robots 與 feeds 不得殘留裸網域', () => {
    [
      'sitemap-index.xml',
      'sitemap-0.xml',
      'robots.txt',
      'feed.xml',
      'feed.json',
    ].forEach((file) => {
      expect(readFileSync(join(distDir, file), 'utf-8'), file)
        .not.toContain('https://misstravel.me');
    });
  });

  it('JSON Feed 的 URL 應是合法 canonical 絕對 URL', () => {
    const feed = JSON.parse(readFileSync(join(distDir, 'feed.json'), 'utf-8'));
    const urls = [
      feed.home_page_url,
      feed.feed_url,
      ...feed.items.flatMap((item: { id: string; url: string }) => [item.id, item.url]),
    ];

    expect(urls.length).toBeGreaterThan(2);
    urls.forEach((value: string) => {
      const url = new URL(value);
      expect(url.origin).toBe('https://www.misstravel.me');
      expect(url.pathname).toMatch(/^\//);
    });
  });

  it('resolveSiteUrl 應為 fallback 與 URL base 補上單一斜線', () => {
    expect(resolveSiteUrl()).toBe('https://www.misstravel.me/');
    expect(resolveSiteUrl(new URL('https://www.misstravel.me/')))
      .toBe('https://www.misstravel.me/');
    expect(resolveSiteUrl(new URL('https://www.misstravel.me')))
      .toBe('https://www.misstravel.me/');
  });
});
