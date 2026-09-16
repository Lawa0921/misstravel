# Response to the independent adversarial review

This is a coordinator response, not an independent approval. Independent re-review is required.

- P1 test contradictions: original heading tests are explicitly updated to h2 categories/h3 room cards. Header behavior is restored, including cancellation guard; reduced-motion focus is now retried across visibility frames. New browser regression covers Enter -> close-button focus -> Escape -> original focus. No assertion is removed to hide an interaction defect.
- P1 price semantics: rooms without priceOptions no longer claim a standard plan. Existing three-tent minimum remains NT$2,400, displayed first. Every three/four-tent plan includes its own 12/16-person limit beside its exact existing price. Both original pricing options remain. Stronger tests check each plan and order. Original content Markdown untouched.
- P1 glyphs: actual FontTools inspection found 鄉 U+9109 and 閱 U+95B1 have cmap entries but EMPTY outlines. Other new missing glyphs 己/把/簿 were avoided in new copy. Original WOFF2 bytes are unchanged. CSS unicode-range excludes only the two empty codepoints, so the pre-existing sans-serif fallback can display the original text without adding/replacing a font. A checksum+outline-coverage fixture regression validates this exact exception.
- P1 tile clickability: a full-card stretched link covers the entire article. Visitor automation clicks the PHOTO area and verifies navigation, not just the h2 text.
- P2 alt descriptions: all 36 gallery originals were visually inspected via a numbered contact sheet. Each now has a distinct factual description, shared by image, lightbox, link label and ImageObject. Header/title images are no longer falsely labeled exterior/traffic map; card labels are safe when exact room scene was not inspected.
- P2 branding: global siteConfig.title restored to Misstravel (RSS/footer/og naming retained); independent SEO suffix uses Chinese author. Homepage title includes the existing campground/cabin/suite categories. Gallery visible h1 restored to 密式圖集. Dusk Mountain is only a design-guide label; the fake hero 01/06 counter is removed.
- P2 header: visible Menu is included in its accessible name. Button-only nav is a div. Current-page calculation uses exact pathname, so parent information and guide are not both current in one menu. Desktop nav and important prices have been enlarged.
- P2 warnings: required notice is a section, not aside. Notice and original inline red text now meet measured contrast, with wording unchanged. All business paragraphs remain expanded.
- Scope: visible copy/layout changes are explicitly documented in the single docs/DESIGN_GUIDE.md. Dependency security patches are isolated in their own commit 17a0f46. They remove nine audit findings without bypassing the audit gate. The original worktree and all protected content/photo/font files remain untouched.

Verification observations: npm run verify previously passed 227 tests before the additional fallback regression (latest source is being re-run). Chromium interaction tests passed 13 scenarios, including normal and reduced motion. Axe found zero violations in 20 route/viewport checks after contrast corrections. Visitor checks also cover no-JS, real links, all 25 pages at desktop/mobile and 360/768 widths. Final exact-source reports supersede earlier runs.

Test-harness issues corrected separately: public production Cloudflare email obfuscation is decoded as its public browser script would display it before comparing business content; closing transitions use state-based waits, not a race-prone 300ms snapshot; normal-motion full-page inspection uses explicit instant scroll so smooth scrolling cannot prevent the harness from reaching later cards.


## 第二輪複核後的更正

第二輪獨立審查確認上述四個 P1 已修正，但指出本回應所稱「exact pathname」當時尚未反映於原始碼；這項敘述不正確。已先新增回歸測試，重現交通頁有兩個 aria-current 及詳細頁錯標分類頁的兩個失敗，再於 commit `ed0764d51e0f96fa10d1e1bedd7971291f52d391` 改為精確相等判斷。另修正 Menu 的中性可存取名稱、摘要的 region 語意，並將相關房型價格字級恢復為 0.9rem。此版本 verify 為 24 檔／233 測試通過，最終獨立 closure 報告另附。這段保留修正歷程，不把第二輪 needs-changes 結論改寫成通過。


## 最後的焦點時序修正

後續壓測发现圖集關閉後的舊 requestAnimationFrame 回呼可能再次把焦點移入關閉的圖集。修正前先以確定性測試重現，於 `99799d9f758277ec82b43d86dd4dbea31d1c202b` 加入 activeDialog 與 active class 檢查。修正後 30 次關閉焦點壓測與 14 個完整 E2E 均在不重試下通過；此兩行源碼變更另交獨立 AI 複核並獲 PASS。
