## Verdict: **NEEDS_CHANGES** (one blocker, cheap remedy; fix #2 is clean)

Independent AI static review of the delta only. I read files; I ran nothing. All pass/fail statements about execution come from the logs you supplied.

---

## What the supplied evidence actually shows

- `verify-final.log` — audit + `astro check` + `tsc` + **vitest 340/340 pass**, including `tests/guest-media-dimensions.test.ts` (2 tests). **No Playwright output at all.**
- `regression-red.log` — pre-fix RED for `homepage-overflow.spec.ts` at 1440: `{"maximum":4,"left":4,"rootOverflow":"visible","bodyOverflow":"visible"}`.
- `image-stability-red.log` — pre-fix RED: menu Δ247.84px, map Δ27.67px at 390px.
- `screenshot-metrics.json` — resting-state only (390/932/1440, scroll==client==body). Not evidence for the tilt case; the bug only appears under pointer/focus.

So: **fix #2 is green in supplied evidence; fix #1 has no green browser evidence yet** (you said the exact-source E2E is still running).

---

## Blocker

**B1 — The whole first fix rests on an unhardened cascade tie against the shared stylesheet.**
`astro-site/src/components/Tiles.astro:61` sets `.tile { transform: none; transform-style: flat; ... }`, which must beat `astro-site/src/styles/motion-effects.css:60-66`:

```css
@media (hover: hover) and (pointer: fine) {
  [data-motion-card] { transform: perspective(1100px) translate3d(...) rotateX(var(--motion-rotate-x)) rotateY(var(--motion-rotate-y)); transform-style: preserve-3d; }
}
```

`[data-motion-card]` is (0,1,0). The scoped `.tile` is (0,2,0) only under Astro's `scopedStyleStrategy: 'attribute'`; under `'where'` it is (0,1,0) — a dead tie decided solely by bundle/link emission order between a global stylesheet and a component style. The snapshot contains no `astro.config.*`, no layout, and no built CSS, so I cannot confirm which applies, and no supplied green browser run demonstrates the override taking effect. Media queries contribute nothing to specificity, so there is no other tie-break.

Remedy (one line, deterministic, no `!important`, no behavior change), `Tiles.astro:61`:

```css
.tile[data-motion-card] { transform: none; transform-style: flat; ... }
```

`data-motion-card` is already on the element (`Tiles.astro:38`). Alternatively, resolve by producing the green `homepage-overflow.spec.ts` run plus the config showing `'attribute'` scoping — but the selector bump removes the dependency permanently and survives future bundling/import-order changes.

---

## What I verified as correct (fix #1)

- **Root cause matches the repro.** Tile half-width at 1440 is 240px (12-col grid, `span 4`). With `rotateY` ±3° and `rotateX` ±2.5° (`motion-effects.js:55-56`) at `perspective(1100px)`, the near corner projects to ≈245px — ~4-5px past the viewport edge, exactly the measured 4px. Removing the card transform removes the cause; nothing is being masked.
- **No blanket clipping, no scrollbar hiding.** The delta adds no `overflow-x`/`scrollbar-width`/`::-webkit-scrollbar` anywhere, and `homepage-overflow.spec.ts:20-21` actively forbids `hidden|clip` on root/body. The `state.left` assertion (real `scrollTo({left:100, behavior:'instant'})`, then read `scrollX`) would also catch a scrollbar-hiding "fix", and correctly uses `instant` to defeat `html { scroll-behavior: smooth }` (`global.css:43`) — without that the read would falsely pass.
- **Perspective is genuinely confined.** `.tile-image` is `position:absolute; inset:0` whose containing block is `.tile` (`position:relative`, `overflow:hidden`) — clipped. `isolation:isolate` is retained, so the `z-index:-3` image still paints inside the tile's stacking context.
- **No edge gap from the tilt.** `scale(1.06)` vs perspective shrink: coverage holds while `1.06·cos3° ≥ 1 + w·sin3°/1100`, i.e. tile width up to ≈2460px (viewport ≈7380px). Safe at every real breakpoint.
- **Reduced motion is double-guarded**: `motion-effects.css:83-91` (`transform:none !important` on the card) plus `Tiles.astro:109-112`, which is ordered after the new hover block and wins the tie. The new block is itself gated on `prefers-reduced-motion: no-preference` (`Tiles.astro:86`).
- **Keyboard focus and full-card link intact.** `.tile-link::after { inset:0; z-index:3 }` is unchanged and still resolves against `.tile`; both focus-visible outlines (`Tiles.astro:82-83`) are untouched. On keyboard focus the vars sit at their `0deg` defaults (`motion-effects.css:7-8`), so focus produces a zoom, not a tilt.
- **Local horizontal scroll regions untouched.** No global rule changed; `.guest-content pre { overflow-x:auto }` (`guest-pages.css:87`) and the compare/thumbnail regions are outside the delta.

## What I verified as correct (fix #2)

- Only the `width`/`height` attributes changed (`menu.md:12`, `map.md:12`). Text, `src`, `alt`, `loading`, `decoding`, inline style, front-matter metaTitle/description/keywords/image are byte-identical; no price, font, or image binary appears in the delta.
- Values match the real files: `guest-media-dimensions.test.ts` compares the built HTML against `sharp(...).metadata()` of the actual `public/images/*.webp` and passed in `verify-final.log:151`. Corroborated independently by the pre-existing `Tiles.astro:23` entry (`map.webp` 2000×1500).
- **Post-load rendered size is unchanged**, which is the key non-regression: `.guest-content img { max-width:100%; height:auto }` (`guest-pages.css:30`) caps the presentational `width` hint. The widest content column is ≈927px (`.guest-wrap` = min(100% − 3rem, 72rem), minus 12rem sidebar/gap/padding) — always below both 1077 and 2000, so the hint was capped before and after. Red-log numbers reconcile exactly: map 332×800/1200 = 221.33 → 332×1500/2000 = 249 (Δ27.67); menu 332×1522/1077 = 469.17 (Δ247.84).
- The E2E measures real loading, not forced styles: it gates the network request, asserts `naturalWidth === 0` before measuring, then releases and `decode()`s (`guest-image-stability.spec.ts:13-20`). That `naturalWidth === 0` assertion is what makes the "before" box trustworthy.

---

## Non-blocking cautions (should-fix, in priority order)

1. **Pointer-out/settle transient untested.** The PR's own acceptance text (`docs/DESIGN_GUIDE.md`, "移入／移出") is not covered: the loop only moves within tiles and never off the last one (`homepage-overflow.spec.ts:33-41`). Add one `page.mouse.move(box.x + box.width/2, box.y - 40)` + `unscrollablePage(page)` after the loop.
2. **Sampling window shorter than the longest transition.** 18 rAF ≈ 300ms (`homepage-overflow.spec.ts:6-9`) vs `.tile-image` `transform 0.6s` (`Tiles.astro:64`). Harmless today (the image is clipped, the card is static) but it will under-sample a future regression. ~40 frames would cover it.
3. **No fallback on the custom properties.** `var(--motion-rotate-x)` / `-y` (`Tiles.astro:89`) have no fallback; if `motion-effects.css` is ever not loaded on a page, the whole `transform` declaration becomes invalid-at-computed-value and the hover zoom silently disappears. Use `var(--motion-rotate-x, 0deg)`.
4. **Stationarity is only proxied by computed transform**, and only on `cards.last()` (`homepage-overflow.spec.ts:44-46`). Your requirement is that the hit box and text stay put; a positional assertion (`.tile-content` / `.tile-link` bounding box identical before vs during hover) would test the actual contract.
5. **Scope limited to `.tile`.** Every other `[data-motion-card]` and `[data-motion-scene]` still receives the shared tilt/parallax, and the new test only hovers `#tiles .tile`. If any other full-bleed motion element exists on the homepage, this delta does not cover it. Those components are not in the snapshot, so I could not check.
6. **Breakpoint 767** (exact `max-width:767px` boundary, `Tiles.astro:98`) is absent from the width list; 390 and 768 exercise both branches, so risk is low.
7. **Behavior change worth design signoff:** `--motion-lift: -8px` is now inert for tiles while the hover `box-shadow` (`motion-effects.css:70-74`) remains — cards keep a shadow but no longer lift. This is consistent with the new doc text; box-shadow is ink overflow and cannot scroll the document.
8. Test runtime: ~19 sampling calls × ~300ms per width sits under the 30s default but leaves little headroom on a slow dev server.

---

**Bottom line:** fix #2 is complete and evidenced. Fix #1 is the right shape — it keeps the full-bleed card frame, text and hit box stationary and confines the perspective to the already-clipped child image, with no page-level clipping and no scrollbar masking — but merge should wait on B1 (one-line specificity bump) plus the green `homepage-overflow.spec.ts` run you have in flight. This is a static AI review, not human signoff and not any SEO-ranking assurance.
