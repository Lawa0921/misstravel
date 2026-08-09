import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const projectDir = join(__dirname, '..');
const roomsDir = join(projectDir, 'src', 'content', 'rooms');

function readRoom(filename: string) {
  return readFileSync(join(roomsDir, filename), 'utf-8');
}

function roomCategory(filename: string) {
  return readRoom(filename).match(/^category:\s*['\"]?(campsite|cabin|suite)['\"]?$/m)?.[1];
}

describe('房型內容模型', () => {
  it('Content Collection 應使用明確三分類，不再使用 isCampsite 布林值', () => {
    const config = readFileSync(join(projectDir, 'src', 'content.config.ts'), 'utf-8');

    expect(config).toContain("category: z.enum(['campsite', 'cabin', 'suite'])");
    expect(config).not.toContain('isCampsite');
  });

  it('每一個房型都必須有且只有合法 category', () => {
    const roomFiles = readdirSync(roomsDir).filter((filename) => filename.endsWith('.md'));

    expect(roomFiles).toHaveLength(10);
    roomFiles.forEach((filename) => {
      const source = readRoom(filename);
      const categoryMatches = source.match(/^category:/gm) ?? [];
      expect(categoryMatches, filename).toHaveLength(1);
      expect(['campsite', 'cabin', 'suite'], filename).toContain(roomCategory(filename));
      expect(source, filename).not.toContain('isCampsite:');
    });
  });

  it('既有十個房型應依實際住宿型態分類', () => {
    const expectedCategories: Record<string, 'campsite' | 'cabin' | 'suite'> = {
      'campsite_1.md': 'campsite',
      'campsite_2.md': 'campsite',
      'campsite_3.md': 'campsite',
      'log_cabin_1.md': 'cabin',
      'log_cabin_2.md': 'cabin',
      'log_cabin_3.md': 'cabin',
      'log_cabin_4.md': 'cabin',
      'suite_1.md': 'suite',
      'suite_2.md': 'suite',
      'suite_3.md': 'suite',
    };

    Object.entries(expectedCategories).forEach(([filename, category]) => {
      expect(roomCategory(filename), filename).toBe(category);
    });
  });

  it('房型列表應以 category 判斷營位與住宿單位顯示', () => {
    const roomsPage = readFileSync(join(projectDir, 'src', 'pages', 'rooms', 'index.astro'), 'utf-8');

    expect(roomsPage).toContain("room.data.category === 'campsite'");
    expect(roomsPage).not.toContain('room.data.isCampsite');
  });
});
