# Verdict: PASS, with one check still needed before merge

I found no real blockers in the code. The one gap is missing proof, covered at the end. Snapshot HEAD is `eafc4458f9b31ecc484acd7918ff5491e3e7c048` (`HEAD.txt`), and `verify-final.log:1` shows the same commit.

## What holds up

**Animation can't hide content**
- The transition only animates the browser's transition layers (`motion-effects.css:111-117`). Nothing hides `html`, `body` or page content, and there's no JavaScript gate.
- The `both` fill only lasts while the transition runs.
- In a browser without support, pages just change normally.

**Reduced motion**
- The whole transition is switched on only inside `prefers-reduced-motion: no-preference` (`:100-118`). A browser that matches neither setting gets no transition, which is the safe default.
- `:129-135` and `technical-hardening.css:45-57` switch it off for reduce.
- The test checks that no transition starts and that the header's transition name is `none` (`spec:78-80`).

**No JavaScript**
- The effect is pure CSS, so it doesn't need scripts. Navigation and the booking link's `target`/`rel` are tested with JavaScript off (`spec:133-144`).

**Event timing**
- The Header script is a module, so its `pageswap` listener is registered before `DOMContentLoaded`. The test's listener is added after that, so it reads the state after the app's cleanup has run.
- The assertion `opacity: '0'` is meaningful. The menu fades over 0.3s (`Header.astro:109`), and the link click has already started that fade. Only `animation.finish()` (`:203`) can make opacity exactly 0 at `pageswap`. `getAnimations()` updates styles first, so the fade exists to finish.
- Nothing was loosened. The expectation is the full `{visible:false, opacity:'0', overflow:''}`.

**Tests check real behavior, not a CSS string**
- They use `pagereveal` → `viewTransition.ready`, `skipped`, then `finished`.
- At `ready`, they read `document.getAnimations()` names and require both `mist-page-in` and `mist-page-out` (`spec:10-19, 82-87`).
- A same-page anchor jump is checked to leave the transition state unchanged (`:91-94`).
- Line numbers in `targeted-browser-tests.txt` (40/70/98/117/133) match the spec, and all 7 passed.

**Focus and Menu styling**
- `#menu-toggle:focus-visible` is more specific than `global.css:76`, and the `technical-hardening.css:25-35` selectors don't target the menu.
- Both controls keep 44px minimums (`2.75rem`).
- Screenshots:
  - `infos-1440.png`: MENU has no border.
  - `header-focus-1440.png`: a clear aqua ring on MENU.
  - `menu-open-390.png`: a round ring on the close control.

**Navigation and scope**
- The desktop header reads 首頁／房型展示／關於密式／密式圖集, with 關於密式 → `/infos/` marked as current (`infos-1440.png`).
- The full menu still has all 7 items, including 交通指南 (`Header.astro:12-20`). The About page still links to 交通指引 (screenshots).
- `aria-current` still only marks the exact page, and `homepage-editorial.test.ts:62-79` still covers it.
- The diff only touches Header, the motion CSS, tests and `DESIGN_GUIDE.md`. There are no route, canonical, sitemap, booking, price, font or dependency changes.
- Full verify: 0 audit vulnerabilities, astro check 0 errors, 26 files / 328 tests passed.

## Needed before merge (missing proof, not a code bug)
- `AGENTS.md:9` requires both `npm run verify` and `npm run test:e2e`. The snapshot only has the 7 targeted Playwright tests, and that file isn't tied to a commit. Other existing e2e specs could expect the old desktop 交通指南 link or the old Menu border. Run the full `test:e2e` at `eafc445…` and attach the output.

## Optional polish (not blockers)
1. **Header doesn't animate is only partly tested.** The name check doesn't rule out a header animation. You could assert that no animation name contains `site-header`.
2. **Back-button comment isn't proven.** The `goBack` test (`spec:111-114`) would also pass on a full reload, so the back/forward cache claim in the comment at `Header.astro:200` is untested. Checking `pageshow.persisted` would prove it. The `pageswap` handler itself is already proven by the opacity check.
3. **Transparent header variant.** On pages using the `.alt` or `.alt style2` header, the new header appears instantly at full opacity while the old page fades underneath. I couldn't see those pages from the snapshot, so look at one visually.
4. **Header drawn above everything for 280ms.** During the transition the header sits on top of all page content. That could briefly cover a lightbox restored by the back button.
5. **No current marker on About subpages.** On `/infos/guide/` and other `/infos/*` pages, the desktop header now marks nothing as current. A section highlight (not `aria-current="page"`) would help orientation.
6. **Browsers without `pageswap`.** A browser that runs the transition but doesn't fire `pageswap` could briefly show the fading menu in the old page's snapshot. It's cosmetic only.

This is an independent AI review, not human approval.
