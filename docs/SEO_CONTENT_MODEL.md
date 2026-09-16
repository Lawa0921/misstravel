# SEO 與房型內容資料維護

視覺規範仍以 `docs/DESIGN_GUIDE.md` 為唯一來源，本文件只說明資料與搜尋資訊。

## 一次維護房價

每個房型 `src/content/rooms/*.md` 的 `weekdayPrice`、`holidayPrice`、`standardPrice` 是該房型標準方案的價格來源。三至四帳包區的標準方案只存標籤、帳數及 `isStandard: true`，人數與價格由頂層繼承；三帳替代方案另外儲存自己的價格與人數。不同房型即使金額相同也各自維護，因為它們是不同的住宿方案。

房型正文費用段與搜尋摘要使用受限制的數值參照，例如：

```text
平日：{{weekdayPrice}} 元
平日 {{priceOptions.0.weekdayPrice}} 元
三帳平日{{priceOptions.1.weekdayPrice}}元
```

`room-values.mjs` 同時供內容 schema 與 Markdown renderer 使用。建置會先驗證非負整數、唯一標準方案及資料一致性，再產生完整 HTML，不靠瀏覽器 JavaScript 或請求補文字。未定義、非數值、運算式或不在白名單中的參照會令建置失敗。Markdown 仍使用專案原有的 Satteri 引擎，沒有換另一套渲染規則。

這一輪沒有改任何實際價格、額外費用、早餐／寵物／訪客／退費／入住條件。既有正文以渲染後的完整文字與遷移前基準逐房核對。相關營位卡片唯一新增的可見說明，是將原來四帳價格前標明「4 帳平日」，並統一以 NT$ 與千分位顯示相同金額，避免把四帳標準價誤認為三帳起價。

`tests/fixtures/room-operating-copy.json` 是這次遷移的測試基準，不是第二套輸出資料來源。之後若有經營者核准的價格／條款變更，須同步更新相關驗收基準，不能把測試放寬或刪除。

## 房型摘要

十個房型的 description／metaDescription 均採正文已有事實。木屋明示公用衛浴等設備，套房分清平日不附早餐與假日／連續假期附早餐，三帳與四帳各自配對正確人數和價格。移除「最佳、頂級、全天候不用擔心天氣」等未由事實支持的承諾。摘要中的金額由數值參照產生；舊 keywords 的手寫價格區間移除，避免多一份會過期的金額。

## 房型與營區的結構化資料

每頁保留營區 LodgingBusiness，另外由 `room-schema.ts` 產生該頁自己的 Accommodation 和 WebPage。三個實體的 @id 不同；Accommodation.containedInPlace 指向營區，WebPage.mainEntity 指向住宿，住宿的 mainEntityOfPage 指回該頁。

不把房型庫存數量當成臥室數，不把基本入住人數當成無條件最高入住人數，不輸出不存在的即時空房、Offer、Product、評分、評論或固定入住／退房時間。照片只使用經核對的實景照片，不將尺寸圖或歷史公告當成住宿代表照片。這是語意資料改善，不代表已獲得 Google 住宿特殊搜尋結果資格。

## 原始照片描述

`src/lib/image-metadata.json` 逐張記錄房型頁使用的 127 張不同原圖，另有首頁、預設分享圖與菜單的 metadata。width／height 由原始檔量測；alt 由實際看圖確認，kind 區分 photo、diagram、notice。版本查詢字串不代表另一張照片，查表時會移除 query/hash，但輸出仍保留原始 URL。

輪播、房型卡片、相關房型、分享圖片與住宿 schema 共用同一份描述。新增房型照片卻沒有核對 metadata 時，建置／測試會失敗。照片位元組、排序與既有 CSS 外觀未修改；無 JavaScript 備援另補齊原本遺漏的第二張照片。

`image-sitemap.xml` 列出房型實景及原有36張圖集圖片，並在 robots.txt 宣告。這使輪播中延後下載的照片仍有直接可發現的網址，沒有為了搜尋而強制首屏下載全部圖片。園區地圖與菜單頁也會使用自己的既有圖片作分享圖，og:image:alt 不再錯用整頁摘要。

## 重跑檢核

```bash
npm ci
npm run verify
CI=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4336 npx playwright test --retries=0
ACCEPTANCE_BASE_URL=http://127.0.0.1:4336 node scripts/visitor-acceptance.mjs
```

先完成建置，再執行瀏覽器驗收，不能一邊清理 dist 一邊驗收。保持深色配色的既有測試、所有路由、canonical、robots 與原訂房流程檢查。

## 發布後才可衡量的結果

PR 預覽有 Vercel 登入保護；正式站需經使用者核准合併才會套用。網站修正與搜尋流量提升是兩件事。發布後應在 Search Console 提交／確認 sitemap、檢查代表性房型 URL 的算繪與收錄，分品牌／非品牌搜尋詞比較曝光、點擊及平均排名；尚未發布時不能聲稱這些成效已獲驗證。

官方規範參考：
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading
- https://schema.org/Accommodation
- https://docs.astro.build/en/guides/markdown-content/


## 補充防護

標準方案固定放在 priceOptions 第一項，避免索引式費用參照因重排而錯配；重排或矛盾資料會中止建置。除 description／metaDescription 及正文外，其餘輸出文字欄位不允許插入參照；不完整或多餘的大括號也會被拒絕。圖集頁與圖片 sitemap 共用 `src/lib/gallery.ts` 的清單，不另外維護張數。圖片描述僅陳述畫面，不構成免費備品、加床或其他服務承諾；營運條件仍以房型正文為準。

## 建置時響應式照片

`astro:config:setup` 由 `scripts/responsive-images.mjs` 使用既有 sharp 產生 WebP；build、dev、check、sync 都會先準備同一份 `.generated/responsive-images.json`。原始 bytes 加上管線設定／sharp 版本決定內容 hash，96／192／384／640／960／1280 寬度只縮小、不裁切，僅保留小於原檔的輸出。快取以輸出 SHA-256 驗證，缺失或損毀會重建；清理只限 `public/generated-images/ri-<hash>-<width>.webp` 自有命名。兩個生成目錄都不進版控，沒有網路下載或原圖改寫。

`src/lib/responsive-images.ts` 統一提供 intrinsic 尺寸、srcset、sizes 與含原始 query 的 `data-original-src`。src 與最大候選保留原圖；preload 與可見照片共用候選與 sizes。延後載入先設定 sizes、srcset，再設定 src；比較面板與縮圖只在需要時啟用。圖解／公告主要閱讀圖不降階；全螢幕先以已載入照片銜接，原圖就緒後替換。動畫依完整原圖身分配對，不能將不同版本或照片配成同一張。schema、OG、圖片 sitemap、下載連結仍引用原圖。

合成檔管線測試：`node scripts/test-responsive-images.mjs`；HTML 契約包含於 `npm run verify`。瀏覽器測試：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4336 npx playwright test responsive-images.spec.ts`（先建置）。


### 本輪搜尋摘要與量測界線

首頁、關於密式、交通、菜單、園區地圖的搜尋摘要改為原頁可支持的內容及用途；404 另設自己的 noindex 恢復導覽摘要，不再繼承首頁廣告文字。沒有修改十個房型價格、正文或營運規則。`guest-interface-baseline.json` 只更新這六頁的 SEO 雜湊，正文、圖片及連結契約保持原值；`seo-preservation-audit.mjs` 再對照修改前的建置，限制允許變動的 metadata。

衍生圖有完整原圖身分（含版本查詢字串），不以 currentSrc 相等判斷是不是同張照片。全螢幕先顯示已載入的同圖，再升級原始解析度；顯示尺寸預先使用原圖尺寸，升級不得重設使用者的縮放、平移或照片位置。原圖升級與裝飾動畫各自取消，不能因使用者按鍵而永遠停在小圖。縮圖列僅提供最大 384px 的候選，照片原圖連結、分享圖片與 image-sitemap 仍使用原 URL。

`scripts/seo-performance-audit.mjs` 比較新鮮瀏覽環境、停用快取下的實際同源圖片回應 bytes，另保留實驗室 LCP/CLS。這不是全站所有檔案總傳輸量，也不是真實訪客 Core Web Vitals；高 DPR 會選更大候選，不能只報低解析度的最大節省百分比。未查閱私人 Search Console／商家後台，不宣稱點擊率、收錄或排名已提升。


## Search Console 回報修正（2026-09-16）

- 舊日期網址以 Git 歷史 `1041513^` 的 19 份 Jekyll 內容為依據，`vercel.json` 明確對應 `.html` 及過去錯轉出的帶日期 `/` 路徑到同一個現行頁。精確規則先於通用 `:slug.html`；未知／截斷網址不猜測指向首頁，維持正常 404。測試基準在 `tests/fixtures/legacy-dated-routes.json`，正式站 smoke 會讀取實際規則並檢查查詢參數保留。
- 柑仔店的烹飪、烤肉、寢具是有歸還條件的租借服務，不是可直接購買的零售商品。以 `Service`、原供應者及 `Offer.businessFunction=LeaseOut` 表達，價格及每次計價沿用原值。Schema.org 的 Product 可以廣義描述租借，但 Google Merchant 購買體驗不是此頁目標；不為了追逐該報表添加虛構照片、配送、退貨、庫存或評論。Service 沒有本頁可保證取得的 Google 商品複合式搜尋結果。
- sitemap-index.xml 使用既有 @astrojs/sitemap 的 customSitemaps 納入 image-sitemap.xml；維持原 25 個 canonical 網址及所有原圖 URL，不更名、不虛造 lastmod、不增加重複 sitemap 產生器。
- Google 後台提交／接受 Sitemap 與實際重新擷取、更新歷史 404 或 Merchant 報表是不同狀態。網站修正需先合併部署，才可要求 Google 驗證公開版的修正；未部署前不按「驗證修正後的項目」。私人 Search Console 全量截圖／帳號／查詢資料不可提交公開儲存庫。

本輪官方規範：
https://developers.google.com/search/docs/crawling-indexing/301-redirects
https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
https://schema.org/Service
https://schema.org/Offer
https://support.google.com/webmasters/answer/7451001?hl=zh-Hant


## 完整 Sitemap 交付（取代本次前一版分開的兩份索引）

一般頁面與圖片現在在發布時組成同一份 XML。已存在的 `image-sitemap.xml` 不再只列 11 個相簿／房型頁，而是包含全部 25 個正式 canonical 頁面；其中原有 11 頁的 139 個圖片參照全部保留。檔名沿用是相容性決策，不代表它只能列圖片。Google 的圖片 sitemap 是標準 urlset 的擴充，沒有圖片的網頁可以共存。

- `scripts/complete-sitemap.mjs` 包裝既有 `@astrojs/sitemap` 的 build-done hook：先完成官方路由探索，再與原有圖片 endpoint 的結果合併，最後在 Vercel 複製產物前寫入。
- `sitemap-index.xml` 只指向這份完整清單，避免一般頁面的探索依賴另一個尚未處理成功的子檔。
- `sitemap-0.xml` 維持 HTTP200，輸出相同的完整 XML 作相容入口，不移除、不導向首頁、不另寫一份頁面清單。
- 原本 25 個 canonical 頁面與圖片對應不變。沒有新增假日期或 lastmod，也沒有更動 robots、WAF、安全標頭、原圖、字型、價格或畫面。
- 新增頁面由 Astro 的實際建置探索自動帶入，不需維護另一份手工 URL 陣列。空清單、重複／外站 URL、孤立圖片及容量超限會中止建置。

此修正提供一條完整而可驗證的發現途徑，不把它宣稱為已證明 Google 舊擷取錯誤的內部根因。發布後必須看 Search Console 的實際「成功／25 個網頁」，不能以本機 HTTP200 代替；舊提交紀錄的結果與主要完整清單的結果分開記錄。

依據：https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
