import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { load } from 'cheerio';
import baseline from './fixtures/guest-interface-baseline.json';
import font from './fixtures/setofont-coverage.json';
const root = join(__dirname, '..');
const hash = (text:string) => createHash('sha256').update(text).digest('hex');
const compact = (text:string) => text.replace(/\s+/g, ' ').trim();
const read = (file:string) => load(readFileSync(join(root,'dist',file),'utf8'));
describe('Guest interface coverage preserves content and SEO', () => {
  for (const contract of baseline.contracts) {
    it(`${contract.file}: keeps all SEO and operational copy`, () => {
      const $ = read(contract.file);
      const seo = {title:$('title').text(),meta:$('meta').toArray().map(e=>({...e.attribs})),canonical:$('link[rel="canonical"]').attr('href'),schemas:$('script[type="application/ld+json"]').map((_,e)=>JSON.parse($(e).text())).get()};
      expect(hash(JSON.stringify(seo))).toBe(contract.seo);
      for (const region of contract.regions) {
        const el = $(region.selector).eq(region.index);
        expect(el.length).toBe(1);
        const copy=el.clone();copy.find('script,style,noscript').remove();
        expect(hash(compact(copy.text())), `${region.selector}[${region.index}]`).toBe(region.text);
        const media=copy.find('img,iframe').toArray().map(e=>({tag:e.tagName,src:$(e).attr('src')||$(e).attr('data-src'),alt:$(e).attr('alt'),title:$(e).attr('title')}));
        expect(hash(JSON.stringify(media)), `${region.selector} media`).toBe(region.media);
        expect(hash(JSON.stringify(el.find('a[href]').map((_,a)=>$(a).attr('href')).get()))).toBe(region.links);
      }
    });
  }
  it.each(['account','roles','contact-method','menu','map','video','guide','set-menu-info'])('%s uses the shared guest navigation and a main heading', slug => {
    const $=read(`infos/${slug}/index.html`);
    expect($('main h1')).toHaveLength(1);
    expect($('.guest-navigation-links a')).toHaveLength(8);
    expect($('.guest-navigation [aria-current="page"]')).toHaveLength(1);
    expect($('.guest-navigation [aria-current="page"]').attr('href')).toBe(`/infos/${slug}/`);
  });
  it('keeps every service and all twelve original information dialogs', () => {
    const shop=read('sale_items/index.html');expect(shop('button.sale-btn')).toHaveLength(7);expect(shop('.modal')).toHaveLength(7);
    expect(read('infos/guide/index.html')('.modal')).toHaveLength(2);
    expect(read('infos/set-menu-info/index.html')('.modal')).toHaveLength(3);
    shop('button.sale-btn').each((_,e)=>expect(shop(e).attr('aria-label')).toBe(shop(e).find('.guest-choice-title').text()));
  });
  it('new visible copy uses the original font coverage', () => {
    const supported=new Set([...font.supportedCodepoints,0x9109,0x95b1]);
    for(const file of ['sale_items/index.html','infos/guide/index.html','infos/set-menu-info/index.html','infos/contact-method/index.html','infos/map/index.html','infos/menu/index.html','404.html']) {
      const $=read(file); const text=$('.guest-choice,.guest-navigation,.media-action,.error-actions').text();
      const missing=[...new Set([...text].filter(c=>/[\u4e00-\u9fff]/u.test(c)&&!supported.has(c.codePointAt(0)!)))];
      expect(missing, file).toEqual([]);
    }
  });
});
