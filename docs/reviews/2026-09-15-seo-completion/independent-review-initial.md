# Verdict: PASS. No P0 or P1 findings; seven P2 items below are non-blocking.

This review covers source commit `aca384b89d008b4331e0caf711b937366a59d701` (`HEAD.txt`, matching `SOURCE_COMMIT` in `verify-final-source.log`). I only read files; I ran nothing. The log shows 25 test files and 289 tests passed, audit 0 and `astro check` 0 errors. I haven't seen any browser-gate results, so I'm not saying they pass. I also didn't open any image files. Where I discuss photo descriptions, I'm comparing the catalog text with the room text, not with the photos.

## What I checked and found correct

**Prices are unchanged.** I compared every removed line in `changes.diff` with `tests/fixtures/room-operating-copy.json` and the new token lines. All ten rooms keep the same weekday, holiday and long-holiday prices, including both campsite_1/2 plans (4 tents: 3200/4000/4800; 3 tents: 2400/3000/3600).
- In the room `.md` files, only `description`, `metaDescription`, `keywords` and the fee lines changed. The campsite_1/2 standard plans also lost their duplicate fields.
- No operating sentence, extra fee, meal, pet, visitor, refund or check-in text was touched.
- The booking-notice and weekday/holiday blocks in `rooms/[...slug].astro` are unchanged.

**The value tokens fail safely** (`room-values.mjs`):
- Only names on a fixed list can be used (`:3`), checked before any lookup (`:19`). The lookup only follows the object's own fields (`:22`).
- `{{constructor}}`, `{{__proto__.x}}`, `{{weekdayPrice + 1}}`, a missing option index and unclosed `{{` all throw. Nothing is evaluated.
- Values must be whole numbers (`:7`), so NaN, negatives, decimals and text are rejected.
- The same function runs in the content schema (`content.config.ts:18`) and the Markdown step (`room-markdown.mjs:18-19`), and running it twice gives the same result.

**The standard plan really takes its values from the top level.**
- The standard plan copies the room's three prices and headcount (`:49-53`).
- If the standard plan states its own value and it disagrees, the build fails (`:51`).
- Exactly one standard plan is required (`:45`).
- The 3-tent plan keeps its own values.

**The structured data is truthful** (`room-schema.ts`):
- The room (Accommodation), its web page and the campground business each have their own `@id`, and they point at each other correctly (`:37-56`).
- There is no room count, bedroom count, occupancy, offer, rating, availability or check-in/out time.
- `SchemaOrg.astro:75` no longer copies the business's fields into Accommodation.
- Only images marked `photo` are listed (`:22`), and the notice images are excluded.

**The summaries hold up.**
- Every room's summary states its plan-specific conditions (tent count, headcount, meals, shared facilities).
- Cabins say their facilities are 公用 (shared).
- Suites separate weekday (no breakfast) from holiday/long-holiday (breakfast included).
- Campsites pair 12 people with 3 tents and 16 people with 4 tents.
- The unsupported marketing claims ("best", "top-tier", "no need to worry about weather") are gone.

The catalog has 130 entries, which matches the documented 127 room images plus 3 others (`rooms.webp`, `banner.webp`, `menu.webp`).

## P2 findings (non-blocking)

1. **Tokens in fields other than the summaries and body are not caught** (`room-values.mjs:61-64`). Only `description` and `metaDescription` are resolved and checked. A `{{…}}` in `title`, `metaTitle`, `shortTitle`, `keywords`, `pricingNote` or a plan `label` would appear literally in `<title>`, the h1 or the price chips. The build would still succeed, and the tests only check `main` text and the meta description. `docs/SEO_CONTENT_MODEL.md:17` describes failing closed more broadly than that.
   - **Fix:** after normalizing, walk every remaining text field (including plan labels) and throw if it contains `{{` or `}}`.

2. **Extra braces pass the final check** (`room-values.mjs:17,29`). `{{{weekdayPrice}}}` becomes `{3200}` and `{{weekdayPrice}}}` becomes `3200}`, and neither is caught.
   - **Fix:** after replacing, also reject any leftover `{` or `}`, or reject a token with a brace directly before or after it.

3. **suite_3 says 共用平台 (shared platform), which the room text doesn't** (`suite_3.md:5-6`). The body only says cooking happens on the outdoor platform. The claim seems to come from the diagram description (`image-metadata.json:683`, "月房、星房與共用平台位置標示"). It is a cautious claim, but `docs/SEO_CONTENT_MODEL.md:25` says every summary uses only facts already in the room text.
   - **Fix:** either have the coordinator/owner confirm it and change the doc to say some facts come from reviewed diagrams, or remove the phrase.

4. **Three photo descriptions could conflict with the room text.** Each one feeds the page alt text, the Accommodation image caption and the image sitemap. I can't judge them without viewing the photos.
   - **`image-metadata.json:758-762`:** suite_3_17 is described as "沐浴乳與洗髮乳" (body wash and shampoo). `suite_3.md:53` says the room provides no toiletries, and the booking notice says to bring your own.
   - **`image-metadata.json:740-744`:** new_14 is "套房加床配置示例" (an extra-bed layout example). The room text only mentions a per-person fee above two guests and never an extra bed.
   - **`image-metadata.json:164-168`:** `campsite_3_main` is marked `photo` but described as a "尺寸示意" (size diagram). As the main image, it appears in the Accommodation schema, contrary to the doc's rule of photos only.
   - **Fix:** have the coordinator re-check these three (and mark the campsite image `diagram` if it is annotated), or reword the descriptions, e.g. "衛浴內擺放的沐浴用品" (toiletries in the bathroom) and "套房床位配置".

5. **Structure precision:**
   - `room-schema.ts:36`: campsites could use `CampingPitch`, a more specific kind of Accommodation.
   - `room-schema.ts:54`: `isPartOf #website` points to an ID that only the homepage defines (`index.astro`). That's valid, but a crawler reading only the room page can't resolve it.

6. **The gallery count is duplicated** (`image-sitemap.xml.ts:18`). The number 36 is hard-coded again instead of shared with `galleries.astro:45`. If the gallery changes, the sitemap could list images that don't exist.
   - **Fix:** export one gallery list and use it in both places.

7. **Minor maintainability:**
   - **Fee lines reference plans by position** (`campsite_1.md:55-56`, `campsite_2.md:45-46`). The plan labels and headcounts (12/16) are still typed by hand in the body and summary. Reordering the plans would swap prices under the wrong labels. The baseline test would catch it today, but a guard that plan 0 is the standard plan would make the rule explicit.
   - **Bare `$` in related cards** (`rooms/[...slug].astro:228`). The related card shows `$3200`, while the page's own price summary uses `NT$` with number formatting. This predates the change, but the line was edited.

## Scope notes

- I didn't view any photos. The 127 room image descriptions depend on the coordinator's contact-sheet review; image widths and heights are checked with sharp in `room-seo-completion.test.ts:117-125`.
- Nothing here claims ranking gains, rich-result eligibility or approval by a human third party.
- None of the P2 items asks for new marketing copy or policy changes. Items 1 and 2 are small and worth doing before merge, but they don't block it.
