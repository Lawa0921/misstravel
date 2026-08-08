import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const siteDir = new URL('..', import.meta.url).pathname;
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4321'], {
  cwd: siteDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ready = false;
for (let i = 0; i < 40; i += 1) {
  try {
    const response = await fetch('http://127.0.0.1:4321/');
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {}
  await sleep(250);
}
if (!ready) throw new Error('Astro preview did not become ready');

const browser = await chromium.launch({ headless: true });
const pages = ['/', '/rooms/', '/rooms/log_cabin_4/', '/galleries/'];
const fmt = (bytes) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;

try {
  for (const path of pages) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const resources = [];

    page.on('response', async (response) => {
      const request = response.request();
      if (!response.url().startsWith('http://127.0.0.1:4321/')) return;
      try {
        const body = await response.body();
        resources.push({
          url: response.url().replace('http://127.0.0.1:4321', ''),
          type: request.resourceType(),
          bytes: body.byteLength,
        });
      } catch {}
    });

    await page.goto(`http://127.0.0.1:4321${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const unique = new Map();
    for (const resource of resources) {
      const prior = unique.get(resource.url);
      if (!prior || resource.bytes > prior.bytes) unique.set(resource.url, resource);
    }
    const list = [...unique.values()].sort((a, b) => b.bytes - a.bytes);
    const total = list.reduce((sum, item) => sum + item.bytes, 0);
    const byType = new Map();
    for (const item of list) byType.set(item.type, (byType.get(item.type) ?? 0) + item.bytes);

    console.log(`\n=== PAGE ${path} MOBILE INITIAL LOAD ===`);
    console.log(`Total same-origin decoded resources: ${fmt(total)} across ${list.length} requests`);
    console.log('By type:', [...byType.entries()].map(([type, bytes]) => `${type}=${fmt(bytes)}`).join(', '));
    console.log('Top resources:');
    for (const item of list.slice(0, 15)) console.log(`${fmt(item.bytes).padStart(10)}  ${item.type.padEnd(10)} ${item.url}`);

    await context.close();
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
  server.unref();
}

process.exit(0);
