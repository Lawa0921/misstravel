# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an Astro-based website for "密式旅行" (MissTravel), a camping and lodging facility in Miaoli, Taiwan. The site showcases accommodations, provides booking information, and serves as a business portal for guests.

## Development Commands

### Prerequisites
```bash
cd astro-site
npm install
```

### Local Development
```bash
cd astro-site

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment
The site deploys to Vercel automatically when pushing to the main branch. Configuration is in `vercel.json`. The custom domain is `www.misstravel.me`.

## Architecture Overview

### Project Structure
```
astro-site/
├── src/
│   ├── components/    # Reusable Astro components
│   ├── content/       # Content collections (Markdown)
│   │   ├── rooms/         # Accommodation listings
│   │   ├── infos/         # Information pages
│   │   └── announcements/ # Site announcements
│   ├── layouts/       # Page layouts
│   ├── lib/           # Utility functions
│   ├── pages/         # Route pages
│   └── styles/        # Global styles
├── public/            # Static assets (images, fonts, favicon)
└── astro.config.mjs   # Astro configuration
```

### Content Collections
The site uses Astro content collections for structured content:

- **rooms/**: Accommodation listings (campsites, log cabins, suites)
- **infos/**: Information pages (accounts, maps, rules, menus, contact)
- **announcements/**: Site announcements and updates

### Key Technologies
- **Astro 5**: Static site generator with partial hydration
- **Tailwind CSS 4**: Utility-first CSS framework
- **Sharp**: Image optimization
- **TypeScript**: Type-safe development
- **Vercel**: Hosting and deployment

### Styling
- Tailwind CSS for utility-based styling
- Global styles in `src/styles/`
- Component-scoped styles using Astro's `<style>` tags

## Important Considerations

1. **Language**: Site content is primarily in Traditional Chinese (zh-TW)
2. **Images**: Static images in `public/images/` - optimized with Sharp
3. **SEO**: Sitemap and RSS feed generation via Astro integrations
4. **Performance**: Static site with optimized assets and Vercel edge caching
