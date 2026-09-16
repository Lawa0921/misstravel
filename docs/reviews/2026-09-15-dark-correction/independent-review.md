I've finished reading the diff, the sources, the test logs and the screenshots; here's the report.

# Independent review of the dark-palette correction (PR #63)

**Source SHA:** `5662328fd9892a58773938488de979471fbd5f06` (from `HEAD.txt`, matching `SOURCE_COMMIT` in both verify logs)
**Verdict:** **PASS** for this limited correction. I found no new blockers. This is an AI review based on reading files and the evidence you supplied. I didn't run anything, and it isn't a human sign-off.

## Key evidence

**1. No large light surfaces remain.** Every cream or white fill in the room pages now uses a shared token:
- **Detail page:** the reading area (`#main-content`, `[...slug].astro:336-340`), the notice panel (`:347-356`), the booking notice (`:533-538`), the related cards (`:594-601`) and the summary (`:263-275`) use `--color-bg` or `--color-surface`.
- **List page:** the room cards, price area and image placeholder (`index.astro:251-308`) do the same.
- **Tokens:** `--color-surface: #2a2f4a` and `--color-danger` were added to `global.css:19-20`, and the page-local `--room-*` colours are gone.
- **Remaining light fills:** only the small CTAs and hover fills (`.availability-cta`, `.btn-action.special`, carousel buttons), which the brief allows.
- **Screenshots:** the 1440 full, 1440 viewport and 390 full captures show a dark interface throughout.

**2. Text and hover/focus colours were fixed, not just the background.** Every old dark text colour (`#71501c`, `#34364a`, `#3d4052`, `#5a5d6c`, `#167081`, `#a33b42`, `--room-deep`/`navy`) now uses paper, paper-muted, champagne, aqua or danger. My contrast estimates:

| Pair | Ratio |
|---|---|
| Aqua `#9dd8d0` on surface `#2a2f4a` | ≈8.2:1 |
| Champagne on surface | ≈7.0:1 |
| Paper-muted on surface | ≈7.8:1 |
| Danger `#ff9b92` on surface | ≈6.5:1 |
| Navy text on aqua (hover/CTA) | ≈8.9:1 |
| Aqua text on the `.category-link` hover tint | ≈6.1:1 |

- **Hover rules override the global link colour:** `.room-card:hover`, `.related-card:hover` and `.btn-action:hover` are more specific than `a:hover` in `global.css:75`, so text stays legible on hover.
- **Focus:** keyboard focus keeps the global aqua outline.

**3. Photos, markup and content are unchanged.**
- No `filter`, `invert` or `mix-blend` appears in the changed sources.
- The diff only touches `<style>` blocks, `:root` tokens, tests and the design guide. No markup, JS, prices or policy text changed.
- `content-seo-invariance.json` reports 26 pages, 251 protected files and zero differences.
- `color-scheme: dark` affects only browser-drawn controls and scrollbars.

**4. The new E2E test checks real surfaces.**
- **Not vacuous:** each selector must match at least one element (`dark-theme.spec.ts:17`). The colour regex only matches the two exact dark `rgb(...)` values, so transparent or other `rgba` backgrounds would fail.
- **Both OS themes:** each case runs with the light and then the dark preference, at 390px and 1440px.
- **It catches the old bug:** the before-log shows `#main-content` failing with `rgb(248, 244, 236)` at both widths.
- **Current results:** the after-log shows all 8 dark-theme tests passing. The verify log shows 233 tests passing with an audit count of 0. `dark-visual-axe.json` shows 20 scans with 0 violations.

## Limits and non-blocking gaps

- **Hover/focus test coverage is narrow.** Only `.room-card` is tested, only in the default OS theme, and `.room-card` has no hover background rule to begin with. Nothing tests hover or focus on `.related-card`, `.btn-action`, `.availability-cta` or `.category-link`. My contrast figures above come from reading the source, not from a test.
- **Axe scans cover only `suite_1` and `campsite_1`**, and those ran with the light OS preference only. The snapshot doesn't include the room markdown, so I can't rule out inline colours in the other 8 room pages that were written for the old cream background.
- **Axe "incomplete" results** (homepage, galleries, infos) are unresolved checks, not passes. They're outside this change.
- **Leftover hard-coded colours (cosmetic):** some faint border and tint colours from the old palette weren't moved to tokens:
  - `index.astro:177, 188, 214`
  - `[...slug].astro:271, 289, 295, 423, 460`

  All of them are faint borders or tints on dark backgrounds with no contrast impact. The source test only checks that `--room-` is gone, so it wouldn't catch these.
- **Two warning reds:** `global.css:94` sets `.red` to `#e9a29b`, while the booking notice uses `--color-danger` (`#ff9b92`). Both are readable, but they're inconsistent.
- **Out of scope:** the small carousel dots (visible in the 390 screenshot) were already there before this change.
- **Not assessed:** whether the result looks right to the user. That's their call.

## Possible follow-ups (not required for this change)
1. Extend the hover/focus test to `.related-card`, `.btn-action`, `.availability-cta` and `.category-link`, under both OS themes.
2. Run axe on all 10 room detail pages.
3. Move the leftover colours to tokens and use one warning red.
