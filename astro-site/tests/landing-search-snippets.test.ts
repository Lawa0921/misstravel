import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
const root=join(__dirname,'..');
const read=(file:string)=>load(readFileSync(join(root,'dist',file),'utf8'));
describe('Search summaries describe the actual landing-page purpose',()=>{
  it.each([
    ['index.html',['苗栗泰安','營位','小木屋','套房']],
    ['infos/index.html',['桌遊咖啡廳','兒童遊戲室','訂房匯款']],
    ['infos/guide/index.html',['大湖','豆腐街','七十二快速道路']],
    ['infos/menu/index.html',['原圖','標示價格']],
    ['infos/map/index.html',['配置原圖','交通指引']],
  ])('%s has a specific summary and consistent social description',(file,terms)=>{
    const $=read(file as string);const summary=$('meta[name="description"]').attr('content')||'';
    for(const term of terms as string[])expect(summary).toContain(term);
    expect(summary).not.toMatch(/最佳|頂級|全天候|保證|免費住宿/);
    expect($('meta[property="og:description"]').attr('content')).toBe(summary);
    expect($('meta[name="twitter:description"]').attr('content')).toBe(summary);
    expect($('h1').length).toBe(1);
  });
  it('404 keeps noindex and describes recovery rather than selling a room',()=>{
    const $=read('404.html');expect($('meta[name="robots"]').attr('content')).toContain('noindex');
    expect($('meta[name="description"]').attr('content')).toContain('頁面不存在');
  });
  it('does not duplicate the five distinct landing-page summaries',()=>{
    const summaries=['index.html','infos/index.html','infos/guide/index.html','infos/menu/index.html','infos/map/index.html'].map(file=>read(file)('meta[name="description"]').attr('content'));
    expect(new Set(summaries).size).toBe(5);
  });
});
