import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
const page = () => load(readFileSync(join(__dirname, '../dist/rooms/index.html'), 'utf8'));

describe('Room-list first-paint loading policy', () => {
  it('the leading row loads eagerly and only the first image has high priority', () => {
    const $ = page(); const images = $('.room-card img');
    expect(images).toHaveLength(10);
    expect(images.eq(0).attr('loading')).toBe('eager');
    expect(images.eq(1).attr('loading')).toBe('eager');
    expect(images.filter('[fetchpriority="high"]')).toHaveLength(1);
    expect(images.eq(0).attr('fetchpriority')).toBe('high');
    images.slice(2).each((_, image) => expect($(image).attr('loading')).toBe('lazy'));
  });
  it('the responsive preload matches the first displayed image exactly', () => {
    const $ = page(); const first = $('.room-card img').first();
    const preload = $('link[rel="preload"][as="image"]');
    expect(preload).toHaveLength(1);
    expect(preload.attr('href')).toBe(first.attr('src'));
    expect(preload.attr('imagesrcset')).toBe(first.attr('srcset'));
    expect(preload.attr('imagesizes')).toBe(first.attr('sizes'));
  });
  it('the first row never waits for scroll-reveal JavaScript to become visible', () => {
    const $ = page(); const cards = $('.room-card');
    expect(cards.eq(0).is('[data-reveal]')).toBe(false);
    expect(cards.eq(1).is('[data-reveal]')).toBe(false);
    expect(cards.filter('[data-motion-card]')).toHaveLength(10);
    expect(cards.filter('[data-reveal]')).toHaveLength(8);
  });
});
