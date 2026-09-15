import { siteConfig } from './config';
import { getRoomImageMetadata } from './image-metadata';

export interface RoomSchemaInput {
  title: string;
  metaTitle: string;
  description: string;
  metaDescription: string;
  category: 'campsite' | 'cabin' | 'suite';
  mainImage: string;
  images: string[];
}
const categories = { campsite: '露營營位', cabin: '露營木屋', suite: '套房' } as const;

/** A room-type page is not the business and its inventory is not a bedroom count. */
export function createRoomSchemas(slug: string, room: RoomSchemaInput): Record<string, unknown>[] {
  if (!/^[a-z0-9_-]+$/.test(slug)) throw new Error('Invalid room page identifier');
  const url = `${siteConfig.url}/rooms/${slug}/`;
  const accommodationId = `${url}#accommodation`;
  const pageId = `${url}#webpage`;
  const photographs = [...new Set([room.mainImage, ...room.images])]
    .filter(src => getRoomImageMetadata(src).kind === 'photo')
    .map(src => {
      const metadata = getRoomImageMetadata(src);
      return {
        '@type': 'ImageObject',
        contentUrl: new URL(src, siteConfig.url).href,
        caption: metadata.alt,
        width: metadata.width,
        height: metadata.height,
      };
    });
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Accommodation',
      '@id': accommodationId,
      name: room.title,
      url,
      description: room.description,
      accommodationCategory: categories[room.category],
      containedInPlace: { '@id': `${siteConfig.url}/#lodgingbusiness` },
      mainEntityOfPage: { '@id': pageId },
      image: photographs,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': pageId,
      name: room.metaTitle,
      url,
      description: room.metaDescription,
      inLanguage: 'zh-TW',
      isPartOf: { '@id': `${siteConfig.url}/#website` },
      mainEntity: { '@id': accommodationId },
      about: { '@id': `${siteConfig.url}/#lodgingbusiness` },
    },
  ];
}
