import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const distDir = join(__dirname, '..', 'dist');

function relatedRoomHrefs(slug: string) {
  const html = readFileSync(join(distDir, 'rooms', slug, 'index.html'), 'utf-8');
  const $ = load(html);
  return $('.related-card')
    .map((_, element) => $(element).attr('href'))
    .get();
}

describe('相關住宿排序', () => {
  it('露營木屋應優先推薦其他露營木屋', () => {
    expect(relatedRoomHrefs('log_cabin_4')).toEqual([
      '/rooms/log_cabin_2/',
      '/rooms/log_cabin_3/',
      '/rooms/log_cabin_1/',
    ]);
  });

  it('雙人套房應先推薦其他套房，再補最接近的其他住宿', () => {
    expect(relatedRoomHrefs('suite_3')).toEqual([
      '/rooms/suite_1/',
      '/rooms/suite_2/',
      '/rooms/log_cabin_2/',
    ]);
  });

  it('雨棚營位應先推薦其他營位，再補最接近的其他住宿', () => {
    expect(relatedRoomHrefs('campsite_3')).toEqual([
      '/rooms/campsite_1/',
      '/rooms/campsite_2/',
      '/rooms/log_cabin_2/',
    ]);
  });
});
