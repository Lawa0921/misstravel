import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
const root = join(__dirname, '..');

describe('Native motion opt-in is parsed before deferred external styles', () => {
  it('all 26 HTML documents have one early opt-in with a reduced-motion opt-out', () => {
    const pages = readdirSync(join(root, 'dist'), {recursive: true}).filter(p => typeof p === 'string' && p.endsWith('.html'));
    expect(pages).toHaveLength(26);
    for (const file of pages) {
      const html = readFileSync(join(root, 'dist', String(file)), 'utf8');
      const $ = load(html);
      const policy = $('head style[data-navigation-policy]');
      expect(policy, String(file)).toHaveLength(1);
      expect(policy.text()).toMatch(/prefers-reduced-motion:\s*no-preference/);
      expect(policy.text()).toMatch(/navigation:\s*auto/);
      expect(policy.text()).toMatch(/prefers-reduced-motion:\s*reduce/);
      expect(policy.text()).toMatch(/navigation:\s*none/);
      expect(html.indexOf('data-navigation-policy')).toBeLessThan(html.indexOf('<script'));
      expect(html.indexOf('data-navigation-policy')).toBeLessThan(html.indexOf('rel="stylesheet"'));
    }
  });
  it('the shared stylesheet no longer supplies a competing navigation policy', () => {
    expect(readFileSync(join(root, 'src/styles/motion-effects.css'), 'utf8')).not.toContain('@view-transition');
  });
});
