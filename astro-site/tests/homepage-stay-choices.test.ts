import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const projectDir = join(__dirname, '..');
const distDir = join(projectDir, 'dist');

function readPage(path: string) {
  return load(readFileSync(join(distDir, path), 'utf-8'));
}

describe('首頁內容', () => {
  it('不應顯示住宿方式區塊', () => {
    const $ = readPage('index.html');
    expect($('.stay-choices')).toHaveLength(0);
    expect($.text()).not.toContain('選擇住宿方式');
  });

  it('原本六張首頁功能 tiles 應完整保留', () => {
    const $ = readPage('index.html');
    expect($('#tiles .tile')).toHaveLength(6);
  });
});
