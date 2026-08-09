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

# Run audit, Astro diagnostics, TypeScript and Vitest
npm run verify

# Run Chromium interaction tests
npm run test:e2e

# Verify the public production site
npm run smoke:production
```

### Deployment
The site deploys to Vercel automatically when pushing to the main branch. Configuration is in `vercel.json`. The custom domain is `www.misstravel.me`.

GitHub CI runs the full verification suite on pull requests and pushes to `main`. Vercel is responsible for the deployable Astro build, while the production smoke workflow verifies the public site after deployment.

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
- **Astro 7**: Static site generator
- **Tailwind CSS 4**: CSS build dependency
- **Sharp**: Image metadata/processing support
- **TypeScript**: Type-safe development
- **Vercel**: Hosting and deployment
- **Vitest + Playwright**: Static and browser-level regression testing

## Protected Content and Files

1. **Do not rewrite operational/business content unless the user explicitly asks for that content change.** This includes room prices, booking/payment flow, refund policy, pet rules, visitor rules, meal policy, check-in/out wording, contact information and bank-transfer details.
2. **Do not regenerate, replace, subset, expand, or otherwise modify `astro-site/public/fonts/setofont.woff2` unless the user explicitly asks for a font change.** Technical refactors must leave the font file untouched.
3. When adding or changing visible Traditional Chinese text, remember that the current font is a subset. Treat font glyph coverage as a validation concern; do not silently solve missing glyphs by replacing the font.
4. Keep technical/performance changes isolated from content changes whenever practical. PR descriptions should explicitly state whether visible content, prices, rules, images, or fonts changed.
5. Prefer adding regression tests for fixes that protect booking accuracy, route integrity, accessibility, production behavior, or content-model assumptions.

## Important Considerations

1. **Language**: Site content is primarily in Traditional Chinese (zh-TW)
2. **Images**: Static images are primarily under `public/images/`
3. **SEO**: Sitemap, structured data, RSS/JSON feeds and canonical metadata are already implemented; do not add SEO markup without checking existing output first
4. **Performance**: The site is statically generated and already has regression coverage for major technical hardening work
5. **Deployment safety**: Preserve the existing GitHub CI and production smoke responsibilities when changing build or deployment configuration
