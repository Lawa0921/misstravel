import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { load } from 'cheerio';
import sharp from 'sharp';

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
});
