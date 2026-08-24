// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.misstravel.me',
  output: 'static',
  adapter: vercel({
    imageService: true,
  }),
  integrations: [sitemap()],
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
