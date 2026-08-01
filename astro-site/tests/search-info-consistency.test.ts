import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const rootDir = join(__dirname, '..', '..');
const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
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

  it('不得在共用 Schema 元件中覆寫原本 FAQ 內容', () => {
    const schemaComponent = readFileSync(
      join(rootDir, 'astro-site', 'src', 'components', 'SEO', 'SchemaOrg.astro'),
      'utf-8',
    );
    const infoPage = readFileSync(
      join(rootDir, 'astro-site', 'src', 'pages', 'infos', '[...slug].astro'),
      'utf-8',
    );

    expect(schemaComponent).toContain('siteConfig.contact.lineUrl');
    expect(schemaComponent).not.toContain('const bookingFaq');
    expect(schemaComponent).not.toContain('normalizedExtraSchemas');
    expect(infoPage).toContain("'@type': 'FAQPage'");
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

  it('正式路由驗收應檢查 sitemap、舊網址與公開訂房文案', () => {
    const smoke = readFileSync(join(__dirname, '..', 'scripts', 'production-route-smoke.mjs'), 'utf-8');
    expect(smoke).toContain('verifySitemapPages');
    expect(smoke).toContain('verifyLegacyRedirects');
    expect(smoke).toContain('verifyBookingPresentation');
    expect(smoke).toContain('response.status !== 200');
    expect(smoke).toContain("!accountHtml.includes('RoomCloud')");
  });
});
