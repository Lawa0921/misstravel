import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const infosSourceDir = path.join(__dirname, '../../_infos');
const infosTargetDir = path.join(__dirname, '../src/content/infos');

// Ensure target directory exists
if (!fs.existsSync(infosTargetDir)) {
  fs.mkdirSync(infosTargetDir, { recursive: true });
}

// Read all info files
const infoFiles = fs.readdirSync(infosSourceDir).filter(f => f.endsWith('.md') || f.endsWith('.html'));

function parseJekyllFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatterStr = match[1];
  const body = match[2];

  const frontmatter = {};
  const lines = frontmatterStr.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    if (value === 'true') value = true;
    if (value === 'false') value = false;

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function transformFrontmatter(fm) {
  const mapping = {
    meta_title: 'metaTitle',
    meta_description: 'metaDescription',
    show_tile: 'showTile',
  };

  const result = {};

  for (const [key, value] of Object.entries(fm)) {
    if (key === 'layout') continue;

    const newKey = mapping[key] || key;

    if (newKey === 'image' && typeof value === 'string' && value.startsWith('assets/')) {
      result[newKey] = '/' + value.replace('assets/', '');
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

function generateAstroFrontmatter(fm) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(fm)) {
    if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "''");
      lines.push(`${key}: '${escaped}'`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

// Process each info file
for (const filename of infoFiles) {
  const content = fs.readFileSync(path.join(infosSourceDir, filename), 'utf-8');
  const parsed = parseJekyllFrontmatter(content);

  if (!parsed) {
    console.error(`Failed to parse: ${filename}`);
    continue;
  }

  const newFrontmatter = transformFrontmatter(parsed.frontmatter);

  // Generate new filename (remove date prefix, change extension to .mdx for HTML content)
  let newFilename = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');

  // Convert HTML body to MDX-friendly format
  let body = parsed.body
    .replace(/\{% link ([^%]+) %\}/g, '/$1')
    .replace(/\{\{ site\.baseurl \}\}/g, '')
    .replace(/\{\{ page\.([^}]+) \}\}/g, '')
    .replace(/<h4 class="yellow">/g, '#### ')
    .replace(/<\/h4>/g, '')
    .replace(/<br>/g, '\n')
    .replace(/<br\/>/g, '\n')
    .replace(/<br \/>/g, '\n');

  // Change .html to .mdx
  if (newFilename.endsWith('.html')) {
    newFilename = newFilename.replace('.html', '.mdx');
  } else if (newFilename.endsWith('.md')) {
    newFilename = newFilename.replace('.md', '.mdx');
  }

  const newContent = generateAstroFrontmatter(newFrontmatter) + '\n\n' + body.trim() + '\n';

  fs.writeFileSync(path.join(infosTargetDir, newFilename), newContent);
  console.log(`Migrated: ${filename} -> ${newFilename}`);
}

console.log(`\nMigrated ${infoFiles.length} info files.`);
