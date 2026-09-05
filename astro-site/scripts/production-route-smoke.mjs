import { pathToFileURL } from 'node:url';
import { WWW_ORIGIN, sitemapLocations } from './production-smoke.mjs';

export const LEGACY_REDIRECTS = {
  '/rooms.html': '/rooms/',
  '/infos.html': '/infos/',
  '/galleries.html': '/galleries/',
  '/sale_items.html': '/sale_items/',
  '/announcements.html': '/announcements/',
  '/infos/2022-10-06-roles.html': '/infos/roles/',
  '/infos/2022-10-06-account.html': '/infos/account/',
  '/infos/2022-10-06-set-menu-info.html': '/infos/set-menu-info/',
  '/infos/2022-10-06-menu.html': '/infos/menu/',
  '/rooms/campsite_1.html': '/rooms/campsite_1/',
  '/rooms/log_cabin_1.html': '/rooms/log_cabin_1/',
  '/rooms/suite_1.html': '/rooms/suite_1/',
  '/infos/account.html': '/infos/account/',
  '/infos/guide.html': '/infos/guide/',
  '/announcements/website.html': '/announcements/website/',
};

const REQUEST_TIMEOUT_MS = 15_000;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, { redirect = 'follow' } = {}) {
  return fetch(url, {
    redirect,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: '*/*',
      'cache-control': 'no-cache',
      'user-agent': 'misstravel-production-route-smoke/1.0',
    },
  });
}

export async function verifySitemapPages(origin = WWW_ORIGIN) {
  const sitemapResponse = await request(`${origin}/sitemap-0.xml`);
  invariant(sitemapResponse.status === 200, `sitemap returned HTTP ${sitemapResponse.status}`);
  const locations = sitemapLocations(await sitemapResponse.text());
  invariant(locations.length > 0, 'sitemap did not contain URLs');

  const failures = [];
  for (const location of locations) {
    const response = await request(location);
    if (response.status !== 200) failures.push(`${location}: HTTP ${response.status}`);
  }
  invariant(failures.length === 0, `sitemap URL failures: ${failures.join(', ')}`);
  console.log(`✓ ${locations.length} sitemap URLs returned HTTP 200`);
}

export async function verifyLegacyRedirects(origin = WWW_ORIGIN) {
  for (const [source, destination] of Object.entries(LEGACY_REDIRECTS)) {
    const query = '?legacy_smoke=preserve';
    const response = await request(`${origin}${source}${query}`, { redirect: 'manual' });
    invariant(response.status === 308, `${source} returned HTTP ${response.status}`);
    const location = response.headers.get('location');
    invariant(location, `${source} did not return Location`);
    const actual = new URL(location, origin);
    invariant(actual.pathname === destination, `${source} redirected to ${actual.pathname}, expected ${destination}`);
    invariant(actual.search === query, `${source} did not preserve query ${query}`);
  }
  console.log(`✓ ${Object.keys(LEGACY_REDIRECTS).length} legacy URLs redirect correctly`);
}

export async function verifyBookingPresentation(origin = WWW_ORIGIN) {
  const homeResponse = await request(`${origin}/`);
  invariant(homeResponse.status === 200, `home page returned HTTP ${homeResponse.status}`);

  const csp = homeResponse.headers.get('content-security-policy') || '';
  invariant(homeResponse.headers.get('x-content-type-options') === 'nosniff', 'home page missing X-Content-Type-Options: nosniff');
  invariant(homeResponse.headers.get('x-frame-options') === 'DENY', 'home page missing X-Frame-Options: DENY');
  invariant((homeResponse.headers.get('strict-transport-security') || '').includes('includeSubDomains'), 'home page HSTS did not include subdomains');
  invariant(csp.includes("object-src 'none'"), 'CSP did not block object-src');
  invariant(csp.includes("frame-ancestors 'none'"), 'CSP did not block frame ancestors');
  invariant(!homeResponse.headers.has('x-xss-protection'), 'home page still returned obsolete X-XSS-Protection');

  const homeHtml = await homeResponse.text();
  invariant(homeHtml.includes('查詢空房'), 'home page did not contain the availability CTA');
  invariant(!homeHtml.includes('空房系統僅供查詢，預訂請再透過 LINE 或 Facebook 聯絡確認。'), 'home page still contained the removed booking notice');
  invariant(!homeHtml.includes('"checkinTime"'), 'home page schema still hard-coded checkinTime');
  invariant(!homeHtml.includes('"checkoutTime"'), 'home page schema still hard-coded checkoutTime');

  const accountResponse = await request(`${origin}/infos/account/`);
  invariant(accountResponse.status === 200, `account page returned HTTP ${accountResponse.status}`);
  const accountHtml = await accountResponse.text();
  invariant(accountHtml.includes('線上訂房系統提供目前空房查詢'), 'booking page did not use the public online booking system name');
  invariant(!accountHtml.includes('RoomCloud'), 'booking page exposed the booking vendor name');
  invariant(accountHtml.includes('匯款後，請透過原先與密式旅行聯絡的管道回報匯款資訊'), 'booking page did not preserve the approved payment reporting instruction');
  invariant(accountHtml.includes('原先使用 LINE 聯絡者，請回到原 LINE 對話通知'), 'booking page did not preserve the LINE reporting channel');
  invariant(accountHtml.includes('原先使用 Facebook 聯絡者，請回到原 Facebook Messenger 對話通知'), 'booking page did not preserve the Facebook reporting channel');
  invariant(!accountHtml.includes('匯款後請來電或來信確認'), 'booking page still contained the old payment callback instruction');
  invariant(!accountHtml.includes('"@type":"FAQPage"'), 'booking page still published the stale FAQPage schema');

  console.log('✓ production booking copy, schema and security headers match the approved state');
}

export async function runProductionRouteSmoke() {
  await verifySitemapPages();
  await verifyLegacyRedirects();
  await verifyBookingPresentation();
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runProductionRouteSmoke().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  });
}
