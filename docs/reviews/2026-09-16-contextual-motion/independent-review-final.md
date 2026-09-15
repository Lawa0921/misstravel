# PR #63 final review at `3971d352`: **PASS** on B1 and B2, with no new blocking issues

This is an independent AI review based only on reading the files. It is not human design approval, and nobody has approved the new look yet. I read everything in `review-closure/` and the three filmstrips; I ran nothing.

## B1: no replayed opacity or blur (PASS)

- **Every card is marked.** `page-transitions.js:87-90` now marks all `[data-reveal]` cards on each navigation with a transition, wherever they sit on the page. Cards the browser scrolls to late on Back are covered too.
- **The CSS wins.** `html [data-route-ready][data-reveal]` (`motion-effects.css:140-147`) outranks the base card rule. It fixes opacity at 1 and filter at none, and only animates `transform` and `box-shadow`. So a running transition can no longer override the `!important` value.
- **The tests check the real result.**
  - `spec:123-132` checks every card on the page for the marker, `transition-property: transform, box-shadow`, `opacity: 1` and `filter: none`.
  - `spec:28` checks opacity and filter again at the moment the transition is ready.
- **A direct page load is unchanged.** Marking only happens when a page transition exists (`:84`), so the normal scroll reveal still runs on a fresh load.
- **Limits of what I could check:**
  - The "late-return" test gets there with a normal link, not a real late scroll on Back. It still covers the logic, because marking no longer depends on where the card is.
  - The room list page's own styles weren't in the folder, so I haven't compared their rules directly. The computed-style test is what proves the final values.

## B2: Back and back/forward cache coverage (PASS)

- **Back must animate.** `spec:111-121` has no fallback branch. It requires `ready`, not skipped, the room-photo animation, and exactly one named photo. The final log shows it passed (#25).
- **A real cache restore is tested.** `spec:143-169` launches full Chromium without the flag that turns the cache off. It then:
  - waits for `pageshow` rather than a fresh load;
  - requires `persisted === true`, both from `pageshow` and in the state recorded when the page was revealed (`restored`);
  - requires one named photo, and no leftover names before the next link is clicked.
- **No false pass from stale data.** If the old page state were read by mistake, it would have `restored: false` and `ready: false`. So a timing slip could only make the test fail, never pass wrongly.
- **Leftover names are cleaned up.** Before this test clicks the next link, it checks that no element still carries a `view-transition-name`. That check alone shows nothing is left behind from the cache restore. The WeakMap generation check (`page-transitions.js:32-43`) stops an old callback from clearing a newer name.
- **The changed-carousel-slide fallback now has a test** (`spec:134-141`).
- **Logs:**
  - `browser-final-reviewed.log` names the SHA and `--retries=0`, and shows 96/96 passed.
  - `verify-final-reviewed.log` has the same SHA: 0 vulnerabilities, 0 errors from `astro check`, 328/328 passed.
  - The two diagnosis logs are failed runs (a `goBack` timeout, and `BackForwardCacheDisabledForDelegate`). I did not count them as evidence. `review-blockers-green.log` has no SHA, and the final log replaces it.

## Test gaps (not blocking, worth tightening)

1. **The "no lingering image layer" check after the cache restore is weak.** `spec:167` looks for `room-photo` in the next page's animation names. A leftover photo that only exists on the old page gets no group animation, and its old-image animation is set to `none`. So that check would pass even if a name had leaked. The real protection is the check just before the click (`spec:164`), which is enough. Checking the computed `::view-transition-group(room-photo)` during the next navigation would make it airtight.
2. **"Matched Back photo" only checks the count.** `spec:120` and `spec:163` assert `toHaveLength(1)`, not that the source equals the card's image URL. The script only names the photo when the source matches, but the test doesn't prove it independently. Comparing against `imageURL`, as `spec:81` already does, is a small fix.
3. **One test branch never runs.** `spec:89` sets `back.restored?0:1`, but its `0` side can't happen in the default headless run.

## Security headers

`vercel.json` has `script-src 'self' 'unsafe-inline' …`. That lets the inline `<script is:inline set:html>` (`Head.astro:143`) run. Setting `style.viewTransitionName` from the script isn't restricted by this policy. It works as configured. If the policy is ever tightened to nonces or hashes, this script will need its own hash.

## Filmstrips (normal speed, checked at thumbnail resolution only)

- **Ordinary link:** the old page stays until the new one arrives, then is replaced in one step, with no text ghosting. The first new frame shows empty image boxes while photos load.
- **Back at 1440:** starts with the photo already travelling back into its card, done in about 3 frames. The later frames are the scripted scroll, not animation. In the first frame both cards' image boxes are briefly empty, including the neighbouring card.
- **390:** the photo grows into the carousel with the arrow buttons already showing, and shrinks back into an empty card box on return. No text ghosting.

These frames can't confirm the 1–2 frame details, like how the 0.86→1 settle looks.

## Optional polish (not blocking)

Unchanged from the prior review:
- Empty image boxes on arrival (list cards and carousel).
- Carousel arrows showing while the photo moves.
- Corners snapping between square, 12px and 16px.
- Whether the 0.86→1 settle reads as a dim flicker.
- The hard cut when Back skips the animation.
