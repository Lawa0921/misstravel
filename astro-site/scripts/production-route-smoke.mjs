import { pathToFileURL } from 'node:url';
import { WWW_ORIGIN, sitemapLocations } from './production-smoke.mjs';

export const LEGACY_REDIRECTS = {
  '/rooms.html': '/rooms/',
  '/infos.html': '/infos/',
  '/galleries.html': '/galleries/',
  '/sale_items.html': '/sale_items/',
  '/announcements.html': '/announcements/',
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
    const response = await request(`${origin}${source}`, { redirect: 'manual' });
    invariant(response.status === 308, `${source} returned HTTP ${response.status}`);
    const location = response.headers.get('location');
    invariant(location, `${source} did not return Location`);
    const actual = new URL(location, origin).pathname;
    invariant(actual === destination, `${source} redirected to ${actual}, expected ${destination}`);
  }
  console.log(`✓ ${Object.keys(LEGACY_REDIRECTS).length} legacy URLs redirect correctly`);
}

export async function verifyBookingFaq(origin = WWW_ORIGIN) {
  const response = await request(`${origin}/infos/account/`);
  invariant(response.status === 200, `account page returned HTTP ${response.status}`);
  const html = await response.text();
  invariant(html.includes('線上訂房系統提供目前空房查詢'), 'booking FAQ did not explain the online booking system');
  invariant(!html.includes('RoomCloud'), 'booking page exposed the booking vendor name');
  invariant(html.includes('回到原本的 LINE 或 Facebook 對話通知'), 'booking FAQ did not preserve the original contact channel');
  invariant(!html.includes('匯款後請來電或來信確認'), 'booking FAQ still contained the old callback instruction');
  console.log('✓ booking FAQ matches the visible booking flow');
}

export async function runProductionRouteSmoke() {
  await verifySitemapPages();
  await verifyLegacyRedirects();
  await verifyBookingFaq();
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runProductionRouteSmoke().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  });
}
