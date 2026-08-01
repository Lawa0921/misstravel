import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

function normalizedText(path: string) {
  return readPage(path).text().replace(/\s+/g, ' ').trim();
}

function normalizedContentText(path: string) {
  return readPage(path)('.info-content').text().replace(/\s+/g, ' ').trim();
}

describe('空房查詢與正式預訂流程', () => {
  it('首頁 Banner 應只以查詢空房對外呈現', () => {
    const $ = readPage('index.html');
    const bannerBookingLink = $('#banner a[href*="roomcloud.cc"]');

    expect(bannerBookingLink.length).toBe(1);
    expect(bannerBookingLink.text().trim()).toBe('查詢空房');
    expect($('#banner').text()).not.toContain('立即預訂');
    expect($('#banner').text()).not.toContain('RoomCloud');
  });

  it('首頁不應顯示訂房流程說明文字', () => {
    const text = normalizedText('index.html');

    expect(text).not.toContain('空房系統僅供查詢');
    expect(text).not.toContain('LINE 或 Facebook 聯絡確認');
  });

  it('訂房流程頁應以線上訂房系統對外呈現', () => {
    const text = normalizedContentText('infos/account/index.html');

    expect(text).toContain('線上訂房系統提供目前空房查詢');
    expect(text).toContain('不會直接完成預訂');
    expect(text).toContain('收到密式旅行的訂位確認後，才代表預訂完成');
    expect(text).not.toContain('RoomCloud');
  });

  it('訂房流程順序應包含查詢、聯絡、匯款、原管道回報與確認', () => {
    const text = normalizedContentText('infos/account/index.html');
    const checkpoints = [
      '確認預計入住日期與房型是否仍有空位',
      '透過官方管道傳訊預訂',
      '再依通知進行匯款',
      '請透過原先與密式旅行聯絡的管道回報匯款資訊',
      '收到密式旅行的訂位確認後',
    ];

    let previousIndex = -1;
    checkpoints.forEach((checkpoint) => {
      const index = text.indexOf(checkpoint);
      expect(index, checkpoint).toBeGreaterThan(previousIndex);
      previousIndex = index;
    });
  });

  it('匯款後應回到原本的 LINE 或 Facebook 對話通知', () => {
    const text = normalizedContentText('infos/account/index.html');

    expect(text).toContain('原先使用 LINE 聯絡者，請回到原 LINE 對話通知');
    expect(text).toContain('原先使用 Facebook 聯絡者，請回到原 Facebook Messenger 對話通知');
    expect(text).not.toContain('匯款後請透過 Email 或電話回報');
  });

  it('官方聯絡資料應與全站設定一致', () => {
    const accountText = normalizedContentText('infos/account/index.html');
    const contactText = normalizedContentText('infos/contact-method/index.html');

    expect(accountText).toContain('@rys8178b');
    expect(contactText).toContain('@rys8178b');
    expect(accountText).toContain('密式旅行農場');
    expect(accountText).toContain('0905-108-958');
    expect(accountText).not.toContain('misstravel0921 LINE');
    expect(accountText).not.toContain('line搜尋:電話號碼');
  });

  it('LINE 加好友連結與 QR Code 必須指向同一官方帳號', () => {
    const pages = ['index.html', 'infos/account/index.html', 'infos/contact-method/index.html'];
    const officialUrl = 'https://line.me/R/ti/p/%40rys8178b';

    pages.forEach((file) => {
      const $ = readPage(file);
      const links = $(`a[href="${officialUrl}"]`);
      expect(links.length, file).toBeGreaterThan(0);
    });

    const accountPage = readPage('infos/account/index.html');
    const contactPage = readPage('infos/contact-method/index.html');
    expect(accountPage('img[src="/images/line-official-account-qr.svg"]').length).toBe(1);
    expect(contactPage('img[src="/images/line-official-account-qr.svg"]').length).toBe(1);

    const qrPath = join(distDir, 'images', 'line-official-account-qr.svg');
    expect(existsSync(qrPath)).toBe(true);
    const qrSvg = readFileSync(qrPath, 'utf-8');
    expect(qrSvg).toContain('@rys8178b');
  });

  it('匯款頁應保留既有官方帳戶資料與防詐警示', () => {
    const text = normalizedContentText('infos/account/index.html');

    expect(text).toContain('郵局代碼：700');
    expect(text).toContain('郵局帳號：0041703-0172216');
    expect(text).toContain('匯款戶名：林季霆');
    expect(text).toContain('若有人要求改匯其他帳戶');
    expect(text).toContain('空房查詢結果不等於房位已保留');
  });

  it('關於密式上方導覽項目應全部為四個中文字', () => {
    const $ = readPage('infos/index.html');
    const labels = $('.info-nav .info-link')
      .map((_, element) => $(element).text().replace(/\s+/g, '').trim())
      .get();

    expect(labels.length).toBe(8);
    labels.forEach((label) => {
      expect(label, label).toMatch(/^[\u4e00-\u9fff]{4}$/);
    });
    expect(labels).toContain('訂房匯款');
  });

  it('所有空房查詢連結的可見文字不得暗示可直接完成預訂', () => {
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
