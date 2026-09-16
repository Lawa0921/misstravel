Review's done. I found no P0 or P1 blockers. **Verdict: PASS**, with the P2 notes below to handle at commit and deploy. I only read the files in the review folder. I didn't run anything, so the test results come from the coordinator's logs.

## What checks out

**Redirects (`vercel.json`)**
- **All 19 historical URLs are covered.** Each of the 19 old dated URLs (1 announcement, 8 infos pages, 10 rooms) has an exact `.html` rule and an exact trailing-slash rule, and both point to the same current page (`vercel.json:19-213`, plus the four existing `.html` rules at `vercel.json:226-245`). They match the list in `legacy-dated-routes.json:3-23` one to one.
- **Rule order is right.**
  - The apex-to-www rule is still first (`vercel.json:8-18`), so query strings are kept and old URLs on the apex domain take at most 2 hops.
  - The exact rules come before the generic `:slug.html` rules (`vercel.json:231-253`), so the generic rules no longer produce the wrong dated `/.../2022-.../` pages.
- **Unknown or cut-off paths aren't guessed.** `/rooms/2022-10-07-sui`, `/sale` and unknown slugs match no rule (`gsc-remediation.test.ts:31-33`).
- **Every destination page exists** in the build output (`gsc-remediation.test.ts:27`, and the page list in the build log).
- **The production smoke check** now reads the real redirect rules from `vercel.json` (`production-route-smoke.mjs:5-12`). The relative path `../../vercel.json` resolves to the repo root, which is correct. It checks for a 308 and that the query string is kept (`:66-72`).

**Rental schema (`sale_items.astro`)**
- The three kits are now `Service` entries (`sale_items.astro:13-33`). Each has a `LeaseOut` offer, prices of 200, 300 and 400 TWD, and a per-use unit (`次`). That matches the visible modal text "200元/次", "300元/次" and "400 元/次" (`:76`, `:101`, `:130`), and every modal says `租用` (rent).
- Nothing was invented: the schema has no availability, shipping, return policy, price-valid-until date, rating or image. The test checks for all of these (`gsc-remediation.test.ts:52-53`).
- The button list still uses the same names, descriptions and prices (`sale_items.astro:35`). The one-off single-item rental prices and the three bedding images are unchanged.
- The provider ID `https://www.misstravel.me/#organization` matches the Organization defined in `SchemaOrg.astro:23`.
- The docs don't claim `Product` was invalid (`SEO_CONTENT_MODEL.md` line 215 says Product can broadly describe rentals). They also don't claim the Search Console reports are cleared, and they say fixes must be merged and deployed before asking Google to validate (line 217).

**Sitemap**
- The existing sitemap integration now lists the image sitemap through `customSitemaps` (`astro.config.mjs:15`); no second sitemap generator was added.
- The test requires exactly two entries in `sitemap-index.xml` and 25 page URLs, with no dated or `.html` URLs (`gsc-remediation.test.ts:58-64`).
- According to `preservation.json`, `sitemap-0.xml` and `image-sitemap.xml` are identical to before.

**Tests weren't weakened**
- **Red run:** 21 of 23 new tests failed for the expected reasons: the 19 route tests, the Product-count check and the sitemap check (`gsc-regression-red.log:60-83`). The 2 that passed are guard tests that should pass before and after the fix.
- **Green run:** 375 tests passed in 33 files (`verify-round1.log:167-168`).
- In `seo-round2.test.ts:283-329` the Product tests became Service tests with the same assertions, including "no availability". The new test adds a check that no `Product` remains.
- Only the `sale_items` schema hash changed in the baseline file (diff lines 132-134).
- `preservation.json` reports visible text, metadata and other schemas unchanged on all 26 pages. That file is the coordinator's summary; I couldn't check how it was produced.

## P2 (fix or confirm before merge)

1. **New files are missing from `changes.diff`.** `changes.diff` doesn't contain `astro-site/tests/gsc-remediation.test.ts` or `astro-site/tests/fixtures/legacy-dated-routes.json`, probably because they're untracked. Make sure both are added to the commit, or the PR loses the regression tests.
2. **The redirect test only simulates Vercel.** `gsc-remediation.test.ts:9-17` matches rules with `path-to-regexp`, not Vercel's own router. With `"trailingSlash": true` (`vercel.json:322`), rules whose source ends in `/` should work, but only the post-deploy smoke run (`production-route-smoke.mjs:63-75`) proves it. Run `npm run smoke:production` after the deploy, before asking Search Console to validate.
3. **The provider link isn't confirmed on the page itself.** `sale_items.astro:21` points to `#organization`, but `BaseLayout.astro` isn't in the review folder, so I couldn't confirm that `/sale_items/` actually outputs the Organization block rather than only the LodgingBusiness one (`SchemaOrg.astro:40`). If it doesn't, the link still points to the site's Organization, but it won't resolve within the page. A one-line check on the built page would settle it.
4. **Minor behaviour to know about.** An unknown dated URL ending in `.html` (e.g. `/rooms/2022-10-07-unknown.html`) still goes through the generic rule (`vercel.json:237-241`) to a dated slash URL, which then returns 404. No page is guessed, so this meets the requirement; it's just a redirect followed by a 404 rather than a direct 404.
5. **Cosmetic.** `seo-round2.test.ts:288-323` still calls its variable `products` even though it now holds Services.
