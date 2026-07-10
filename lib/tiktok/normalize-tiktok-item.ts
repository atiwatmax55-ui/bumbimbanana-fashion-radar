import { PRODUCT_CATEGORIES, type ProductCategory } from "@/types/product";
import { computeInterestScore } from "@/lib/shopee/category-map";

/**
 * ฟิลด์ดิบ 1 รายการสินค้า TikTok — มาจาก CSV (ทุกช่องเป็น string)
 * หรือ JSON (ตัวเลขบางช่องอาจเป็น number ตรง ๆ) ดู data contract ใน
 * docs/TIKTOK_IMPORT_FABLE_PLAN.md หัวข้อ 5
 */
export interface TiktokRawItem {
  productName?:    string;
  price?:          string | number;
  commissionRate?: string | number;
  productUrl?:     string;
  productImage?:   string;
  estimatedSold?:  string | number;
  category?:       string;
  shopName?:       string;
}

/** แถวที่ผ่านการตรวจสอบแล้ว พร้อม upsert เข้า public.products (source_platform='tiktok') */
export type NormalizedTiktokRow = {
  source_platform:     "tiktok";
  source_item_id:      string;
  external_product_id: string;
  title:               string;
  product_name:        string;
  product_image:       string | null;
  product_url:         string;
  shop_name:           string | null;
  category:            string;
  price:               number;
  commission_rate:     number;
  commission_status:   null;
  item_sold:           number;
  estimated_revenue:   number;
  interest_score:      number;
  growth_rate:         0;
  sales_7d:            0;
  sales_30d:           0;
  data_source:         "tiktok_manual";
  imported_at:         string;
  last_seen_at:        string;
};

export type NormalizeOk     = { ok: true; row: NormalizedTiktokRow; warnings: string[] };
export type NormalizeSkip   = { ok: false; reason: string };
export type NormalizeResult = NormalizeOk | NormalizeSkip;

const CATEGORY_SET = new Set<string>(PRODUCT_CATEGORIES);

/**
 * แปลงข้อความ/ตัวเลขเป็น number ล้วน — strip "," "฿" "%" ก่อน แล้วบังคับให้เหลือ
 * ตัวเลขล้วนเท่านั้น (ปฏิเสธค่าย่อ เช่น "1.2K", "10K+", "1.2พัน") กันข้อมูลเพี้ยนแบบเงียบ ๆ
 * เช่น parseFloat("1.2K") จะได้ 1.2 ซึ่งผิดมาก — ฟังก์ชันนี้คืน null แทนในกรณีนั้น
 */
function parsePlainNumber(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = raw.replace(/[,฿%\s]/g, "").trim();
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** normalize URL เป็น dedup key — ตัด query/hash ทิ้ง (tracking params เปลี่ยนทุกครั้งที่คัดลอกลิงก์ใหม่) */
function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function isHttpsUrl(value: string): boolean {
  return /^https:\/\//i.test(value.trim());
}

/**
 * ตรวจสอบและแปลง 1 รายการสินค้า TikTok เป็นแถวพร้อม upsert
 * คืน { ok:false, reason } เมื่อฟิลด์บังคับไม่ผ่าน — ไม่ throw เพื่อให้ผู้เรียก reject ทีละแถวได้
 */
export function normalizeTiktokItem(
  raw: TiktokRawItem,
  opts: { importedAt: string },
): NormalizeResult {
  const warnings: string[] = [];

  // ── ชื่อสินค้า: บังคับ ──────────────────────────────────────────────
  const productName = (raw.productName ?? "").trim();
  if (!productName) {
    return { ok: false, reason: "ไม่มีชื่อสินค้า — ข้ามรายการนี้" };
  }

  // ── ราคา: บังคับ ต้องมากกว่า 0 ────────────────────────────────────────
  const price = parsePlainNumber(raw.price);
  if (price === null || price <= 0) {
    return {
      ok: false,
      reason:
        `"${productName}": ราคา "${raw.price ?? ""}" ไม่ถูกต้อง — ต้องเป็นตัวเลขมากกว่า 0 ` +
        `(ถ้าเป็นค่าย่อ เช่น "1.2K" ให้แปลงเป็นจำนวนเต็มก่อน)`,
    };
  }

  // ── ค่าคอม: บังคับ 0-100 ────────────────────────────────────────────
  const commissionRate = parsePlainNumber(raw.commissionRate);
  if (commissionRate === null || commissionRate < 0 || commissionRate > 100) {
    return {
      ok: false,
      reason: `"${productName}": ค่าคอม "${raw.commissionRate ?? ""}" ไม่ถูกต้อง — ต้องเป็นตัวเลข 0-100`,
    };
  }

  // ── ลิงก์สินค้า: บังคับ https:// — ใช้เป็น dedup key กันข้อมูลซ้ำ ────
  const productUrl = (raw.productUrl ?? "").trim();
  if (!productUrl || !isHttpsUrl(productUrl)) {
    return {
      ok: false,
      reason: `"${productName}": ลิงก์สินค้าต้องขึ้นต้นด้วย https:// (ได้รับ "${productUrl || "ว่าง"}")`,
    };
  }
  const dedupKey = normalizeUrlKey(productUrl);

  // ── ลิงก์รูป: ไม่บังคับ — ไม่ใช่ https ก็แค่ตัดทิ้ง ไม่ reject ทั้งแถว ──
  const rawImage = (raw.productImage ?? "").trim();
  let productImage: string | null = null;
  if (rawImage) {
    if (isHttpsUrl(rawImage)) {
      productImage = rawImage;
    } else {
      warnings.push("ลิงก์รูปไม่ถูกต้อง (ต้องขึ้นต้น https://) — ใช้รูปตัวอย่างตามหมวดแทน");
    }
  }

  // ── ยอดขายโดยประมาณ: ไม่บังคับ default 0 ("ยังไม่มีข้อมูล" ไม่ใช่ "ขายไม่ได้") ──
  let itemSold = 0;
  if (raw.estimatedSold !== undefined && raw.estimatedSold !== "") {
    const parsed = parsePlainNumber(raw.estimatedSold);
    if (parsed === null || parsed < 0) {
      warnings.push(
        `ยอดขายโดยประมาณ "${raw.estimatedSold}" ไม่ใช่ตัวเลข — ใช้ 0 แทน ` +
          `(ถ้าเป็นค่าย่อ เช่น "1.2K" ให้แปลงเป็นจำนวนเต็ม)`,
      );
    } else {
      itemSold = Math.round(parsed);
    }
  }

  // ── หมวดหมู่: ไม่บังคับ default "อื่นๆ" ─────────────────────────────
  const rawCategory = (raw.category ?? "").trim();
  let category: ProductCategory = "อื่นๆ";
  if (rawCategory) {
    if (CATEGORY_SET.has(rawCategory)) {
      category = rawCategory as ProductCategory;
    } else {
      warnings.push(`หมวดหมู่ "${rawCategory}" ไม่ตรงกับหมวดที่ระบบรองรับ — ใช้ "อื่นๆ" แทน`);
    }
  }

  // ── ชื่อร้าน: ไม่บังคับ ──────────────────────────────────────────────
  const shopName = (raw.shopName ?? "").trim() || null;

  const row: NormalizedTiktokRow = {
    source_platform:     "tiktok",
    source_item_id:      dedupKey,
    external_product_id: dedupKey,
    title:               productName,
    product_name:        productName,
    product_image:       productImage,
    product_url:         productUrl,
    shop_name:           shopName,
    category,
    price,
    commission_rate:     commissionRate,
    commission_status:   null,
    item_sold:           itemSold,
    estimated_revenue:   Math.round(itemSold * price),
    interest_score:      computeInterestScore(itemSold),
    growth_rate:         0,
    sales_7d:            0,
    sales_30d:           0,
    data_source:         "tiktok_manual",
    imported_at:         opts.importedAt,
    last_seen_at:        opts.importedAt,
  };

  return { ok: true, row, warnings };
}
