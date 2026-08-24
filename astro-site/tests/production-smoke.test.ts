import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertHtmlPage,
  assertCloudflareBeacon,
  assertNotFound,
  assertRedirect,
  assertRobots,
  assertSitemap,
  assertSitemapIndex,
  assertVideoObject,
  EXPECTED_SITEMAP_PATHS,
  jsonLdDocuments,
} from '../scripts/production-smoke.mjs';
import { EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN } from '../scripts/production-smoke.mjs';

const canonical = 'https://www.misstravel.me/rooms/campsite_1/';

const validHtml = `
  <!doctype html>
  <html>
    <head>
      <link href="${canonical}" rel="canonical">
      <meta content="${canonical}" property="og:url">
      <meta name="twitter:url" content="${canonical}">
      <script type="application/ld+json">
        {"@context":"https://schema.org","url":"${canonical}"}
      </script>
    </head>
    <body>
      <a href="https://roomcloud.cc/booking/example">訂房</a>
    </body>
  </html>
`;

const videoHtml = `
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"VideoObject","uploadDate":"2017-11-07T00:26:31-08:00","duration":"PT2M37S"}
  </script>
`;

const cloudflareBeaconHtml = `
  <script type="module" defer src="https://static.cloudflareinsights.com/beacon.min.js"
    data-cf-beacon='${JSON.stringify({ token: EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN })}'></script>
`;

describe('正式環境 smoke 檢查器', () => {
  it('正式 homepage runner 必須傳入獨立 Cloudflare token 真值', () => {
    const smokeSource = readFileSync(join(__dirname, '../scripts/production-smoke.mjs'), 'utf-8');
    expect(smokeSource).toMatch(
      /assertCloudflareBeacon\(body, EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN\)/,
    );
  });

  it('接受順序不同但完整的 canonical metadata 與 RoomCloud 連結', () => {
    expect(() => assertHtmlPage(validHtml, canonical, { requireBookingLink: true })).not.toThrow();
    expect(jsonLdDocuments(validHtml)).toHaveLength(1);
  });

  it('拒絕重複 canonical、裸網域 schema 與非 HTTPS 訂房連結', () => {
    expect(() => assertHtmlPage(
      validHtml.replace('</head>', `<link rel="canonical" href="${canonical}"></head>`),
      canonical,
    )).toThrow(/one canonical/);

    expect(() => assertHtmlPage(
      validHtml.replace(canonical, 'https://misstravel.me/rooms/campsite_1/'),
      canonical,
    )).toThrow();

    expect(() => assertHtmlPage(
      validHtml.replace('https://roomcloud.cc', 'http://roomcloud.cc'),
      canonical,
      { requireBookingLink: true },
    )).toThrow(/RoomCloud/);
  });

  it('只接受保留完整 path 與 query 的 308 轉址', () => {
    const expected = `${canonical}?production_smoke=abc`;

    expect(() => assertRedirect(308, expected, expected)).not.toThrow();
    expect(() => assertRedirect(307, expected, expected)).toThrow(/308/);
    expect(() => assertRedirect(308, canonical, expected)).toThrow(/expected redirect/);
  });

  it('驗證 robots 與 sitemap 僅使用 canonical 網域', () => {
    expect(() => assertRobots(
      'User-agent: *\nAllow: /\nSitemap: https://www.misstravel.me/sitemap-index.xml\n',
    )).not.toThrow();

    expect(() => assertSitemapIndex(
      '<sitemapindex><sitemap><loc>https://www.misstravel.me/sitemap-0.xml</loc></sitemap></sitemapindex>',
    )).not.toThrow();

    const urls = EXPECTED_SITEMAP_PATHS.map(
      (pathname) => `https://www.misstravel.me${pathname}`,
    );
    const sitemap = `<urlset>${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;

    expect(() => assertSitemap(sitemap)).not.toThrow();
    expect(() => assertSitemap(sitemap.replace(
      'https://www.misstravel.me/infos/',
      'https://misstravel.me/infos/',
    ))).toThrow(/non-canonical/);
    expect(() => assertSitemap(sitemap.replace(
      '<url><loc>https://www.misstravel.me/rooms/</loc></url>',
      '',
    ))).toThrow(/missing expected paths/);
  });

  it('只接受 VideoObject 的真實日期與時長', () => {
    expect(() => assertVideoObject(videoHtml)).not.toThrow();
    expect(() => assertVideoObject(videoHtml.replace('2017-11-07T00:26:31-08:00', '2023-01-01')))
      .toThrow(/uploadDate/);
    expect(() => assertVideoObject(videoHtml.replace('PT2M37S', 'PT1M30S')))
      .toThrow(/duration/);
  });

  it('只接受帶 noindex 的真正 404 頁', () => {
    expect(() => assertNotFound(404, '<meta name="robots" content="noindex, nofollow">'))
      .not.toThrow();
    expect(() => assertNotFound(200, '<meta name="robots" content="noindex">'))
      .toThrow(/404/);
    expect(() => assertNotFound(404, '<meta name="robots" content="index">'))
      .toThrow(/noindex/);
  });

  it('只接受 Cloudflare Web Analytics beacon contract', () => {
    expect(() => assertCloudflareBeacon(
      cloudflareBeaconHtml,
      EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
    ))
      .not.toThrow();
    expect(() => assertCloudflareBeacon(
      cloudflareBeaconHtml.replace('cloudflareinsights.com/beacon.min.js', 'example.com/beacon.js'),
    )).toThrow(/beacon/);
    expect(() => assertCloudflareBeacon(
      cloudflareBeaconHtml.replace(
        EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
        '00000000000000000000000000000000',
      ),
      EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
    )).toThrow(/token/);
    expect(() => assertCloudflareBeacon(
      cloudflareBeaconHtml.replace('data-cf-beacon=', 'data-cf-beacon="not-json" '),
    )).toThrow(/JSON/);
  });
});
