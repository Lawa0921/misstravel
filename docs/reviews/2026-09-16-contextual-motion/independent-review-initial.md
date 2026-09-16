I've read everything I need, including both filmstrips, the reveal script and two main photos, so I'm writing up the review now. No further requests are needed.

# Review: new page-transition motion — **NEEDS CHANGES** (small fixes; no design rethink needed)

This is an independent AI review based only on reading the files. It is not a human design sign-off or an accessibility certification. I haven't seen any test results, so nothing here says the tests pass.

## Design, judged from the filmstrips

**What works**
- **Opening a room looks right.** At both widths the photo starts exactly where the card was. At 1440 it moves to the carousel over about 2 frames; at 390 over about 3. It goes under the fixed header. Old and new page text never overlap, because the old page is hidden (`motion-effects.css:106`). None of the rejected slide or blur remains.
- **The photo hand-off matches.** `campsite_1_main.webp` (945×709) and `log_cabin_2_main.webp` (1008×756) are both 4:3. The detail page shows them uncropped and the list crops them from the centre (`index.astro:292-296`, `[...slug].astro:416-421`). So the new image covers the old one with the same framing, with no letterbox gap for the old photo to show through. I didn't check the suite or `log_cabin_1` photos.

**Polish (optional)**
1. **Empty carousel during the move.** At 390px (row 2, column 4) the carousel box sits empty on screen, arrow buttons included, while the photo is still on its way. It lasts about one frame. You could hide `.carousel-btn` and `.carousel-dots` for the duration of the transition.
2. **Corners snap.** The moving photo has a fixed 12px radius (`motion-effects.css:119`). The list image starts with square corners (`index.astro:285-290`) and the carousel ends at 16px on top only (`[...slug].astro:395`). The corners jump at the start and end. Making the radius animate, or matching it, would remove that.
3. **The 0.86→1 settle (`:144-147`) may read as a quick dim-flicker** rather than motion. Please look at a dedicated frame capture before keeping it; otherwise a plain instant swap is the honest alternative.
4. **Skipped returns hard-cut** (`page-transitions.js:94`), while every other page change uses the settle. Hard-cutting is safer than a mismatched move, but the look is inconsistent.

## Blockers

**B1 — The "no second reveal" promise can break (likely; not seen in the filmstrips).**
- The reveal script only sets `data-motion='ready'` once the page has finished loading (`baseline-dist/assets/motion-effects.BYmScpGR.js:9`).
- If that happens before `pagereveal`, the size check at `page-transitions.js:80` makes the browser register the cards as invisible and blurred. The next line then marks them `data-route-ready`.
- The cards' existing 0.75s opacity/blur transitions (`motion-effects.css:10-12`) would then play from invisible to visible. That is exactly the staggered blur reveal the change is meant to remove. `!important` at `:140` doesn't stop it, because a running transition takes priority over it.
- **Fix:** give `[data-route-ready]` a `transition` that lists only `transform` and `box-shadow`.
- Also, when the browser restores the scroll position late on Back, `:79-85` marks the cards at the top of the page. The cards the user actually lands on still blur in.

**B2 — The Back animation and its cleanup aren't really tested.**
- `contextual-navigation.spec.ts:13` copies the script's own visibility check (`page-transitions.js:16-26`), and `:79-86` branches on it. If the Back animation never ran (for example, the early image load broke), both would agree and the test would still pass. Nothing requires even one Back animation to actually happen.
- `:88` expects exactly one eager image after Back. That can only happen if the list page was reloaded; a page restored from Chrome's back/forward cache never re-runs the script. So either the cache isn't used in the tests, or this line fails when it is.
- That cache restore is the common path in real Chrome. It is also the path where leftover `view-transition-name`s matter. If the cleanup at `page-transitions.js:32-37` ever failed, a later ordinary link from the list would show the old photo sitting above the new page for 300ms (`:120`, z-index 2). It would also force a hard cut when opening a different card, because two elements would share the name.
- The cleanup follows Chrome's documented pattern, but nothing verifies it.
- **Fix:**
  - Add one Back test that must animate (e.g. `campsite_1` at 1440, list at the top).
  - Add one test that checks whether the page came from the cache (`pageshow.persisted`) and asserts there are no leftover names and a clean next navigation.
  - Make `:88` depend on whether the page was restored from the cache.

## Checked with no blocker found
- **sessionStorage:** it stores only the two paths, the photo URL and a timestamp (`page-transitions.js:69-70`). It is cleared on every page change (`:58`), removed when read (`:28`), and expires after 5s. The stored values are only compared, never put into the page. Storage failures are caught (`:56`, `:71`), and the blocked-storage test covers this (`spec:95-100`). No personal data is stored.
- **Early head script** (`Head.astro:143`) is small, built from a fixed file, and doesn't intercept clicks, fetch, add delays or touch history. The early observer (`:41-56`) disconnects once it finds the image or when the page finishes loading, so it doesn't run forever.
  - Minor: it doesn't check that the navigation was actually Back. A header link from a room to the list also loads that one image early (`:43-45`); it costs one cached image.
- **No duplicate names within a page:** only one image per page is named, and hidden carousel slides are excluded (`:18`).
- **Reduced motion:** turned off in CSS (`motion-effects.css:149-155`) and in the script (`:7`, `:60`, `:77`).
- **JavaScript off:** content stays visible, because `data-motion` is only ever set by the script. The CSS-only settle still runs, and no photo is named.

## Gaps in what I could check
- **Filmstrips:**
  - Both show only opening `campsite_1`. No frames cover an ordinary link (the part the user rejected), Back, a skipped Back, or a carousel moved to another slide.
  - At 12fps each frame is about 83ms, so the 120ms hand-off and the 140ms settle get only 1–2 frames each.
- **No test for the "different carousel slide" fallback.**
- **Security headers:** I found no header config in the review folder. I can't confirm whether a policy would block the new inline script (`AGENTS.md:24` asks to preserve security headers).
- **Test results:** still pending. Whether all 10 rooms animate at 390px depends on those logs (`spec:73-76`).
