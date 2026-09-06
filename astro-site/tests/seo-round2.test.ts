import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { load } from 'cheerio';
import { join } from 'path';

const distDir = join(__dirname, '..', 'dist');

function readPage(path: string) {
  const filePath = join(distDir, path);
  if (!existsSync(filePath)) {
    throw new Error(`Page not found: ${filePath}`);
  }
  return load(readFileSync(filePath, 'utf-8'));
}

function getJsonLd($: ReturnType<typeof load>, selector = 'script[type="application/ld+json"]') {
  const scripts: any[] = [];
  $(selector).each((_, el) => {
    try {
      scripts.push(JSON.parse($(el).html()!));
    } catch {}
  });
  return scripts;
}

function getHeadJsonLd($: ReturnType<typeof load>) {
  const scripts: any[] = [];
  $('head script[type="application/ld+json"]').each((_, el) => {
    try {
      scripts.push(JSON.parse($(el).html()!));
    } catch {}
  });
  return scripts;
}

// 1. 公告詳情頁 og:type 應為 article
describe('1. 公告頁面 og:type', () => {
  it('公告詳情頁的 og:type 應為 article', () => {
    const $ = readPage('announcements/website/index.html');
    const ogType = $('meta[property="og:type"]').attr('content');
    expect(ogType).toBe('article');
  });
});

// 2. 公告詳情頁應使用共用 Breadcrumb 元件（含 BreadcrumbList JSON-LD）
describe('2. 公告詳情頁 Breadcrumb', () => {
  it('應包含 BreadcrumbList JSON-LD schema', () => {
    const $ = readPage('announcements/website/index.html');
    const schemas = getJsonLd($);
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement).toBeDefined();
    expect(breadcrumb.itemListElement.length).toBeGreaterThanOrEqual(3);
  });

  it('BreadcrumbList 應包含首頁、最新消息、當前頁面', () => {
    const $ = readPage('announcements/website/index.html');
    const schemas = getJsonLd($);
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList');
    const items = breadcrumb.itemListElement;
    expect(items[0].name).toBe('首頁');
    expect(items[1].name).toBe('最新消息');
    expect(items[1].item).toContain('/announcements/');
  });
});

// 3. LodgingBusiness 結構化資料應完善
describe('3. LodgingBusiness 結構化資料', () => {
  it('應包含完整地址', () => {
    const $ = readPage('index.html');
    const schemas = getJsonLd($);
    const lodging = schemas.find((s) => s['@type'] === 'LodgingBusiness');
    expect(lodging).toBeDefined();
    expect(lodging.address.streetAddress).toContain('大興村');
    expect(lodging.address.postalCode).toBe('365');
  });

  it('未建立條件式資料模型前不得硬編單一入住與退房時間', () => {
    const $ = readPage('index.html');
    const schemas = getJsonLd($);
    const lodging = schemas.find((s) => s['@type'] === 'LodgingBusiness');
    expect(lodging.checkinTime).toBeUndefined();
    expect(lodging.checkoutTime).toBeUndefined();
  });

  it('不應宣告無法由本站庫存證實的 numberOfRooms', () => {
    const $ = readPage('index.html');
    const schemas = getJsonLd($);
    const lodging = schemas.find((s) => s['@type'] === 'LodgingBusiness');
    expect(lodging.numberOfRooms).toBeUndefined();
  });

  it('應以 sameAs 連結官方社群與 Google 地圖，供搜尋引擎辨識品牌實體', () => {
    const $ = readPage('index.html');
    const schemas = getJsonLd($);
    const lodging = schemas.find((s) => s['@type'] === 'LodgingBusiness');
    expect(lodging.sameAs).toEqual(
      expect.arrayContaining([
        'https://www.facebook.com/misstravel0921',
        'https://www.instagram.com/misstravel_miaoli',
        'https://www.google.com/maps?cid=9727131956713515891',
      ]),
    );
  });

  it('應包含 amenityFeature', () => {
    const $ = readPage('index.html');
    const schemas = getJsonLd($);
    const lodging = schemas.find((s) => s['@type'] === 'LodgingBusiness');
    expect(lodging.amenityFeature).toBeDefined();
    expect(Array.isArray(lodging.amenityFeature)).toBe(true);
    expect(lodging.amenityFeature.length).toBeGreaterThan(0);
  });
});

// 4. 404 頁面應包含 noindex
describe('4. 404 頁面 noindex', () => {
  it('應包含 meta robots noindex', () => {
    const $ = readPage('404.html');
    const robots = $('meta[name="robots"]').attr('content');
    expect(robots).toContain('noindex');
  });
});

// 5. 房型頁只描述住宿商家，不捏造可購買商品/庫存
describe('5. 房型頁結構化資料', () => {
  it('不應輸出與即時庫存無關的 Product/AggregateOffer schema', () => {
    const $ = readPage('rooms/suite_1/index.html');
    const schemas = getJsonLd($);
    expect(schemas.some((schema) => schema['@type'] === 'Product')).toBe(false);
    expect(schemas.some((schema) => schema['@type'] === 'AggregateOffer')).toBe(false);
  });

  it('應保留住宿商家與麵包屑 schema', () => {
    const $ = readPage('rooms/suite_1/index.html');
    const schemas = getJsonLd($);
    expect(schemas.some((schema) => schema['@type'] === 'LodgingBusiness')).toBe(true);
    expect(schemas.some((schema) => schema['@type'] === 'BreadcrumbList')).toBe(true);
  });
});

// 6. 列表頁 ItemList schema
describe('6. 列表頁 ItemList schema', () => {
  it('房型列表頁應包含 ItemList schema', () => {
    const $ = readPage('rooms/index.html');
    const schemas = getJsonLd($);
    const itemList = schemas.find((s) => s['@type'] === 'ItemList');
    expect(itemList).toBeDefined();
    expect(itemList.itemListElement).toBeDefined();
    expect(itemList.itemListElement.length).toBeGreaterThan(0);
    expect(itemList.itemListElement[0]['@type']).toBe('ListItem');
  });

  it('公告列表頁應包含 ItemList schema', () => {
    const $ = readPage('announcements/index.html');
    const schemas = getJsonLd($);
    const itemList = schemas.find((s) => s['@type'] === 'ItemList');
    expect(itemList).toBeDefined();
    expect(itemList.itemListElement).toBeDefined();
    expect(itemList.itemListElement.length).toBeGreaterThan(0);
  });
});

// 7. JSON-LD 應在 <head> 內
describe('7. JSON-LD 在 head 內', () => {
  it('首頁的 JSON-LD 應在 <head> 內', () => {
    const $ = readPage('index.html');
    const headSchemas = getHeadJsonLd($);
    expect(headSchemas.length).toBeGreaterThan(0);
    const lodging = headSchemas.find((s) => s['@type'] === 'LodgingBusiness');
    expect(lodging).toBeDefined();
  });

  it('房間頁的 JSON-LD 應在 <head> 內', () => {
    const $ = readPage('rooms/suite_1/index.html');
    const headSchemas = getHeadJsonLd($);
    expect(headSchemas.some((schema) => schema['@type'] === 'LodgingBusiness')).toBe(true);
    expect(headSchemas.some((schema) => schema['@type'] === 'Product')).toBe(false);
  });

  it('body 內不應有 JSON-LD scripts', () => {
    const $ = readPage('index.html');
    const bodySchemas: any[] = [];
    $('body script[type="application/ld+json"]').each((_, el) => {
      try {
        bodySchemas.push(JSON.parse($(el).html()!));
      } catch {}
    });
    expect(bodySchemas.length).toBe(0);
  });
});

// 8. 圖片應包含 width 和 height 屬性
describe('8. 圖片 width/height', () => {
  it('房型列表卡片圖片應有 width 和 height', () => {
    const $ = readPage('rooms/index.html');
    const imgs = $('.room-image img');
    imgs.each((_, el) => {
      expect($(el).attr('width')).toBeDefined();
      expect($(el).attr('height')).toBeDefined();
    });
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('房間輪播圖應有 width 和 height', () => {
    const $ = readPage('rooms/suite_1/index.html');
    const imgs = $('.carousel-slide img');
    imgs.each((_, el) => {
      expect($(el).attr('width')).toBeDefined();
      expect($(el).attr('height')).toBeDefined();
    });
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('圖集頁面圖片應有 width 和 height', () => {
    const $ = readPage('galleries/index.html');
    const imgs = $('.item img');
    imgs.each((_, el) => {
      expect($(el).attr('width')).toBeDefined();
      expect($(el).attr('height')).toBeDefined();
    });
    expect(imgs.length).toBe(36);
  });

  it('關於密式 spotlight 圖片應有 width 和 height', () => {
    const $ = readPage('infos/index.html');
    const imgs = $('.spotlights .image img');
    imgs.each((_, el) => {
      expect($(el).attr('width')).toBeDefined();
      expect($(el).attr('height')).toBeDefined();
    });
    expect(imgs.length).toBe(8);
  });

  it('公告列表卡片圖片應有 width 和 height', () => {
    const $ = readPage('announcements/index.html');
    const imgs = $('.card-image img');
    imgs.each((_, el) => {
      expect($(el).attr('width')).toBeDefined();
      expect($(el).attr('height')).toBeDefined();
    });
  });

  it('公告詳情頁特色圖片應有 width 和 height', () => {
    const $ = readPage('announcements/website/index.html');
    const imgs = $('.featured-image img');
    imgs.each((_, el) => {
      expect($(el).attr('width')).toBeDefined();
      expect($(el).attr('height')).toBeDefined();
    });
  });

  it('相關房型卡片圖片應有 width 和 height', () => {
    const $ = readPage('rooms/suite_1/index.html');
    const imgs = $('.related-card img');
    imgs.each((_, el) => {
      expect($(el).attr('width')).toBeDefined();
      expect($(el).attr('height')).toBeDefined();
    });
    expect(imgs.length).toBeGreaterThan(0);
  });
});

// 9. 圖集頁面 ImageGallery schema
describe('9. ImageGallery schema', () => {
  it('圖集頁面應包含 ImageGallery schema', () => {
    const $ = readPage('galleries/index.html');
    const schemas = getJsonLd($);
    const gallery = schemas.find((s) => s['@type'] === 'ImageGallery');
    expect(gallery).toBeDefined();
  });

  it('ImageGallery 應包含 36 張圖片', () => {
    const $ = readPage('galleries/index.html');
    const schemas = getJsonLd($);
    const gallery = schemas.find((s) => s['@type'] === 'ImageGallery');
    expect(gallery.image).toBeDefined();
    expect(gallery.image.length).toBe(36);
    expect(gallery.image[0]['@type']).toBe('ImageObject');
  });
});

// 10. 柑仔店 Product schema
describe('10. 柑仔店 Product schema', () => {
  it('柑仔店頁面應包含 Product schema', () => {
    const $ = readPage('sale_items/index.html');
    const schemas = getJsonLd($);
    const products = schemas.filter((s) => s['@type'] === 'Product');
    expect(products.length).toBeGreaterThanOrEqual(3);
  });

  it('Product schema 應包含烹飪組合', () => {
    const $ = readPage('sale_items/index.html');
    const schemas = getJsonLd($);
    const products = schemas.filter((s) => s['@type'] === 'Product');
    const cooking = products.find((p) => p.name.includes('烹飪'));
    expect(cooking).toBeDefined();
    expect(cooking.offers).toBeDefined();
    expect(cooking.offers.price).toBeDefined();
  });

  it('Product schema 應包含烤肉組合', () => {
    const $ = readPage('sale_items/index.html');
    const schemas = getJsonLd($);
    const products = schemas.filter((s) => s['@type'] === 'Product');
    const bbq = products.find((p) => p.name.includes('烤肉'));
    expect(bbq).toBeDefined();
    expect(bbq.offers).toBeDefined();
  });

  it('Product schema 應包含寢具組合', () => {
    const $ = readPage('sale_items/index.html');
    const schemas = getJsonLd($);
    const products = schemas.filter((s) => s['@type'] === 'Product');
    const bedding = products.find((p) => p.name.includes('寢具'));
    expect(bedding).toBeDefined();
    expect(bedding.offers).toBeDefined();
  });

  it('柑仔店商品不應宣告無法由本站證實的即時庫存', () => {
    const $ = readPage('sale_items/index.html');
    const schemas = getJsonLd($);
    const products = schemas.filter((s) => s['@type'] === 'Product');
    expect(products.length).toBeGreaterThan(0);
    products.forEach((product) => {
      expect(product.offers.availability).toBeUndefined();
    });
  });
});
