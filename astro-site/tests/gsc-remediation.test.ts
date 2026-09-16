import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {load} from 'cheerio';
import {match,compile} from 'path-to-regexp';
import history from './fixtures/legacy-dated-routes.json';
const app=join(__dirname,'..');
const config=JSON.parse(readFileSync(join(app,'../vercel.json'),'utf8'));
function destination(url:URL){
 for(const r of config.redirects){
  if(r.has?.some((h:{type:string;value:string})=>h.type==='host'&&url.hostname!==h.value))continue;
  const result=match(r.source,{decode:decodeURIComponent})(url.pathname);if(!result)continue;
  const value=r.destination.startsWith('https:') ? r.destination.replace(':path*',url.pathname.slice(1)) : compile(r.destination)(result.params);
  const to=new URL(value,url);to.search=url.search;return {to,permanent:r.permanent};
 }
 return null;
}
describe('Historical URLs resolve to their real successor, not a dated 404',()=>{
 it.each(Object.entries(history.routes))('%s has exact current destination', (source,target)=>{
  for(const suffix of ['.html','/']){
   const old=source.replace(/\.html$/,suffix);
   for(const origin of ['https://www.misstravel.me','https://misstravel.me']){
    let url=new URL(old+'?utm_source=legacy&key=keep',origin);let hops=0;const visited=new Set<string>();
    for(let n=0;n<4;n++){const redirect=destination(url);if(!redirect)break;expect(redirect.permanent).toBe(true);expect(visited.has(url.href)).toBe(false);visited.add(url.href);url=redirect.to;hops++;}
    expect(url.origin).toBe('https://www.misstravel.me');expect(url.pathname).toBe(target);expect(url.search).toBe('?utm_source=legacy&key=keep');
    expect(hops).toBeLessThanOrEqual(origin.includes('www.')?1:2);
    expect(existsSync(join(app,'dist',target,'index.html'))).toBe(true);
   }
  }
 });
 it('does not invent destinations for truncated or unknown slugs',()=>{
  for(const path of [...history.unmapped,'/rooms/2022-10-07-unknown/','/rooms/2021-01-01-suite_1/'])expect(destination(new URL(path,'https://www.misstravel.me'))).toBeNull();
 });
 it('has no duplicate exact redirect sources',()=>{
  const sources=config.redirects.filter((r:{source:string})=>!r.source.includes(':')).map((r:{source:string})=>r.source);expect(new Set(sources).size).toBe(sources.length);
 });
});
describe('Rental services are not product purchases',()=>{
 const $=load(readFileSync(join(app,'dist/sale_items/index.html'),'utf8'));
 const schemas=$('script[type="application/ld+json"]').map((_,e)=>JSON.parse($(e).text())).get();
 it('describes all three actual rental services, with no merchant Product claims',()=>{
  expect(schemas.filter(s=>s['@type']==='Product')).toHaveLength(0);
  const services=schemas.filter(s=>s['@type']==='Service');expect(services).toHaveLength(3);
  for(const [index,name,price] of [[1,'烹飪組合',200],[2,'烤肉組合',300],[3,'寢具組合',400]] as const){
   const s=services.find(s=>s.name===name);expect(s).toBeDefined();
   expect(s.url).toBe(`https://www.misstravel.me/sale_items/#sale_item_${index}`);
   expect(s.provider['@id']).toBe('https://www.misstravel.me/#organization');
   expect(schemas.find(entity=>entity['@type']==='Organization'&&entity['@id']===s.provider['@id'])).toBeDefined();
   expect(s.offers.price).toBe(price);expect(s.offers.priceCurrency).toBe('TWD');
   expect(s.offers.businessFunction).toBe('http://purl.org/goodrelations/v1#LeaseOut');
   expect(s.offers.priceSpecification.referenceQuantity).toEqual({'@type':'QuantitativeValue',value:1,unitText:'次'});
   expect($(`#sale_item_${index}`).text()).toContain('租用');
   for(const field of ['availability','shippingDetails','hasMerchantReturnPolicy','priceValidUntil'])expect(s.offers[field]).toBeUndefined();
   expect(s.aggregateRating).toBeUndefined();expect(s.image).toBeUndefined();
  }
 });
});
describe('Sitemap entrypoint discovers page AND original-image sitemaps',()=>{
 it('contains two valid same-origin children without changing canonical page set',()=>{
  const xml=load(readFileSync(join(app,'dist/sitemap-index.xml'),'utf8'),{xml:true});
  const locs=xml('loc').map((_,e)=>xml(e).text()).get();
  expect(locs).toEqual(expect.arrayContaining(['https://www.misstravel.me/sitemap-0.xml','https://www.misstravel.me/image-sitemap.xml']));expect(locs).toHaveLength(2);
  const pages=load(readFileSync(join(app,'dist/sitemap-0.xml'),'utf8'),{xml:true});expect(pages('loc')).toHaveLength(25);
  for(const loc of pages('loc').map((_,e)=>pages(e).text()).get()){expect(loc).not.toMatch(/2022-|\.html$/);expect(loc).toMatch(/^https:\/\/www\.misstravel\.me\//);}
 });
});
