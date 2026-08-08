import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const siteRoot = resolve(import.meta.dirname, '..');
const publicRoot = join(siteRoot, 'public');
const mediaExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.mp4', '.webm', '.mov', '.woff', '.woff2', '.ttf', '.otf']);
const textExtensions = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.mdx', '.css', '.scss', '.html', '.yml', '.yaml']);
const ignoredDirs = new Set(['node_modules', 'dist', '.astro', '.vercel', 'test-results', 'playwright-report']);

function walk(dir, filter = () => true) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full, filter));
    else if (filter(full)) results.push(full);
  }
  return results;
}

function fmt(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function normalize(path) {
  return path.split(sep).join('/');
}

const mediaFiles = walk(siteRoot, (file) => mediaExtensions.has(extname(file).toLowerCase()));
const mediaStats = mediaFiles.map((file) => ({
  file,
  rel: normalize(relative(repoRoot, file)),
  size: statSync(file).size,
})).sort((a, b) => b.size - a.size);
const totalMediaBytes = mediaStats.reduce((sum, item) => sum + item.size, 0);

const hashGroups = new Map();
for (const item of mediaStats) {
  const hash = createHash('sha256').update(readFileSync(item.file)).digest('hex');
  const group = hashGroups.get(hash) ?? [];
  group.push(item);
  hashGroups.set(hash, group);
}
const duplicateGroups = [...hashGroups.values()]
  .filter((group) => group.length > 1)
  .sort((a, b) => (b[0].size * (b.length - 1)) - (a[0].size * (a.length - 1)));
const duplicateWaste = duplicateGroups.reduce((sum, group) => sum + group[0].size * (group.length - 1), 0);

const textFiles = walk(siteRoot, (file) => textExtensions.has(extname(file).toLowerCase()));
const textChunks = textFiles.map((file) => {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
});
const searchableText = textChunks.join('\n');
const dynamicMediaPatterns = [];
for (const text of textChunks) {
  for (const match of text.matchAll(/`([^`]*?)\$\{[^}]+\}([^`]*)`/g)) {
    const prefix = match[1];
    const suffix = match[2];
    if (prefix.includes('/images/') || prefix.includes('/fonts/')) dynamicMediaPatterns.push({ prefix, suffix });
  }
}

const publicMedia = mediaStats.filter((item) => item.file.startsWith(publicRoot + sep));
const unusedCandidates = publicMedia.filter((item) => {
  const publicPath = '/' + normalize(relative(publicRoot, item.file));
  const barePath = normalize(relative(publicRoot, item.file));
  const basename = item.file.split(sep).at(-1);
  const dynamicMatch = dynamicMediaPatterns.some(({ prefix, suffix }) => publicPath.startsWith(prefix) && publicPath.endsWith(suffix));
  return !dynamicMatch && !searchableText.includes(publicPath) && !searchableText.includes(barePath) && !searchableText.includes(basename);
}).sort((a, b) => b.size - a.size);
const unusedBytes = unusedCandidates.reduce((sum, item) => sum + item.size, 0);

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, ...options });
}

function revListObjects(ref) {
  const lines = git(['rev-list', '--objects', ref]).trim().split('\n').filter(Boolean);
  const map = new Map();
  for (const line of lines) {
    const splitAt = line.indexOf(' ');
    const sha = splitAt === -1 ? line : line.slice(0, splitAt);
    const path = splitAt === -1 ? '' : line.slice(splitAt + 1);
    if (!map.has(sha)) map.set(sha, path);
  }
  return map;
}

function blobStats(objectMap) {
  if (objectMap.size === 0) return [];
  const input = [...objectMap.keys()].join('\n') + '\n';
  const checked = execFileSync('git', ['cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize)'], {
    cwd: repoRoot,
    encoding: 'utf8',
    input,
    maxBuffer: 512 * 1024 * 1024,
  });
  return checked.split('\n')
    .filter((line) => line.startsWith('blob '))
    .map((line) => {
      const match = line.match(/^blob ([0-9a-f]+) (\d+)$/);
      return match ? { sha: match[1], size: Number(match[2]), path: objectMap.get(match[1]) || '' } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.size - a.size);
}

let gitObjectStats = '';
let allBlobs = [];
let mainBlobs = [];
let legacyOnly = [];
try {
  gitObjectStats = git(['count-objects', '-vH']).trim();
  const allObjects = revListObjects('--all');
  const mainObjects = revListObjects('origin/main');
  allBlobs = blobStats(allObjects);
  mainBlobs = blobStats(mainObjects);
  const mainShas = new Set(mainBlobs.map((item) => item.sha));
  legacyOnly = allBlobs.filter((item) => !mainShas.has(item.sha));
} catch (error) {
  console.error('Git history audit failed:', error.message);
}

console.log('=== SUMMARY ===');
console.log(`Media files: ${mediaStats.length}`);
console.log(`Current media bytes: ${fmt(totalMediaBytes)}`);
console.log(`Exact duplicate groups: ${duplicateGroups.length}`);
console.log(`Exact duplicate removable bytes: ${fmt(duplicateWaste)}`);
console.log(`Unused public media candidates: ${unusedCandidates.length}`);
console.log(`Unused candidate bytes: ${fmt(unusedBytes)}`);
console.log(`Largest blob reachable from main: ${mainBlobs[0] ? fmt(mainBlobs[0].size) : '(none)'}`);
console.log(`Largest blob only reachable from non-main refs: ${legacyOnly[0] ? fmt(legacyOnly[0].size) : '(none)'}`);
console.log('Git object stats:');
console.log(gitObjectStats || '(unavailable)');

console.log('\n=== CURRENT TOP 50 MEDIA ===');
for (const item of mediaStats.slice(0, 50)) console.log(`${fmt(item.size).padStart(10)}  ${item.rel}`);

console.log('\n=== EXACT DUPLICATE GROUPS TOP 30 ===');
for (const group of duplicateGroups.slice(0, 30)) {
  console.log(`\n${fmt(group[0].size)} × ${group.length} (waste ${fmt(group[0].size * (group.length - 1))})`);
  for (const item of group) console.log(`  ${item.rel}`);
}

console.log('\n=== UNUSED PUBLIC MEDIA CANDIDATES TOP 80 ===');
for (const item of unusedCandidates.slice(0, 80)) console.log(`${fmt(item.size).padStart(10)}  ${item.rel}`);

console.log('\n=== LARGEST BLOBS REACHABLE FROM MAIN TOP 50 ===');
for (const item of mainBlobs.slice(0, 50)) console.log(`${fmt(item.size).padStart(10)}  ${item.sha}  ${item.path}`);

console.log('\n=== LARGEST BLOBS ONLY ON NON-MAIN REFS TOP 80 ===');
for (const item of legacyOnly.slice(0, 80)) console.log(`${fmt(item.size).padStart(10)}  ${item.sha}  ${item.path}`);
