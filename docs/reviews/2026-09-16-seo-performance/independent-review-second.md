## Verdict: **PASS** — both P1s are genuinely closed; no new blocker found

Reviewed: `closure.diff` against the current source in the snapshot, plus the red/green logs, `preservation.json`, and the three test files. Source-only static review by an AI; I ran nothing and did not open a browser.

---

## P1-1 (fullscreen geometry jump) — **closed**

The fix does what it claims, and for the right reason.

- `PhotoViewer.astro:6` precomputes `responsiveImage(image.src,'100vw')` → original `width`/`height` per photo; serialized at `:24`, typed at `:33`.
- `display()` at `:56-57` sets `--photo-width`/`--photo-height` from `images[target]`, i.e. from the **original's** dimensions, not from whichever bitmap is loaded.
- `PhotoViewer.astro:179` consumes them: `width:var(--photo-width,auto);height:var(--photo-height,auto)` with `max-width/max-height:100%` and `object-fit:contain` retained.

The stage box is now independent of `currentSrc`, so the 384w derivative and the original produce the same box. `photoGeometry` (`photo-spatial.ts:23-25`) derives the photo rect via the `contain` scale from `naturalWidth/Height`, and derivative vs. original share the aspect ratio (945/709 = 1.3329 vs. 384/288 = 1.3333, well inside the `.02` tolerance at `photo-spatial.ts:46`), so the flight endpoints match across the upgrade too.

Zoom is unaffected: `--photo-*` are custom properties, so `.is-zoomed .viewer-stage img{width:180%;height:auto}` (`:189`) still wins on specificity and `height:auto` resolves from the natural ratio.

Evidence is real, not asserted: `progressive-red.log:10` shows the exact defect (`384×288` → `945×709`, Δ280.5px), and `progressive-photo-state.spec.ts:12-18` pins all four box components to ≤1px across a route-gated upgrade.

## P1-2 (upgrade resets zoom/pan) — **closed**

- `display()` gains `keepView` (`PhotoViewer.astro:54-55`); `resetZoom()` is skipped only when it is set.
- `:75` passes `opening`, which is `true` only for the open-path call at `:111`. Every user-initiated path (`:139`, `:140`, `:141`, `:146`, `:160`, and `:121`) still resets. The failure path at `:85` forwards the same flag, so restoring the last good photo during an in-place upgrade also preserves the view.
- Pan survives because `stage.scrollLeft/Top` are untouched and the zoomed box (`width:180%`) does not depend on natural size.

`progressive-red.log:38-49` reproduces (`aria-pressed` flipping to `false`); `progressive-photo-state.spec.ts:19-28` pins `aria-pressed` **and** exact `scrollLeft/scrollTop`.

## New safeguard — checked for the failure modes you named

`PhotoViewer.astro:107-121` / `photo-spatial.ts:73-88`:

- **Functional/decorative split is correct.** `void select(next,true)` at `:111` now runs unconditionally, before `flightGeneration=++decoration`. Previously it lived inside the rAF that returned early on `flightGeneration!==decoration`, so a cancelled decoration silently skipped the original upgrade. That is a real bug fixed, not cosmetic.
- **Stale open/close:** the deferred handler at `:117` re-checks `generation!==token || !opened || !viewer.classList.contains('active')`. `token` advances on `close()` (`:125`), on reopen (`:96-98`), and on every `select()` (`:69`), so a superseded flight cannot publish `shown` or fly. `generation` is read after `select()`'s synchronous `++token`, so it is the current value — correct, if subtle.
- **Opacity restoration:** `to.element.style.opacity='0'` is only set inside `start()` (`photo-spatial.ts:80`), after the append. If `cleanup` runs first (cancel or deadline), the `=== '0'` guard at `:68` prevents clobbering an untouched value. `cleaned` (`:74`) makes a late `start()` a no-op. `previousOpacity` is captured at `:59` after `cancelPhotoFlight()` at `:45` has already restored any prior flight's value, so nested flights can't latch `0`.
- **Hide/zoom/resize cancellation during the decode wait:** `cancelCurrent=cleanup` is assigned synchronously at `:72`, *before* the async branch, so `resize`/`pagehide`/`pageswap`/`pointerdown`/`keydown` (`:8`), `scroll` (`:10`), `visibilitychange` (`:11`), reduced-motion change (`:9`), `toggleZoom` (`PhotoViewer.astro:148`) and `close()` (`:125`) all reach it. `cleanup` clears `decoderDeadline` (`:66`), and `frame.remove()` on a never-appended node is a no-op.
- **Bounded:** if neither `decode()` settles nor a cancel arrives, the 180ms `setTimeout` at `:86` cleans up. No leak, no un-restored opacity.
- **Identity:** `originalPhoto` (`responsive-photo.ts:2-6`) still reads only `data-original-src` and keeps query strings significant; `thumbnailImage` retains `data-original-src` (`responsive-images.ts:34`).
- **Controls are never delayed:** `display()`/`sync()`/`resetZoom()` at `:106-108` are synchronous; only the animation is deferred.

`responsive-images.spec.ts:53-55` proves the flight still materializes with the derivative in the deferred-decode path (green log #18).

## The other four fixes

| Fix | Location | Assessment |
|---|---|---|
| Atomic writes + symlink checks | `responsive-images.mjs:20-26`, `:30`, `:37`, `:56`, `:60`, `:72-74` | Correct. `wx` + `rename` closes the truncation window; the `throw`-inside-`try` symlink pattern works (thrown `Error.code` is `undefined ≠ 'ENOENT'` → rethrown). Manifest is only rewritten when content changes. Covered by `test-responsive-images.mjs:24-32`, which also asserts the symlink target stays `untouched`. |
| `data-src` removed on activation | `responsive-photo.ts:10`, `:15` | Correct, and the added no-op guard at `:10` handles `''` defaults safely (first activation has `getAttribute('src')===null`). |
| Orientation normalization | `responsive-images.mjs:51-52` | Correct: dims swapped for EXIF 5–8 *and* derivative generation still skipped at `:53`, so a rotated original ships the right aspect ratio with no srcset. |
| Metadata key decoding | `image-metadata.ts:10` | Aligned. `split(/[?#]/,1)[0]` + `decodeURIComponent` matches `responsive-images.ts:15` exactly. |
| Thumbnail srcset ≤384 | `responsive-images.ts:31-37` | Correct and pinned by `responsive-images.spec.ts:36` (`/-(96\|192\|384)\.webp$/`). Originals still used for the stage (`PhotoViewer.astro:6`), gallery anchors and SEO (`responsive-images.test.ts:39-41`). |

## Preservation

`preservation.json` — `failures: []`, `ok: true`, all 26 pages `body/links/imageOriginals/schemas: true`, all six feed/sitemap/robots assets byte-identical. The 19 `changes` entries reduce to exactly the six permitted page descriptions (404 incl. noindex, index, guide, infos, map, menu, each ×3 tags) plus the homepage `WebSite.description`. Nothing else moved.

---

## Non-blocking

1. **`verify-round1.log` predates the P1 fixes.** It ran 14:38:50–14:39:09, but `closure.diff:2,105` dates `PhotoViewer.astro` and `photo-spatial.ts` at **14:42:36**. So `astro:check`/`tsc --noEmit` have **not** been run against the two changed files. Concrete risk: `photo-spatial.ts:78-79` now calls `frameKey(from)`/`photoKey(to)` from inside the `start` closure (`:73`), where `from`/`to` are `PhotoGeometry | null` parameters narrowed by the early return at `:46`. This only compiles under TS ≥5.4's preserved-closure narrowing; the snapshot has no `package.json`/`tsconfig`, so I cannot confirm the version. Re-run typecheck on the final tree before merge. (I am not claiming the full suite passed — the green log covers 20 e2e scenarios only.)
2. **The opening flight can now fire arbitrarily late.** `PhotoViewer.astro:119` runs after `await waitForPhoto(image)` (`:116`), and `select(next,true)` concurrently swaps `image.src` to the original at `:75`, so that wait can end up tracking the full original (8s ceiling per `photo-ready.ts`, not in snapshot). An idle user on a slow link can see the already-visible stage photo blanked (`photo-spatial.ts:80`) for a 320ms fly-in seconds after opening. Bounded in practice — any `pointerdown`/`keydown`/`scroll`/`resize`/zoom bumps `decoration` (`:148`, `:163`) and suppresses it — and no test pins it, since `toHaveAttribute` at `responsive-images.spec.ts:55` polls for 5s. Suggested: capture `const deadline=performance.now()+400` in `open()` and skip only the `flyPhoto` call at `:119` past it, leaving the `shown`/`publish` lines intact.
3. **Duplicate `photo-viewer:shown`.** `:109` and `:118` can both publish for the same index. Pre-existing shape, now slightly more likely; harmless unless a listener is non-idempotent.
4. **Loading toast over a visible photo.** `select()`'s 180ms timer (`:71`) and its failure branch (`:74`) can show 照片準備中 / 照片無法開啟 while a usable derivative is already on screen. Pre-existing, not introduced here, but more reachable now that `select()` always runs on the fast path.
5. **Crashed builds leak `.ri-write-<uuid>.tmp`.** `responsive-images.mjs:21` writes into `public/generated-images/`, and the sweep at `:71` only matches `^ri-[a-f0-9]{64}-\d+\.webp$`, so orphans ship in `dist`. Either sweep `.ri-write-*` or write to `.generated/`.
6. **`atomicWrite`'s `finally` can mask the real error** (`:25`): a non-ENOENT `unlink` failure replaces the originating `writeFile` error.
7. **Unverified (files absent from the snapshot):** the `data-src` deletion's effect on `RoomCompare.astro:95-104` and `rooms/[...slug].astro:756-764`, and `waitForPhoto`'s exact semantics in `photo-ready.ts`. Both are load-bearing for items 2 and the P2-1 fix.