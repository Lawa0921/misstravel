import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import { parseFrontmatter } from 'astro/markdown';
import sharp from 'sharp';
import baseline from './fixtures/room-operating-copy.json';
import catalog from '../src/lib/image-metadata.json';
import { normalizeRoomData, resolveRoomValueTokens } from '../src/lib/room-values.mjs';
import { getRoomImageMetadata, imageKey } from '../src/lib/image-metadata';
import { createRoomSchemas } from '../src/lib/room-schema';

const root = join(__dirname, '..');
const compact = (text: string) => text.replace(/\s+/g, ' ').trim();
const slugs = Object.keys(baseline) as Array<keyof typeof baseline>;
const raw = (slug: string) => parseFrontmatter(readFileSync(join(root, 'src/content/rooms', `${slug}.md`), 'utf8')).frontmatter;
const page = (slug: string) => load(readFileSync(join(root, 'dist/rooms', slug, 'index.html'), 'utf8'));

for (const slug of slugs) {
  describe(`${slug}: complete room SEO and operating integrity`, () => {
    it('preserves every original fee and operating paragraph after interpolation', () => {
      const $ = page(slug);
      for (const [selector, key] of [['.room-content','room'],['.booking-notice','booking'],['.day-definition','day']] as const) {
        expect(compact($(selector).text())).toBe(baseline[slug][key]);
      }
      expect($('main').text()).not.toMatch(/\{\{|\}\}/);
      const data = normalizeRoomData(raw(slug));
      for (const key of ['weekdayPrice','holidayPrice','standardPrice','numberOfPeople','numberOfRooms'] as const) {
        expect(data[key]).toBe(baseline[slug].data[key]);
      }
    });
    it('publishes a factual page-specific resolved description', () => {
      const $ = page(slug);
      const data = normalizeRoomData(raw(slug));
      expect($('meta[name="description"]').attr('content')).toBe(data.metaDescription);
      expect(data.metaDescription).not.toMatch(/\{\{|最佳|頂級|最舒適|浪漫之旅|全天候不用擔心/);
      expect(data.metaDescription).toContain('密式旅行');
      expect(data.metaDescription).toContain(String(data.weekdayPrice));
      expect(data.metaDescription).toContain('連續假期限接三天兩夜以上');
      if (data.category === 'suite') {
        expect(data.metaDescription).toContain('不附早餐');
        expect(data.metaDescription).toContain('附早餐');
      }
      if (data.category === 'cabin') expect(data.metaDescription).toContain('公用');
    });
    it('separates the room, its web page and the existing lodging business', () => {
      const $ = page(slug);
      const schemas = $('script[type="application/ld+json"]').map((_, el) => JSON.parse($(el).text())).get();
      const room = schemas.filter(s => s['@type'] === 'Accommodation');
      const web = schemas.filter(s => s['@type'] === 'WebPage');
      expect(room).toHaveLength(1); expect(web).toHaveLength(1);
      expect(schemas.filter(s => s['@type'] === 'LodgingBusiness')).toHaveLength(1);
      const canonical = `https://www.misstravel.me/rooms/${slug}/`;
      expect(room[0]['@id']).toBe(`${canonical}#accommodation`);
      expect(room[0].name).toBe(baseline[slug].data.title);
      expect(room[0].mainEntityOfPage['@id']).toBe(web[0]['@id']);
      expect(web[0].mainEntity['@id']).toBe(room[0]['@id']);
      expect(room[0].containedInPlace['@id']).toBe('https://www.misstravel.me/#lodgingbusiness');
      expect($('link[rel="canonical"]').attr('href')).toBe(canonical);
      for (const field of ['numberOfRooms','numberOfBedrooms','occupancy','offers','aggregateRating','starRating','checkinTime','checkoutTime']) {
        expect(room[0]).not.toHaveProperty(field);
      }
      expect(JSON.stringify(schemas)).not.toMatch(/"@type":"(?:Offer|Product|AggregateOffer|FAQPage)"/);
      expect(room[0].image.length).toBeGreaterThan(0);
      for (const image of room[0].image) {
        const metadata = getRoomImageMetadata(new URL(image.contentUrl).pathname);
        expect(metadata.kind).toBe('photo'); expect(image.caption).toBe(metadata.alt);
      }
    });
    it('uses audited descriptions for every carousel and related photograph', () => {
      const $ = page(slug);
      const imgs = $('.carousel-slide img, .related-card img');
      expect(imgs.length).toBeGreaterThan(0);
      imgs.each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src')!;
        expect($(img).attr('alt')).toBe(getRoomImageMetadata(src).alt);
      });
      expect($('meta[property="og:image:alt"]').attr('content')).toBe(getRoomImageMetadata(raw(slug).mainImage).alt);
    });
  });
}

describe('single-source room price model', () => {
  it.each(['campsite_1','campsite_2'])('%s does not duplicate the standard plan rates', slug => {
    const input = raw(slug);
    const standard = input.priceOptions.find((p: {isStandard?: boolean}) => p.isStandard);
    for (const key of ['weekdayPrice','holidayPrice','standardPrice','numberOfPeople']) expect(Object.hasOwn(standard, key)).toBe(false);
    const original = normalizeRoomData(input);
    const changed = normalizeRoomData({ ...input, weekdayPrice: 3500 });
    expect(original.priceOptions[0].weekdayPrice).toBe(3200);
    expect(changed.priceOptions[0].weekdayPrice).toBe(3500);
    expect(changed.priceOptions[1].weekdayPrice).toBe(2400);
    expect(changed.metaDescription).toContain('3500');
    expect(resolveRoomValueTokens('平日 {{priceOptions.0.weekdayPrice}} 元', changed)).toBe('平日 3500 元');
  });
  it('updates standard room body and search summary from one canonical rate', () => {
    const data = normalizeRoomData({ ...raw('suite_1'), weekdayPrice: 2700 });
    expect(data.metaDescription).toContain('2700');
    expect(resolveRoomValueTokens('平日：{{weekdayPrice}} 元',data)).toBe('平日：2700 元');
  });
  it.each(['{{missing}}','{{constructor}}','{{priceOptions.9.weekdayPrice}}','{{weekdayPrice + 1}}','{{weekdayPrice','{{__proto__.x}}','{{{weekdayPrice}}}','{{weekdayPrice}}}'])('rejects invalid reference %s', value => {
    expect(() => resolveRoomValueTokens(value, normalizeRoomData(raw('suite_1')))).toThrow();
  });
  it('rejects contradictory standard data, nonnumeric values and multiple standard plans', () => {
    const input = raw('campsite_1');
    expect(() => normalizeRoomData({...input,weekdayPrice:NaN})).toThrow();
    expect(() => normalizeRoomData({...input,weekdayPrice:-1})).toThrow();
    expect(() => normalizeRoomData({...input,priceOptions:input.priceOptions.map((p: object)=>({...p,isStandard:true}))})).toThrow();
    expect(() => normalizeRoomData({...input,priceOptions:[{...input.priceOptions[0],weekdayPrice:1},input.priceOptions[1]]})).toThrow();
  });
  it('rejects misplaced text references and reordered standard plans', () => {
    for (const field of ['title','metaTitle','shortTitle','keywords','pricingNote']) {
      expect(() => normalizeRoomData({ ...raw('suite_1'), [field]: '{{weekdayPrice}}' })).toThrow();
    }
    const input = raw('campsite_1');
    expect(() => normalizeRoomData({ ...input, priceOptions: [...input.priceOptions].reverse() })).toThrow();
    expect(() => normalizeRoomData({ ...input, priceOptions: [{ ...input.priceOptions[0], label: '{{weekdayPrice}}' }, input.priceOptions[1]] })).toThrow();
  });
  it('keeps all ten descriptions distinct', () => {
    expect(new Set(slugs.map(s => normalizeRoomData(raw(s)).metaDescription)).size).toBe(10);
  });
});

describe('image inventory, sitemap and sharing', () => {
  it('verifies every catalog entry against the original file dimensions', async () => {
    for (const [src, metadata] of Object.entries(catalog)) {
      const file = join(root,'public',src);
      expect(existsSync(file)).toBe(true);
      const real = await sharp(file).metadata();
      expect({width:metadata.width,height:metadata.height},src).toEqual({width:real.width,height:real.height});
      expect(metadata.alt.length).toBeGreaterThan(5);
    }
  });
  it('exposes every room photograph without listing notice images as room photos', () => {
    const $ = load(readFileSync(join(root,'dist/image-sitemap.xml'),'utf8'), {xml:true});
    expect($('url')).toHaveLength(25);
    expect($('url').filter((_, entry) => $(entry).find('image\\:loc').length > 0)).toHaveLength(11);
    const locations = new Set($('image\\:loc').map((_,el)=>$(el).text()).get());
    for (const slug of slugs) {
      const data = raw(slug);
      for (const src of [...new Set<string>([data.mainImage,...data.images])]) {
        const url = new URL(src,'https://www.misstravel.me').href;
        if (getRoomImageMetadata(src).kind === 'photo') expect(locations.has(url),url).toBe(true);
        else expect(locations.has(url),url).toBe(false);
      }
    }
    expect(readFileSync(join(root,'dist/robots.txt'),'utf8')).toContain('Sitemap: https://www.misstravel.me/image-sitemap.xml');
  });
  it.each(['map','menu'])('%s uses the declared page-specific share image', slug => {
    const $ = load(readFileSync(join(root,`dist/infos/${slug}/index.html`),'utf8'));
    expect($('meta[property="og:image"]').attr('content')).toBe(`https://www.misstravel.me/images/${slug}.webp`);
    expect($('meta[property="og:image:alt"]').attr('content')).toBe(getRoomImageMetadata(`/images/${slug}.webp`).alt);
  });
  it('treats version queries as the same audited photograph and fails missing metadata', () => {
    expect(imageKey('/images/suite_1/suite_1_4.webp?v=20260702')).toBe('/images/suite_1/suite_1_4.webp');
    expect(() => getRoomImageMetadata('/images/not-reviewed.webp')).toThrow();
    expect(() => createRoomSchemas('../invalid',normalizeRoomData(raw('suite_1')) as any)).toThrow();
  });
});
