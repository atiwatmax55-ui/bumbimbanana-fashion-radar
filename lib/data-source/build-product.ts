import type { Product, ProductCategory } from "@/types/product";
import { getCategoryPlaceholderImage } from "@/lib/data-source/category-image";

/** ฟิลด์ที่ผู้ใช้กรอกเองได้ ไม่ว่าจะเป็น Mock Data ในโค้ดหรือสินค้าที่เจ้าของเว็บพิมพ์เพิ่มเอง */
export interface ProductDraft {
  productName: string;
  shopName: string;
  category: ProductCategory;
  price: number;
  commissionRate: number;
  sales7d: number;
  sales30d: number;
  growthRate: number;
  interestScore: number;
  productUrl?: string;
}

/**
 * แปลง ProductDraft ให้เป็น Product เต็มรูปแบบ (ยังไม่รวม salesRank/commissionRank/growthRank
 * เพราะอันดับต้องคำนวณจากสินค้าทั้งระบบพร้อมกันผ่าน computeProductRanks เสมอ)
 */
export function buildProductFromDraft(
  draft: ProductDraft,
  id: string,
  lastUpdatedAt: string
): Omit<Product, "salesRank" | "commissionRank" | "growthRank"> {
  return {
    ...draft,
    id,
    productImage: getCategoryPlaceholderImage(draft.category),
    productUrl: draft.productUrl?.trim() || "#",
    estimatedRevenue: Math.round(draft.sales30d * draft.price),
    lastUpdatedAt,
  };
}
