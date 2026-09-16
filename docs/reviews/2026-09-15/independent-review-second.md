# Independent re-review: PR #63 at HEAD `c98f831`

**Verdict: needs changes (one small fix).** All four previous P1 blockers are fixed in the code. One issue is left: the coordinator response says the `aria-current` bug was fixed, but the code still has it. It's a P2 with a one-line fix. Once it's fixed I see no other blocking defects.

## Previous P1 blockers

**1. Menu focus guard, including reduced motion: resolved**
- **Guard restored:** the focus callback checks the menu is still open before moving focus (`Header.astro:140`). It retries once per frame, at most 30 frames, and stops as soon as focus is on the close button (`:144-146`). Opening then closing quickly can't pull focus back.
- **Old tests pass unchanged:** `closeMenu` returns focus to the Menu button (`:128-135`). The Tab trap still uses `menu.contains(activeElement)` (`:194`), so the old checks in `technical-hardening.test.ts:86-97` pass without edits.
- **Reduced motion is covered by a real browser test:** `interaction.spec.ts:249-260` runs with reduced motion on: Enter, close button focused, Escape, focus back on Menu. It passed in `e2e-exact-head.log:20`, which ran 13 of 13.
- **Gap (not blocking):** no test fails if the "menu still open" check inside the callback is removed. The static test only checks function names, and no browser test does open-then-close within one frame.

**2. Minimum price and 12- vs 16-person plans: resolved**
- **Plans sorted by price:** the plans are sorted cheapest first (`[...slug].astro:28-29`).
- **Each plan shows its own facts:** label, its own people limit and its own weekday price (`:76-80`). Campsites therefore show 三帳包區・12 人以下, NT$2,400 first, then 四帳・16 人以下, NT$3,200.
- **No invented plan name:** rooms without price options show the room's people count and minimum price, with no plan label (`:81-85`).
- **Data matches:** the values match `campsite_1.md:12-24` and `campsite_2.md:12-24`.
- **Tests now check real things:**
  - The 2,400 minimum is required again (`room-detail-decision-ux.test.ts:16`).
  - Rooms without plans must not show 標準方案 (`:41-44`).
  - Each plan's price and people limit are checked, plus the order (`:46-55`). The `not.toContain('16 人')` check can now actually fail, because that plan shows 12.

**3. The two empty glyphs, fixed in CSS without touching the font: resolved**
- **CSS rule:** `global.css:13` is `unicode-range: U+0000-9108, U+910A-95B0, U+95B2-10FFFF`. It drops exactly 鄉 (U+9109) and 閱 (U+95B1) from the font, so the existing `sans-serif` fallback (`:27-28`) draws them.
- **Fixture:** `emptyCjkCodepoints` is `[37129, 38321]` (`setofont-coverage.json:1085-1088`). Those equal 0x9109 and 0x95B1, and neither appears in the supported list. Its sha256 matches `protected-source-hashes.json:19`.
- **Test:** checks the font's byte hash, the exact two exclusions and the CSS string (`editorial-font-coverage.test.ts:12-20`). It passed, 7 of 7, per `verify-final.log:149`. I didn't compute the hash myself.
- **Font file untouched:** `changes.diff` touches no `public/` or `src/content/` files.
- **Screenshots:** in the current `home-1440.png` the hero reads 位於苗栗泰安，提供 with no gap. In `rooms-suite_1-390.png` the notice's 詳閱 renders, which shows the fallback working.
- **Minor:** `Banner.astro:21` still rewrites 泰安鄉 as 泰安. That's allowed editorial copy, but the CSS fix makes it unnecessary.

**4. Whole photo tile clickable: resolved**
- **Stretched link:** `.tile` is positioned (`Tiles.astro:59`), and the title link's overlay covers the whole card (`:79`).
- **Nothing covers it:** the only extra overlay in `motion-effects.css` applies to room images and gallery links, not tiles. The document click handler (`interaction-accessibility.js:87-104`) only reacts to modal and lightbox triggers.
- **Tested:** the visitor script clicks the photo area, 50px from the card's top (`changes.diff:3674`). It passes at 1440, 390 and 360 (`visitor-exact-head.log:222,309,351`).

## Other items

- **Exact `aria-current` links: not resolved (P2).** `Header.astro:23` still uses `currentPath.startsWith(href)`.
  - On `/infos/guide/`, the full menu (`:41-48`) marks both 關於密式 (`/infos/`) and 交通指南 as the current page.
  - All `/infos/*` pages mark 關於密式, and room detail pages mark 房型展示.
  - The only test (`homepage-editorial.test.ts:54`) checks the desktop nav on `/`, so it can't catch this.
  - The response's "uses exact pathname" claim is false. **Fix:** `currentPath === href`, plus a test on `infos/guide/index.html` expecting exactly one `#menu [aria-current="page"]`.
- **Image metadata: resolved.**
  - The 36 gallery descriptions are distinct and reused for the alt text, link labels and ImageGallery schema (`galleries.astro:7-65`), and a test enforces that (`seo-gallery.test.ts:162`).
  - The tile and banner alts no longer describe things the photos don't show (`Tiles.astro:20,22`; `Banner.astro:34`).
  - I didn't recheck the 36 descriptions against the photos.
- **Semantics: resolved.**
  - The booking notice is now a `<section>` (`[...slug].astro:102`).
  - The Menu button's name includes "Menu" (`Header.astro:34`).
  - The button's wrapper is a `div`, not a second `nav`.
  - Room list headings are h2 for categories and h3 for cards, and the old test was updated openly (`seo-round3.test.ts:33-37`).
- **Small prices: mostly resolved.**
  - Room-list prices went from 0.85rem to 0.9rem (`rooms/index.astro:358`), and the room summary is 0.9rem.
  - Desktop nav at ≤1020px is now 0.8125rem.
  - One regression: related-room card prices shrank from 0.9rem to 0.8rem (`[...slug].astro:634`).
- **SEO and booking: no regressions found.**
  - `siteConfig.title` is back to `Misstravel`, so the footer, RSS and og:site_name are unaffected (`config.ts:6`), and the homepage title includes 小木屋.
  - Booking, LINE, tel and mailto links are all present.
  - The visitor report for HEAD c98f passed 419 of 419 checks. It compared the room policy text and guest info pages against production and found them identical.
- **Protected boundary: confirmed.**
  - The diff edits no room or info content, images or the font file.
  - Changed visible copy and layout (hero, tiles, footer, notice panel, gallery intro) is listed in `DESIGN_GUIDE.md:252-256`. That is authorized design work, not a violation.
  - Changing the global `.red` color and the inline red override on info pages is a visual-only change and is disclosed.

## Evidence limits
- **Tests:** `verify-final.log` shows 24 files and 228 tests passing with 0 audit findings, but it doesn't print a HEAD. The test files it lists match this snapshot.
- **Axe:** `axe-report.json` (05:00Z) has no HEAD field, so I'm relying on the coordinator's say-so that it matches this HEAD. It shows 0 violations, and some routes (e.g. `/` at 390px) have an unreviewed "incomplete" result.
- **Visitor checks:** `visitor-exact-head.log` stops at line 360. The report used is `acceptance-final/report.json`, which records HEAD c98f and 0 failures.
- **Built pages:** `dist/` isn't in the snapshot, so the `aria-current` finding comes from reading the source, not built HTML.
- **Screenshots:** I only used `acceptance-final/`.

## Nonblocking future improvements
- **Related-room cards:** they show `weekdayPrice 起` (`[...slug].astro:225`). For campsites that's NT$3,200, not the NT$2,400 minimum. The text predates this PR, but it's now inconsistent with the summary above it. They should also go back to ≥0.875rem.
- **Menu button name:** it stays "Menu 開啟選單" even while the menu is open. Consider a name that doesn't say "open".
- **Room summary label:** `aria-label` on the plain `div.room-summary` (`[...slug].astro:72`) is ignored by screen readers. Add a role or remove it.
- **Small labels:** the tile kicker (0.68rem) and summary kicker (0.68rem) are still very small.
- **Gallery title:** the page `<title>` is 密式旅行圖集 while the h1 and breadcrumb say 密式圖集.

This is an independent AI code review, not a human approval or a usability study.