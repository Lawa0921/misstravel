import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const projectDir = join(__dirname, '..');
const contentDir = join(projectDir, 'src', 'content', 'rooms');

const expectedCategories = {
  campsite_1: 'campsite',
  campsite_2: 'campsite',
  campsite_3: 'campsite',
  log_cabin_1: 'cabin',
  log_cabin_2: 'cabin',
  log_cabin_3: 'cabin',
  log_cabin_4: 'cabin',
  suite_1: 'suite',
  suite_2: 'suite',
  suite_3: 'suite',
} as const;

describe('房型分類資料完整性', () => {
  it('所有公開房型都必須有明確三分類', () => {
    const roomSlugs = readdirSync(contentDir)
      .filter((file) => file.endsWith('.md') && !file.startsWith('_'))
      .map((file) => file.replace(/\.md$/, ''))
      .sort();

    expect(roomSlugs).toEqual(Object.keys(expectedCategories).sort());

    for (const [slug, category] of Object.entries(expectedCategories)) {
      const source = readFileSync(join(contentDir, `${slug}.md`), 'utf-8');
      expect(source.match(/^category:/gm), `${slug}: category 應只出現一次`).toHaveLength(1);
      expect(source, `${slug}: category 應為 ${category}`).toContain(`category: '${category}'`);
    }
  });

  it('房型資料不得再使用舊 isCampsite 雙重分類來源', () => {
    for (const slug of Object.keys(expectedCategories)) {
      const source = readFileSync(join(contentDir, `${slug}.md`), 'utf-8');
      expect(source, `${slug}: 不應保留 isCampsite`).not.toMatch(/^isCampsite:/m);
    }
  });

  it('Astro content schema 應只保留 category 三分類', () => {
    const schema = readFileSync(join(projectDir, 'src', 'content.config.ts'), 'utf-8');
    expect(schema).toContain("category: z.enum(['campsite', 'cabin', 'suite'])");
    expect(schema).not.toContain('isCampsite');
  });
});