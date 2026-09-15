import { getCollection } from 'astro:content';
import { siteConfig } from '../lib/config';
import { galleryImages } from '../lib/gallery';
import { getRoomImageMetadata } from '../lib/image-metadata';

export const prerender = true;
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Expose photographs without requesting every carousel image on initial load.
export async function GET() {
  const rooms = await getCollection('rooms');
  const entries = rooms.map(room => ({
    url: `${siteConfig.url}/rooms/${room.id.replace(/\.md$/, '')}/`,
    images: [...new Set([room.data.mainImage, ...room.data.images])]
      .filter(src => getRoomImageMetadata(src).kind === 'photo'),
  }));
  entries.push({
    url: `${siteConfig.url}/galleries/`,
    images: galleryImages.map(image => image.src),
  });
  const urls = entries.map(entry => `<url><loc>${escapeXml(entry.url)}</loc>${entry.images.map(src => `<image:image><image:loc>${escapeXml(new URL(src, siteConfig.url).href)}</image:loc></image:image>`).join('')}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
