import { mapShopeeCategory, computeInterestScore } from "@/lib/shopee/category-map";

// ─── Output type: ทุก field ที่ Supabase public.products ต้องการ ──────────────

export type NormalizedShopeeRow = {
  // dedup / source
  source_platform:      "shopee";
  source_item_id:       string;        // NOT NULL
  external_product_id:  string;        // NOT NULL (alias source_item_id)
  // product identity — ทั้งสองคอลัมน์ set ค่าเหมือนกัน เพราะ DB ต่าง schema กัน
  title:                string;        // NOT NULL — DB column "title" (บาง schema)
  product_name:         string;        // NOT NULL — DB column "product_name" (setup.sql)
  // media / links
  product_image:        string | null;
  product_url:          string | null;
  // shop
  shop_name:            string | null;
  shop_rating:          number | null;
  is_preferred_shop:    boolean | null;
  is_official_shop:     boolean | null;
  // category
  category:             string;        // NOT NULL
  category_level_1:     string | null;
  category_level_2:     string | null;
  category_level_3:     string | null;
  // pricing / sales
  price:                number;        // NOT NULL DEFAULT 0
  sales_7d:             number;        // NOT NULL DEFAULT 0
  sales_30d:            number;        // NOT NULL DEFAULT 0
  estimated_revenue:    number;        // NOT NULL DEFAULT 0
  growth_rate:          number;        // NOT NULL DEFAULT 0
  interest_score:       number;        // NOT NULL DEFAULT 0
  // Shopee-specific
  item_sold:            number;        // NOT NULL DEFAULT 0
  item_rating:          number | null;
  like_count:           number | null;
  raw_sale_price:       string | null;
  // commission — ห้ามสร้างค่าปลอม
  commission_rate:      null;
  commission_status:    "not_available_from_feed";
  // metadata
  data_source:          "shopee_product_feed";
  passed_by_rule:       string | null;
  filter_reason:        string | null;
  imported_at:          string;
  last_seen_at:         string;   // เวลาเห็นสินค้านี้ใน Feed ล่าสุด (สำหรับตรวจความสด)
};

export type NormalizeOk   = { ok: true;  row: NormalizedShopeeRow; itemSold: number };
export type NormalizeSkip = { ok: false; reason: string; itemId: string };
export type NormalizeResult = NormalizeOk | NormalizeSkip;

// ─── Helper: ดึงค่าจาก raw record (normalized headers: lowercase + BOM removed)

function get(raw: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const v = (raw[key] ?? "").replace(/^﻿/, "").trim();
    if (v) return v;
  }
  return "";
}

// ─── normalizeShopeeRow ───────────────────────────────────────────────────────
/**
 * แปลง 1 แถว CSV (header-normalized: lowercase + BOM removed) เป็น NormalizedShopeeRow
 * คืน { ok: false, reason } ถ้าแถวนั้นต้องข้าม (ไม่มี source_item_id)
 * ทุก NOT NULL field มี fallback — ไม่มีทางส่ง null/undefined เข้า Supabase
 */
export function normalizeShopeeRow(
  raw: Record<string, string>,
  opts: { importedAt: string; passedByRule: string | null; filterReason: string | null },
): NormalizeResult {
  // ── 1. source_item_id: MUST NOT be empty ────────────────────────────
  const sourceItemId = get(
    raw,
    "itemid", "item_id", "external_product_id", "sku_id", "product_id",
  );
  if (!sourceItemId) {
    return { ok: false, reason: "ไม่มี itemid / item_id — ข้ามรายการ", itemId: "" };
  }

  // ── 2. title / product_name: fallback chain → auto-generate ─────────
  const rawTitle = get(
    raw,
    "title", "product_name", "product_title", "name", "item_name",
  );
  const title = rawTitle || `สินค้า Shopee ${sourceItemId}`;
  const productName = title;

  // ── 3. numbers: 0 ถ้า CSV ว่างหรือ parse ไม่ได้ ─────────────────────
  const salePriceRaw = get(raw, "sale_price", "price", "original_price", "current_price");
  const price = Math.max(0, parseFloat(salePriceRaw) || 0);
  const soldRaw = get(raw, "item_sold", "sold", "units_sold", "total_sold");
  const itemSold = Math.max(0, parseInt(soldRaw, 10) || 0);
  const interestScore = computeInterestScore(itemSold);
  const estimatedRevenue = Math.round(itemSold * price);

  // ── 4. categories ─────────────────────────────────────────────────────
  const cat1 = get(raw, "global_category1", "category1", "category_level_1", "main_category");
  const cat2 = get(raw, "global_category2", "category2", "category_level_2");
  const cat3 = get(raw, "global_category3", "category3", "category_level_3");
  const category: string = mapShopeeCategory(cat1, cat2, title) || "อื่นๆ";

  // ── 5. optional fields ────────────────────────────────────────────────
  const imageUrl =
    get(raw, "image_link", "image_link_4", "image", "image_url", "thumbnail") || null;
  const productUrl =
    get(raw, "product_link", "product_url", "link", "url") || null;
  const shopName =
    get(raw, "shop_name", "seller_name", "store_name") || null;
  const shopRatingRaw = get(raw, "shop_rating");
  const shopRating   = shopRatingRaw ? (parseFloat(shopRatingRaw) || null) : null;
  const itemRatingRaw = get(raw, "item_rating", "rating", "product_rating", "star_rating");
  const itemRating    = itemRatingRaw ? (parseFloat(itemRatingRaw) || null) : null;
  const likeRaw      = get(raw, "like", "like_count", "likes", "favorites");
  const likeCount    = likeRaw ? (parseInt(likeRaw, 10) || null) : null;
  const isPreferredShop = get(raw, "is_preferred_shop") === "1" ? true : null;
  const isOfficialShop  = get(raw, "is_official_shop")  === "1" ? true : null;

  const row: NormalizedShopeeRow = {
    source_platform:     "shopee",
    source_item_id:      sourceItemId,
    external_product_id: sourceItemId,
    title,
    product_name:        productName,
    product_image:       imageUrl,
    product_url:         productUrl,
    shop_name:           shopName,
    shop_rating:         shopRating,
    is_preferred_shop:   isPreferredShop,
    is_official_shop:    isOfficialShop,
    category,
    category_level_1:    cat1 || null,
    category_level_2:    cat2 || null,
    category_level_3:    cat3 || null,
    price,
    sales_7d:            itemSold,
    sales_30d:           itemSold,
    estimated_revenue:   estimatedRevenue,
    growth_rate:         0,
    interest_score:      interestScore,
    item_sold:           itemSold,
    item_rating:         itemRating,
    like_count:          likeCount,
    raw_sale_price:      salePriceRaw || null,
    commission_rate:     null,
    commission_status:   "not_available_from_feed",
    data_source:         "shopee_product_feed",
    passed_by_rule:      opts.passedByRule,
    filter_reason:       opts.filterReason,
    imported_at:         opts.importedAt,
    last_seen_at:        opts.importedAt,
  };

  return { ok: true, row, itemSold };
}
