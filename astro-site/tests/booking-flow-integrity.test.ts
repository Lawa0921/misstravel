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

describe('空房查詢與正式預訂流程', () => {
  it('首頁 Banner 不得將 RoomCloud 誤稱為立即預訂', () => {
    const $ = readPage('index.html');
    const bannerBookingLink = $('#banner a[href*="roomcloud.cc"]');

    expect(bannerBookingLink.length).toBe(1);
    expect(bannerBookingLink.text().trim()).toBe('查詢空房');
    expect($('#banner').text()).not.toContain('立即預訂');
  });

  it('首頁不應顯示訂房流程說明文字', () => {
    const text = normalizedText('index.html');

    expect(text).not.toContain('空房系統僅供查詢');
    expect(text).not.toContain('LINE 或 Facebook 聯絡確認');
  });
});
