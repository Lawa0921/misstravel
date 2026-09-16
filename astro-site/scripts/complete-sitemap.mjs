import sitemap from '@astrojs/sitemap';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { load } from 'cheerio';

const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const IMAGE_NS = 'http://www.google.com/schemas/sitemap-image/1.1';
/** @param {string} value */
const escapeXml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
/** @param {string} xml @param {string} label */
function parseUrlset(xml, label) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error(`${label}: unsupported XML declaration`);
  const $ = load(xml, {xml: true});
  const root = $.root().children();
  if (root.length !== 1 || !root.is('urlset') || root.attr('xmlns') !== NS) throw new Error(`${label}: expected sitemap urlset`);
  return $;
}

/**
 * Use the existing Astro-generated canonical pages and the existing reviewed
 * image map. No hand-maintained route list, second crawler or fake lastmod.
 * @param {string} pagesXml @param {string} imagesXml @param {string} site
 */
export function combineSitemaps(pagesXml, imagesXml, site) {
  const origin = new URL(site).origin;
  const pages = parseUrlset(pagesXml, 'pages');
  const photos = parseUrlset(imagesXml, 'images');
  const pageUrls = pages('urlset > url').map((_, entry) => {
    const loc = pages(entry).children('loc');
    if (loc.length !== 1) throw new Error('Each page requires exactly one loc');
    const text = loc.text(); const url = new URL(text);
    if (url.origin !== origin || url.search || url.hash || !url.pathname.endsWith('/') || /\/(404|500)\/$/.test(url.pathname)) throw new Error(`Invalid canonical page: ${text}`);
    return url.href;
  }).get();
  if (!pageUrls.length || pageUrls.length > 50000 || new Set(pageUrls).size !== pageUrls.length) throw new Error('Canonical sitemap is empty, duplicated or too large');
  const allowed = new Set(pageUrls);
  /** @type {Map<string, string[]>} */
  const imageMap = new Map();
  photos('urlset > url').each((_, entry) => {
    const loc = photos(entry).children('loc');
    if (loc.length !== 1 || !allowed.has(loc.text()) || imageMap.has(loc.text())) throw new Error('Image page is not a unique canonical entry');
    const images = photos(entry).children('image\\:image').map((_, image) => {
      const imageLoc = photos(image).children('image\\:loc');
      if (imageLoc.length !== 1) throw new Error('Image requires exactly one loc');
      const url = new URL(imageLoc.text());
      if (url.origin !== origin || !url.pathname.startsWith('/images/') || url.hash) throw new Error('Expected a same-origin original image');
      return url.href;
    }).get();
    if (images.length > 1000 || new Set(images).size !== images.length) throw new Error('Too many or duplicated image references');
    imageMap.set(loc.text(), images);
  });
  if (!imageMap.size || ![...imageMap.values()].some(images => images.length)) throw new Error('Reviewed image references must not disappear');
  const rows = pageUrls.map(url => `<url><loc>${escapeXml(url)}</loc>${(imageMap.get(url) || []).map(src => `<image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`).join('')}</url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="${NS}" xmlns:image="${IMAGE_NS}">${rows.join('')}</urlset>`;
  if (Buffer.byteLength(xml) > 50 * 1024 * 1024) throw new Error('Complete sitemap exceeds protocol size limit');
  const index = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="${NS}"><sitemap><loc>${escapeXml(origin + '/image-sitemap.xml')}</loc></sitemap></sitemapindex>`;
  return {xml, index, pages: pageUrls.length, imageReferences: [...imageMap.values()].reduce((n, images) => n + images.length, 0)};
}

/** @returns {import('astro').AstroIntegration} */
export default function completeSitemap() {
  const upstream = sitemap({namespaces: {news: false, xhtml: false, image: false, video: false}});
  const originalDone = upstream.hooks['astro:build:done'];
  const originalConfig = upstream.hooks['astro:config:done'];
  let site = '';
  return {
    ...upstream,
    name: 'complete-canonical-sitemap',
    hooks: {
      ...upstream.hooks,
      'astro:config:done': async context => {
        if (!context.config.site) throw new Error('Complete sitemap requires a canonical site');
        site = context.config.site;
        await originalConfig?.(context);
      },
      'astro:build:done': async context => {
        // Finish the official route discovery first, before the Vercel adapter
        // copies static files. Both compatibility URLs then share one manifest.
        await originalDone?.(context);
        const main = new URL('sitemap-0.xml', context.dir);
        const images = new URL('image-sitemap.xml', context.dir);
        const output = combineSitemaps(await readFile(main, 'utf8'), await readFile(images, 'utf8'), site);
        for (const [url, body] of [[main, output.xml], [images, output.xml], [new URL('sitemap-index.xml', context.dir), output.index]]) {
          const target = /** @type {URL} */ (url);
          const temp = new URL(target.href + '.tmp');
          await writeFile(temp, body, 'utf8');
          await rename(temp, target);
        }
        context.logger.info(`${output.pages} canonical pages and ${output.imageReferences} original-image references; compatible sitemap URLs synchronized`);
      },
    },
  };
}
