# Independent review: 密式旅行 visual redesign + SEO snapshot (pre-verification)

I found no P0 issues. I found 4 P1 issues that block merge and a set of P2 issues. I didn't run anything. Findings come from reading the source and the two draft screenshots.

## P1: blocking

**1. `npm run verify` will fail: old tests contradict the new markup and nobody updated them.**
- `tests/seo-round3.test.ts:33-37` still expects `.room-card h2 > 0` and `h3 === 0`. `rooms/index.astro:81` now renders `<h3>`, and the new `tests/room-design-system.test.ts:17-19` requires the reverse. Both can't pass.
- `tests/technical-hardening.test.ts:91` expects the string `menu.contains(activeElement)`, and `:94` expects `focusMenuCloseWhenVisible`. The refactor in `Header.astro:137,152` removed both.
- The refactor also dropped a guard. The old code checked `if (!menu.classList.contains('is-visible')) return` inside the animation-frame callback. Without it, an open followed by a close within one frame can move focus to the hidden close button.
- **Fix:** update `seo-round3.test.ts:33-37` to the h2/h3 outline, and state that change in the PR. Undo the style-only rewrite of the Header script. It's unrelated to the redesign and weakens a tested guard.

**2. Price summary invents a plan label and reverses an existing pricing rule.**
- `rooms/[...slug].astro:77` always renders `標準方案・平日 NT$… 起`. Only `campsite_1` and `campsite_2` have `priceOptions`. The 3 cabins, 3 suites and `campsite_3` now show a "標準方案" (standard plan) they don't offer.
- The test at `room-detail-decision-ux.test.ts:17-18` still passes only because `平日 NT$1,200 起` is a substring of the new text.
- For campsites, `:30` switches the "起" (starting-from) price from the minimum (2,400) to the four-tent price (3,200). The old test explicitly required 2,400 and `not.toContain('NT$3,200 起')`. It was rewritten to fit the new code, not kept (`room-detail-decision-ux.test.ts:41-46`).
- Beside both plans the summary still shows `👥 16 人` (`:76`), but the 12-person limit of the three-tent plan isn't shown.
- The new check at `:46` (`summary-alternative` must not contain `16 人`) can never fail, so it tests nothing.
- **Fix:** only show the plan label when `standardOption` exists. Get the owner's sign-off before changing what "起" means, or restore the minimum-price rule. Show `option.numberOfPeople` next to each plan.

**3. Newly visible text is missing a glyph (鄉).**
- Both screenshots show `位於苗栗泰安 ，提供` with a gap. The desktop and mobile footers show `苗栗縣泰安` with the last character missing.
- The sources are `Banner.astro:21`, which displays `siteConfig.description` (previously only used in meta tags), and `Footer.astro:52`, which is new text on every page.
- AGENTS.md says to report or test glyph coverage when adding new Chinese text. Nothing in `tests/` does this.
- **Fix:** don't touch the font file. Remove or reword the new footer line, add a glyph-coverage test for all new strings, and report the gap to the owner.

**4. Home tiles are no longer clickable as a whole card.**
- The old `.tile h2 a::after { inset: 0 }` is gone. `Tiles.astro:78` now makes only the title text a ~44px link, so tapping the photo or description does nothing.
- This contradicts `DESIGN_GUIDE.md:28`, which says the link is the whole card's main interaction target.
- **Fix:** add `.tile-link::after { content: ''; position: absolute; inset: 0; }`. Keep the description in the normal page flow.

## P2

**Image alt text describes things not in the photos** (breaks `DESIGN_GUIDE.md:20`):
- `Tiles.astro:20`: the alt says "園區與山景" (park and mountain view), but the photo is a close-up of daylilies.
- `:22`: the alt says "服務與用品" (services and goods), but the photo is a drink on a terrace.
- `Banner.astro:34`: the alt says the campground sits in the view, but the photo is a sunset ridge. No campground is visible.

**Gallery accessibility got worse:**
- 34 of the 36 images share the same alt, "密式旅行圖集照片".
- Each link's `aria-label` (`開啟${alt}`) is built from that alt, giving 34 identical link names.
- **Fix:** use numbered labels such as `圖集照片 n / 36`.

**Approved wording was rewritten, and new marketing copy was added:**
- The gallery `h1` and page title changed from 密式圖集 to 密式旅行圖集. The breadcrumb (`galleries.astro:44`), header nav and tile still say 密式圖集.
- New copy was added, including 在山裡，留一晚給自己, 慢慢走進密式, the gallery intro sentence, "Before you book" and "01 / 06". The "01 / 06" counter suggests a slideshow that doesn't exist.
- All of this must be listed in the PR description.

**SEO and branding changes aren't disclosed:**
- The homepage `<title>` changed and no longer includes 小木屋 (`config.ts:8`).
- `siteConfig.title` changed from `Misstravel` to `密式旅行`. That also changes `og:site_name` (`Head.astro:112`), both feed titles (`feed.xml.ts:13`, `feed.json.ts:15`) and the footer.
- The comment at `config.ts:5` claims the split avoids affecting the footer and RSS. That's false.

**Header accessibility:**
- `Header.astro:34`: the button shows "Menu", but `aria-label` overrides its name to 開啟選單/關閉選單. Voice-control users saying "Menu" won't match, and changing the label duplicates `aria-expanded`.
- `:33`: a second `<nav>` holds only this button and is labelled mobile-only (行動版), but it also shows on desktop.
- `:23,45`: the path check uses `startsWith`. On `/infos/guide/` it marks both 關於密式 and 交通指南 as `aria-current="page"`.

**Small text:**
- Desktop nav is 10.4px at 768–1020px (`Header.astro:93`).
- Tile kicker 0.68rem (`Tiles.astro:75`), footer meta 0.7rem (`Footer.astro:70`), hero caption 0.72rem.
- Room-list prices drop from 0.85rem to 0.78rem (`changes.diff:2688-2692`). Prices are the main information on that card.

**Room detail:**
- The required-reading booking notice is now inside `<aside>` (`rooms/[...slug].astro:96-102`). That marks it as side content, and screen-reader users who skip landmarks may skip it. Use a `<section>` or `div`.
- The global `.red` color went from `red` to `#e9a29b`. That softens warnings on the pet/visitor policy pages (`infos/index`, `guide`, `sale_items`). It's a visual change only, but it should be disclosed.

**Review and scope issues:**
- `changes.diff` leaves out the new files: `docs/DESIGN_GUIDE.md`, `homepage-editorial.test.ts`, `room-design-system.test.ts` and `seo-gallery.test.ts`. They must be committed to the PR.
- Dependency upgrades are mixed into a design PR (`package.json`: astro, sharp, vitest, js-yaml). AGENTS.md asks to keep technical changes separate.
- The screenshots show the Astro dev toolbar, so they come from `astro dev`, not a built preview. They don't satisfy the "real preview" requirement.

## What I checked and found fine
- Booking, LINE, tel and mailto links are all kept.
- The price and policy lists are unchanged.
- The banner now sits inside `<main>`, so the skip link reaches it.
- Nothing is hidden by opacity when JavaScript is off.
- The 360px hero and footer fit without horizontal overflow.
- The blank tiles 04–06 in the screenshots are lazy loading, not broken code.

## Blocking findings
P1-1 (failing tests), P1-2 (price label and starting-price rule), P1-3 (missing 鄉 glyph) and P1-4 (tile click area).

**Confidence:**
- **High** for P1-1, P1-2 and P1-4. They follow directly from the code and tests.
- **Medium-high** for P1-3. The screenshots are low resolution and the font file isn't in the snapshot to inspect, but the same gap appears in two places on both screenshots.
- **Medium** for the alt-text findings, which rely on the downscaled screenshots.

This is an independent AI review, not a human approval.