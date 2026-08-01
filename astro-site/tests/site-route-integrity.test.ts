import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const rootDir = join(projectDir, '..');
const distDir = join(projectDir, 'dist');
const canonicalOrigin = 'https://www.misstravel.me';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function displayPath(path: string) {
  return relative(distDir, path).split(sep).join('/');
}

function routeForHtml(file: string) {
  const path = `/${displayPath(file)}`;
  if (path === '/index.html') return '/';
  return path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path;
}

function outputCandidates(pathname: string) {
  const decoded = decodeURIComponent(pathname);
  const clean = decoded.startsWith('/') ? decoded.slice(1) : decoded;
  if (!clean) return [join(distDir, 'index.html')];
  if (decoded.endsWith('/')) {
    const routeName = clean.replace(/\/$/, '');
    return [
      join(distDir, clean, 'index.html'),
      join(distDir, `${routeName}.html`),
    ];
  }
  if (extname(clean)) return [join(distDir, clean)];
  return [join(distDir, clean), join(distDir, clean, 'index.html')];
}

function internalUrl(raw: string, currentRoute: string) {
  const trimmed = raw.trim();
  if (!trimmed || /^(?:mailto:|tel:|sms:|javascript:|data:)/i.test(trimmed)) return null;
  const url = new URL(trimmed, `${canonicalOrigin}${currentRoute}`);
  if (!['www.misstravel.me', 'misstravel.me'].includes(url.hostname)) return null;
  return url;
}

const htmlFiles = walk(distDir).filter((path) => path.endsWith('.html'));
const htmlByRoute = new Map(htmlFiles.map((file) => [routeForHtml(file), file]));
const redirects = JSON.parse(readFileSync(join(rootDir, 'vercel.json'), 'utf-8')).redirects as Array<{
  source: string;
  destination: string;
}>;
const exactRedirectSources = new Set(
  redirects
    .map((redirect) => redirect.source)
    .filter((source) => !source.includes(':') && !source.includes('*')),
);

function expectInternalTarget(raw: string, currentRoute: string, page: string) {
  const url = internalUrl(raw, currentRoute);
  if (!url) return;

  const candidates = outputCandidates(url.pathname);
  const exists = candidates.some((candidate) => existsSync(candidate));
  expect(exists || exactRedirectSources.has(url.pathname), `${page}: missing internal target ${raw}`).toBe(true);

  if (!url.hash || !exists) return;
  const targetFile = candidates.find((candidate) => existsSync(candidate));
  const targetHtml = load(readFileSync(targetFile!, 'utf-8'));
  const targetId = decodeURIComponent(url.hash.slice(1));
  const ids = new Set(targetHtml('[id]').map((_, element) => targetHtml(element).attr('id')).get());
  expect(ids.has(targetId), `${page}: missing fragment ${url.hash} in ${url.pathname}`).toBe(true);
}

describe('站內路由與資產完整性', () => {
  it('所有站內連結、canonical、Feed 與靜態資產都應存在', () => {
    htmlFiles.forEach((file) => {
      const page = displayPath(file);
      const route = routeForHtml(file);
      const $ = load(readFileSync(file, 'utf-8'));

      $('a[href], link[href]').each((_, element) => {
        expectInternalTarget($(element).attr('href') || '', route, page);
      });

      $('img[src], script[src], source[src], iframe[src], video[poster]').each((_, element) => {
        const raw = $(element).attr('src') || $(element).attr('poster') || '';
        expectInternalTarget(raw, route, page);
      });
    });
  });

  it('所有頁面不得有重複 ID，且 skip link 必須指向存在的 main', () => {
    htmlFiles.forEach((file) => {
      const page = displayPath(file);
      const $ = load(readFileSync(file, 'utf-8'));
      const ids = $('[id]').map((_, element) => $(element).attr('id')).get();
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

      expect([...new Set(duplicates)], page).toEqual([]);
      expect($('main#main').length, page).toBe(1);
      expect($('a.skip-link[href="#main"]').length, page).toBe(1);
    });
  });

  it('所有外開連結必須防止 opener 劫持', () => {
    htmlFiles.forEach((file) => {
      const page = displayPath(file);
      const $ = load(readFileSync(file, 'utf-8'));

      $('a[target="_blank"]').each((_, element) => {
        const rel = new Set(($(element).attr('rel') || '').toLowerCase().split(/\s+/).filter(Boolean));
        expect(rel.has('noopener'), `${page}: missing noopener on ${$(element).attr('href')}`).toBe(true);
        expect(rel.has('noreferrer'), `${page}: missing noreferrer on ${$(element).attr('href')}`).toBe(true);
      });
    });
  });

  it('Sitemap 內每一個 canonical 路由都必須有實際 HTML 產物', () => {
    const sitemap = readFileSync(join(distDir, 'sitemap-0.xml'), 'utf-8');
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);

    expect(locations.length).toBeGreaterThan(0);
    locations.forEach((pathname) => {
      expect(htmlByRoute.has(pathname), `sitemap route missing output: ${pathname}`).toBe(true);
    });
  });
});
