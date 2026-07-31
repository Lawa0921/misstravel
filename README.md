# 密式旅行 MissTravel

苗栗露營與住宿網站，使用 Astro 建構。

## 開發

```bash
cd astro-site
npm install
npm run dev
```

## 部署

推送到 main 分支後，會自動部署到 Vercel。

正式主網域是 `www.misstravel.me`。Vercel 專案必須同時綁定
`misstravel.me`，讓 `vercel.json` 能將裸網域永久轉址到 `www`；
DNS 也應讓兩個網域都指向同一個 Vercel 專案。

Vercel 回報 Production 部署成功後，GitHub Actions 會自動執行正式環境
smoke test，驗證裸網域轉址、核心頁面、canonical、結構化資料、
robots.txt、sitemap 與 RoomCloud 訂房連結。也可以在 Actions 頁面手動
執行 `Production Smoke`，或於 `astro-site` 目錄執行：

```bash
npm run smoke:production
```

## 網站

- 正式環境：https://www.misstravel.me
