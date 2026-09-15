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

這一輪沒有改任何實際價格、額外費用、早餐／寵物／訪客／退費／入住條件。既有正文以渲染後的完整文字與遷移前基準逐房核對。相關營位卡片唯一新增的可見說明，是將原來四帳價格前標明「4 帳平日」，避免把四帳標準價誤認為三帳起價。

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
