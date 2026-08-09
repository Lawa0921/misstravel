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

  it('三分類導入期間應維持既有 isCampsite 相容性', () => {
    for (const [slug, category] of Object.entries(expectedCategories)) {
      const source = readFileSync(join(contentDir, `${slug}.md`), 'utf-8');
      const expectedLegacyValue = category === 'campsite';
      expect(source, `${slug}: isCampsite 應與 category 一致`).toContain(`isCampsite: ${expectedLegacyValue}`);
    }
  });

  it('Astro content schema 應限制 category 僅能使用三種合法值', () => {
    const schema = readFileSync(join(projectDir, 'src', 'content.config.ts'), 'utf-8');
    expect(schema).toContain("category: z.enum(['campsite', 'cabin', 'suite'])");
  });
});
