import { defineCollection, z } from 'astro:content';

// 房型集合
const rooms = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    metaTitle: z.string(),
    description: z.string(),
    metaDescription: z.string(),
    keywords: z.string().optional(),
    weekdayPrice: z.number(),
    holidayPrice: z.number(),
    standardPrice: z.number(),
    numberOfRooms: z.number(),
    numberOfPeople: z.number(),
    order: z.number(),
    isCampsite: z.boolean().default(false),
    mainImage: z.string(),
    images: z.array(z.string()).default([]),
  }),
});

// 資訊集合
const infos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaTitle: z.string().optional(),
    description: z.string(),
    metaDescription: z.string().optional(),
    keywords: z.string().optional(),
    image: z.string().optional(),
    order: z.number().optional(),
    showTile: z.boolean().default(false),
  }),
});

// 公告集合
const announcements = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaTitle: z.string().optional(),
    description: z.string(),
    datetime: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
  }),
});

export const collections = {
  rooms,
  infos,
  announcements,
};
