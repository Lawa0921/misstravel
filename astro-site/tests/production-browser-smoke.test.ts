import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLOUDFLARE_BEACON_URL,
  CLOUDFLARE_RUM_URL,
  evaluateCloudflareRum,
} from '../scripts/production-browser-smoke.mjs';
import { EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN } from '../scripts/production-smoke.mjs';

const csp = "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com";

const successfulEvidence = {
  pageStatus: 200,
  csp,
  beaconScriptCount: 1,
  beaconResponses: [{
    url: CLOUDFLARE_BEACON_URL,
    status: 200,
    headers: { 'content-type': 'text/javascript;charset=UTF-8' },
  }],
  rumRequests: [{
    url: CLOUDFLARE_RUM_URL,
    method: 'POST',
    postData: JSON.stringify({ siteToken: EXPECTED_CLOUDFLARE_WEB_ANALYTICS_TOKEN }),
  }],
  rumResponses: [{ url: CLOUDFLARE_RUM_URL, method: 'POST', status: 204 }],
  requestFailures: [],
};

describe('Cloudflare RUM production browser evaluator', () => {
  it('接受 beacon 200、單一正確 token POST 與任一 2xx response', () => {
    expect(evaluateCloudflareRum(successfulEvidence)).toEqual({ ok: true, errors: [] });
  });

  it('OPTIONS 不算 RUM POST，但和一個 POST 並存時仍成功', () => {
    expect(evaluateCloudflareRum({
      ...successfulEvidence,
      rumRequests: [
        { url: CLOUDFLARE_RUM_URL, method: 'OPTIONS', postData: null },
        ...successfulEvidence.rumRequests,
      ],
      rumResponses: [
        { url: CLOUDFLARE_RUM_URL, method: 'OPTIONS', status: 204 },
        { url: CLOUDFLARE_RUM_URL, method: 'POST', status: 204 },
      ],
    })).toEqual({ ok: true, errors: [] });
  });

  it.each([
    ['缺少 POST', { rumRequests: [], rumResponses: [] }, /exactly one POST/],
    ['RUM 404', { rumResponses: [{ url: CLOUDFLARE_RUM_URL, method: 'POST', status: 404 }] }, /HTTP 2xx.*404/],
    ['RUM GET response', { rumResponses: [{ url: CLOUDFLARE_RUM_URL, method: 'GET', status: 204 }] }, /exactly one Cloudflare RUM response/],
    ['RUM response 缺 method', { rumResponses: [{ url: CLOUDFLARE_RUM_URL, status: 204 }] }, /exactly one Cloudflare RUM response/],
    ['requestfailed/CORS', { requestFailures: [{ url: CLOUDFLARE_RUM_URL, errorText: 'net::ERR_FAILED' }] }, /requestfailed.*net::ERR_FAILED/],
    ['CSP 缺少 script origin', { csp: "connect-src 'self' https://cloudflareinsights.com" }, /script-src.*static.cloudflareinsights.com/],
    ['CSP 只在 img-src 放 origin', { csp: "default-src 'self'; script-src 'self'; connect-src 'self'; img-src https://static.cloudflareinsights.com https://cloudflareinsights.com" }, /script-src.*static.cloudflareinsights.com/],
    ['重複 POST', { rumRequests: [
      ...successfulEvidence.rumRequests,
      ...successfulEvidence.rumRequests,
    ] }, /exactly one POST/],
    ['錯 token', { rumRequests: [{
      ...successfulEvidence.rumRequests[0],
      postData: JSON.stringify({ siteToken: '00000000000000000000000000000000' }),
    }] }, /token/],
    ['beacon JS 非 200', { beaconResponses: [{ url: CLOUDFLARE_BEACON_URL, status: 404, headers: { 'content-type': 'text/javascript' } }] }, /beacon.*HTTP 200/],
    ['beacon network response 重複', { beaconResponses: [
      ...successfulEvidence.beaconResponses,
      ...successfulEvidence.beaconResponses,
    ] }, /exactly one.*network/],
    ['缺少 DOM beacon script', { beaconScriptCount: 0 }, /exactly one.*DOM/],
    ['beacon 非 JavaScript Content-Type', { beaconResponses: [{ url: CLOUDFLARE_BEACON_URL, status: 200, headers: { 'content-type': 'text/plain' } }] }, /Content-Type.*JavaScript/],
  ])('%s 時失敗', (_label, override, message) => {
    const result = evaluateCloudflareRum({ ...successfulEvidence, ...override });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(message);
  });

  it('不接受只有 OPTIONS，避免 preflight 被誤判成 beacon POST', () => {
    const result = evaluateCloudflareRum({
      ...successfulEvidence,
      rumRequests: [{ url: CLOUDFLARE_RUM_URL, method: 'OPTIONS', postData: null }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/exactly one POST/);
  });

  it('接受 200 作為合法 RUM 2xx response', () => {
    expect(evaluateCloudflareRum({
      ...successfulEvidence,
      rumResponses: [{ url: CLOUDFLARE_RUM_URL, method: 'POST', status: 200 }],
    }).ok).toBe(true);
  });

  it('runner 不得以 Node fetch 重送 telemetry 或混入 synthetic response', () => {
    const source = readFileSync(join(__dirname, '../scripts/production-browser-smoke.mjs'), 'utf8');
    expect(source).not.toMatch(/probeFailedRumRequest|failedRumProbes|fetch\(CLOUDFLARE_RUM_URL/);
  });

  it('RUM contract fail 不得靠 whole-attempt retry 變成假綠', () => {
    const source = readFileSync(join(__dirname, '../scripts/production-browser-smoke.mjs'), 'utf8');
    expect(source).not.toMatch(/MAX_ATTEMPTS|for \(let attempt = 1; attempt <=/);
  });

  it('runner 在 terminal evidence 後仍觀察完整 deadline，捕捉延遲 duplicate POST', () => {
    const source = readFileSync(join(__dirname, '../scripts/production-browser-smoke.mjs'), 'utf8');
    expect(source).toMatch(/while \(Date\.now\(\) < deadline\)/);
  });

  it('DOM beacon count 使用 exact src，不依賴 data-cf-beacon 屬性', () => {
    const source = readFileSync(join(__dirname, '../scripts/production-browser-smoke.mjs'), 'utf8');
    expect(source).toContain('script[src="${CLOUDFLARE_BEACON_URL}"]');
    expect(source).not.toContain('[data-cf-beacon]');
  });

  it('production gate concurrency 按 deployment environment 分組，manual 有 fallback', () => {
    const workflow = readFileSync(
      join(__dirname, '../../.github/workflows/production-smoke.yml'),
      'utf8',
    );
    expect(workflow).toMatch(/group:\s*>-\s*\n\s*production-smoke-\$\{\{ github\.event\.deployment\.environment \|\| 'manual' \}\}/);
  });
});
