# Delta closure review, PR #63, at `d2521f4e05210eb7cb2feb3be0667be87d260cc8`

**Verdict: PASS.** The one blocker from the first review is fixed, and I found no new blocker. This is an independent AI review of the snapshot, not human approval, a usability study or WCAG certification.

## Evidence
- **SHA:** `HEAD.txt`, `verify-reviewed.log:1` and `browser-reviewed.log:1` all show `d2521f4…`. The diff changes 7 files: 3 pages, `guest-pages.css`, 2 test files and the fixture. It changes no content markdown, prices, images or fonts.
- **Unit tests:** 0 vulnerabilities, `astro check` 0 errors, and 328 passed across 26 files. The count is unchanged because the new media check was added inside the existing content-hash tests.
- **Browser tests:** 35 passed on one worker, with no retries shown.

## Blocker 1 (booking/park-rule reading styles): closed
- **Source:** `guest-pages.css:84–93` adds styles for `blockquote`, `strong`, `pre`, `code`, `table/th/td` and alternate row shading. They use only existing tokens and are scoped to `.guest-content`. Tables scroll sideways inside their own box.
- **Browser test:** `guest-interface.spec.ts:51–62` checks the actual computed styles at 390 and 1440px: blockquote side rule 3px, `pre` padding 20px, header cell background `rgb(36,41,67)`, solid cell borders, bold text colour `rgb(217,185,140)`. It also checks the page has no sideways overflow. Tests 16–17 pass.
- **Captures:** in both `after/infos-account-1440.png` and `-390.png`:
  - The opening warning has its side rule and highlight back.
  - The bank details block has padding and a border.
  - The deduction table has borders, a styled header row and aligned percentages.
  - The closing bold lines are champagne-coloured.
  - At 390px the table fits without breaking the page.

## Recommended fixes
- **Card details for screen readers:** fixed.
  - The route hints (`guide.astro:19,25`) and the shop details and prices (`sale_items.astro:69–73`) are now linked with `aria-describedby`.
  - The button names stay the same: the browser test finds the buttons by exact name and checks their descriptions (test 18), and the unit test at `guest-interface.test.ts:40` still checks the labels.
- **Media hashes:** fixed. Each region's `img/iframe` `src`/`data-src`, `alt` and `title` values are now hashed (`guest-interface.test.ts:23–24`). The map, menu, video and set-menu dialogs, which contain no text, now have real hashes instead of the empty-array hash `4f53…`.
- **"查看原圖" link:** fixed. Its label is "查看原圖（另開視窗）" (`[...slug].astro:56`), which starts with the visible text and warns about the new window.
- **Meal summary:** confirmed. 家庭／經濟／精緻合菜 appears in the original `baseline-dist/infos/set-menu-info/index.html`, so it was not invented.
- **Other nits:** ↗ became → on the guide and shop cards, and the map and menu pages are now in the font-coverage test.

## Remaining limits (not blocking)
1. **Docs:** `changes.diff` contains no docs file, so I could not verify the claim that docs clarify the source scope.
2. **Axe:** all 50 states (25 per width) have zero violations. But 34 of 50 list `color-contrast` as *incomplete* (30 before), which is not a pass. `axe.json` also doesn't record a SHA.
3. **Unhashed images:** the `/infos/` spotlight photos sit in `.image`, outside the hashed `.content` region, so they are still unprotected. The announcements and 404 pages still have SEO hashes only.
4. **Fixture baseline:** the new media hashes come from the current build. They catch future changes but don't prove the images match earlier builds. This delta doesn't touch any media.
5. **Bank details colour:** the block is charcoal, not the navy token. An inline background colour from the markdown code highlighter (`astro-code github-dark`) overrides the CSS. The original page had the same thing, so it isn't a regression.
6. **Table layout:** the table uses `display:block`, as the original did.
   - At 1440px the outer border spans the full width but the cells fill only about half of it.
   - Some screen readers may not announce it as a table.
7. **Set-menu cards:** `set-menu-info.astro` isn't in the diff or the snapshot. I couldn't confirm whether its cards also have details that screen readers skip (first review, finding 2).
8. **Test depth:** only one guide button and one shop button are checked for descriptions. The arrow → still renders in a fallback font. I didn't check why account and roles share the same media hash.
