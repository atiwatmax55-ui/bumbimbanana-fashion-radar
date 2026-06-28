import type { Product, TimeRange } from "@/types/product";
import type { ProductFilters, ProductSortKey } from "@/lib/data-source/types";

/** คืนค่ายอดขายของสินค้าตามช่วงเวลาที่เลือก (7 วัน หรือ 30 วัน) */
export function getSalesByRange(product: Product, timeRange: TimeRange): number {
  return timeRange === "7d" ? product.sales7d : product.sales30d;
}

/** กรองรายการสินค้าตามตัวกรองที่ผู้ใช้เลือก ใช้ร่วมกันทั้งฝั่ง repository และฝั่ง client ของ Product Radar */
export function applyProductFilters(
  products: Product[],
  timeRange: TimeRange,
  filters?: ProductFilters
): Product[] {
  if (!filters) return products;

  return products.filter((product) => {
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(product.category)) return false;
    }
    if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
    if (
      filters.minCommissionRate !== undefined &&
      product.commissionRate < filters.minCommissionRate
    ) {
      return false;
    }
    if (filters.minSales !== undefined && getSalesByRange(product, timeRange) < filters.minSales) {
      return false;
    }
    if (filters.minGrowthRate !== undefined && product.growthRate < filters.minGrowthRate) {
      return false;
    }
    if (filters.savedOnly) {
      const savedIds = filters.savedProductIds ?? [];
      if (!savedIds.includes(product.id)) return false;
    }
    return true;
  });
}

/** เรียงรายการสินค้าตามตัวเลือกเรียงข้อมูลที่ผู้ใช้เลือก */
export function sortProducts(
  products: Product[],
  timeRange: TimeRange,
  sortBy?: ProductSortKey
): Product[] {
  const sorted = [...products];
  switch (sortBy) {
    case "sales":
      return sorted.sort((a, b) => getSalesByRange(b, timeRange) - getSalesByRange(a, timeRange));
    case "revenue":
      return sorted.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
    case "commission":
      return sorted.sort((a, b) => b.commissionRate - a.commissionRate);
    case "growth":
      return sorted.sort((a, b) => b.growthRate - a.growthRate);
    case "interest":
      return sorted.sort((a, b) => b.interestScore - a.interestScore);
    case "salesRank":
      return sorted.sort((a, b) => a.salesRank - b.salesRank);
    default:
      return sorted.sort((a, b) => a.salesRank - b.salesRank);
  }
}
