import { pathToFileURL } from 'node:url';

export const WWW_ORIGIN = 'https://www.misstravel.me';
export const APEX_ORIGIN = 'https://misstravel.me';
export const EXPECTED_SITEMAP_PATHS = [
  '/',
  '/announcements/',
  '/announcements/website/',
  '/galleries/',
  '/infos/',
  '/infos/account/',
  '/infos/contact-method/',
  '/infos/guide/',
  '/infos/map/',
  '/infos/menu/',
  '/infos/roles/',
  '/infos/set-menu-info/',
  '/infos/video/',
  '/rooms/',
  '/rooms/campsite_1/',
  '/rooms/campsite_2/',
  '/rooms/campsite_3/',
  '/rooms/log_cabin_1/',
  '/rooms/log_cabin_2/',
  '/rooms/log_cabin_3/',
  '/rooms/log_cabin_4/',
  '/rooms/suite_1/',
  '/rooms/suite_2/',
  '/rooms/suite_3/',
  '/sale_items/',
];

const RETRY_ATTEMPTS = 6;
const RETRY_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function openingTags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
}

function attribute(tag, name) {
  const attributes = new Map();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  for (const match of tag.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? '');
  }

  return attributes.get(name.toLowerCase());
}

export function canonicalUrl(html) {
  const links = openingTags(html, 'link').filter((tag) =>
    attribute(tag, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'),
  );

  invariant(links.length === 1, `expected one canonical link, found ${links.length}`);
  return attribute(links[0], 'href');
}

export function metaContent(html, selector, value) {
  const matches = openingTags(html, 'meta').filter(
    (tag) => attribute(tag, selector)?.toLowerCase() === value.toLowerCase(),
  );

  invariant(matches.length === 1, `expected one meta[${selector}="${value}"], found ${matches.length}`);
  return attribute(matches[0], 'content');
}

export function jsonLdDocuments(html) {
  const scripts = html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
  );
  const documents = [];

  for (const match of scripts) {
    const type = attribute(`<script ${match[1]}>`, 'type');
    if (type?.toLowerCase() === 'application/ld+json') {
      documents.push(JSON.parse(match[2]));
    }
  }

  return documents;
}

export function assertVideoObject(html) {
  const schemas = jsonLdDocuments(html).flatMap((document) => (
    Array.isArray(document) ? document : [document]
  ));
  const video = schemas.find((schema) => schema?.['@type'] === 'VideoObject');

  invariant(video, 'page did not include a VideoObject schema');
  invariant(
    video.uploadDate === '2017-11-07T00:26:31-08:00',
    'VideoObject uploadDate was incorrect',
  );
  invariant(video.duration === 'PT2M37S', 'VideoObject duration was incorrect');
}

export function assertNotFound(status, html) {
  invariant(status === 404, `expected HTTP 404, received ${status}`);
  const robots = metaContent(html, 'name', 'robots') ?? '';
  invariant(/\bnoindex\b/i.test(robots), '404 page did not include noindex robots');
}

export function assertAnalyticsScript(status, contentType) {
  invariant(status === 200, `expected analytics script HTTP 200, received ${status}`);
  invariant(
    contentType?.toLowerCase().includes('javascript'),
    'analytics script did not return a JavaScript Content-Type',
  );
}

export function absoluteLinks(html) {
  return openingTags(html, 'a')
    .map((tag) => attribute(tag, 'href'))
    .filter((href) => href?.startsWith('https://'));
}

export function assertRedirect(status, location, expectedUrl) {
  invariant(status === 308, `expected HTTP 308, received ${status}`);
  invariant(location, 'redirect response did not include a Location header');

  const actual = new URL(location, APEX_ORIGIN).href;
  invariant(actual === expectedUrl, `expected redirect to ${expectedUrl}, received ${actual}`);
}

export function assertHtmlPage(html, expectedCanonical, { requireBookingLink = false } = {}) {
  invariant(canonicalUrl(html) === expectedCanonical, `canonical did not equal ${expectedCanonical}`);
  invariant(
    metaContent(html, 'property', 'og:url') === expectedCanonical,
    `og:url did not equal ${expectedCanonical}`,
  );
  invariant(
    metaContent(html, 'name', 'twitter:url') === expectedCanonical,
    `twitter:url did not equal ${expectedCanonical}`,
  );

  const schemas = jsonLdDocuments(html);
  invariant(schemas.length > 0, 'page did not include valid JSON-LD');

  const serializedSchemas = JSON.stringify(schemas);
  invariant(
    !serializedSchemas.includes('https://misstravel.me'),
    'JSON-LD contained the bare domain',
  );

  if (requireBookingLink) {
    const bookingLinks = absoluteLinks(html).filter((href) => {
      const hostname = new URL(href).hostname;
      return hostname === 'roomcloud.cc' || hostname.endsWith('.roomcloud.cc');
    });

    invariant(bookingLinks.length > 0, 'page did not include an HTTPS RoomCloud booking link');
  }
}

export function assertRobots(body) {
  invariant(
    body.includes(`Sitemap: ${WWW_ORIGIN}/sitemap-index.xml`),
    'robots.txt did not advertise the canonical sitemap',
  );
  invariant(!body.includes(`${APEX_ORIGIN}/`), 'robots.txt contained the bare domain');
}

export function sitemapLocations(body) {
  return [...body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
}

export function assertSitemapIndex(body) {
  const locations = sitemapLocations(body);
  invariant(locations.length > 0, 'sitemap index did not contain any sitemap locations');
  invariant(
    locations.includes(`${WWW_ORIGIN}/sitemap-0.xml`),
    'sitemap index did not include sitemap-0.xml',
  );
  invariant(
    locations.every((location) => location.startsWith(`${WWW_ORIGIN}/`)),
    'sitemap index contained a non-canonical origin',
  );
}

export function assertSitemap(body) {
  const locations = sitemapLocations(body);
  invariant(
    locations.every((location) => location.startsWith(`${WWW_ORIGIN}/`)),
    'sitemap contained a non-canonical origin',
  );

  const missing = EXPECTED_SITEMAP_PATHS.filter(
    (pathname) => !locations.includes(`${WWW_ORIGIN}${pathname}`),
  );
  invariant(missing.length === 0, `sitemap was missing expected paths: ${missing.join(', ')}`);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function eventually(label, callback) {
  let lastError;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      await callback();
      console.log(`✓ ${label}`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(`Retrying ${label} (${attempt}/${RETRY_ATTEMPTS}): ${error.message}`);
        await wait(RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(`${label}: ${lastError?.message ?? 'unknown failure'}`);
}

async function request(url, { redirect = 'follow' } = {}) {
  const response = await fetch(url, {
    redirect,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: '*/*',
      'cache-control': 'no-cache',
      'user-agent': 'misstravel-production-smoke/1.0',
    },
  });

  const body = await response.text();
  return { response, body };
}

async function expectOk(url, expectedContentType) {
  const { response, body } = await request(url);
  invariant(response.status === 200, `${url} returned HTTP ${response.status}`);
  invariant(
    response.headers.get('content-type')?.includes(expectedContentType),
    `${url} returned an unexpected Content-Type`,
  );
  return body;
}

export async function runProductionSmoke() {
  const marker = encodeURIComponent(process.env.GITHUB_SHA ?? Date.now().toString());
  const deepPath = `/rooms/campsite_1/?production_smoke=${marker}`;
  const expectedRedirect = `${WWW_ORIGIN}${deepPath}`;
  const freshUrl = (pathname) => {
    const url = new URL(pathname, WWW_ORIGIN);
    url.searchParams.set('production_smoke', marker);
    return url.href;
  };

  await eventually('bare domain preserves a deep path and query with HTTP 308', async () => {
    const { response } = await request(`${APEX_ORIGIN}${deepPath}`, { redirect: 'manual' });
    assertRedirect(response.status, response.headers.get('location'), expectedRedirect);
  });

  const pages = [
    ['homepage', '/', true],
    ['rooms page', '/rooms/', false],
    ['representative room page', '/rooms/campsite_1/', true],
  ];

  for (const [label, pathname, requireBookingLink] of pages) {
    await eventually(`${label} metadata and schema`, async () => {
      const body = await expectOk(freshUrl(pathname), 'text/html');
      assertHtmlPage(body, `${WWW_ORIGIN}${pathname}`, { requireBookingLink });
    });
  }

  await eventually('robots.txt', async () => {
    const body = await expectOk(freshUrl('/robots.txt'), 'text/plain');
    assertRobots(body);
  });

  await eventually('sitemap index', async () => {
    const body = await expectOk(freshUrl('/sitemap-index.xml'), 'xml');
    assertSitemapIndex(body);
  });

  await eventually('sitemap URLs', async () => {
    const body = await expectOk(freshUrl('/sitemap-0.xml'), 'xml');
    assertSitemap(body);
  });

  await eventually('video page VideoObject schema', async () => {
    const body = await expectOk(freshUrl('/infos/video/'), 'text/html');
    assertHtmlPage(body, `${WWW_ORIGIN}/infos/video/`);
    assertVideoObject(body);
  });

  await eventually('unknown path is a noindex 404', async () => {
    const { response, body } = await request(freshUrl('/__production_smoke_not_found__/'));
    assertNotFound(response.status, body);
  });

  await eventually('Vercel Analytics loader', async () => {
    const { response } = await request(freshUrl('/_vercel/insights/script.js'));
    assertAnalyticsScript(response.status, response.headers.get('content-type'));
  });
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runProductionSmoke().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  });
}
