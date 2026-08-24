import { getCollection } from 'astro:content';
import { resolveSiteUrl, siteConfig } from '../lib/config';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const announcements = await getCollection('announcements');
  const sortedAnnouncements = announcements
    .sort((a, b) => new Date(b.data.datetime).getTime() - new Date(a.data.datetime).getTime())
    .slice(0, 10);

  const siteUrl = resolveSiteUrl(context.site);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: siteConfig.title,
    home_page_url: siteUrl,
    feed_url: `${siteUrl}feed.json`,
    description: siteConfig.description,
    language: 'zh-TW',
    authors: [
      {
        name: siteConfig.author,
      },
    ],
    items: sortedAnnouncements.map((announcement) => ({
      id: `${siteUrl}announcements/${announcement.id.replace('.md', '')}/`,
      url: `${siteUrl}announcements/${announcement.id.replace('.md', '')}/`,
      title: announcement.data.title,
      content_text: announcement.data.description,
      date_published: announcement.data.datetime.toISOString(),
      tags: announcement.data.tags,
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
    },
  });
}
