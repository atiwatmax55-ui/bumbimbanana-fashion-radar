import type { ProductCategory } from "@/types/product";

export const SHOPEE_CAT_MAP: Record<string, ProductCategory> = {
  "dresses": "เดรส",
  "women clothes": "เสื้อเชิ้ต",
  "skirts": "กระโปรง",
  "women bags": "กระเป๋า",
  "women shoes": "รองเท้า",
  "fine jewelry": "อื่นๆ",
  "hair accessories": "อื่นๆ",
  "fashion accessories": "อื่นๆ",
  "women watches": "อื่นๆ",
  "women muslim wear": "เสื้อเชิ้ต",
  "lingerie & underwear": "ชุดเซ็ต",
  "innerwear & underwear": "ชุดเซ็ต",
  "sleepwear": "ชุดเซ็ต",
  "sleepwear & pajamas": "ชุดเซ็ต",
  "hoodies & sweatshirts": "เสื้อครอป",
  "wedding dresses": "เดรส",
  "traditional wear": "อื่นๆ",
  "eyewear": "อื่นๆ",
  "loafers & boat shoes": "รองเท้า",
};

export function mapShopeeCategory(cat1?: string | null): ProductCategory {
  if (!cat1) return "อื่นๆ";
  return SHOPEE_CAT_MAP[cat1.trim().toLowerCase()] ?? "อื่นๆ";
}

/** คำนวณ interestScore แบบ log-scale (1–100) จากยอดขายสะสม
 *  10 ชิ้น → ~10 | 100 → ~30 | 1K → ~50 | 10K → ~70 | 100K → ~90 | 1M → 100
 */
export function computeInterestScore(itemSold: number): number {
  return Math.min(100, Math.max(1, Math.round(Math.log10(Math.max(1, itemSold)) * 20 - 10)));
}
