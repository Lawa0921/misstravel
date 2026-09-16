## Verdict: **Blocker** — 3 × P1, 9 × P2. Nothing needs redesign; all fixes are local.

Scope reviewed: `changes.diff` + the 7 files in `new-files.txt`, `screens/*`, `AGENTS.md`, `docs/DESIGN_GUIDE.md`, `verify-round5.log`, `diagnostic.log`. Paths below are relative to the snapshot root.

---

## P1

### P1-1 Compare dialog's Tab trap is computed from unfocusable hidden rooms — focus escapes
`astro-site/src/scripts/interaction-accessibility.js:32-39` rejects an element only if *that element* is `hidden`/`display:none`. `RoomCompare.astro:30` renders all 10 `<article class="compare-room" hidden>` up front, each containing `<a class="compare-detail">` (`:36`) whose own computed `display` is `flex` — `getComputedStyle` reports an element's own computed display even inside a `display:none` subtree. So all 10 links are counted as focusable.

Consequences, with 2–3 rooms selected:
- `last` = room #10's link, which can never receive focus, so the forward wrap at `:180-183` never fires. Tab from the last **visible** `.compare-detail` falls through to native navigation; everything else is inert via `isolateDialog`, so focus leaves the document into browser chrome.
- Shift+Tab from `.modal-close` hits `:177-179`, calls `last.focus()` (a no-op on a non-rendered element) **after** `preventDefault()` → focus is stuck on the close button.

`tests/e2e/modern-interactions.spec.ts:27-35` only presses Escape, so this passes today.

Fix at `interaction-accessibility.js:33-38`:
```js
return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.getClientRects().length === 0) return false;   // covers hidden ancestors
  return window.getComputedStyle(element).visibility !== 'hidden';
});
```
Add an e2e step: with 3 selected, Tab from the last visible `.compare-detail` must land on `.modal-close`.

### P1-2 Room carousel writes and clears the failure message without a token check
`astro-site/src/pages/rooms/[...slug].astro:799-802` — both the `!ready` branch and the clear run **before** `if (token !== navigationToken) return;`.

Tap ▶ three times: slide 1's `waitForPhoto` (8 s timeout, `photo-ready.ts:8`) resolves `false` long after the user reached slide 3, and the page then shows a correct photo plus a persistent 「照片無法開啟，請選擇其他照片。」. The inverse also happens — a slow success clears an error a later navigation legitimately raised. This is precisely the rapid-navigation/loading-failure case in scope.

```js
const ready = targetImage ? await waitForPhoto(targetImage) : false;
if (token !== navigationToken) return;
const status = document.querySelector('[data-photo-error]');
if (!ready) { if (status) status.textContent = '照片無法開啟，請選擇其他照片。'; return; }
if (status) status.textContent = '';
```
(`targetImage && await …` also yields `undefined` rather than a boolean — make it explicit.)

### P1-3 Fixed compare tray permanently covers the footer contact block
`RoomCompare.astro:82` is `position:fixed; bottom:max(1rem, env(safe-area-inset-bottom))`. The compensating padding at `rooms/index.astro:875` targets `#main`, but `<footer>` is a **sibling** of `<main>` inside `#wrapper` (`BaseLayout.astro:69-73`). At scroll bottom on `/rooms/` the tray (~86 px desktop, ~134 px mobile once chips wrap to `order:4`) sits on top of `Footer.astro:18-50` — 空房查詢, LINE, 電話, Email, Google 地圖 — and `.footer-meta`. Those are contact details protected by `AGENTS.md:14`, and the tray has no dismiss other than 清空.

Fix: pad the scroll container, not `#main`:
```css
:global(html[data-compare-active] body) { padding-bottom: 10rem; }
```

---

## P2

**P2-1 Comparison leads with the non-standard cheaper plan.** `RoomCompare.astro:29` sorts `priceOptions` by `weekdayPrice` ascending, so campsite_1/2 show 三帳包區 NT$2,400 **above** 四帳包區（標準方案） NT$3,200 — visible in `screens/compare-1440.png`, and locked in by `tests/modern-interactions.test.ts:8` and `e2e/modern-interactions.spec.ts:31-33`. Every other surface leads with the standard plan: `room-values.mjs:46` *enforces* `isStandard` at index 0, `rooms/index.astro:101-121` shows 標準方案 then 三帳方案, and `campsite_1.md:53` states 線上訂位系統顯示四帳價格. No figure is wrong — only the order — but leading a side-by-side with the price the booking system does not quote sets the wrong expectation. Drop the `.sort()` (source order is already standard-first); update both tests.

**P2-2 Header menu inerts only `main, footer`.** `Header.astro:254-258`. `#menu` is a child of `#wrapper` (`BaseLayout.astro:68-74`), so `#header` (logo, `#desktop-nav`, `#menu-toggle`) and the body-level `.skip-link` (`:67`) stay exposed. The visual cover is complete and the Tab trap at `Header.astro:377-409` holds, but screen-reader browse mode, "list all links" and voice control still reach the background — the failure APG's modal pattern calls out and that DESIGN_GUIDE claims is closed (「背景不可操作」). The repo already has the correct walk at `interaction-accessibility.js:20-30`; reuse it. `spec.ts:7` only asserts `main`, so it passes either way.

**P2-3 Header moved from `rem` to `px` while everything anchored to it stayed `rem`.** `Header.astro:77` (`72px`) and `:183` (`64px`) vs `SectionRail.astro:32,36` and `rooms/index.astro:175,876` (`top:4.5rem`/`4rem`). Identical at a 16 px root — which is why the screenshots look right — but the header no longer grows with user text scaling while its contents do (`.logo`, `#desktop-nav a`, `#menu-toggle` are all `min-height:2.75rem`). At ~200 % the 88 px controls overflow the 72 px fixed bar and both sticky rails detach by a growing gap. Restore `4.5rem`/`4rem`, or move the rails to `72px`/`64px` so one unit governs.

**P2-4 Mobile compare chips lose their room name.** `RoomCompare.astro:115` hides `{shortTitle}`, leaving a 44×36 thumbnail with `alt=""` (`:15`) plus `×`. `screens/compare-tray-390.png` shows two near-identical dark thumbnails. `aria-label="移除…"` keeps screen readers correct; a sighted phone user cannot tell which selection they are removing. Keep the label and let the row scroll (it already has `overflow-x:auto`).

**P2-5 `set:html` escaping is a no-op.** `PhotoViewer.astro:21`: `.replace(/</g,'\u003c')` — `'\u003c'` *is* `<` in a JS string; the intent needed `'\\u003c'`. `set:html` does no escaping, so a future alt/caption containing `</script` would terminate the JSON block. All data is build-time authored (`lib/gallery.ts`, `lib/image-metadata.json`), so nothing is broken today — but the guard reads as present when it is absent.

**P2-6 `/rooms/` now carries a hidden duplicate of every room.** `RoomCompare.astro:28-38` renders all 10 unconditionally, adding an `h2` (比較房型), 10 `h3` room titles and 12 `h4` plan headings on top of the existing h1 + 3 `h2` + 10 `h3`, plus each room's `description` and full rate table that already lives on `/rooms/<slug>/`. `room-list-category-ux.test.ts:46-47` only checks one `h3` per card, so nothing fails, but the heading outline and duplicate-content profile of the list page changed materially and DESIGN_GUIDE treats heading semantics as governed. Consider demoting the in-dialog plan headings to `<p>` with `aria-labelledby`.

**P2-7 Swipe bounces back on uncached photos.** `[...slug].astro:826`: `onEnd` removes `is-dragging` and calls `updateCarousel()` (snapping back, transition re-enabled) *before* awaiting `navigateTo`. Only ±1 slides are preloaded (`:790-793`), so from slide 3 onward the photo visibly springs back and then advances — it reads as a failed swipe. Hold the dragged offset until `navigateTo` resolves, or move optimistically and roll back on failure.

**P2-8 8 s timeout reports a slow photo as a broken photo.** `photo-ready.ts:8` resolves `false` on timeout and both callers render 「照片無法開啟，請選擇其他照片。」 (`[...slug].astro:800`, `PhotoViewer.astro:51`). On a slow connection a still-downloading 900×675 webp is labelled unopenable and the carousel refuses to advance; it self-heals on retry because `image.complete` flips true, which makes it look intermittent. Distinguish timeout from `error`: keep 「照片準備中」 on timeout, reserve the failure copy for the `error` event.

**P2-9 DESIGN_GUIDE overstates the mobile result.** The new section claims 「保留房型主圖於第一畫面」. At 390×900 the photo starts at y≈790 with ~110 px visible (`diagnostic.log:3`, `screens/room-390.png`); on a real 390×664 viewport the photo, the toolbar and the notice panel are all below the fold. The compaction is real (`[...slug].astro:250,256,349,359,668` and the new `:711-718` block) but the stated outcome is not delivered.

---

## P3 / notes

- `Header.astro:30` `previewForItem = [0,2,1,2,0,3,1]`: 密式柑仔店 gets the generic landing photo, 交通指南 the homepage banner, 空房查詢 a campsite photo. Decorative (`alt=""`, container `aria-hidden`), so nothing false is asserted — but 2 of 7 entries preview an unrelated destination.
- `SectionRail.astro:30` (`.section-rail[data-rail-ready] a{…}`, specificity 0-2-1) outranks `.category-link:hover,:focus-visible` (`rooms/index.astro:196-200`, 0-2-0), so once JS runs the rooms category nav only changes colour on hover. Keyboard focus survives via `global.css:76`, so this is affordance, not access.
- `interaction-accessibility.js:18` uses one module-level `inertBackground`. If `activateDialog` ever ran for dialog B while A was active, B's `isolateDialog` would record the already-`true` values and `restoreBackground` would leave the page permanently inert. Not reachable today (one dialog per page; guest-page triggers are inerted while a modal is open) — add `if (activeDialog && activeDialog !== dialog) restoreBackground();`.
- `PhotoViewer.astro:19` produces 36 Tab stops on `/galleries/` before the trap wraps; a roving `tabindex` on the filmstrip would be kinder.
- `PhotoViewer.astro:15` toggles `hidden` on a `role="status"`; text set while hidden is not reliably announced. Set `textContent` after unhiding.
- **Needs one live check, not a finding:** `screens/viewer-390.png` / `viewer-1440.png` show page text faintly through the viewer. `.photo-viewer` (`PhotoViewer.astro:98`) specifies opaque `var(--color-bg-alt)` (defined at `global.css:21`) and I found no overriding rule, so this is most likely the 180 ms opacity transition captured mid-flight — but it matches the *deliberate* 85 % backdrop in `compare-1440.png` closely enough that I can't rule it out statically. If it reproduces after the transition settles, add `background: var(--color-bg-alt)` to `.viewer-layout` too.

---

## Verified sound — please don't re-litigate

- **Per-plan comparison data is correct.** `numberOfPeople` is per-option in the schema (`content.config.ts:9`) and `normalizeRoomData` (`room-values.mjs:51-56`) copies root values *only* into the standard plan, so 三帳 = 12人/2400‑3000‑3600 and 四帳 = 16人/3200‑4000‑4800 pair correctly. No three-tent price against four-tent occupancy. `pricingNote` and `description` render verbatim.
- **No nested interactive controls.** `.compare-toggle` is a sibling of `a.room-card` inside `article.room-option` (`rooms/index.astro:79-129`); asserted at `modern-interactions.test.ts:7`.
- **Native gestures preserved.** `touch-action: pan-y pinch-zoom` on both surfaces; horizontal-intent gate at `photo-gestures.ts:27-28`; `reset(0)` on a non-primary pointer (`:19`) clears `pointer` so `preventDefault` stops and a second finger can pinch.
- **No-JS fallbacks hold.** Compare toggles and 放大照片 gated on `data-compare-ready`/`data-viewer-ready`; gallery links still resolve to the full-size image; `<noscript>` carousel retained; guest-page `<noscript>` modal expansion untouched.
- **Storage denial contained.** Both `sessionStorage` calls are wrapped (`RoomCompare.astro:52,60`); no navigation depends on them.
- **Shared dialog lifecycle is right.** `isolateDialog` walks every ancestor level, correctly covering `#header`, `#menu`, `footer` and `.skip-link` given `BaseLayout`'s structure; `pageswap`/`pagehide` deactivate (`:250-251`); body-overflow capture happens in the capture-phase listener before the component handlers set `hidden`.
- **Build/units green.** `verify-round5.log`: 26 pages built, 333/333 unit tests pass. E2E (`modern-interactions.spec.ts` and the existing specs) still pending — P1-1 and P1-3 are not covered by any current assertion, so a green E2E run should not be read as clearing them.
- Prices, booking/refund/pet/visitor/meal/check-in wording, contact details, `setofont.woff2` and all 26 routes are untouched by the diff.