import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { testResponsivePipeline } from '../scripts/test-responsive-images.mjs';
import { load } from 'cheerio';
import { responsiveImage } from '../src/lib/responsive-images';
const page=(name:string)=>load(readFileSync(new URL(`../dist/${name}`,import.meta.url),'utf8'));
describe('responsive original image contract',()=>{
  it('generates safely and repairs deterministic cached output using synthetic sources',async()=>{
    await testResponsivePipeline();
  });
  it('retains exact versioned identities and fallback, with an original largest candidate',()=>{
    const a=responsiveImage('/images/banner.webp?v=1','100vw');
    const b=responsiveImage('/images/banner.webp?v=2','100vw');
    expect(a.src).toBe('/images/banner.webp?v=1');
    expect(a['data-original-src']).not.toBe(b['data-original-src']);
    expect(a.srcset).toContain('/images/banner.webp?v=1 1478w');
    expect(a.width).toBe(1478);expect(a.height).toBe(1108);
    expect(()=>responsiveImage('/images/missing.webp','100vw')).toThrow('Missing');
    expect(()=>responsiveImage('/images/../banner.webp','100vw')).toThrow();
  });
  it('uses identical preload and visible candidate sets, without activating hidden slides',()=>{
    for(const [route,selector] of [['index.html','.hero-image'],['rooms/suite_1/index.html','.carousel-slide.active img']]){
      const $=page(route),img=$(selector),link=$('link[as="image"]');
      expect(img.attr('srcset')).toContain('/generated-images/');
      expect(link.attr('imagesrcset')).toBe(img.attr('srcset'));
      expect(link.attr('imagesizes')).toBe(img.attr('sizes'));
      expect(link.attr('href')).toBe(img.attr('src'));
      $('.carousel-slide:not(.active) img').each((_,el)=>{expect($(el).attr('src')).toBeUndefined();expect($(el).attr('srcset')).toBeUndefined();expect($(el).attr('data-src')).toMatch(/^\/images\//);});
    }
  });
  it('wires cards, gallery, deferred comparisons and thumbnails without changing SEO originals',()=>{
    const $=page('rooms/index.html');
    expect($('.room-card img').first().attr('srcset')).toContain('/generated-images/');
    expect($('.compare-chip img').first().attr('data-srcset')).toContain('/generated-images/');
    expect($('.compare-photo').first().attr('srcset')).toBeUndefined();
    const g=page('galleries/index.html');
    expect(g('.item img').first().attr('srcset')).toContain('/generated-images/');
    expect(g('[data-thumb-src]').first().attr('data-thumb-src')).toMatch(/^\/generated-images\//);
    expect(g('[data-lightbox]').first().attr('href')).toBe(g('.item img').first().attr('src'));
    expect(g('script[type="application/ld+json"]').text()).not.toContain('generated-images');
    expect(readFileSync(new URL('../dist/image-sitemap.xml',import.meta.url),'utf8')).not.toContain('generated-images');
  });
});
