import cloudflareWebAnalytics from './cloudflare-web-analytics.json';

// 站點配置 - 從 Jekyll _config.yml 遷移
export const siteConfig = {
  // 顯示給訪客的品牌名稱；SEO 標題後綴獨立設定，避免影響頁尾與 RSS。
  title: 'Misstravel',
  seoTitleSuffix: '密式旅行露營區',
  metaTitle: '密式旅行｜苗栗泰安露營區、小木屋與套房',
  description: '密式旅行露營區，位於苗栗泰安鄉，提供露營、小木屋、套房等多種住宿選擇，園內還提供桌遊咖啡廳、兒童遊戲室、兒童沙坑等空間。',
  metaDescription: '密式旅行位於苗栗泰安，提供露營營位、小木屋與套房。查看房型照片、費用、訂房及交通資訊；園內有桌遊咖啡廳、兒童遊戲室與沙坑，住宿條件請見各房型說明。',
  author: '密式旅行',
  url: 'https://www.misstravel.me',
  lang: 'zh-TW',
  locale: 'zh_TW',
  logo: '/images/logo.webp',
  ogImage: '/images/rooms.webp',
  tilesCount: 6,

  // 聯絡資訊
  contact: {
    email: 'misstravel0921@gmail.com',
    line: '@rys8178b',
    lineUrl: 'https://line.me/R/ti/p/%40rys8178b',
    lineQr: '/images/line-official-account-qr.svg',
    phone: '0905108958',
  },

  // 社群連結
  socials: {
    facebook: 'https://www.facebook.com/misstravel0921',
    instagram: 'https://www.instagram.com/misstravel_miaoli',
    googleMaps: 'https://www.google.com/maps?cid=9727131956713515891',
    github: 'https://github.com/Lawa0921/misstravel',
  },

  // 特殊頁面 URL
  urls: {
    roles: '/infos/roles/',
    account: '/infos/account/',
  },

  // 預訂系統
  booking: {
    url: 'https://roomcloud.cc/hotels/misstravel/booking',
  },
} as const;

export const cloudflareWebAnalyticsToken = cloudflareWebAnalytics.token;

export type SiteConfig = typeof siteConfig;

export function resolveSiteUrl(site?: URL): string {
  return new URL('.', site ?? siteConfig.url).href;
}
