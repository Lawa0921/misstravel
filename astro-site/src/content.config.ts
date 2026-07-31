import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const priceOption = z.object({
  label: z.string(),
  numberOfUnits: z.number().int().positive(),
  numberOfPeople: z.number().int().positive(),
  weekdayPrice: z.number().nonnegative(),
  holidayPrice: z.number().nonnegative(),
  standardPrice: z.number().nonnegative(),
  isStandard: z.boolean().default(false),
});

const rooms = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/rooms' }),
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
    pricingNote: z.string().optional(),
    priceOptions: z.array(priceOption).min(2).optional(),
    numberOfRooms: z.number(),
    numberOfPeople: z.number(),
    order: z.number(),
    isCampsite: z.boolean().default(false),
    mainImage: z.string(),
    images: z.array(z.string()).default([]),
  }),
});

const infos = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/infos' }),
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

const announcements = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/announcements' }),
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
