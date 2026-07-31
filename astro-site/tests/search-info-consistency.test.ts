import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const rootDir = join(__dirname, '..', '..');
const distDir = join(__dirname, '..', 'dist');

function readJsonLd(path: string) {
  const $ = load(readFileSync(join(distDir, path), 'utf-8'));
  return $('script[type="application/ld+json"]')
    .map((_, element) => JSON.parse($(element).text()))
    .get();
}

describe('搜尋資訊與舊網址一致性', () => {
  it('訂房 FAQ 結構化資料應符合目前流程', () => {
    const faq = readJsonLd('infos/account/index.html').find((schema) => schema['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    const serialized = JSON.stringify(faq);

    expect(serialized).toContain('RoomCloud 僅供查詢空房');
    expect(serialized).toContain('@rys8178b');
    expect(serialized).toContain('原本的 LINE 或 Facebook 對話');
    expect(serialized).not.toContain('匯款後請來電或來信確認');
    expect(serialized).not.toContain('線上訂房查看空房位');
  });

  it('舊版 HTML 網址應永久轉到新路由', () => {
    const config = JSON.parse(readFileSync(join(rootDir, 'vercel.json'), 'utf-8'));
    const redirects = new Map(
      config.redirects.map((redirect: { source: string; destination: string; permanent: boolean }) => [redirect.source, redirect]),
    );

    const required = {
      '/rooms.html': '/rooms/',
      '/infos.html': '/infos/',
      '/galleries.html': '/galleries/',
      '/sale_items.html': '/sale_items/',
      '/rooms/:slug.html': '/rooms/:slug/',
      '/infos/:slug.html': '/infos/:slug/',
      '/announcements/:slug.html': '/announcements/:slug/',
    };

    Object.entries(required).forEach(([source, destination]) => {
      expect(redirects.get(source)).toMatchObject({ destination, permanent: true });
    });
  });

  it('正式部署驗收應 checkout 實際部署 SHA', () => {
    const workflow = readFileSync(join(rootDir, '.github', 'workflows', 'production-smoke.yml'), 'utf-8');
    expect(workflow).toContain('github.event.deployment.sha');
    expect(workflow).toContain('production-route-smoke.mjs');
    expect(workflow).not.toContain('ref: main');
  });

  it('正式路由驗收應檢查 sitemap、舊網址與訂房 FAQ', () => {
    const smoke = readFileSync(join(__dirname, '..', 'scripts', 'production-route-smoke.mjs'), 'utf-8');
    expect(smoke).toContain('verifySitemapPages');
    expect(smoke).toContain('verifyLegacyRedirects');
    expect(smoke).toContain('verifyBookingFaq');
    expect(smoke).toContain('response.status !== 200');
  });
});
