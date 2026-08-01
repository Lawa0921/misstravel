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

  it('訂房匯款頁應統一稱為線上訂房系統', () => {
    const text = normalizedText('infos/account/index.html');

    expect(text).toContain('線上訂房系統提供目前空房查詢');
    expect(text).not.toContain('RoomCloud');
  });
});
