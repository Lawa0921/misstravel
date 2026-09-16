# Coordinator response to independent review (not an approval)

All changes are in the same isolated worktree. Original content/media/font files and the old original worktree remain protected. The final reviewer must verify code and evidence, not trust this response.

P1-1: Shared dialog focus candidates now require nonnegative tabindex, nonempty client rects, no hidden/inert ancestor and visible computed style. Deterministic test with only two selected rooms failed before the fix and passes after: last visible link -> Tab -> close; Shift+Tab -> last visible link.
P1-2: Carousel request token is checked immediately after await, before touching status, drag state or slide index. This was already corrected after the initial snapshot, and is explicitly kept in final source.
P1-3: Comparison clearance pads the body's scrollable bottom, not main before footer. A mobile regression scrolls to bottom and asserts the entire footer ends before the fixed tray begins; labels remain visible on chips.
P2-1: Comparison alone now follows source order, standard plan first. Both alternate/standard original people and prices are still paired and tested; original room-detail price order and operating text are unchanged.
P2-2: Header modal now walks sibling branches to inert the whole background, including header and skip link, restoring exact pre-open values before focus return.
P2-3: Header height restored to rem, matching both rails and existing scalable controls.
P2-4: Mobile chip names remain visible in their horizontally scrollable row; not image-only close targets.
P2-5: New safeInlineJson serializer encodes < into a literal JSON unicode escape; regression passes a closing-script string and requires round-trip equality with no raw <. The failed initial escape attempt is retained in verify-review-fixes.log; the corrected serializer passes.
P2-6: Comparison room/plan titles use styled text, not ten duplicate h3 and twelve h4 headings on the list page; the named comparison dialog keeps its own h2.
P2-7: A committed swipe retains the dragged offset while its photograph prepares; only success transitions to the new index, failure or cancellation returns to the old index. A new drag invalidates an older pending request.
P2-8: Shared readiness helper distinguishes ready/error/timeout. A timeout uses slow-preparation/retry copy, never the broken-photo error. Unit test proves error and timeout are different states.
P2-9: DESIGN_GUIDE explicitly limits first-screen claims; different title lengths and viewport heights mean not every screen contains the full photo.
Additional: roving thumbnail tabindex prevents 36 sequential stops; capture-loss handlers ignore an image child's implicit touch-capture transfer (a real CDP touch test failed before and passed after this fix). Zoom panning clears its state before release; viewer backdrop now fully opaque. Modal-to-modal background state is restored before a new isolation map is built. Existing metadata/schema/sitemaps and all original room, guest and policy regions pass baseline comparison.

Test scope is actual pointer/touch/keyboard/state behavior, not screenshots or string assertions alone. The old contextual photo tests keep every prior target-animation assertion; the source document must finish its initial pagereveal before the test starts a new navigation. Earlier concurrent screenshot/test runs exposed missing optional native-transition events; a separate 20-case transition stress pass and final isolated full suite are reported separately, not hidden as automatic retries.


## Final thumbnail focus guard

The second review passed all prior blockers but identified a failed-thumbnail roving-tabindex edge case. A first test checking only final focus passed because headless Chromium natively wraps within the document; it was not proof of trapping. A stronger pre-fix test also required the actual Tab event to be defaultPrevented and failed with false. The helper now explicitly prevents Tab from any focused element outside its currently tabbable list, wrapping to first/last according to direction. The same strict regression retains both the prevented-event and resulting-focus assertions. Compare articles also receive their original room title as an accessible name. These are the only final runtime differences; normal visual states are unchanged.
