import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../lib/config';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const announcements = await getCollection('announcements');
  const sortedAnnouncements = announcements
    .sort((a, b) => new Date(b.data.datetime).getTime() - new Date(a.data.datetime).getTime())
    .slice(0, 10);

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items: sortedAnnouncements.map((announcement) => ({
      title: announcement.data.title,
      pubDate: announcement.data.datetime,
      description: announcement.data.description,
      link: `/announcements/${announcement.id.replace('.md', '')}/`,
      categories: announcement.data.tags,
    })),
    customData: `<language>zh-TW</language>`,
  });
}
