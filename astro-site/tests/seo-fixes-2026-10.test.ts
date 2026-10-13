import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import { getTransformedRoutes } from '@vercel/routing-utils';

const app = join(__dirname, '..');
const read = (file: string) => load(readFileSync(join(app, 'dist', file), 'utf8'));
const config = JSON.parse(readFileSync(join(app, '../vercel.json'), 'utf8'));
const roomSlugs = readdirSync(join(app, 'src/content/rooms')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')).sort();

// Resolve a request path with Vercel's own compiled redirect routes (same approach as tests/helpers/edge-preview.mjs).
function edgeRedirect(pathname: string, hostname = 'www.misstravel.me') {
  const { routes, error } = getTransformedRoutes({ redirects: config.redirects, trailingSlash: config.trailingSlash });
  if (error || !routes) throw new Error(JSON.stringify(error));
  for (const route of routes as Array<{ src?: string; headers?: Record<string, string>; status?: number; has?: Array<{ type: string; value: string }>; caseSensitive?: boolean }>) {
    if (!route.src || !route.headers?.Location) continue;
    if (route.has?.some(h => h.type === 'host' && h.value !== hostname)) continue;
    const match = new RegExp(route.src, route.caseSensitive ? '' : 'i').exec(pathname);
    if (!match) continue;
    return { status: route.status, location: route.headers.Location.replace(/\$(\d+)/g, (_, n) => match[Number(n)] || '') };
  }
  return null;
}

describe('1. /index.html duplicates collapse onto the canonical directory URL', () => {
  it('/index.html answers 301 to /', () => {
    expect(edgeRedirect('/index.html')).toEqual({ status: 301, location: '/' });
  });
  it.each(['rooms', 'infos', 'announcements', 'rooms/log_cabin_1', 'infos/guide'])('/%s/index.html answers 301 to its directory, not a slug 404', dir => {
    expect(edgeRedirect(`/${dir}/index.html`)).toEqual({ status: 301, location: `/${dir}/` });
  });
  it('canonical directory URLs themselves are never redirected (no loop)', () => {
    for (const path of ['/', '/rooms/', '/infos/guide/', '/rooms/log_cabin_1/']) expect(edgeRedirect(path)).toBeNull();
  });
  it('legacy .html slugs still map to their pages', () => {
    expect(edgeRedirect('/rooms/suite_1.html')?.location).toBe('/rooms/suite_1/');
  });
});

describe('3. every room, including log_cabin_1, is linked from /rooms/', () => {
  // The homepage intentionally has no room-choice block (tests/homepage-stay-choices.test.ts), so /rooms/ is the hub.
  it('finds all ten rooms in content', () => {
    expect(roomSlugs).toHaveLength(10);
    expect(roomSlugs).toContain('log_cabin_1');
  });
  it.each(['rooms/index.html'])('%s links to every room page', file => {
    const $ = read(file);
    for (const slug of roomSlugs) expect($(`a[href="/rooms/${slug}/"]`).length, `${file} -> ${slug}`).toBeGreaterThan(0);
  });
});

describe('4. homepage title leads with the brand, then location/type from site content', () => {
  it('starts with 密式旅行｜ and names 苗栗泰安 and the lodging types', () => {
    const title = read('index.html')('title').text();
    expect(title.startsWith('密式旅行｜')).toBe(true);
    for (const term of ['苗栗泰安', '露營', '小木屋', '套房']) expect(title).toContain(term);
  });
});

describe('5. room pages have unique, location-bearing titles and descriptions', () => {
  const typeWord: Record<string, string> = { campsite_: '露營', log_cabin_: '木屋', suite_: '套房' };
  const pages = roomSlugs.map(slug => ({ slug, $: read(`rooms/${slug}/index.html`) }));
  it.each(roomSlugs)('%s title names the room, its type, 苗栗泰安 and the brand', slug => {
    const $ = pages.find(p => p.slug === slug)!.$;
    const title = $('title').text();
    const type = Object.entries(typeWord).find(([prefix]) => slug.startsWith(prefix))![1];
    expect(title).toContain(type);
    expect(title).toContain('苗栗泰安');
    expect(title).toContain('密式旅行');
    expect($('meta[property="og:title"]').attr('content')).toBe(title);
  });
  it.each(roomSlugs)('%s description carries the 苗栗泰安 location', slug => {
    const description = pages.find(p => p.slug === slug)!.$('meta[name="description"]').attr('content') || '';
    expect(description).toContain('苗栗泰安');
  });
  it('titles and descriptions are all distinct', () => {
    expect(new Set(pages.map(p => p.$('title').text())).size).toBe(roomSlugs.length);
    expect(new Set(pages.map(p => p.$('meta[name="description"]').attr('content'))).size).toBe(roomSlugs.length);
  });
});

describe('5/7. no unsupported FAQPage or rating markup is published', () => {
  it('no page emits FAQPage, AggregateRating or Review', () => {
    const files = readdirSync(join(app, 'dist'), { recursive: true }).map(String).filter(f => f.endsWith('.html'));
    for (const file of files) {
      const html = readFileSync(join(app, 'dist', file), 'utf8');
      expect(html, file).not.toMatch(/"(?:FAQPage|AggregateRating|aggregateRating|Review)"/);
    }
  });
});

describe('6. /infos/guide/ search snippet matches route-finding intent', () => {
  const $ = read('infos/guide/index.html');
  it('title leads with the brand and names location and both routes', () => {
    const title = $('title').text();
    expect(title.startsWith('密式旅行交通')).toBe(true);
    for (const term of ['苗栗泰安', '大湖', '豆腐街']) expect(title).toContain(term);
    expect(title).not.toContain('| 密式旅行露營區');
  });
  it('description cites the concrete roads already on the page', () => {
    const description = $('meta[name="description"]').attr('content') || '';
    for (const term of ['苗栗泰安', '七十二快速道路', '大湖', '苗栗六十一號縣道', '豆腐街', '苗62-1']) expect(description).toContain(term);
    const body = $('main').text();
    for (const term of ['苗栗六十一號縣道', '苗62-1', '豆腐街', '七十二快速道路']) expect(body).toContain(term);
  });
});
