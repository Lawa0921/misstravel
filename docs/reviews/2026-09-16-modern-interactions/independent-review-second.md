## Closure Review — `887ea8c045b6d23783946653eb6829eafbb36765`

**Verdict: PASS.** All 3 P1 and all 9 P2 findings are resolved in the actual sources and diff, not merely in `review-response.md`. One new non-blocking defect (focus escape via the filmstrip's roving tabindex) and a few nits are listed below. Nothing here blocks closure.

Scope: `changes.diff`, the 10 copied sources/tests, `verify-final.log`, `browser-final.log`, `review-regression-red.log`, `touch-test.log`/`touch-fixed.log`, current screenshots. I ran nothing.

### Prior P1s

- **P1-1 (Tab trap counted hidden rooms) — fixed.** `interaction-accessibility.js:37` now requires `tabIndex >= 0 && getClientRects().length > 0 && !closest('[hidden],[inert]')`, so the 7 unselected `.compare-room` links and every `tabindex="-1"` filmstrip thumb drop out. `review-regression-red.log` is a genuine red run of the new test against the pre-fix build (fails on the forward wrap at the `Tab` from the last visible `.compare-detail`); `modern-interactions.spec.ts:117-125` now asserts both directions — `Tab` from last visible link → `.modal-close`, `Shift+Tab` from close → last visible link, which is exactly both consequences I reported.
- **P1-2 (post-await write without token guard) — fixed.** `[...slug].astro:799-808`: `waitForPhoto` result is explicit (`targetImage ? await … : 'error'`), `if (token !== navigationToken) return;` precedes every write to `[data-photo-error]` and to `currentIndex`. The status element is a persistent `role="status"` (`:167`), so text is announced rather than set while hidden.
- **P1-3 (tray covering the footer) — fixed.** `rooms/index.astro:269` pads `html[data-compare-active] body` (11rem) instead of `#main`, and `modern-interactions.spec.ts:122-124` scrolls to the bottom at 390×844 and asserts `#footer.bottom <= #compare-tray.top`. Contact block is clear.

### Prior P2s

All nine verified in the current files: standard-first plan order with the `.sort()` removed (`RoomCompare.astro:29`, `compare-1440.png` shows 四帳包區（標準方案）NT$3,200 above 三帳包區 NT$2,400, unit + e2e expectations inverted accordingly); full ancestor inert walk in `Header.astro:254-262` covering `#header` and the body-level `.skip-link` (`#menu` is `z-index:10001`, opaque, `inset:0`, and carries its own `#menu-close`, so inerting `#menu-toggle` costs nothing, and `closeMenu` restores inert *before* refocusing the toggle); header back to `4.5rem`/`4rem` matching both rails; mobile chips keep the room name (`tray-390.png`: 櫻花之靈 / 沒日之嶺) with `flex:0 0 auto` in the scrollable row; `safeInlineJson` actually escapes (`'\\u003c'`, with a round-trip unit test); compare headings demoted to `<p class="compare-room-title">/.compare-plan-title` so the `/rooms/` heading outline is unchanged; swipe holds the dragged offset until `navigateTo` resolves, with `onStart` bumping `navigationToken` so a new gesture cancels the in-flight one; `PhotoReadiness` distinguishes `'timeout'` (「照片準備中，請再按一次。」) from `'error'`; DESIGN_GUIDE no longer promises a first-screen main photo and now states standard-first ordering.

Also closed from my P3 list: single-`activeDialog` leak (`interaction-accessibility.js:65`), `role="status"` text set after unhiding (`PhotoViewer.astro:49,52`), and the 36-stop filmstrip (roving tabindex).

The touch fix is pre-existing, not part of this diff: `photo-gestures.ts:41-43` filters `event.target===surface && event.pointerId===pointer` on `lostpointercapture`, so the bubbled implicit-capture loss from the child `<img>` no longer cancels a just-claimed drag, while a real capture loss on the surface still resets. `touch-test.log` (red, slide stuck at index 0) → `touch-fixed.log` (green) is consistent, and release ordering is safe because `reset()` nulls `pointer` before the surface's own `lostpointercapture` fires.

### New defect (non-blocking)

**Roving tabindex can desynchronise from focus, and then Tab leaves the viewer.** `PhotoViewer.astro:78` moves focus to the neighbouring thumb immediately, but `sync()` (`:43`) only makes that thumb tabbable after `select()` resolves. If the selected photo errors or times out (`:52` returns early), focus stays on a `tabindex="-1"` thumb while the tabbable one is elsewhere. The shared trap then finds `document.activeElement` in neither `first` nor `last`, takes no branch, and native Tab finds no later tabbable element inside the dialog — the background is inert, so focus lands in browser chrome. Clicking a thumb whose image fails reproduces it without any timing luck. This is the same family as P1-1 but needs an image failure, so I rate it P2, not a blocker. One-line fix: update the roving tabindex on `focusin` in `.viewer-filmstrip` (or have the trap fall back to `first.focus()` when `activeElement` is inside the dialog but outside the list). `modern-interactions.spec.ts:89-95` aborts `gallery_2.webp` but navigates with the ▶ button, so this path is untested.

### Nits (no action required for closure)

- During a swipe the photo is held at up to 45% offset with no interim message for as long as `waitForPhoto` runs (8 s worst case). Neighbours are preloaded in `onStart`, so this is rare; the viewer's 180 ms 「照片準備中」 pattern would be the consistent treatment.
- `body { padding-bottom: 11rem }` is ~7rem taller than the desktop tray, leaving visible empty space below the footer when one room is selected. Current screenshots do not look excessive at 390px.
- `.compare-room` articles now have no accessible name after the heading demotion; `aria-label={room.data.title}` would restore it.
- `Header.astro:30` `previewForItem` still previews an unrelated destination for 2 of 7 entries (decorative, `alt=""`) — unchanged and previously accepted as P3.

### Evidence and limitations

Both logs carry `SOURCE_COMMIT=887ea8c045b6d23783946653eb6829eafbb36765`; `verify-final.log` shows audit clean, `astro check` 0 errors, 27 files / 336 tests passing; `browser-final.log` shows 110/110 with `--retries=0`. The room-photo specs now wait for the source document's own reveal (`contextual-navigation.spec.ts:69`), assert the source photo is at least half in the viewport (`toBeInViewport({ratio:0.5})`), and click the photo itself, with every prior target-transition assertion intact — the observer correction is commented in place rather than silently weakened.

Limits I want stated plainly: I ran no tests, opened no browser, and this is not an accessibility certification or human sign-off. Coverage is Chromium-only — `inert`, pointer capture and `dvh` behaviour on WebKit/iOS Safari remain unverified, and the native-touch test is a CDP dispatch, not a real device. The per-slug Back assertion still accepts the fallback branch; only `campsite_1` at 1440 asserts a real Back animation. The timeout copy is unit-tested at `waitForPhoto` level but has no e2e; the 200% text-zoom rationale for the rem header is verified by reading CSS only. The diff touches no content, images, font or metadata, and the new UI is authorized.