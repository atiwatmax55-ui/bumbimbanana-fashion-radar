import type { ProductCategory } from "@/types/product";

/** ตัวกรองด่วน (Quick Filter Chip) เลือกได้ทีละ 1 — ไม่รวมกับ RadarFilterState */
export type QuickFilterKey =
  | "all"                  // ทั้งหมด
  | "best_seller"          // ขายดีที่สุด (salesRank ≤ 50)
  | "trending"             // กำลังมาแรง (growthRate ≥ 20%)
  | "has_commission"       // มีค่าคอมจริงแล้ว
  | "wait_commission"      // รอข้อมูลค่าคอม (source=shopee ยังไม่มีค่าคอมจริง)
  | "strategy_review"      // รอฝ่ายกลยุทธ์ตรวจ
  | "approved";            // อนุมัติทำคอนเทนต์แล้ว

export const QUICK_FILTER_LABELS: Record<QuickFilterKey, string> = {
  all:              "ทั้งหมด",
  best_seller:      "ขายดีที่สุด",
  trending:         "กำลังมาแรง",
  has_commission:   "มีค่าคอมจริงแล้ว",
  wait_commission:  "รอข้อมูลค่าคอม",
  strategy_review:  "รอฝ่ายกลยุทธ์ตรวจ",
  approved:         "อนุมัติแล้ว",
};

/** สถานะตัวกรองทั้งหมดของหน้า Product Radar (หน้าค้นหาและคัดสินค้า) */
export interface RadarFilterState {
  categories: ProductCategory[];
  minPrice: number;
  maxPrice: number;
  minCommissionRate: number;
  minSales: number;
  minGrowthRate: number;
  savedOnly: boolean;
}

export const PRICE_BOUNDS = { min: 0, max: 1500 };
export const COMMISSION_BOUNDS = { min: 0, max: 35 };
export const GROWTH_BOUNDS = { min: -20, max: 100 };
export const SALES_BOUNDS = { min: 0, max: 8500 };

export const DEFAULT_RADAR_FILTERS: RadarFilterState = {
  categories: [],
  minPrice: PRICE_BOUNDS.min,
  maxPrice: PRICE_BOUNDS.max,
  minCommissionRate: COMMISSION_BOUNDS.min,
  minSales: SALES_BOUNDS.min,
  minGrowthRate: GROWTH_BOUNDS.min,
  savedOnly: false,
};

export function countActiveFilters(filters: RadarFilterState): number {
  let count = 0;
  if (filters.categories.length > 0) count += 1;
  if (filters.minPrice > PRICE_BOUNDS.min || filters.maxPrice < PRICE_BOUNDS.max) count += 1;
  if (filters.minCommissionRate > COMMISSION_BOUNDS.min) count += 1;
  if (filters.minSales > SALES_BOUNDS.min) count += 1;
  if (filters.minGrowthRate > GROWTH_BOUNDS.min) count += 1;
  if (filters.savedOnly) count += 1;
  return count;
}
