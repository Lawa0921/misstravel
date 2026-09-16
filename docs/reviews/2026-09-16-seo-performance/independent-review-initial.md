## Verdict: **NOT PASS** — 2 P1 blockers (both in the viewer upgrade path), 5 P2s

Scope reviewed: source only, no build/test execution. The snapshot is partial (no `tsconfig`, `playwright.config`, `public/`, `.generated/`), so anything depending on those is called out as unverified, not as a defect.

---

## P1-1 — The already-loaded small source shrinks the fullscreen stage, then the photo jumps when the original arrives

**Proven from source.** `astro-site/src/components/PhotoViewer.astro:104` seeds the stage with the page thumbnail's bitmap:

```js
display(next,true,source.currentSrc);   // e.g. a ri-…-384.webp from the gallery grid
```

and `PhotoViewer.astro:54` assigns `image.src=src` with **no `srcset`/`sizes`** on the stage `<img>`. The stage style at `PhotoViewer.astro:172` is:

```css
.viewer-stage img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;…}
```

`width:auto/height:auto` overrides the `width="945" height="709"` presentational hints (`PhotoViewer.astro:16`), so the used box is the **currently loaded bitmap's natural size**. Gallery cards request `imageSizes.gallery` (≈266 CSS px at 1440, `src/lib/responsive-images.ts:12`) → `currentSrc` is the 384w derivative → the fullscreen stage paints at **384×288** inside a ~1200×750 stage, and the open flight (`PhotoViewer.astro:111` → `photoGeometry(image)`) lands on that small box. When `select()` completes and `display(target,false)` (`PhotoViewer.astro:71`) swaps in the original, the stage snaps to ~1000×750.

No test pins this: `tests/e2e/responsive-images.spec.ts:52-56` asserts only the `src` attribute transition, never geometry.

**Minimal fix** — size the stage from the *original's* dimensions, not from whichever bitmap is loaded:
1. `PhotoViewer.astro:5` — build the data block with dimensions: `const data=images.map(i=>{const a=thumbnailImage(i.src);return {...i,w:a.width,h:a.height};});` and use it at `:23` (`safeInlineJson(data)`), widening the script's type at `:32`.
2. `PhotoViewer.astro:54` in `display()`: `image.style.setProperty('--photo-w',`${images[target].w}px`);image.style.setProperty('--photo-h',`${images[target].h}px`);`
3. `PhotoViewer.astro:172`: `width:min(100%,var(--photo-w));height:auto;max-height:100%;aspect-ratio:var(--photo-w)/var(--photo-h);` (drop `width:auto;height:auto;max-width:100%`).

`resetZoom()` only removes `transform`, and `.is-zoomed` (`:182`) sets `width:180%` explicitly, so both states stay correct. Add an e2e assertion that `[data-viewer-image].getBoundingClientRect()` is unchanged across the gated upgrade in `responsive-images.spec.ts:42-59`.

---

## P1-2 — A slow original upgrade silently resets the user's zoom, pan and in-flight swipe

**Proven from source.** `open()` fires `void select(next,true)` (`PhotoViewer.astro:112`), which awaits the full original for up to 8 s (`select` at `:66-68`, `photo-ready.ts:9`). Nothing in that wait is keyed to zoom state: `toggleZoom` (`:141`) bumps `decoration`, not `token`. When the original resolves, `:71` calls `display(target,false)`, and `display` (`:54`) unconditionally calls `resetZoom()` (`:57`), which clears `is-zoomed`, resets `aria-pressed`, does `stage.scrollTo({left:0,top:0})` and removes the swipe `transform`. A user who zooms/pans while the original is still downloading has it undone under them.

Same race makes `tests/e2e/modern-interactions.spec.ts:55-56` (zoom click immediately after open) order-dependent on a fast local server — it is not a guard against this.

**Minimal fix** — do not reset the view when upgrading the *same* photo in place:
```js
// PhotoViewer.astro:53
function display(target, commit=true, src=images[target].src, keepView=false) {
  loading.hidden=true; if(!keepView)resetZoom(); image.hidden=false; …
}
// PhotoViewer.astro:71
display(target,false,images[target].src,opening);
```
`opening` is only true for `target === index === next`, so the failure path (`:81`) and all user-initiated selections keep resetting as today. Add a test: open, zoom while the original is route-gated, release, assert `is-zoomed` and `stage.scrollLeft` survive.

---

## P2

1. **Repeated `src`/`srcset` assignment on already-activated images.** `responsive-photo.ts:13` deletes `data-thumb-src` only; `data-src` persists, so `RoomCompare.astro:100` and `:104` re-activate every `sync()` (every toggle, removal and `pageshow` at `:153`), and `rooms/[...slug].astro:756-764` re-activates each time the carousel revisits a slide. Browsers abort `update the image data` when the selected source is unchanged, so this is wasted work rather than re-downloads — but it is avoidable. Fix: `if(!thumb)delete image.dataset.src;` in `responsive-photo.ts:13` (the `hasAttribute('src')` guard at `RoomCompare.astro:95` and the `dataset.src` guard at `rooms/[...slug].astro:758-759` remain correct).
2. **Non-atomic derivative writes.** `scripts/responsive-images.mjs:49` writes directly to the served path. A crashed build can leave a truncated file under `public/generated-images/`. It does self-heal — the content hash check at `:47-48` rejects it on the next run and `scripts/test-responsive-images.mjs:21-22` covers exactly this — so it cannot be shipped by a *successful* build. Still, write to `${target}.tmp-${process.pid}` + `rename` to remove the window entirely.
3. **EXIF-rotated / multi-page originals get pre-rotation dimensions.** `responsive-images.mjs:42` correctly skips derivatives when `orientation!==1` or `pages>1`, but still stores `meta.width/height` unswapped, and those become the `width`/`height` attributes via `responsive-images.ts:21`. A rotated JPEG would ship an inverted aspect ratio (CLS). No such source exists today — latent. Fix: in the same guard, swap for orientation 5–8, or `throw` to fail closed.
4. **Key-encoding mismatch between the two catalogs.** `responsive-images.ts:15` decodes (`decodeURIComponent`) while `image-metadata.ts:10` does not. A percent-encoded path would miss the metadata lookup at `responsive-images.ts:18`, `kind` becomes `undefined`, and the `!kind` branch at `:19` treats a diagram as a photo and downscales it. Fix: use `imageKey` + `decodeURIComponent` consistently in `image-metadata.ts:10`.
5. **Whole-directory generation.** `responsive-images.mjs:58` walks all of `public/images`, so favicons/`apple-touch-icon` and any unreferenced image also emit derivatives that ship in `dist`. Harmless but pure build bloat; restrict to sources actually resolved through the manifest consumers, or skip files under a size/dimension floor.

---

## Verified sound (no action)

- **Path/symlink/privacy:** `responsive-images.mjs:11-17` rejects `..`/`.`/`\`/NUL after decoding, refuses a symlinked `public/images` (`:12`), symlinked entries (`:34`), symlinked output dirs/manifest/targets (`:24`,`:27`,`:45`), and enforces `realpath` containment (`:17`). `test-responsive-images.mjs:28-31` exercises `%2e%2e`, `%2f..%2f`, absolute URLs and an escaping symlink. Derivative names are `ri-<sha256>-<w>.webp` — no input-derived path segments. Sharp strips EXIF by default, so derivatives carry no source metadata; originals are byte-preserved as required.
- **Cache invalidation:** content-hash keying plus `hash(cached)===prior.hash` (`:47-48`) repairs deleted *and* corrupted cache files; stale sweep at `:60` is scoped to the exact owned namespace. Clean-build safety holds because `astro:config:setup` (`:65`) runs before module resolution, and `tests/global-setup.ts:12` builds before vitest.
- **Preload parity:** `Head.astro:149` derives `imagesrcset` from the same `responsiveImage()` call as the rendering `<img>` (`Banner.astro:34`, `rooms/[...slug].astro:136`), so the preload and the element resolve to one candidate; `infos/index.astro:24` preloads a CSS background with no `srcset` on either side. `tests/responsive-images.test.ts:21-30` locks this.
- **Lazy fanout:** `deferredImage` emits no `src`/`srcset`; unselected compare chips and panels are never fetched (`RoomCompare.astro:100`,`:104` filter on `!hidden`), and the 36-thumb filmstrip is `IntersectionObserver`-gated to the strip root (`PhotoViewer.astro:99`), asserted by `responsive-images.spec.ts:33-37`.
- **Strict same-photo identity:** `compare-motion.ts:32` requires a non-null, exactly equal `data-original-src` on both ends plus visibility/hit-testing; `photo-spatial.ts:46` additionally requires matching aspect ratios and a decoded bitmap. Mismatches degrade to no animation, never to pairing different photos. Version queries stay significant (`responsive-photo.ts:1-6`, `responsive-images.test.ts:11-20`).
- **Originals preserved for SEO/no-JS:** `src` stays the canonical original, gallery anchors link the original (`galleries.astro:49`), and derivatives are absent from schema and the image sitemap (`responsive-images.test.ts:40-41`); `responsive-images.spec.ts:60-69` covers the JS-disabled path.
- **Diagrams:** `responsive-images.ts:19` excludes non-photo kinds from downscaling; `infos/map|menu` render the full original with a working 查看原圖 affordance (`infos/[...slug].astro:56`), so the five new descriptions (index, infos, guide, menu, map — `landing-search-snippets.test.ts:8-25`) match real page content. Cache header addition is scoped to `/generated-images/` only, with `/images/` TTL unchanged (`vercel.json:35-51`, `responsive-cache-policy.test.ts:9-11`).

Fix P1-1 and P1-2 (plus their two missing assertions) and this is otherwise ready for the delta re-review.