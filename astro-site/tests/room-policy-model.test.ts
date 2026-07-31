import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import { policiesForRoom, roomTypeFromId, selectRelatedRooms } from '../src/lib/room-policy';

const distDir = join(__dirname, '..', 'dist');

function page(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

function text(path: string) {
  return page(path).text().replace(/\s+/g, ' ').trim();
}

describe('房型政策模型', () => {
  it('應辨識營位、木屋與套房', () => {
    expect(roomTypeFromId('campsite_1')).toBe('campsite');
    expect(roomTypeFromId('log_cabin_1')).toBe('cabin');
    expect(roomTypeFromId('suite_1')).toBe('suite');
    expect(() => roomTypeFromId('unknown')).toThrow();
  });

  it('各類型應取得不同政策與入住時間', () => {
    expect(policiesForRoom('campsite_1').times.checkinTime).toBe('13:00');
    expect(policiesForRoom('suite_1').times.checkinTime).toBe('15:00');
    expect(policiesForRoom('campsite_1').specific.join(' ')).toContain('一帳以一車四人');
    expect(policiesForRoom('suite_1').specific.join(' ')).not.toContain('一帳');
  });

  it('套房頁不得顯示營位專屬規則', () => {
    const suiteText = text('rooms/suite_1/index.html');
    expect(suiteText).toContain('套房於假日及連續假期附早餐');
    expect(suiteText).not.toContain('一帳以一車四人');
    expect(suiteText).not.toContain('攜帶寵物離開預訂區域');
  });

  it('營位與木屋頁應顯示各自規則', () => {
    const campsiteText = text('rooms/campsite_1/index.html');
    const cabinText = text('rooms/log_cabin_1/index.html');
    expect(campsiteText).toContain('一帳以一車四人');
    expect(campsiteText).toContain('攜帶寵物離開預訂區域');
    expect(cabinText).toContain('木屋區嚴禁攜帶寵物');
    expect(cabinText).not.toContain('套房於假日');
  });

  it('相關房型應優先同類型與相近人數價格', () => {
    const rooms = [
      { id: 'campsite_1', data: { numberOfPeople: 16, weekdayPrice: 3200, order: 0 } },
      { id: 'campsite_2', data: { numberOfPeople: 16, weekdayPrice: 3200, order: 1 } },
      { id: 'campsite_3', data: { numberOfPeople: 8, weekdayPrice: 1600, order: 2 } },
      { id: 'suite_1', data: { numberOfPeople: 2, weekdayPrice: 2600, order: 8 } },
    ];
    expect(selectRelatedRooms(rooms[0], rooms, 2).map((room) => room.id)).toEqual(['campsite_2', 'campsite_3']);
  });

  it('房型頁應輸出 Accommodation schema 與正確入住時間', () => {
    const campsiteSchemas = page('rooms/campsite_1/index.html')('script[type="application/ld+json"]')
      .map((_, element) => JSON.parse(page('rooms/campsite_1/index.html')(element).text()))
      .get();
    const suiteSchemas = page('rooms/suite_1/index.html')('script[type="application/ld+json"]')
      .map((_, element) => JSON.parse(page('rooms/suite_1/index.html')(element).text()))
      .get();

    const campsite = campsiteSchemas.find((schema) => schema['@type'] === 'Accommodation');
    const suite = suiteSchemas.find((schema) => schema['@type'] === 'Accommodation');
    expect(campsite?.checkinTime).toBe('13:00');
    expect(campsite?.accommodationCategory).toBe('露營營位');
    expect(suite?.checkinTime).toBe('15:00');
    expect(suite?.accommodationCategory).toBe('園區套房');
  });

  it('房型頁應提供查空房與 LINE 入口', () => {
    const $ = page('rooms/campsite_1/index.html');
    expect($('a[href*="roomcloud.cc"]').text()).toContain('查詢空房');
    expect($('a[href="https://line.me/R/ti/p/%40rys8178b"]').text()).toContain('LINE 詢問');
  });
});
