import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import reviewed from './fixtures/reviewed-sitemap-images.json';
import { assertSitemap, assertSitemapIndex } from '../scripts/production-smoke.mjs';
const dist = join(__dirname, '..', 'dist');
const read = (name: string) => readFileSync(join(dist, name), 'utf8');
const urls = (xml: string) => { const $ = load(xml, {xml: true}); return $('url > loc').map((_, e) => $(e).text()).get(); };
describe('Complete canonical sitemap delivery', () => {
  it('the accepted sitemap entrypoint includes every canonical page, not only photo pages', () => {
    const expected = urls(read('sitemap-0.xml'));
    expect(expected).toHaveLength(25);
    expect(urls(read('image-sitemap.xml'))).toEqual(expected);
  });
  it('the old numbered path remains an exact compatible copy, not an abandoned 404', () => {
    expect(read('sitemap-0.xml')).toBe(read('image-sitemap.xml'));
  });
  it('the index references one complete authoritative child without duplicate dependencies', () => {
    const $ = load(read('sitemap-index.xml'), {xml: true});
    expect($('sitemap > loc').map((_,e)=>$(e).text()).get()).toEqual(['https://www.misstravel.me/image-sitemap.xml']);
  });
  it('publishes identical XML in the Vercel deployment output', () => {
    for (const name of ['sitemap-0.xml','image-sitemap.xml','sitemap-index.xml']) {
      expect(readFileSync(join(dist, '../.vercel/output/static', name), 'utf8')).toBe(read(name));
    }
  });
  it('uses the same complete-manifest requirements in production smoke', () => {
    expect(() => assertSitemapIndex(read('sitemap-index.xml'))).not.toThrow();
    expect(() => assertSitemap(read('image-sitemap.xml'))).not.toThrow();
    expect(() => assertSitemapIndex('<sitemapindex><sitemap><loc>https://www.misstravel.me/sitemap-0.xml</loc></sitemap></sitemapindex>')).toThrow();
  });
  it('each entry resolves to its canonical indexable page and original images remain', () => {
    const xml = read('image-sitemap.xml'); const $ = load(xml, {xml: true});
    const locations = urls(xml);
    expect(new Set(locations).size).toBe(locations.length);
    for (const loc of locations) {
      const url = new URL(loc); expect(url.origin).toBe('https://www.misstravel.me');
      expect(url.search + url.hash).toBe(''); expect(url.pathname).not.toMatch(/404|500|generated-images|\.xml/);
      const page = load(read(join(url.pathname.slice(1), 'index.html')));
      expect(page('link[rel="canonical"]').attr('href')).toBe(loc);
      expect(page('meta[name="robots"]').attr('content') || '').not.toContain('noindex');
    }
    expect($('image\\:loc')).toHaveLength(139);
    const actual: Record<string, string[]> = {};
    $('url').each((_, entry) => {
      const images = $(entry).find('image\\:loc').map((_,img)=>$(img).text()).get();
      if (images.length) actual[$(entry).children('loc').text()] = images;
    });
    expect(actual).toEqual(reviewed.entries);
    expect(xml).not.toContain('/generated-images/'); expect(xml).not.toContain('<lastmod>');
  });
});
