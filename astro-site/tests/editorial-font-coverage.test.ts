import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import coverage from './fixtures/setofont-coverage.json';
const root = join(__dirname, '..');
const supported = new Set(coverage.supportedCodepoints);
// Fixture derives from the original font's actual glyph outlines, not merely its cmap.
// In particular 鄉 has a cmap entry but an empty outline; the original file is unchanged.
describe('New editorial copy preserves the original font', () => {
  it('does not alter the protected font bytes', () => {
    expect(createHash('sha256').update(readFileSync(join(root, 'public/fonts/setofont.woff2'))).digest('hex')).toBe(coverage.sha256);
  });
  it('routes only the two empty CJK outlines through the existing fallback', () => {
    expect(coverage.emptyCjkCodepoints).toEqual([0x9109, 0x95b1]);
    const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
    expect(css).toContain('unicode-range: U+0000-9108, U+910A-95B0, U+95B2-10FFFF');
    expect(css).toContain("--font-body: 'setofont', sans-serif");
  });
  it.each(['index.html', 'galleries/index.html', 'rooms/index.html', 'rooms/campsite_1/index.html', 'rooms/suite_1/index.html'])( '%s has supported glyphs in new interface copy', (file) => {
    const $ = load(readFileSync(join(root, 'dist', file), 'utf8'));
    const copy = $('.hero-copy, .hero-media figcaption, .tiles-heading, .tile-content, #footer, .summary-kicker, .summary-facts, .standard-capacity, .alternative-capacity, .intro').text();
    const missing = [...new Set([...copy].filter(c => /[\u4e00-\u9fff]/u.test(c) && !supported.has(c.codePointAt(0)!)))];
    expect(missing, `Unsupported new glyphs in ${file}`).toEqual([]);
  });
});
