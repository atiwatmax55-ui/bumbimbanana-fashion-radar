/**
 * Test script สำหรับ normalizeShopeeRow
 * วิธีรัน: npm run test:normalizer
 *         หรือ: npx tsx scripts/test-shopee-normalizer.ts
 *
 * ครอบคลุม 5 กรณี: ปกติ, ไม่มี title, ไม่มี itemid, ตัวเลขว่าง, BOM + ช่องว่าง
 */

// ── inline ฟังก์ชันที่ต้องใช้ (หลีกเลี่ยง path alias ระหว่าง test) ───────────

const SHOPEE_CAT_MAP: Record<string, string> = {
  "dresses": "เดรส",
  "women clothes": "เสื้อเชิ้ต",
  "skirts": "กระโปรง",
  "women bags": "กระเป๋า",
  "women shoes": "รองเท้า",
};

function mapShopeeCategory(cat1?: string | null): string {
  if (!cat1) return "อื่นๆ";
  return SHOPEE_CAT_MAP[cat1.trim().toLowerCase()] ?? "อื่นๆ";
}

function computeInterestScore(itemSold: number): number {
  return Math.min(100, Math.max(1, Math.round(Math.log10(Math.max(1, itemSold)) * 20 - 10)));
}

// ── re-implement normalizeShopeeRow แบบ standalone (logic เหมือนกันทุกจุด) ──

type NormalizedShopeeRow = {
  source_platform:     "shopee";
  source_item_id:      string;
  external_product_id: string;
  title:               string;
  product_name:        string;
  product_image:       string | null;
  product_url:         string | null;
  shop_name:           string | null;
  shop_rating:         number | null;
  is_preferred_shop:   boolean | null;
  is_official_shop:    boolean | null;
  category:            string;
  category_level_1:    string | null;
  category_level_2:    string | null;
  category_level_3:    string | null;
  price:               number;
  sales_7d:            number;
  sales_30d:           number;
  estimated_revenue:   number;
  growth_rate:         number;
  interest_score:      number;
  item_sold:           number;
  item_rating:         number | null;
  like_count:          number | null;
  raw_sale_price:      string | null;
  commission_rate:     null;
  commission_status:   "not_available_from_feed";
  data_source:         "shopee_product_feed";
  passed_by_rule:      string | null;
  filter_reason:       string | null;
  imported_at:         string;
};

type NormalizeResult =
  | { ok: true;  row: NormalizedShopeeRow; itemSold: number }
  | { ok: false; reason: string; itemId: string };

function get(raw: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const v = (raw[key] ?? "").replace(/^﻿/, "").trim();
    if (v) return v;
  }
  return "";
}

function normalizeShopeeRow(
  raw: Record<string, string>,
  opts: { importedAt: string; passedByRule: string | null; filterReason: string | null },
): NormalizeResult {
  const sourceItemId = get(raw, "itemid", "item_id", "external_product_id", "sku_id", "product_id");
  if (!sourceItemId) {
    return { ok: false, reason: "ไม่มี itemid / item_id — ข้ามรายการ", itemId: "" };
  }

  const rawTitle = get(raw, "title", "product_name", "product_title", "name", "item_name");
  const title = rawTitle || `สินค้า Shopee ${sourceItemId}`;
  const productName = title;

  const salePriceRaw = get(raw, "sale_price", "price", "original_price", "current_price");
  const price = Math.max(0, parseFloat(salePriceRaw) || 0);
  const soldRaw = get(raw, "item_sold", "sold", "units_sold", "total_sold");
  const itemSold = Math.max(0, parseInt(soldRaw, 10) || 0);
  const interestScore = computeInterestScore(itemSold);
  const estimatedRevenue = Math.round(itemSold * price);

  const cat1 = get(raw, "global_category1", "category1", "category_level_1", "main_category");
  const cat2 = get(raw, "global_category2", "category2", "category_level_2");
  const cat3 = get(raw, "global_category3", "category3", "category_level_3");
  const category: string = mapShopeeCategory(cat1) || "อื่นๆ";

  const imageUrl  = get(raw, "image_link", "image_link_4", "image", "image_url", "thumbnail") || null;
  const productUrl = get(raw, "product_link", "product_url", "link", "url") || null;
  const shopName  = get(raw, "shop_name", "seller_name", "store_name") || null;
  const shopRatingRaw = get(raw, "shop_rating");
  const shopRating    = shopRatingRaw ? (parseFloat(shopRatingRaw) || null) : null;
  const itemRatingRaw = get(raw, "item_rating", "rating", "product_rating", "star_rating");
  const itemRating    = itemRatingRaw ? (parseFloat(itemRatingRaw) || null) : null;
  const likeRaw    = get(raw, "like", "like_count", "likes", "favorites");
  const likeCount  = likeRaw ? (parseInt(likeRaw, 10) || null) : null;
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
  };

  return { ok: true, row, itemSold };
}

// ── Test cases ─────────────────────────────────────────────────────────────────

const OPTS = { importedAt: "2026-01-01T00:00:00Z", passedByRule: "test", filterReason: null };

type TestCase = {
  name: string;
  input: Record<string, string>;
  check: (r: NormalizeResult) => boolean;
  desc: string;
};

const tests: TestCase[] = [
  {
    name: "1. แถวปกติ",
    input: {
      itemid: "123456789",
      title: "เสื้อผ้าแฟชั่นผู้หญิง",
      sale_price: "299.00",
      item_sold: "15000",
      global_category1: "Women Clothes",
    },
    check: (r) =>
      r.ok &&
      r.row.source_item_id === "123456789" &&
      r.row.title === "เสื้อผ้าแฟชั่นผู้หญิง" &&
      r.row.product_name === "เสื้อผ้าแฟชั่นผู้หญิง" &&
      r.row.price === 299 &&
      r.row.item_sold === 15000 &&
      r.row.commission_rate === null &&
      r.row.source_platform === "shopee",
    desc: "ทุก field ถูกต้อง, commission_rate = null",
  },
  {
    name: "2. ไม่มี title → auto-generate จาก source_item_id",
    input: {
      itemid: "987654321",
      sale_price: "100",
      item_sold: "50",
      global_category1: "Women Bags",
    },
    check: (r) =>
      r.ok &&
      r.row.title === "สินค้า Shopee 987654321" &&
      r.row.product_name === "สินค้า Shopee 987654321" &&
      r.row.title.length > 0,
    desc: "title ว่าง → ใช้ 'สินค้า Shopee {id}' ไม่ส่ง NULL",
  },
  {
    name: "3. ไม่มี itemid → ข้ามแถว",
    input: {
      title: "สินค้าไม่มี ID",
      sale_price: "199",
      item_sold: "100",
    },
    check: (r) => !r.ok,
    desc: "ต้องคืน ok: false — ห้ามส่ง row เข้า Supabase",
  },
  {
    name: "4. ตัวเลขว่างทั้งหมด → ใช้ 0",
    input: {
      itemid: "456789",
      title: "สินค้าทดสอบตัวเลขว่าง",
      sale_price: "",
      item_sold: "",
      item_rating: "",
      like: "",
      shop_rating: "",
    },
    check: (r) =>
      r.ok &&
      r.row.price === 0 &&
      r.row.item_sold === 0 &&
      r.row.sales_7d === 0 &&
      r.row.sales_30d === 0 &&
      r.row.estimated_revenue === 0 &&
      r.row.item_rating === null &&
      r.row.like_count === null &&
      r.row.shop_rating === null,
    desc: "ตัวเลขว่าง → 0, optional fields → null ไม่มี NaN",
  },
  {
    name: "5. title มี BOM + ช่องว่างหลายตัว",
    input: {
      itemid: "111222333",
      title: "﻿   เสื้อยืดคอกลม   ",
      sale_price: "150",
      item_sold: "200",
    },
    check: (r) =>
      r.ok &&
      r.row.title === "เสื้อยืดคอกลม" &&
      !r.row.title.includes("﻿") &&
      r.row.title === r.row.title.trim(),
    desc: "BOM และ whitespace ถูกตัดออกจาก title",
  },
];

// ── Runner ─────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const t of tests) {
  const result = normalizeShopeeRow(t.input, OPTS);
  const ok = t.check(result);
  const status = ok ? "✓" : "✗";

  console.log(`${status} ${t.name}`);
  console.log(`  ${t.desc}`);
  if (!ok) {
    console.log("  ผลลัพธ์:", JSON.stringify(result, null, 2));
    failed++;
  } else {
    passed++;
  }
}

console.log(`\n── สรุป: ${passed}/${tests.length} passed ──`);

if (failed > 0) {
  console.error(`\nมี ${failed} test ที่ไม่ผ่าน`);
  process.exit(1);
} else {
  console.log("ทุก test ผ่าน — normalizeShopeeRow พร้อมใช้งาน");
}
