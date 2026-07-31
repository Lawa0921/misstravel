// 站點配置 - 從 Jekyll _config.yml 遷移
export const siteConfig = {
  title: 'Misstravel',
  metaTitle: '密式旅行露營區，苗栗泰安鄉小木屋露營區',
  description: '密式旅行露營區，位於苗栗泰安鄉，提供露營、小木屋、套房等多種住宿選擇，園內還提供桌遊咖啡廳、兒童遊戲室、兒童沙坑等空間。',
  metaDescription: '密式旅行露營區，位於苗栗泰安鄉，提供露營、小木屋、套房等多種住宿選擇，園內還提供桌遊咖啡廳、兒童遊戲室、兒童沙坑等空間，是個非常適合闔家前往的親子露營區。桌遊咖啡廳除了販售輕食、咖啡以外，也有提供免費的桌遊教學。雲海、夕陽等美景也經常造訪，竹林秘境車程十分鐘即可到達。',
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

export type SiteConfig = typeof siteConfig;
