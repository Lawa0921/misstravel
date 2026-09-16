## Closure verdict: **PASS** for HEAD `0caec00a77778737ff47eaaa58d3188c81bd5d0d`

Static AI review of the delta only, using Read/Glob/Grep. I ran nothing; every execution statement below is a reading of the logs you supplied.

---

### B1 — resolved, with exact code evidence

`astro-site/src/components/Tiles.astro:61`

```css
.tile[data-motion-card] { transform: none; transform-style: flat; }
```

- **The tie is gone under every scoping strategy.** The shared rule is `[data-motion-card]` = (0,1,0). The reset is now (0,2,0) *before* Astro scoping. `astro.config.mjs:8-29` sets no `scopedStyleStrategy`, so the default `'attribute'` applies → `.tile[data-motion-card][data-astro-cid-…]` = (0,3,0). Under `'class'` it is also (0,3,0); under `'where'` the `:where(.astro-…)` wrapper adds 0 → (0,2,0). All three strictly exceed (0,1,0), so bundle/link emission order between the global sheet and the component style no longer decides anything. Media queries still contribute no specificity, and none is needed.
- **Same element set, no coverage hole.** Every card carries `data-motion-card=""` (`Tiles.astro:38`), so the narrowed selector matches exactly what `.tile` matched. No tile loses the reset.
- **Monotonic vs. the previously-green form.** The change is a strict specificity increase on identical declarations. A rule that won as (0,1,0)/(0,2,0) at `310867f` cannot lose as (0,2,0)/(0,3,0) at HEAD, in any engine. That is why `cross-engine-310867f.json` (9/9, all `maximumOverflow: 0`) and `browser-310867f.log:66-73` (all overflow widths green; `:153` 143 passed) remain load-bearing across this delta rather than being invalidated by it.

### Responsive cascade — no regression, confirmed line by line

`Tiles.astro:62` retains **all** of `grid-column`, `min-height`, `display`, `padding`, `position`, `overflow`, `isolation` on bare `.tile` at (0,1,0). That is the decisive detail:

- `:95-96` (`max-width:1020px` → `span 6`, `22rem`), `:102` (`max-width:767px` → `19rem`, tighter padding), `:106` (`max-width:390px` → `17rem`) are all `.tile` / `.tile:nth-of-type(n)` and keep their original specificity **and** their original later source position relative to `:62`. They still win.
- Had the dimensions moved into the (0,2,0) selector, `:95` and `:106` would have been outranked and every breakpoint would have silently reverted to desktop sizing. They did not move. This is the correct split.
- `:63-64` (`nth-of-type` grid spans) and the `.tile-wash`/`.tile-link`/`.tile h2` descendant rules are untouched; `.tile-link::after { inset: 0 }` (`:82`) still resolves against `.tile`'s `position: relative` (`:62`), so the full-card hit target and both focus outlines (`:83-84`) are intact.

### Var fallbacks (`Tiles.astro:90`)

`rotateX(var(--motion-rotate-x, 0deg)) rotateY(var(--motion-rotate-y, 0deg))` — inert when `motion-effects.css` defines the properties (identical computed value), and prevents the whole `transform` declaration from going invalid-at-computed-value (silently killing the hover zoom) if that sheet is ever absent. Pure hardening, zero runtime delta on the homepage. Reduced motion stays double-guarded: `:87` gates on `no-preference` and `:110-113` follows in source order.

### Test behavior — strengthened, assertions still strict

- `:19-23` unchanged: `maximum === 0`, `left === 0` after a real `scrollTo({left:100, behavior:'instant'})`, and `rootOverflow`/`bodyOverflow` must not match `/hidden|clip/`. The fix still cannot be faked by clipping or scrollbar hiding.
- `:6-11` wall-clock `performance.now() + 650` beats the old fixed 18-frame loop: it now covers the full `transform 0.6s` on `.tile-image` (`Tiles.astro:65`) independent of refresh rate, where 18 frames was ~300ms at 60Hz and ~113ms at 160Hz.
- `:26` adds `767`, the exact `max-width: 767px` boundary (`Tiles.astro:99`) where `#tiles` flips to `display: block`.
- `:58-60` real pointer-leave plus a settle sample — the "移出" half of the acceptance text.
- `:39-52` asserts the contract directly instead of by proxy: both the card **and** `.tile-content`, x/y/width/height, before vs. during. Using `r.x + scrollX` / `r.y + scrollY` (`:42`) is the right call — `tile.locator('a').focus()` (`:61`) can scroll, and document-space coordinates make that a non-event rather than a false failure.
- `:66-67` still pins the asymmetry: card `transform: none`, inner image not `none`. This is also the guard that would catch any future inline-style transform, which no selector specificity could beat.

### Non-blocking notes (none gate merge)

1. `page.mouse.move(1, 1)` (`:58`) is the viewport corner, not guaranteed empty space — at ≤767px tiles are full-width blocks, so it may land on a *different* tile. The assertions still hold (document-level + current-tile geometry), but it reads as "leave this tile" rather than "hover nothing"; `box.x + box.width/2, 0` would be more literal.
2. Runtime: 25 sampling calls × 650ms ≈ 16s per width plus evaluation overhead, vs. the 7.4–10.8s/width at `310867f` (`browser-310867f.log:66-73`). `test.setTimeout(45000)` (`:28`) has headroom, but total suite wall clock roughly doubles.
3. `toBeCloseTo(…, 1)` is a 0.05px tolerance. Low risk here — `document.fonts.ready` is awaited (`:32`) and `.tile-image` is `position:absolute; inset:0`, so lazy image arrival causes no reflow — but it is a tight band.
4. The rAF-driven loop (`:8-11`) would stall if the page were ever backgrounded/throttled. Not a condition Playwright creates.

### Evidence limits I am not papering over

- `browser-310867f.log` and `cross-engine-310867f.json` pin `310867f`, **not** HEAD `0caec00`; `verify-hardened.log:159-160` is vitest only (29 files / 340 tests passed) and contains no Playwright output. So this snapshot holds **no browser evidence for HEAD's strengthened spec**, and I make no claim about the run you have in flight. My PASS rests on the delta being a strict specificity increase plus inert fallbacks — a change that cannot weaken what `310867f` demonstrated.
- `motion-effects.css` / `.js` are outside this directory, so the `[data-motion-card]` rule text is taken from the preserved initial review's quote rather than re-read. `cross-engine-310867f.json` also records `physicalDeviceTesting: false`.

This is a static AI review at HEAD. It is not human approval, not a claim of browser execution, and says nothing about field SEO outcomes.
