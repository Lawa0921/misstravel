import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import cloudflareWebAnalytics from '../src/lib/cloudflare-web-analytics.json' with { type: 'json' };

export const DEFAULT_PRODUCTION_ORIGIN = 'https://www.misstravel.me';
export const CLOUDFLARE_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';
export const CLOUDFLARE_RUM_URL = 'https://cloudflareinsights.com/cdn-cgi/rum';

const PAGE_TIMEOUT_MS = 15_000;
const RUM_WAIT_MS = 4_000;
const RUM_POLL_MS = 100;

function tokenFromPostData(postData) {
  if (typeof postData !== 'string' || postData.length === 0) return undefined;

  let parsed;
  try {
    parsed = JSON.parse(postData);
  } catch {
    return undefined;
  }

  const visit = (value) => {
    if (!value || typeof value !== 'object') return undefined;
    for (const [key, child] of Object.entries(value)) {
      if (/^(site)?token$/i.test(key) && typeof child === 'string') return child;
      const nested = visit(child);
      if (nested !== undefined) return nested;
    }
    return undefined;
  };

  return visit(parsed);
}

/** @typedef {{ url: string, method?: string, status: number, headers?: Record<string, string> }} HttpResponseEvidence */
/** @typedef {{ url: string, method: string, postData?: string | null }} RumRequestEvidence */
/** @typedef {{ url: string, errorText?: string }} RequestFailureEvidence */
function cspAllowsOrigin(csp, directive, origin) {
  return csp.split(';').some((policy) => {
    const [name, ...sources] = policy.trim().split(/\s+/);
    return name?.toLowerCase() === directive
      && sources.some((source) => source.toLowerCase() === origin);
  });
}

function isJavascriptContentType(contentType) {
  const mime = contentType?.split(';', 1)[0].trim().toLowerCase();
  return new Set([
    'application/ecmascript',
    'application/javascript',
    'application/x-javascript',
    'text/ecmascript',
    'text/javascript',
  ]).has(mime);
}

/**
 * @param {{
 *   pageStatus?: number,
 *   csp?: string,
 *   beaconScriptCount?: number,
 *   beaconResponses?: HttpResponseEvidence[],
 *   rumRequests?: RumRequestEvidence[],
 *   rumResponses?: HttpResponseEvidence[],
 *   requestFailures?: RequestFailureEvidence[],
 * }} evidence
 */
export function evaluateCloudflareRum({
  pageStatus,
  csp = '',
  beaconScriptCount,
  beaconResponses = [],
  rumRequests = [],
  rumResponses = [],
  requestFailures = [],
} = {}) {
  const errors = [];
  const rumPosts = rumRequests.filter(
    (request) => request.url === CLOUDFLARE_RUM_URL && request.method === 'POST',
  );
  const rumHttpResponses = rumResponses.filter(
    (response) => response.url === CLOUDFLARE_RUM_URL && response.method === 'POST',
  );
  const rumFailures = requestFailures.filter((request) => request.url === CLOUDFLARE_RUM_URL);

  if (pageStatus !== 200) errors.push(`page returned HTTP ${pageStatus}`);
  if (!cspAllowsOrigin(csp, 'script-src', 'https://static.cloudflareinsights.com')) {
    errors.push('deployed CSP script-src is missing https://static.cloudflareinsights.com');
  }
  if (!cspAllowsOrigin(csp, 'connect-src', 'https://cloudflareinsights.com')) {
    errors.push('deployed CSP connect-src is missing https://cloudflareinsights.com');
  }

  if (beaconScriptCount !== 1) {
    errors.push(`expected exactly one Cloudflare beacon DOM script, found ${beaconScriptCount ?? 0}`);
  }
  const beaconNetworkResponses = beaconResponses.filter(
    (response) => response.url === CLOUDFLARE_BEACON_URL,
  );
  if (beaconNetworkResponses.length !== 1) {
    errors.push(`expected exactly one Cloudflare beacon network response, found ${beaconNetworkResponses.length}`);
  } else if (beaconNetworkResponses[0].status !== 200) {
    errors.push(`Cloudflare beacon JS expected HTTP 200, received ${beaconNetworkResponses[0].status}`);
  } else {
    const contentType = beaconNetworkResponses[0].headers?.['content-type']
      ?? beaconNetworkResponses[0].headers?.['Content-Type'];
    if (!isJavascriptContentType(contentType)) {
      errors.push(`Cloudflare beacon JS response Content-Type was not JavaScript: ${contentType ?? 'missing'}`);
    }
  }

  if (rumPosts.length !== 1 || rumPosts[0].method !== 'POST') {
    errors.push(`expected exactly one POST to Cloudflare RUM, found ${rumPosts.length}`);
  } else if (tokenFromPostData(rumPosts[0].postData) !== cloudflareWebAnalytics.token) {
    errors.push('Cloudflare RUM site token was incorrect or missing');
  }

  if (rumHttpResponses.length !== 1) {
    errors.push(`expected exactly one Cloudflare RUM response, found ${rumHttpResponses.length}`);
  } else if (rumHttpResponses[0].status < 200 || rumHttpResponses[0].status >= 300) {
    errors.push(`Cloudflare RUM response expected HTTP 2xx, received ${rumHttpResponses[0].status}`);
  }

  for (const failure of rumFailures) {
    errors.push(`Cloudflare RUM requestfailed/CORS: ${failure.errorText ?? 'unknown error'}`);
  }

  return { ok: errors.length === 0, errors };
}

async function runBrowserSmokeAttempt(origin) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const rumRequests = [];
  const rumResponses = [];
  const requestFailures = [];
  const beaconResponses = [];

  page.on('request', (request) => {
    if (request.url() === CLOUDFLARE_RUM_URL) {
      rumRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
      });
    }
  });
  page.on('response', (response) => {
    if (response.url() === CLOUDFLARE_BEACON_URL) {
      beaconResponses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
      });
    }
    if (response.url() === CLOUDFLARE_RUM_URL) {
      rumResponses.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
      });
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url() !== CLOUDFLARE_RUM_URL) return;
    requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText,
    });
  });

  try {
    const url = new URL('/?production_browser_smoke=1', origin);
    const pageResponse = await page.goto(url.href, {
      waitUntil: 'load',
      timeout: PAGE_TIMEOUT_MS,
    });
    const deadline = Date.now() + RUM_WAIT_MS;
    while (Date.now() < deadline) {
      await page.waitForTimeout(RUM_POLL_MS);
    }

    const csp = pageResponse?.headers()['content-security-policy'] ?? '';
    const beaconScriptCount = await page.locator(
      `script[src="${CLOUDFLARE_BEACON_URL}"]`,
    ).count();
    const evidence = {
      pageStatus: pageResponse?.status(),
      csp,
      beaconScriptCount,
      beaconResponses,
      rumRequests,
      rumResponses,
      requestFailures,
    };
    console.log(JSON.stringify({
      pageStatus: evidence.pageStatus ?? null,
      beaconScriptCount,
      beaconScriptStatuses: beaconResponses.map((response) => response.status),
      beaconScriptContentTypes: beaconResponses.map((response) => response.headers?.['content-type'] ?? null),
      rumPostCount: rumRequests.filter((request) => request.method === 'POST').length,
      rumResponseStatuses: rumResponses.map((response) => response.status),
      requestFailures: requestFailures.map((failure) => failure.errorText ?? 'unknown'),
      csp: {
        scriptSrcStaticCloudflare: cspAllowsOrigin(csp, 'script-src', 'https://static.cloudflareinsights.com'),
        connectSrcCloudflareInsights: cspAllowsOrigin(csp, 'connect-src', 'https://cloudflareinsights.com'),
      },
    }));

    const result = evaluateCloudflareRum(evidence);
    if (!result.ok) throw new Error(result.errors.join('; '));
    console.log('✓ Cloudflare RUM browser ingestion returned one POST with HTTP 2xx');
  } finally {
    await browser.close();
  }
}

export async function runProductionBrowserSmoke(
  inputOrigin = process.env.PRODUCTION_ORIGIN ?? DEFAULT_PRODUCTION_ORIGIN,
) {
  const origin = new URL(inputOrigin).origin;
  try {
    await runBrowserSmokeAttempt(origin);
  } catch (error) {
    throw new Error(`Cloudflare RUM browser smoke failed: ${error.message}`);
  }
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runProductionBrowserSmoke().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  });
}
