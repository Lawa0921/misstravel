import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const roomsSourceDir = path.join(__dirname, '../../_rooms');
const roomsTargetDir = path.join(__dirname, '../src/content/rooms');

// Ensure target directory exists
if (!fs.existsSync(roomsTargetDir)) {
  fs.mkdirSync(roomsTargetDir, { recursive: true });
}

// Read all room files
const roomFiles = fs.readdirSync(roomsSourceDir).filter(f => f.endsWith('.md'));

function parseJekyllFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatterStr = match[1];
  const body = match[2];

  // Parse YAML frontmatter
  const frontmatter = {};
  let currentKey = null;
  let arrayValue = null;
  let collectingArray = false;

  const lines = frontmatterStr.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're collecting a multi-line array
    if (collectingArray) {
      arrayValue += line;
      if (line.includes(']')) {
        collectingArray = false;
        try {
          frontmatter[currentKey] = JSON.parse(arrayValue.replace(/'/g, '"'));
        } catch (e) {
          frontmatter[currentKey] = [];
        }
        currentKey = null;
        arrayValue = null;
      }
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Check if this is the start of a multi-line array
    if (value.startsWith('[') && !value.includes(']')) {
      currentKey = key;
      arrayValue = value;
      collectingArray = true;
      continue;
    }

    // Handle quoted strings
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    // Handle single-line arrays
    if (value.startsWith('[') && value.includes(']')) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'));
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    // Handle numbers
    if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    // Handle booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function transformFrontmatter(fm) {
  const mapping = {
    meta_title: 'metaTitle',
    short_title: 'shortTitle',
    meta_description: 'metaDescription',
    weekday_price: 'weekdayPrice',
    holiday_price: 'holidayPrice',
    standard_price: 'standardPrice',
    number_of_rooms: 'numberOfRooms',
    number_of_people: 'numberOfPeople',
    is_campsite: 'isCampsite',
    main_image: 'mainImage',
  };

  const result = {};

  for (const [key, value] of Object.entries(fm)) {
    // Skip layout field
    if (key === 'layout' || key === 'symbol') continue;

    const newKey = mapping[key] || key;

    // Transform image paths
    if (newKey === 'mainImage' && typeof value === 'string') {
      result[newKey] = '/' + value.replace('assets/', '');
    } else if (newKey === 'images' && Array.isArray(value)) {
      result[newKey] = value.map(img => '/' + img.replace('assets/', ''));
    } else {
      result[newKey] = value;
    }
  }

  // Ensure images is an array
  if (!result.images) {
    result.images = [];
  }

  return result;
}

function generateAstroFrontmatter(fm) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(fm)) {
    if (typeof value === 'string') {
      // Escape quotes in strings
      const escaped = value.replace(/'/g, "''");
      lines.push(`${key}: '${escaped}'`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'string') {
          lines.push(`  - '${item}'`);
        } else {
          lines.push(`  - ${item}`);
        }
      }
    }
  }

  lines.push('---');
  return lines.join('\n');
}

// Process each room file
for (const filename of roomFiles) {
  const content = fs.readFileSync(path.join(roomsSourceDir, filename), 'utf-8');
  const parsed = parseJekyllFrontmatter(content);

  if (!parsed) {
    console.error(`Failed to parse: ${filename}`);
    continue;
  }

  const newFrontmatter = transformFrontmatter(parsed.frontmatter);

  // Generate new filename (remove date prefix)
  const newFilename = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');

  // Convert HTML in body to MDX-friendly format
  let body = parsed.body
    .replace(/<h4 class="yellow">/g, '#### ')
    .replace(/<\/h4>/g, '')
    .replace(/<ul class="yellow">/g, '')
    .replace(/<\/ul>/g, '')
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '')
    .replace(/<br>/g, '\n')
    .replace(/<br\/>/g, '\n')
    .replace(/<br \/>/g, '\n');

  const newContent = generateAstroFrontmatter(newFrontmatter) + '\n\n' + body.trim() + '\n';

  fs.writeFileSync(path.join(roomsTargetDir, newFilename), newContent);
  console.log(`Migrated: ${filename} -> ${newFilename}`);
}

console.log(`\nMigrated ${roomFiles.length} room files.`);
