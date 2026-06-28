import type { ProductCategory } from "@/types/product";

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
