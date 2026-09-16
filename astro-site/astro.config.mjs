// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import { roomMarkdownProcessor } from './src/plugins/room-markdown.mjs';

export default defineConfig({
  site: 'https://www.misstravel.me',
  output: 'static',
  adapter: vercel({
    imageService: true,
  }),
  integrations: [sitemap()],
  markdown: { processor: roomMarkdownProcessor() },
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    assets: 'assets',
  },
  trailingSlash: 'always',
  server: {
    port: 4333,
  },
  image: {
    domains: [],
  },
});
