# PR #63 closure review: final PASS at `ed0764d51e0f96fa10d1e1bedd7971291f52d391`

**Verdict: PASS.** The one remaining fix from the second review (exact `aria-current`) is really fixed, and a test now proves it. None of the four changes in `closure.diff` adds a blocker.

The second review is unchanged. It still says "needs changes" for `c98f831`, which was correct for that commit. This PASS covers only `ed0764d`.

## 1. Exact `aria-current`: fixed

- **The fix:** `Header.astro:23` now reads `!external && currentPath === href`. It is the exact one-line fix the second review asked for, with no `startsWith` left. The desktop nav (`:30`) and the full menu (`:45`) both use it.
- **Red log, before the fix:** the new tests failed where the review said they would.
  - `infos/guide/index.html` found 2 current links in `#menu` instead of 1 (the parent and the guide).
  - `rooms/suite_1/index.html` found 1 current link instead of 0 (房型展示 wrongly marked).
  - The failing lines (68:21 and 75:46) match the committed test file, so the red run used the same tests that were committed.
  - The other 7 tests passed in that run. That shows the built paths already end in `/`, so an exact match works on the built HTML.
- **Green log, after the fix:** `homepage-editorial.test.ts` passes 9 of 9.
- **The tests can fail for the right reasons:**
  - Going back to `startsWith` breaks the guide and room-detail tests, as the red log shows.
  - If nothing were ever marked current, the four "exactly one" tests and the existing homepage desktop test (`:54`) would fail.
- **Accepted trade-off (not blocking):** `/infos/*` subpages and room detail pages now mark no nav item. That is correct for `aria-current="page"`. Marking a parent section would need a separate value such as `"true"`, which is optional.

## 2. The three small nonblocking fixes: all correct

| Change | Assessment |
|---|---|
| Menu button name `Menu 開啟選單` → `Menu 選單` (`Header.astro:34`) | Correct. The name still contains the visible word "Menu", so voice users can say it. It no longer says "open" while the menu is open, and `aria-expanded` still reports whether it is open. |
| `role="region"` added to `div.room-summary` (`[...slug].astro:72`) | Correct. The label is now actually used. The page has one such region, so its name is unique, and it sits inside `main`. It adds one landmark per room page, which is acceptable. |
| `.related-price` 0.8rem → 0.9rem (`[...slug].astro:634`) | Correct. The size regression from the second review is undone. |

## 3. What the diff contains and what was verified

- **Diff size:** 24 lines added and 4 removed, as stated.
  - `Header.astro`: 2 lines changed.
  - `[...slug].astro`: 2 lines changed.
  - Test file: 20 lines added.
  - No content, image, font or `public/` files are touched.
- **Snapshot files match the diff:** the current `Header.astro`, `[...slug].astro` and test file all match the diff's new lines.
- **Full verify run at this commit:** `verify-reviewed-head.log` starts with `SOURCE_COMMIT=ed0764d…`, which matches `HEAD.txt`.
  - `npm audit`: 0 vulnerabilities.
  - `astro check`: 0 errors, 0 warnings, 6 hints (existing `is:inline` and unused-variable hints).
  - `tsc`: passes.
  - Build: 26 pages.
  - Tests: 24 files, 233 of 233 passing, up from 228. The 5 new tests are the 4 from `it.each` plus the room-detail test.
- **Cosmetic only:** the test file has an extra blank line at `:58-59`.

## 4. Evidence limits

- **Git history:** the snapshot isn't a git repo, so I couldn't confirm the diff's blob hashes (`c08e2d8→d11e977`, etc.) or that `ed0764d` is exactly `c98f831` plus this diff. I compared file contents only.
- **Browser checks not re-run:** the snapshot has no Playwright, axe or visitor-acceptance run at `ed0764d`. Those results are from `c98f831`.
  - The delta is small (two attributes, one CSS value), so it's low risk.
  - One thing to check: if `interaction.spec.ts` looks for the Menu button by the old name `開啟選單`, that test would now fail. I couldn't see that file. Please confirm CI end-to-end tests are green on `ed0764d` before merging.
- **Other tests:** the desktop-nav check in the new tests only requires "at most 1" current link, which is weak. The shared `isCurrent` and the "exactly one" menu checks make up for it.
- **Unchanged from the earlier reviews:**
  - No human usability study was done.
  - No claim is made about search rankings.
  - Axe showing 0 violations is not a full accessibility certification. Some routes had "incomplete" results nobody reviewed.
  - I didn't recheck the 36 gallery descriptions against the photos.
  - The earlier nonblocking items are still open:
    - Related cards show `weekdayPrice 起`, not the campsite minimum.
    - The 0.68rem kickers are very small.
    - The gallery page `<title>` doesn't match its h1.
    - `Banner.astro` rewrites 泰安鄉 as 泰安, which is no longer necessary.
    - No test checks the "menu still open" guard inside the focus callback.

**Final SHA reviewed:** `ed0764d51e0f96fa10d1e1bedd7971291f52d391`

This is an independent AI code review, not a GitHub human approval or a usability study.