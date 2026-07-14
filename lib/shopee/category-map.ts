import type { ProductCategory } from "@/types/product";

/** แปลงหมวดจาก Shopee Feed → หมวดภายในระบบ (แสดงบนการ์ดสินค้า + แถบกรองหมวดหมู่) */
export const SHOPEE_CAT_MAP: Record<string, ProductCategory> = {
  "dresses": "เดรส",
  "wedding dresses": "เดรส",
  "skirts": "กระโปรง",
  "sets": "ชุดเซ็ต",
  "jumpsuits, playsuits & overalls": "ชุดเซ็ต",
  "hoodies & sweatshirts": "เสื้อครอป",
  "women clothes": "อื่นๆ",
  "women shoes": "รองเท้า",
  "women bags": "กระเป๋า",
};

/** หมวดย่อย (cat2) ใต้ Women Clothes → หมวดภายใน */
export const SHOPEE_SUBCAT_MAP: Record<string, ProductCategory> = {
  "dresses": "เดรส",
  "skirts": "กระโปรง",
  "sets": "ชุดเซ็ต",
  "jumpsuits, playsuits & overalls": "ชุดเซ็ต",
  "pants & leggings": "กางเกงขากระบอก",
  "shorts": "กางเกงขากระบอก",
  "jeans": "กางเกงยีนส์",
  "tops": "เสื้อครอป",
  "shirts & blouses": "เสื้อเชิ้ต",
  "hoodies & sweatshirts": "เสื้อครอป",
  "jackets, coats & vests": "เสื้อครอป",
  "sweaters & cardigans": "เสื้อครอป",
  "sports & activewear": "เสื้อออกกำลังกาย",
};

// คำในชื่อสินค้าที่บ่งชี้ว่าเป็น "ชุดเซ็ต" จริง แม้ Feed จะลง cat2 ผิดเป็นเสื้อ/กระโปรงเดี่ยว
// (เช่น ร้านลงหมวด "tops" ทั้งที่สินค้าคือ "เสื้อ+กระโปรง ชุดเซ็ต 2 ชิ้น")
const TITLE_SET_KEYWORDS = ["ชุดเซ็ท", "ชุดเซ็ต", "เซ็ต 2 ชิ้น", "เซ็ท 2 ชิ้น", "set 2", "2 piece set", "co-ord"];

function titleIndicatesSet(title: string): boolean {
  const lower = title.trim().toLowerCase();
  if (!lower) return false;
  return TITLE_SET_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * แปลงหมวด Shopee → หมวดภายในระบบ ตามลำดับความสำคัญ:
 * ชุดเซ็ต (title override) > เดรส/กระโปรง/กางเกง (cat2 ตรง) > cat1 fallback
 * @param title ใช้ตรวจ "ชุดเซ็ต" เท่านั้น กัน cat2 ผิดพลาดจากร้านลงหมวดไม่ตรง
 */
export function mapShopeeCategory(
  cat1?: string | null,
  cat2?: string | null,
  title?: string | null,
): ProductCategory {
  if (titleIndicatesSet(title ?? "")) return "ชุดเซ็ต";
  const n2 = (cat2 ?? "").trim().toLowerCase();
  if (n2 && SHOPEE_SUBCAT_MAP[n2]) return SHOPEE_SUBCAT_MAP[n2];
  const n1 = (cat1 ?? "").trim().toLowerCase();
  return SHOPEE_CAT_MAP[n1] ?? "อื่นๆ";
}

/** คำนวณ interestScore แบบ log-scale (1–100) จากยอดขายสะสม
 *  10 ชิ้น → ~10 | 100 → ~30 | 1K → ~50 | 10K → ~70 | 100K → ~90 | 1M → 100
 */
export function computeInterestScore(itemSold: number): number {
  return Math.min(100, Math.max(1, Math.round(Math.log10(Math.max(1, itemSold)) * 20 - 10)));
}
