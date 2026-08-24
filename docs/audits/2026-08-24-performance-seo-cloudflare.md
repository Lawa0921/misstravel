# 密式旅行：效能、SEO 與訪問統計調查報告

調查日期：2026-08-24（Asia/Taipei）
調查範圍：目前 Git worktree、Astro build 產物、production `https://www.misstravel.me`、DNS/HTTP/Chromium 實測，以及 Cloudflare、Vercel、Google 官方文件。

## Remediation 前快照

以下「一頁結論」、證據與量測紀錄是 2026-08-24 修正 PR 前的 production/worktree 快照；其中的「目前」是 remediation 前語境，不代表修正 PR 已部署。

## 修正 PR 狀態

- 本 PR 明確選擇 **Vercel Analytics** 作為訪問統計方案；不新增 Cloudflare beacon，也不改 DNS proxy。
- 已實作：VideoObject 真值（`uploadDate=2017-11-07T00:26:31-08:00`、`duration=PT2M37S`）、JSON Feed URL fallback、production video/404/Analytics strict smoke、36 張 `480×360` quality-80 WebP thumbnails 與 gallery thumbnail payload/integrity tests。
- 尚未部署：PR 尚未 merge，Vercel production 仍需在 merge/deploy 後驗證；Analytics project toggle、production artifact 與 live endpoint 仍是 deployment 後驗收事項。
- Loader smoke 只證明 `/_vercel/insights/script.js` 回 HTTP 200 且 MIME 是 JavaScript；不宣稱 browser view ingestion。實際 view request 與後台收數須在 deployment 後由人工或後續 browser gate 驗證。
- 新增 36 張衍生縮圖，原始 `public/images/galleries/gallery_*.webp` 未修改；lightbox anchor 與 ImageGallery JSON-LD 仍指向原圖。
- 本地驗證（尚未部署）：targeted 27/27、完整 `npm run verify` 184 tests、`npm run test:e2e` 6/6；這些不替代 deployment 後的 production/ingestion 驗證。

## 一頁結論（remediation 前快照）

網站本體沒有全面性故障：本機 178 個測試、5 個瀏覽器互動測試與 production smoke 全部通過；production 的 canonical、robots、sitemap、主要 JSON-LD、404 與網域轉址也正常。手機模擬 Lighthouse 的首頁分數為 Performance 90、SEO 100、Accessibility 100。

目前公開證據可以證明「網站訪問」沒有任何可工作的 Cloudflare 收集路徑；但使用者看到的 Cloudflare dashboard/tab 尚未取得，因此必須依統計種類分開下結論：

1. `www.misstravel.me` 目前直接連到 Vercel，HTTP 流量沒有經 Cloudflare proxy；Cloudflare 的 HTTP traffic analytics 看不到這些訪問。
2. 頁面也沒有 Cloudflare Web Analytics beacon（瀏覽器中的計數小程式），因此 DNS-only 架構下同樣不會送 Cloudflare page view。
3. 專案雖注入 Vercel Web Analytics loader，但 production 的 `/_vercel/insights/script.js` 回傳 404 HTML，Vercel page view 也沒有開始執行。

白話說，若看的數字是 HTTP visits 或 Web Analytics，目前是「Cloudflare 櫃台沒在入口、頁面也沒派計數員；原本以為能替代的 Vercel 計數員，其程式又載不到」。若看的是 DNS Analytics，Cloudflare 仍可記錄 DNS query，但那不是人次或 page view。最終仍需一張 dashboard 名稱/URL 截圖確認使用者所指口徑。

最小、風險最低的恢復方案，是先選一套統計作為唯一真相：

- 若只需要可靠訪問趨勢：先確認 Vercel intended production branch/commit，再沿用程式碼已接好的 Vercel Analytics，在 project 後台啟用並只重新部署已確認的 artifact；驗收條件是 `/_vercel/insights/script.js` 回 200 JavaScript，實際瀏覽會送出 view request。
- 若明確需要 Cloudflare Web Analytics：維持 DNS-only，手動加入 Cloudflare beacon 與必要 CSP allowlist 即可；不必只為統計把整站改成 Cloudflare proxy。
- 不建議同時開兩套再比較原始 visit 數字；兩邊的去重、bot 與隱私規則不同，數字本來就不會相等。

## 證據強度與限制

本報告把結論分成三種，避免把合理猜測寫成事實：

- **已證實**：有目前 source、build、DNS、HTTP 或瀏覽器 network 證據。
- **高機率**：符合官方故障條件，但需要平台後台才能確認。
- **待確認**：需要 Search Console、Cloudflare/Vercel 帳號或歷史 zone audit log。

沒有 Cloudflare、Vercel、Google Search Console 後台權限，因此無法證明「哪一天、誰把 proxy 或 Analytics toggle 改掉」。Repo 歷史從未出現 Cloudflare beacon；2026-02-04 起已有 Vercel adapter 的 `webAnalytics.enabled`。現況根因可以證實，停止記錄的精確歷史事件不能由公開資料反推。

另有一個重要限制：目前 production 與 worktree 不是同一份可辨識的頁面 artifact。Current source/本機 build 有首頁 `StayChoices`，production 沒有，CSS hash 也不同。以下 production 量測代表線上版本，不可直接當成目前 source 修改後的結果。

## 優先處理清單

| 優先級 | 項目 | 證據 | 建議的最小動作 | 完成判準 |
|---|---|---|---|---|
| P0 | 恢復一套訪問統計 | Cloudflare 無 proxy/beacon；remediation 前 Vercel loader 404 | 本 PR 選 Vercel Analytics；merge 後確認 toggle、deploy/promote 正確 artifact | loader smoke 先驗 200 + JavaScript MIME；deployment 後另以 browser view request 與後台延遲收數驗證 |
| P1 | 辨識 intended production artifact | 首頁 marker 與 CSS hash 不同 | 先到 Vercel 查 production deployment 的 branch/commit，確認它是否應跟 `main`；確認後才決定是否部署 | 報告 intended commit 與線上 commit；若需部署，再以 marker/hash 與 smoke 驗收 |
| P0 SEO | 修正假的 VideoObject 日期/時長 | remediation 前 source 寫 2023-01-01、PT1M30S；YouTube 真值為 2017-11-07T00:26:31-08:00、157 秒 | 本 PR 將 `uploadDate`/`duration` 改為真值並加 exact smoke assertion | merge/deploy 後 build JSON-LD 與影片來源一致，production smoke 覆蓋影片頁 |
| P1 效能 | 圖集縮圖 | remediation 前 `/galleries/` 解碼後圖片 payload 約 2.03 MiB；原圖未改 | 本 PR 新增 36 張 Sharp quality-80、480×360 WebP，`<img>` 用縮圖、anchor/schema 保留原圖 | 本機 thumbnail total `<1 MiB`、integrity 與 E2E budget 綠，lightbox 互動不退化 |
| P1 | 防止 Analytics 靜默再壞 | remediation 前 smoke 不檢查 analytics endpoint | 本 PR 在既有 production smoke 加 strict 200 + JavaScript MIME gate | 404 或錯誤 MIME 讓 smoke 失敗；view ingestion 另於部署後驗證 |
| P2 SEO | 擴充 production SEO smoke | remediation 前 smoke 未抽查影片、未知 404 與 analytics endpoint | 本 PR 在既有 script 加 video、404、analytics 三個 case，不加新框架 | 假 VideoObject、soft 404 或 loader 404/MIME 回歸會讓 smoke 失敗 |
| P2 效能 | 減少首頁非首屏背景圖 eager load | 首頁 6 個 CSS background 都會抓，圖片共 0.45 MiB | 有實際預算壓力時改成 native lazy `<img>`；先不加 IntersectionObserver | 首屏以外 tile 不在 initial requests，視覺與無障礙不退化 |
| P3 | 修正 JSON Feed fallback | `context.site` 缺失時字串會黏成錯誤 URL | 用 `new URL()` 組網址並加一個 fallback 測試 | 有/無 `context.site` 都產生合法絕對 URL |

`P0` 表示現在就影響資料可信度；`P1` 是先確認、再處理的高潛力項；`P2/P3` 則應排在前面問題之後。

## Cloudflare / Vercel 統計根因

### 先確認使用者看的 dashboard

| 可能的頁籤/產品 | 現況可下的結論 | 還缺什麼 |
|---|---|---|
| Cloudflare zone 的 HTTP Traffic / Web Traffic | **已證實無法反映本站 HTTP visits**：`www` 是 DNS-only，request 直達 Vercel | 後台截圖只用來確認這就是使用者看的頁籤 |
| Cloudflare Web Analytics | **已證實無法收到 page views**：production 無 beacon，DNS-only 又不能 automatic injection | 確認後台是否仍有舊 site/token，以及預期網域 |
| Cloudflare DNS Analytics | Cloudflare 仍是 authoritative DNS，理論上仍可收到 DNS queries；這不等於訪客或瀏覽次數 | Dashboard 時間範圍與 DNS query 圖表截圖 |
| Vercel Web Analytics | **已證實目前 loader 失效**：production script endpoint 回 404 HTML | Project toggle、environment 與最後一次 enable 後 deployment |

所以「Cloudflare 訪問數為何不對」的精確答案取決於第一欄；前兩種訪問口徑的收集斷點已可由公開證據定位，DNS Analytics 則不能被本報告宣告失效。

### 已證實 1：HTTP 流量沒有經 Cloudflare proxy

- Cloudflare 是此網域的 authoritative DNS，但 `www.misstravel.me` 公開 CNAME 是 `8ac36d9b3a9e9e93.vercel-dns-017.com`，解析至 Vercel IP。
- Production 回應有 `server: Vercel`、`x-vercel-cache`，沒有 `cf-ray`、`cf-cache-status` 或其他 Cloudflare edge headers。
- Apex `misstravel.me` 也是由 Vercel 回 308 到 `www`。

這符合 Cloudflare 的 DNS-only 行為：Cloudflare 只回答 DNS，不代理後續 HTTP request，因此仍可能看到 DNS query metrics，但不會有完整網站訪問統計。官方說明：[Proxy status](https://developers.cloudflare.com/dns/proxy-status/)、[Cloudflare Analytics FAQ](https://developers.cloudflare.com/analytics/faq/about-analytics/)。

### 已證實 2：沒有 Cloudflare Web Analytics beacon

- Repo 與 production HTML 都沒有 `static.cloudflareinsights.com/beacon.min.js` 或 `data-cf-beacon`。
- Chromium resource log 也沒有 Cloudflare beacon/request。
- Cloudflare automatic setup 需要 proxied site；DNS-only site 必須手動放 snippet。官方說明：[Web Analytics get started](https://developers.cloudflare.com/web-analytics/get-started/)、[Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/)。

目前 CSP 也尚未允許 manual beacon 所需的 Cloudflare script/connect origins。若選 Cloudflare 路線，必須一起調整 `vercel.json` 的 `script-src` 與 `connect-src`，再以真實 browser network 驗證；不能只測 HTML 裡有字串。

### 已證實 3：Vercel Analytics loader 404（remediation 前快照）

- `astro-site/astro.config.mjs:10-15` 啟用 `webAnalytics.enabled`。
- Build/production HTML 因此注入 `/_vercel/insights/script.js`。
- 2026-08-24 production 實測此 URL 回 HTTP 404、`content-type: text/html`、12,749-byte 網站 404 頁。
- Chromium 同時記錄 404 與 `net::ERR_ABORTED`；HTML 不能當 JavaScript 執行，因此 Vercel beacon 沒有啟動。

高機率原因是 Vercel project 的 Analytics toggle 未啟用，或啟用後沒有重新 deploy/promote production；這需要後台確認。官方 troubleshooting 也要求先確認 project 已 enable，再重新部署：[Vercel Web Analytics quickstart](https://vercel.com/docs/analytics/quickstart)、[Troubleshooting](https://vercel.com/docs/analytics/troubleshooting)。

### Remediation 決策

**本 PR 已選 Vercel Analytics。** 理由不是它一定比 Cloudflare 好，而是 repository 已有 loader、CSP 也已允許 Vercel；PR 本身不宣稱已恢復收數，需 merge 後確認 toggle、deploy/promote 正確 artifact，再以 loader smoke、browser view request 與後台延遲收數驗收。

只有在需要 Cloudflare 特有 dashboard 或明確指定資料落在 Cloudflare 時，才加入 manual beacon。只為 page views 把 DNS 改成 proxied 會同時引入 CDN/cache/TLS/redirect 行為變化，範圍遠大於必要修復。

## 效能調查

### Production 量測

Playwright Chromium 1280×720、等待 network idle 後累加同源 `response.body().length`。這是**解壓後 response body payload proxy**，不是封包層 wire transfer size，也不含 header/TLS 成本：

| Route | 解碼後 body payload | 圖片 body | 同源 resources |
|---|---:|---:|---:|
| `/` | 0.71 MiB | 0.45 MiB | 13 |
| `/rooms/` | 1.86 MiB | 1.60 MiB | 15 |
| `/rooms/log_cabin_4/` | 1.03 MiB | 0.77 MiB | 11 |
| `/galleries/` | 2.30 MiB | 2.03 MiB | 41 |
| `/infos/guide/` | 1.43 MiB | 1.17 MiB | 21 |

Lighthouse 2026-08-24 單次手機模擬：

| Route | Performance | SEO | Accessibility | LCP | TBT | CLS | 傳輸 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 90 | 100 | 100 | 3.7 s | 0 ms | 0 | 700 KiB |
| `/rooms/log_cabin_4/` | 97 | 100 | 96 | 2.6 s | 0 ms | 0 | 1,024 KiB |

Lighthouse 是受模擬網路與單次波動影響的 lab data，不是 Search Console 的真實使用者 Core Web Vitals。它能定位問題，不能證明所有訪客都得到同一秒數。Playwright payload 也受 viewport、DPR、瀏覽器 lazy-load heuristics、production artifact 與 edge cache 時點影響；本表只作同設定下的候選頁比較，不能稱為使用者實際傳輸量。

### 已證實的主要瓶頸

1. **圖片 pipeline 沒真正被使用（remediation 前快照；gallery thumbnail 為本 PR 例外）。** `astro.config.mjs` 有 `imageService: true`，專案也已安裝 Sharp；remediation 前 source 的 `<img>` 沒有 `srcset`、`sizes`、`astro:assets`/`<Image>`，瀏覽器多半取得 public 裡的原尺寸檔。本 PR 只對 gallery 一次性加入 36 張 public thumbnails，未引入 runtime image pipeline；這能證明仍有 responsive-image 改善空間，不能單獨證明對 LCP 的收益。
2. **圖集的 `loading="lazy"` 在本次環境不是按需邊界。** remediation 前 `/galleries/` 一次輸出 36 張原圖，本次 fresh page/network-idle 量測全部進入 response；Chrome 的 lazy-load 距離門檻可能隨網路與版本改變。本 PR 已對圖集先導入 36 張小 thumbnail，必要時仍載原圖，再以 payload 與 E2E budget 驗證。
3. **Public 圖片總量大。** 233 張共 29.85 MiB；最大房型圖是 4032×3024、1.78 MiB，遠高於常見手機顯示尺寸。總 repo 大小本身不直接拖慢單頁，但代表若引用原圖，代價很高。
4. **首頁 tile 用 CSS background。** 六張 tile 圖不能使用 native `<img loading="lazy">`，首次進首頁都會抓；目前約 0.45 MiB，收益小於先修 gallery/rooms。
5. **圖片 cache 只有一天。** Lighthouse 估計重訪可少約 187 KiB，但 public URL 沒有內容 hash。不能直接把它們設成一年 immutable，否則換圖後訪客可能長期看到舊圖；先版本化檔名或導入產物 hash，再拉長 TTL。

### 已做得好，不要重做

- Astro static output、共用 JS defer、零 hydration islands；Lighthouse TBT 為 0 ms。
- LCP 圖與本機 font 已 preload；font 使用 `font-display: swap`。
- Font/hashed assets 已一年 immutable；圖片有一天 cache + 七天 stale-while-revalidate。
- 房型輪播只先抓相鄰圖，既有 E2E 有 `<2 MB` budget，實測通過。
- 不應修改受保護的 `public/fonts/setofont.woff2`；目前沒有證據需要再做 font subset。

## SEO 調查

### 已證實的強項

- 共用 `Head` 集中輸出 title、description、canonical、Open Graph、Twitter、robots、RSS/JSON Feed、preload。
- `astro.config.mjs` 統一 `https://www.misstravel.me`、trailing slash 與 sitemap；apex deep path 會 308 且保留 path。
- Production robots/sitemap index/sitemap 都回 200；sitemap 25 個 URL 全為 `www`。
- 未知路徑回真正 HTTP 404，並有 `noindex, nofollow`，不是 soft 404。
- 主要頁面已有 LodgingBusiness、WebSite、Product、ItemList、BlogPosting、VideoObject、ImageGallery、BreadcrumbList 等 JSON-LD。

### 確定缺口與刻意不做的項目

1. **VideoObject 真值錯誤（remediation 前快照；本 PR 已修正 source/test）。** remediation 前 `src/pages/infos/[...slug].astro:28-29` 寫死 `uploadDate: 2023-01-01`、`duration: PT1M30S`；YouTube 頁面 metadata 實際是 `2017-11-07T00:26:31-08:00` 與 `lengthSeconds: 157`（ISO 8601 為 `PT2M37S`）。本 PR 已改為完整日期時間與真實時長，merge/deploy 後仍須由 production smoke 驗證。[Google Video structured data](https://developers.google.com/search/docs/appearance/structured-data/video)
2. **現在不應硬補 BlogPosting author。** Google Article 文件明說沒有必填欄位，`author`/`author.url` 是支援的建議屬性；目前公告正文沒有可見作者署名，直接在 JSON-LD 填一個使用者看不到的作者反而違反結構化資料應對應可見內容的原則。等產品決定顯示真實 byline 時，再以同一人物/組織補 `author`；本報告不再把 `url` 或 `mainEntityOfPage` 當成 Google 文件要求。[Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
3. **Production smoke 抽樣不足（remediation 前快照；本 PR 已補 gate）。** remediation 前只驗首頁、rooms、代表房型、robots、sitemap；本 PR 已加入影片 VideoObject、未知 404/noindex、Analytics 200 + JavaScript MIME 三個 strict case。
4. **JSON Feed fallback 有條件式壞網址（本 PR 已修正）。** `src/pages/feed.json.ts` 現在透過 `resolveSiteUrl(URL | undefined)` 正規化 fallback；正常 build 有 `site`，仍以 integrity test 鎖住有/無 base 的合法絕對 URL。

### 需要 Google 工具才能定案

- 房型輪播第 3 張以後只先輸出 `data-src`，一般瀏覽器互動正常且 JSON-LD 仍列所有圖片；是否影響 Google Images，需用 Search Console URL Inspection 的 rendered HTML 驗證後再改，不應僅憑猜測犧牲目前的載入節流。
- 程式與 smoke 能證明 sitemap/metadata 可用，不能證明 Google 已選用 canonical、已索引或展示 rich result。需在 Search Console 檢查 sitemap、canonical selection、Video/Article enhancement。

## 驗證紀錄（remediation 前快照）

### 可重現環境

```text
OS: Linux 6.18.33.2-microsoft-standard-WSL2 x86_64
Node: 22.22.0
npm: 10.9.4
Playwright: 1.62.1
Chrome for Testing: 151.0.7922.34
Lighthouse: 13.4.1
```

Playwright payload 表使用每個 route 一個 fresh incognito page/context、viewport 1280×720、DPR 1、`waitUntil: networkidle` 後再等 250 ms；只計同源 response，並依 URL 去重。可重跑的核心 script：

```js
import { chromium } from '@playwright/test';

const base = 'https://www.misstravel.me';
const routes = ['/', '/rooms/', '/rooms/log_cabin_4/', '/galleries/', '/infos/guide/'];
const browser = await chromium.launch({ headless: true });

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const responses = new Map();

  page.on('response', (response) => {
    if (new URL(response.url()).origin !== base || responses.has(response.url())) return;
    responses.set(response.url(), (async () => ({
      contentType: response.headers()['content-type'] ?? '',
      bytes: await response.body().then((body) => body.length).catch(() => 0),
    }))());
  });

  await page.goto(base + route, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(250);
  const items = await Promise.all(responses.values());
  console.log(route, {
    decodedBodyBytes: items.reduce((sum, item) => sum + item.bytes, 0),
    imageBodyBytes: items.filter((item) => item.contentType.startsWith('image/'))
      .reduce((sum, item) => sum + item.bytes, 0),
    uniqueResources: items.length,
  });
  await page.close();
}

await browser.close();
```

執行方式：在 `astro-site/` 用 `node --input-type=module` 執行上述程式。完整 per-resource raw JSON 已保存於 [`evidence/2026-08-24-production-payload.json`](evidence/2026-08-24-production-payload.json)，SHA-256 `777fcf0e7ff208423ebf3d7079ae061e1efb2289fed7eacf5ae56336409b7ee9`。

Lighthouse 使用 CLI 預設 mobile config：412×823、DPR 1.75、simulated throttling（RTT 150 ms、throughput 1638.4 Kbps、CPU slowdown 4×），每個 URL各跑一次：

```sh
CHROME_PATH=/home/lawa0921/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
  npx --yes lighthouse@13.4.1 https://www.misstravel.me/ \
  --output=json --output-path=/tmp/misstravel-lighthouse-home.json \
  --chrome-flags='--headless --no-sandbox' --quiet

CHROME_PATH=/home/lawa0921/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
  npx --yes lighthouse@13.4.1 https://www.misstravel.me/rooms/log_cabin_4/ \
  --output=json --output-path=/tmp/misstravel-lighthouse-room.json \
  --chrome-flags='--headless --no-sandbox' --quiet
```

Lighthouse raw JSON 本次位於 `/tmp/misstravel-lighthouse-home.json` 與 `/tmp/misstravel-lighthouse-room.json`，沒有加入 repo且不是持久 artifact；上面的完整命令可重新產生。當次 SHA-256：首頁 `57f098f0f84c69573e1781d96f2500323351ea36ecb0b2d77bd09f6737609e32`；房型 `2f448ef72701aea7705f309bc1d7483abf13d65b8657d3ae3cb53025a761030e`。Production 會變、lab 分數也有波動，重跑的合理判準是方向與量級，不是逐 byte/逐分相等。

DNS/HTTP 核心 probe 可用下列命令重現：

```sh
node -e "const d=require('node:dns').promises; Promise.all(['CNAME','A'].map(t=>d.resolve('www.misstravel.me',t).then(v=>[t,v]))).then(console.log)"
curl -sSIL https://www.misstravel.me/
curl -sS -D - -o /dev/null https://www.misstravel.me/_vercel/insights/script.js
curl -sS https://www.misstravel.me/ | rg "_vercel/insights|cloudflareinsights|data-cf-beacon"
```

### 測試與 smoke

本次主調查實跑：

```text
npm ci
  added 425 packages; 0 vulnerabilities

npm run verify
  Astro build: 26 pages
  Test files: 19 passed
  Tests: 178 passed

npm run test:e2e
  5 passed (3.2s)
  log_cabin_4 initial same-origin resources: 1.03 MB

npm run smoke:production
  7 checks passed: apex deep redirect, homepage/rooms/room metadata+schema,
  robots, sitemap index, sitemap URLs
```

第一次 `verify` 因本機 `node_modules` 缺少 lockfile 已列依賴而失敗；`npm ci` 後相同指令通過。第一次 E2E 因缺 Chromium 而失敗；安裝該版本 Chromium 後相同 5 個測試通過。這兩次是本機環境缺件，不是應用斷言失敗。

Production probes：

```text
GET /                                      200, server: Vercel
GET /_vercel/insights/script.js            404, text/html
GET /robots.txt                            200
GET /sitemap-index.xml                     200
GET /404-does-not-exist/                   404, noindex
GET https://misstravel.me/deep/path?...    308 to www, path/query preserved
```

remediation 前調查沒有修改價格、訂房/付款流程、營運規則、公開文案、圖片或 font。修正 PR 另新增 36 張衍生 WebP thumbnails（原始 gallery 圖片未修改），並更新 gallery markup/tests；既有未追蹤 `outputs/` 未碰。

## 建議執行順序

1. Merge 本 PR 前確認 review/CI；本 PR 已用失敗測試鎖住 Analytics loader、VideoObject、Feed 與 gallery contracts。
2. Merge 後在同一個 Vercel project 確認 Analytics toggle、production artifact，完成 deploy/promote。
3. 部署後先跑 strict loader/video/404 smoke；再以 browser network view request 與 Vercel dashboard 延遲收數驗證 ingestion，這不由 loader smoke 單獨宣稱。
4. `/galleries/` 的 36 張 responsive thumbnails 已在本 PR 導入；以現有 Playwright/integrity payload budget 驗證，並保留 lightbox 的原圖需求。`/rooms/` 仍待另案評估。
5. Search Console 驗證輪播圖片後，才決定是否改完整 `src` 輸出；Feed fallback 已在本 PR 修正。

未建議新增 SEO 套件、圖片套件、另一套監測服務或 custom cache layer；現有 Astro、Sharp、Vercel 與測試框架已足夠完成上述工作。
