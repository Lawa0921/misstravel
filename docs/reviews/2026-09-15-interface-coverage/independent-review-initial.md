Review is finished. The result is **NEEDS CHANGES**, driven by one Medium-severity visual regression.

*This is an independent AI code review, limited to the snapshot and saved evidence (Read/Glob/Grep only, no commands). It is not a human sign-off and not a usability or WCAG certification.*

## Evidence checked
- **Source and unit tests:** the SHA in `HEAD.txt` (`0ce6c77…`) matches the first line of `verify-final.log`. That log shows `found 0 vulnerabilities`, `astro check` 0 errors, and **328 passed** across 26 test files.
- **Browser tests:** `browser-tests.log` shows **32 passed** with no retries. They cover all 13 pages at 360/390/768/1440, every dialog at 390/1440, and a no-JS test.
- **axe:** `axe.json` has **50 states** (25 per width, 12 dialogs) and zero violations. But 30 of the 50 states list `color-contrast` as *incomplete*, which is not a pass. My own contrast checks of the colour tokens came out at about 6–8:1, which is plausible, but the flagged elements aren't named.
- **Captures:** the blank photos in the `/infos/` spotlights (cards 3–8) appear in **both** the before and after captures. That looks like lazy-loading in the capture tool, not a regression, but it means the captures don't prove those photos render.

## Findings

**1. Medium: the booking/refund and park-rules pages lost their reading styles.**
- **Cause:** the change deletes the scoped style block in `infos/[...slug].astro` (changes.diff:494–736). The new shared rules (`guest-pages.css:18–34`) have no replacement for tables, blockquotes, code blocks or bold text, and `global.css` has none either.
- **Visible result** (after/infos-account-1440.png and -390.png, after/infos-roles-1440.png):
  - The deposit-deduction table (`account.md:65–73`) is now a plain grid with no borders or header row styling.
  - The bank-transfer details block (`account.md:38–43`) is a flat dark strip with the text pressed against its edge.
  - The opening warnings (`account.md:11`, `roles.md:11`) lost their side rule and highlight.
  - The closing bold lines (`account.md:75–76`) lost their colour emphasis.
- **Impact:** no text is lost and the content hashes pass. But the most important operating page is now the kind of "primitive" screen the user complained about, and it breaks the new DESIGN_GUIDE rule about clear long-form reading areas.
- **Fix:** add `.guest-content` styles for `table/th/td`, `blockquote`, `pre`, `code` and `strong` using the theme tokens, with sideways scrolling for the table on mobile. Add a computed-style check to the browser tests.

**2. Low: card labels hide the new card details from screen readers.**
- The cards set `aria-label` to the title only (`guide.astro:19,25`, `sale_items.astro:69`, `set-menu-info.astro:29`). That label replaces everything inside the button for assistive technology.
- As a result, the shop prices and the route hint "(較建議路段)" are visible but never announced.
- **Fix:** remove the `aria-label` (the decorative parts are already `aria-hidden`) or use `aria-describedby`, and update the matching test (`guest-interface.test.ts:34`).

**3. Low: one card summary doesn't come from its own dialog or data.**
- `sale_items.astro:49` shows "家庭合菜、經濟合菜、精緻合菜", which isn't in dialog `sale_item_6` or the page's product data; it comes from the set-menu page.
- The text is accurate, but it contradicts the claim that summaries only reuse that page's dialog/data content.
- The prices are correct: 200/300/400 元／次 match `sale_items.astro:88,113,142`.

**4. Low: the content hashes don't protect image-only content.**
- The fixture's text hash for the set-menu dialogs, map, menu and video is the hash of an empty string (`e3b0c442…`, fixture lines 2541, 2553, 2577–2589, 2607). Those regions contain only images or an embedded video.
- So the price alt text ("$2,200/$3,800/$4,200", e.g. `set-menu-info.astro:75`) and the image and video sources are not locked. The announcement list and 404 page have SEO hashes only.
- This diff doesn't change them, so nothing has regressed. **Fix:** also hash each region's `img[src,alt]` and `iframe[src]` values.

**5. Nits**
- The "查看原圖" link opens a new tab with no warning (`[...slug].astro:56`).
- The ↗ arrow is used for internal links and dialog triggers (`GuestNavigation.astro:18`), although it usually signals an external link.
- The font does not include ↗ or →, so these decorative arrows render in a fallback font.
- The font-coverage test skips the map and menu pages.

## Checked and fine
- **Dialogs:** focus, keyboard trapping, Escape, focus return, `aria-hidden` and scroll lock all come from the unchanged `interaction-accessibility.js`. The page scripts are unchanged. The new dialog styles have no transitions, so the reduced-motion test runs the same code path as normal use. The close button is 44px and its header stays visible while scrolling.
- **No-JS:** `GuestNavigation.astro:24–33` expands the dialogs, and the guide dialogs include `<noscript>` image fallbacks.
- **CSS leaks:** none. The new selectors are prefixed and only guest pages import the file.
- **Tests not weakened:**
  - The four-character about-nav test (`booking-flow-integrity.test.ts:116–127`) is unchanged, and the new directory numbers use pseudo-content so the label text stays the same.
  - The `鄉`/`閱` font exceptions match the existing `global.css:10–13` exclusion.
  - SEO hashes cover title, meta, canonical and structured data.

## Verdict: NEEDS CHANGES
Fix finding 1 to pass. Findings 2–4 are recommended but should not block the merge.
