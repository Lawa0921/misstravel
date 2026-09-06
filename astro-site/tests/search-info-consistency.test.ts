import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const rootDir = join(__dirname, '..', '..');
const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

function jsonLd(path: string) {
  const $ = readPage(path);
  return $('script[type="application/ld+json"]')
    .map((_, element) => JSON.parse($(element).text()))
    .get();
}

describe('搜尋資訊與舊網址一致性', () => {
  it('公開訂房內容只套用已核准的文案調整', () => {
    const home = readPage('index.html');
    const account = readPage('infos/account/index.html');
    const accountText = account('.info-content').text().replace(/\s+/g, ' ').trim();

    expect(home('#banner').text()).not.toContain('空房系統僅供查詢，預訂請再透過 LINE 或 Facebook 聯絡確認。');
    expect(accountText).toContain('線上訂房系統提供目前空房查詢');
    expect(accountText).not.toContain('RoomCloud');
  });

  it('停用的 FAQ 結構化資料與過期來源不得存在', () => {
    const schemas = jsonLd('infos/account/index.html');
    const serialized = JSON.stringify(schemas);

    expect(schemas.some((schema) => schema['@type'] === 'FAQPage')).toBe(false);
    expect(serialized).not.toContain('線上訂房查看空房位');
    expect(serialized).not.toContain('匯款後請來電或來信確認');

    const schemaComponent = readFileSync(
      join(rootDir, 'astro-site', 'src', 'components', 'SEO', 'SchemaOrg.astro'),
      'utf-8',
    );
    const infoPage = readFileSync(
      join(rootDir, 'astro-site', 'src', 'pages', 'infos', '[...slug].astro'),
      'utf-8',
    );

    expect(schemaComponent).not.toContain('blockedFaqPhrases');
    expect(schemaComponent).not.toContain('safeExtraSchemas');
    expect(infoPage).not.toContain("'@type': 'FAQPage'");
    expect(infoPage).not.toContain('線上訂房查看空房位');
    expect(infoPage).not.toContain('匯款後請來電或來信確認');
  });

  it('住宿結構化資料不得硬編單一入住與退房時間', () => {
    const schemaComponent = readFileSync(
      join(rootDir, 'astro-site', 'src', 'components', 'SEO', 'SchemaOrg.astro'),
      'utf-8',
    );

    expect(schemaComponent).not.toContain("checkinTime: '15:00'");
    expect(schemaComponent).not.toContain("checkoutTime: '12:00'");

    ['rooms/campsite_1/index.html', 'rooms/log_cabin_1/index.html', 'rooms/suite_1/index.html'].forEach((path) => {
      const serialized = JSON.stringify(jsonLd(path));
      expect(serialized, path).not.toContain('checkinTime');
      expect(serialized, path).not.toContain('checkoutTime');
    });
  });

  it('舊版 HTML 網址應永久轉到新路由', () => {
    const config = JSON.parse(readFileSync(join(rootDir, 'vercel.json'), 'utf-8'));
    const redirectEntries = config.redirects as Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }>;
    const redirects = new Map(
      redirectEntries.map((redirect) => [redirect.source, redirect]),
    );

    const required = {
      '/sitemap.xml': '/sitemap-index.xml',
      '/rooms.html': '/rooms/',
      '/infos.html': '/infos/',
      '/galleries.html': '/galleries/',
      '/sale_items.html': '/sale_items/',
      '/infos/2022-10-06-roles.html': '/infos/roles/',
      '/infos/2022-10-06-account.html': '/infos/account/',
      '/infos/2022-10-06-set-menu-info.html': '/infos/set-menu-info/',
      '/infos/2022-10-06-menu.html': '/infos/menu/',
      '/rooms/:slug.html': '/rooms/:slug/',
      '/infos/:slug.html': '/infos/:slug/',
      '/announcements/:slug.html': '/announcements/:slug/',
    };

    Object.entries(required).forEach(([source, destination]) => {
      expect(redirects.get(source)).toMatchObject({ destination, permanent: true });
    });

    const genericIndex = redirectEntries.findIndex(({ source }) => source === '/infos/:slug.html');
    expect(genericIndex).toBeGreaterThanOrEqual(0);
    [
      '/infos/2022-10-06-roles.html',
      '/infos/2022-10-06-account.html',
      '/infos/2022-10-06-set-menu-info.html',
      '/infos/2022-10-06-menu.html',
    ].forEach((source) => {
      const explicitIndex = redirectEntries.findIndex((redirect) => redirect.source === source);
      expect(explicitIndex, `${source} must be an explicit redirect`).toBeGreaterThanOrEqual(0);
      expect(explicitIndex, `${source} must precede the generic info redirect`).toBeLessThan(genericIndex);
    });
  });

  it('正式部署驗收應 checkout 實際部署 SHA', () => {
    const workflow = readFileSync(join(rootDir, '.github', 'workflows', 'production-smoke.yml'), 'utf-8');
    expect(workflow).toContain('github.event.deployment.sha');
    expect(workflow).toContain('production-route-smoke.mjs');
    expect(workflow).not.toContain('ref: main');
  });

  it('正式路由驗收應檢查 sitemap、舊網址、訂房文案、Schema 與安全標頭', () => {
    const smoke = readFileSync(join(__dirname, '..', 'scripts', 'production-route-smoke.mjs'), 'utf-8');
    expect(smoke).toContain('verifySitemapPages');
    expect(smoke).toContain('verifyLegacyRedirects');
    expect(smoke).toContain('verifyBookingPresentation');
    expect(smoke).toContain('response.status !== 200');
    expect(smoke).toContain("!accountHtml.includes('RoomCloud')");
    expect(smoke).toContain('FAQPage');
    expect(smoke).toContain('checkinTime');
    expect(smoke).toContain('content-security-policy');
    expect(smoke).toContain('x-xss-protection');
  });
});
