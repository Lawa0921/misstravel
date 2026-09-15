import { describe,it,expect } from 'vitest';
import { load } from 'cheerio';
import {readFileSync} from 'node:fs';import {join} from 'node:path';
import coverage from './fixtures/setofont-coverage.json';
const read=(file:string)=>load(readFileSync(join(process.cwd(),'dist',file),'utf8'));
describe('Modern interaction data and semantic contracts',()=>{
 it('comparison is a sibling action rather than an invalid nested button',()=>{const $=read('rooms/index.html');expect($('a.room-card')).toHaveLength(10);expect($('.room-option > button[data-compare-toggle]')).toHaveLength(10);expect($('a button')).toHaveLength(0);expect($('.compare-room')).toHaveLength(10);});
 it('comparison displays each real plan with its own occupancy and prices',()=>{const $=read('rooms/index.html');const option=$('[data-compare-room="campsite_1"] .compare-plan');expect(option.eq(0).text()).toContain('三帳包區 · 12 人以下');expect(option.eq(0).find('dd').map((_,e)=>$(e).text()).get()).toEqual(['NT$2,400','NT$3,000','NT$3,600']);expect(option.eq(1).text()).toContain('16 人以下');expect(option.eq(1).find('dd').map((_,e)=>$(e).text()).get()).toEqual(['NT$3,200','NT$4,000','NT$4,800']);});
 it('new visible controls use the original font coverage',()=>{const supported=new Set([...coverage.supportedCodepoints,0x9109,0x95b1]);for(const file of ['rooms/index.html','rooms/suite_1/index.html','galleries/index.html']){const $=read(file);const text=$('.compare-tray,.compare-help,.compare-toggle,.photo-toolbar,.viewer-toolbar,.viewer-loading,.room-section-rail').text();const missing=[...new Set([...text].filter(c=>/[\u4e00-\u9fff]/u.test(c)&&!supported.has(c.codePointAt(0)!)))];expect(missing,file).toEqual([]);}});
 it('room reader points to real expanded sections',()=>{const $=read('rooms/suite_1/index.html');const links=$('.room-section-rail a');expect(links).toHaveLength(4);links.each((_,a)=>expect($(String($(a).attr('href')))).toHaveLength(1));expect($('.booking-notice details,.room-content details')).toHaveLength(0);});
 it('viewer and gallery share the same source data and alt text',()=>{const $=read('galleries/index.html');const data=JSON.parse($('[data-viewer-data]').text());expect(data).toHaveLength(36);$('.row.photos a').each((i,a)=>{expect(data[i].src).toBe($(a).attr('href'));expect(data[i].alt).toBe($(a).find('img').attr('alt'));});expect($('.viewer-thumb')).toHaveLength(36);});
});
