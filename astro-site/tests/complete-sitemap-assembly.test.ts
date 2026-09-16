import { describe, expect, it } from 'vitest';
import { combineSitemaps } from '../scripts/complete-sitemap.mjs';
const origin = 'https://www.misstravel.me';
const wrap = (rows: string) => `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${rows}</urlset>`;
const page = (url: string) => `<url><loc>${origin}${url}</loc></url>`;
const images = wrap(`<url><loc>${origin}/rooms/</loc><image:image><image:loc>${origin}/images/photo.webp?v=1&amp;size=full</image:loc></image:image></url>`);
const pages = wrap(page('/') + page('/rooms/'));
describe('Sitemap assembly fails closed rather than publishing partial discovery', () => {
  it('combines every canonical URL, preserves query escaping and is idempotent', () => {
    const output = combineSitemaps(pages, images, origin);
    expect(output.pages).toBe(2); expect(output.imageReferences).toBe(1);
    expect(output.xml).toContain('?v=1&amp;size=full');
    expect(combineSitemaps(pages, output.xml, origin)).toEqual(output);
  });
  it.each([wrap(''), wrap(page('/')+page('/')), '<html>Error</html>', wrap(page('/404/'))])('rejects malformed/empty/duplicate/noncanonical inputs: %s', xml => {
    expect(() => combineSitemaps(xml, images, origin)).toThrow();
  });
  it('refuses foreign pages or orphan image entries instead of silently dropping them', () => {
    expect(() => combineSitemaps(pages.replaceAll(origin, 'https://another.example'), images, origin)).toThrow();
    expect(() => combineSitemaps(wrap(page('/')), images, origin)).toThrow();
  });
  it('refuses derivative thumbnails and disappearing images', () => {
    expect(() => combineSitemaps(pages, images.replace('/images/', '/generated-images/'), origin)).toThrow();
    expect(() => combineSitemaps(pages, wrap(page('/')), origin)).toThrow();
  });
  it('refuses unsupported XML declarations', () => {
    expect(() => combineSitemaps('<!DOCTYPE urlset>'+pages, images, origin)).toThrow();
  });
});
