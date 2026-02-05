# Jekyll to Astro 遷移計劃

## 專案概述

將「密式旅行」官方網站從 Jekyll 4.3 遷移到 Astro 5.x 框架。

**現有技術棧**：Jekyll 4.3 + Bootstrap 4 + HTML5 UP "Forty" 主題 + jQuery
**目標技術棧**：Astro 5.x + Tailwind CSS 4 + 現代化元件架構

---

## 第零階段：Linus 式核心問題分析

### 這是個真問題嗎？

**是的**。遷移到 Astro 解決以下實際問題：
- Jekyll 生態系統老化，Ruby 依賴管理複雜
- Liquid 模板語法表達能力有限
- 缺乏現代開發體驗（熱更新慢、無 TypeScript 支援）
- 效能優化需要大量手動配置

### 會破壞什麼嗎？

**必須保持的不變性**：
1. 所有現有 URL 結構（SEO 關鍵）
2. 結構化資料（Schema.org）
3. 表單功能（Formspree 整合）
4. PWA 支援
5. 外部預訂系統連結
6. 圖片資源路徑

---

## 第一階段：基礎建設（Phase 1）

### 1.1 初始化 Astro 專案

```bash
# 在專案根目錄創建 astro 子目錄進行開發
npm create astro@latest astro-site -- --template minimal
cd astro-site
npm install
```

### 1.2 安裝核心依賴

```bash
# Tailwind CSS 4
npm install tailwindcss @tailwindcss/vite

# Astro 整合
npm install @astrojs/sitemap @astrojs/rss

# 圖片優化
npm install sharp
```

### 1.3 配置 astro.config.mjs

- site: `https://misstravel.me`
- 輸出模式: static（GitHub Pages）
- 整合: sitemap, 圖片優化
- 保持現有 URL 結構

### 1.4 資料夾結構設計

```
astro-site/
├── src/
│   ├── components/      # 可重用元件
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Tiles.astro
│   │   ├── Breadcrumb.astro
│   │   ├── RoomCarousel.astro
│   │   ├── RelatedRooms.astro
│   │   └── SEO/
│   │       ├── Head.astro
│   │       ├── SchemaOrg.astro
│   │       └── OpenGraph.astro
│   ├── layouts/         # 頁面佈局
│   │   ├── BaseLayout.astro
│   │   ├── RoomLayout.astro
│   │   └── PostLayout.astro
│   ├── pages/           # 路由頁面
│   │   ├── index.astro
│   │   ├── rooms/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── infos/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── announcements/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── galleries.astro
│   │   ├── sale-items.astro
│   │   ├── 404.astro
│   │   ├── feed.json.ts
│   │   └── feed.xml.ts
│   ├── content/         # 內容集合（取代 Jekyll Collections）
│   │   ├── config.ts    # 集合 Schema 定義
│   │   ├── rooms/
│   │   ├── infos/
│   │   └── announcements/
│   ├── styles/          # 樣式
│   │   └── global.css
│   └── lib/             # 工具函數
│       ├── seo.ts
│       └── utils.ts
├── public/              # 靜態資源（直接複製）
│   ├── images/
│   ├── fonts/
│   ├── CNAME
│   ├── robots.txt
│   ├── site.webmanifest
│   └── browserconfig.xml
└── astro.config.mjs
```

---

## 第二階段：內容遷移（Phase 2）

### 2.1 內容集合 Schema 定義

**src/content/config.ts**：

```typescript
import { defineCollection, z } from 'astro:content';

const roomsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    metaTitle: z.string(),
    description: z.string(),
    metaDescription: z.string(),
    keywords: z.string(),
    weekdayPrice: z.number(),
    holidayPrice: z.number(),
    standardPrice: z.number(),
    numberOfRooms: z.number(),
    numberOfPeople: z.number(),
    order: z.number(),
    isCampsite: z.boolean(),
    mainImage: z.string(),
    images: z.array(z.string()),
  }),
});

const infosCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaTitle: z.string(),
    description: z.string(),
    metaDescription: z.string().optional(),
    keywords: z.string().optional(),
    image: z.string().optional(),
  }),
});

const announcementsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaTitle: z.string(),
    description: z.string(),
    datetime: z.date(),
    tags: z.array(z.string()),
    image: z.string().optional(),
  }),
});

export const collections = {
  rooms: roomsCollection,
  infos: infosCollection,
  announcements: announcementsCollection,
};
```

### 2.2 內容檔案遷移對照

| Jekyll 來源 | Astro 目標 | 轉換要點 |
|------------|-----------|---------|
| `_rooms/*.md` | `src/content/rooms/*.md` | Frontmatter 駝峰命名 |
| `_infos/*.md/html` | `src/content/infos/*.mdx` | HTML 轉 MDX |
| `_announcements/*.html` | `src/content/announcements/*.mdx` | HTML 轉 MDX |

### 2.3 Frontmatter 轉換規則

Jekyll (snake_case) → Astro (camelCase)：
- `meta_title` → `metaTitle`
- `short_title` → `shortTitle`
- `meta_description` → `metaDescription`
- `weekday_price` → `weekdayPrice`
- `holiday_price` → `holidayPrice`
- `standard_price` → `standardPrice`
- `number_of_rooms` → `numberOfRooms`
- `number_of_people` → `numberOfPeople`
- `is_campsite` → `isCampsite`
- `main_image` → `mainImage`

---

## 第三階段：元件開發（Phase 3）

### 3.1 佈局元件對照

| Jekyll Include | Astro Component | 優先級 |
|----------------|-----------------|--------|
| `head.html` | `components/SEO/Head.astro` | P0 |
| `header.html` | `components/Header.astro` | P0 |
| `footer.html` | `components/Footer.astro` | P0 |
| `tiles.html` | `components/Tiles.astro` | P1 |
| `visual-breadcrumb.html` | `components/Breadcrumb.astro` | P1 |
| `room-related-links.html` | `components/RelatedRooms.astro` | P2 |
| `enhanced-seo-tags.html` | `components/SEO/OpenGraph.astro` | P1 |
| `room-structured-data.html` | `components/SEO/SchemaOrg.astro` | P1 |
| `post-structured-data.html` | `components/SEO/SchemaOrg.astro` | P1 |
| `schema-room.html` | `components/SEO/SchemaOrg.astro` | P1 |
| `performance-optimization.html` | Astro 內建優化 | - |
| `seo-performance-boost.html` | Astro 內建優化 | - |

### 3.2 佈局轉換

| Jekyll Layout | Astro Layout | 說明 |
|---------------|--------------|------|
| `home.html` | `layouts/BaseLayout.astro` + 首頁專用 | Banner + Tiles |
| `page.html` | `layouts/BaseLayout.astro` | 通用頁面 |
| `room.html` | `layouts/RoomLayout.astro` | 房型詳情 + Carousel |
| `post.html` | `layouts/PostLayout.astro` | 公告/資訊 |

---

## 第四階段：樣式遷移（Phase 4）

### 4.1 策略選擇

**方案 A（推薦）：Tailwind CSS 重寫**
- 優點：現代化、效能最佳、維護性好
- 缺點：需要重新設計所有樣式
- 工作量：高

**方案 B：保留 Bootstrap + 自訂 SCSS**
- 優點：視覺一致性、遷移快速
- 缺點：技術債、Bundle 較大
- 工作量：中

**建議**：採用方案 A，同時保持現有視覺設計語言。

### 4.2 設計 Token 提取

從現有 `_sass/libs/_vars.scss` 提取設計變數：

```css
/* src/styles/tokens.css */
:root {
  /* 顏色 */
  --color-primary: #2e3842;
  --color-accent: #9bf1ff;
  --color-bg: #242943;

  /* 間距 */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  /* ... */

  /* 字體 */
  --font-heading: 'Source Sans Pro', sans-serif;
  --font-body: 'Source Sans Pro', sans-serif;
}
```

### 4.3 響應式斷點對照

| Skel.js 斷點 | Tailwind 對應 |
|-------------|--------------|
| xlarge | 2xl (1536px) |
| large | xl (1280px) |
| medium | lg (1024px) |
| small | md (768px) |
| xsmall | sm (640px) |
| xxsmall | xs (480px) |

---

## 第五階段：JavaScript 遷移（Phase 5）

### 5.1 功能分析與替代方案

| jQuery 功能 | 現代替代方案 |
|------------|-------------|
| Parallax 效果 | CSS `background-attachment: fixed` 或 Intersection Observer |
| Scrolly 平滑滾動 | CSS `scroll-behavior: smooth` |
| Skel.js 響應式 | Tailwind CSS 斷點 |
| 磁磚動畫 | CSS Transitions + Intersection Observer |
| 菜單開關 | 原生 JavaScript |
| Carousel | Swiper.js 或自建 Astro 元件 |

### 5.2 輕量化 JavaScript

```typescript
// src/lib/menu.ts - 菜單控制
export function initMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu');
  toggle?.addEventListener('click', () => {
    menu?.classList.toggle('is-visible');
  });
}

// src/lib/carousel.ts - 圖片輪播
// 使用 Swiper.js 或原生實現
```

---

## 第六階段：靜態資源遷移（Phase 6）

### 6.1 直接複製（無需修改）

```bash
cp -r assets/images/* astro-site/public/images/
cp -r assets/fonts/* astro-site/public/fonts/
cp CNAME astro-site/public/
cp robots.txt astro-site/public/
cp assets/images/site.webmanifest astro-site/public/
cp assets/images/browserconfig.xml astro-site/public/
```

### 6.2 圖片優化

Astro 內建圖片優化：
```astro
---
import { Image } from 'astro:assets';
import roomImage from '../assets/images/room.webp';
---
<Image src={roomImage} alt="房型圖片" />
```

---

## 第七階段：SEO 與結構化資料（Phase 7）

### 7.1 必須保持的 SEO 元素

- ✅ Canonical URLs
- ✅ Open Graph tags
- ✅ Twitter Card tags
- ✅ Schema.org 結構化資料
- ✅ Sitemap (XML)
- ✅ RSS Feed
- ✅ JSON Feed
- ✅ robots.txt
- ✅ hreflang 標籤

### 7.2 URL 結構保持

| 頁面類型 | 現有 URL | Astro 路由 |
|---------|---------|-----------|
| 首頁 | `/` | `src/pages/index.astro` |
| 房型列表 | `/rooms/` | `src/pages/rooms/index.astro` |
| 房型詳情 | `/rooms/campsite-1/` | `src/pages/rooms/[...slug].astro` |
| 資訊列表 | `/infos/` | `src/pages/infos/index.astro` |
| 資訊詳情 | `/infos/account/` | `src/pages/infos/[...slug].astro` |
| 公告 | `/announcements/` | `src/pages/announcements/index.astro` |
| 相冊 | `/galleries/` | `src/pages/galleries.astro` |

---

## 第八階段：部署配置（Phase 8）

### 8.1 GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### 8.2 astro.config.mjs 最終配置

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://misstravel.me',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    assets: 'assets',
  },
  trailingSlash: 'always',
});
```

---

## 執行時間表

### Week 1: 基礎建設
- [ ] 初始化 Astro 專案
- [ ] 配置 Tailwind CSS
- [ ] 設置內容集合 Schema
- [ ] 基礎佈局元件

### Week 2: 核心元件
- [ ] Header 元件
- [ ] Footer 元件
- [ ] SEO 元件套件
- [ ] 首頁佈局

### Week 3: 內容遷移
- [ ] 房型內容遷移
- [ ] 資訊頁內容遷移
- [ ] 公告內容遷移
- [ ] 靜態頁面遷移

### Week 4: 樣式與互動
- [ ] Tailwind 樣式實現
- [ ] JavaScript 功能遷移
- [ ] 響應式設計驗證
- [ ] 效能優化

### Week 5: 測試與部署
- [ ] 跨瀏覽器測試
- [ ] SEO 驗證
- [ ] 效能測試
- [ ] 正式部署

---

## 風險評估

### 高風險
1. **URL 結構變更** → 301 重定向或保持一致
2. **SEO 排名下降** → 保持所有 meta 資料

### 中風險
3. **視覺差異** → 詳細視覺對照測試
4. **功能遺漏** → 完整功能清單檢查

### 低風險
5. **圖片載入問題** → Astro 內建優化
6. **表單失效** → Formspree 配置驗證

---

## 驗收標準

### 功能驗收
- [ ] 所有頁面正常渲染
- [ ] 導航功能正常
- [ ] 表單提交成功
- [ ] 圖片正常顯示
- [ ] 響應式設計正確

### SEO 驗收
- [ ] Lighthouse SEO 分數 ≥ 90
- [ ] 結構化資料驗證通過
- [ ] sitemap.xml 可訪問
- [ ] robots.txt 正確
- [ ] Open Graph 預覽正確

### 效能驗收
- [ ] Lighthouse Performance ≥ 90
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Total Bundle Size < 500KB (gzipped)

---

## 備註

本計劃遵循「Never break userspace」原則，確保：
1. 所有現有 URL 保持可訪問
2. 現有功能 100% 遷移
3. SEO 元素完整保留
4. 視覺設計保持一致性

如有問題，請參閱 [Astro 官方文檔](https://docs.astro.build)。
