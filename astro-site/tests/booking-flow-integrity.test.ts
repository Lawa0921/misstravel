import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

function normalizedText(path: string) {
  return readPage(path).text().replace(/\s+/g, ' ').trim();
}

describe('空房查詢與正式預訂流程', () => {
  it('首頁 Banner 不得將 RoomCloud 誤稱為立即預訂', () => {
    const $ = readPage('index.html');
    const bannerBookingLink = $('#banner a[href*="roomcloud.cc"]');

    expect(bannerBookingLink.length).toBe(1);
    expect(bannerBookingLink.text().trim()).toBe('查詢空房');
    expect($('#banner').text()).not.toContain('立即預訂');
  });

  it('首頁應直接說明空房系統僅供查詢', () => {
    const text = normalizedText('index.html');

    expect(text).toContain('空房系統僅供查詢');
    expect(text).toContain('LINE 或 Facebook 聯絡確認');
  });

  it('訂房流程頁應明確說明 RoomCloud 不會直接完成預訂', () => {
    const text = normalizedText('infos/account/index.html');

    expect(text).toContain('RoomCloud 空房系統僅供查詢目前空房');
    expect(text).toContain('不會直接完成預訂');
    expect(text).toContain('收到密式旅行的訂位確認後，才代表預訂完成');
  });

  it('訂房流程順序應包含查詢、聯絡、匯款、回報與確認', () => {
    const text = normalizedText('infos/account/index.html');
    const checkpoints = [
      '確認預計入住日期與房型是否仍有空位',
      '透過官方管道傳訊預訂',
      '再依通知進行匯款',
      '匯款後請透過 Email 或電話回報',
      '收到密式旅行的訂位確認後',
    ];

    let previousIndex = -1;
    checkpoints.forEach((checkpoint) => {
      const index = text.indexOf(checkpoint);
      expect(index, checkpoint).toBeGreaterThan(previousIndex);
      previousIndex = index;
    });
  });

  it('官方聯絡資料應與全站設定一致', () => {
    const text = normalizedText('infos/account/index.html');

    expect(text).toContain('misstravel0921');
    expect(text).toContain('密式旅行農場');
    expect(text).toContain('misstravel0921@gmail.com');
    expect(text).toContain('0905-108-958');
    expect(text).not.toContain('line搜尋:電話號碼');
  });

  it('匯款頁應保留既有官方帳戶資料與防詐警示', () => {
    const text = normalizedText('infos/account/index.html');

    expect(text).toContain('郵局代碼：700');
    expect(text).toContain('郵局帳號：0041703-0172216');
    expect(text).toContain('匯款戶名：林季霆');
    expect(text).toContain('若有人要求改匯其他帳戶');
    expect(text).toContain('空房查詢結果不等於房位已保留');
  });

  it('所有 RoomCloud 連結的可見文字不得暗示可直接完成預訂', () => {
    const htmlFiles = [
      'index.html',
      'rooms/index.html',
      'rooms/campsite_1/index.html',
      'rooms/log_cabin_1/index.html',
      'rooms/suite_1/index.html',
    ];

    htmlFiles.forEach((file) => {
      const $ = readPage(file);
      $('a[href*="roomcloud.cc"]').each((_, element) => {
        const text = $(element).text().replace(/\s+/g, ' ').trim();
        expect(text, `${file}: ${text}`).not.toMatch(/立即預訂|直接預訂|完成預訂/);
      });
    });
  });
});
