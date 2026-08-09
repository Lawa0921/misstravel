# AGENTS.md

Repository guidance for coding agents working on the 密式旅行 website.

## Scope

- Primary app: `astro-site/`
- Framework: Astro 7, TypeScript, static output on Vercel
- Validation: `npm run verify` and `npm run test:e2e` from `astro-site/`
- Production verification: `npm run smoke:production`

## Hard Guardrails

- Do not change room prices, booking/payment flow, refund rules, pet rules, visitor rules, meal policy, check-in/out wording, contact details, or bank-transfer details unless the user explicitly requests that content change.
- Do not regenerate, replace, subset, expand, or otherwise modify `astro-site/public/fonts/setofont.woff2` unless the user explicitly requests a font change.
- If new Traditional Chinese text exposes missing glyphs, report or test the coverage issue instead of silently replacing the font.
- Keep technical/performance work separate from visible content changes whenever practical.
- Do not opportunistically rewrite approved public wording while doing refactors.

## Change Discipline

- Prefer small branches and narrowly scoped PRs.
- State explicitly in PR descriptions whether visible content, prices, business rules, images, or fonts changed.
- Preserve existing route integrity, accessibility behavior, security headers, sitemap/canonical behavior, and production smoke coverage.
- Add or update regression tests when changing content models, shared booking logic, routes, interactive components, or performance-sensitive loading behavior.

## Content Architecture

- `astro-site/src/content/rooms/`: accommodation data and room-specific copy
- `astro-site/src/content/infos/`: booking, rules, maps, menus, contact and other guest information
- `astro-site/src/content/announcements/`: announcements/feed content
- `astro-site/src/content.config.ts`: content schemas; update schema and all affected entries together

Before adding another SEO, performance, accessibility, or deployment mechanism, inspect the existing implementation and tests so the project does not accumulate duplicate layers.
