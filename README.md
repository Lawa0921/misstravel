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

## 網站

- 正式環境：https://www.misstravel.me
