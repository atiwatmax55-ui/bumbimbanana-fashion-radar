import type { Product, ProductCategory, ProductGoal, TimeRange } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";

export function getSalesByRange(product: Product, range: TimeRange): number {
  return range === "7d" ? product.sales7d : product.sales30d;
}

export interface DashboardTotals {
  totalProducts: number;
  totalSales7d: number;
  totalSales30d: number;
  totalEstimatedCommission: number;
}

/** สรุปตัวเลขรวมของทั้งระบบ แสดงในการ์ดสถิติบน Dashboard */
export function getDashboardTotals(products: Product[]): DashboardTotals {
  return products.reduce(
    (acc, p) => {
      acc.totalSales7d += p.sales7d;
      acc.totalSales30d += p.sales30d;
      acc.totalEstimatedCommission += p.estimatedRevenue * (p.commissionRate / 100);
      return acc;
    },
    { totalProducts: products.length, totalSales7d: 0, totalSales30d: 0, totalEstimatedCommission: 0 }
  );
}

export interface CategoryTotal {
  category: ProductCategory;
  value: number;
}

/** รวมยอดขายของแต่ละหมวดสินค้าตามช่วงเวลาที่เลือก ใช้กับกราฟยอดขายตามหมวดสินค้า */
export function getCategoryTotals(products: Product[], range: TimeRange): CategoryTotal[] {
  return PRODUCT_CATEGORIES.map((category) => ({
    category,
    value: products
      .filter((p) => p.category === category)
      .reduce((sum, p) => sum + getSalesByRange(p, range), 0),
  }));
}

export interface CategoryPeriodComparison {
  category: ProductCategory;
  sales7d: number;
  sales30d: number;
}

/** เปรียบเทียบยอดขาย 7 วัน และ 30 วัน ของแต่ละหมวดสินค้า ใช้กับกราฟเปรียบเทียบ */
export function getCategoryPeriodComparison(products: Product[]): CategoryPeriodComparison[] {
  return PRODUCT_CATEGORIES.map((category) => {
    const inCategory = products.filter((p) => p.category === category);
    return {
      category,
      sales7d: inCategory.reduce((sum, p) => sum + p.sales7d, 0),
      sales30d: inCategory.reduce((sum, p) => sum + p.sales30d, 0),
    };
  });
}

/** หาหมวดสินค้าที่น่าสนใจที่สุด (ยอดขาย 30 วันรวมสูงสุด) */
export function getTopCategory(products: Product[]): CategoryTotal {
  const totals = getCategoryTotals(products, "30d");
  return totals.reduce((best, current) => (current.value > best.value ? current : best));
}

export function getBestSellingProduct(products: Product[]): Product | undefined {
  return products.find((p) => p.salesRank === 1);
}

export function getFastestGrowingProduct(products: Product[]): Product | undefined {
  return products.find((p) => p.growthRank === 1);
}

/** จัดอันดับสินค้าตามเป้าหมายที่ผู้ใช้เลือก (ค่าคอมสูง / ยอดขายแรง / รายได้สูง / เติบโตเร็ว / คะแนนความน่าสนใจสูง) */
export function getProductsByGoal(
  products: Product[],
  goal: ProductGoal,
  range: TimeRange,
  limit?: number
): Product[] {
  const sorted = [...products].sort((a, b) => {
    switch (goal) {
      case "commission":
        return b.commissionRate - a.commissionRate;
      case "sales":
        return getSalesByRange(b, range) - getSalesByRange(a, range);
      case "revenue":
        return b.estimatedRevenue - a.estimatedRevenue;
      case "growth":
        return b.growthRate - a.growthRate;
      case "interest":
        return b.interestScore - a.interestScore;
      default:
        return a.salesRank - b.salesRank;
    }
  });
  return limit ? sorted.slice(0, limit) : sorted;
}

export const GOAL_LABELS: Record<ProductGoal, string> = {
  commission: "ค่าคอมสูง",
  sales: "ยอดขายแรง",
  revenue: "รายได้สูง",
  growth: "เติบโตเร็ว",
  interest: "คะแนนความน่าสนใจสูง",
};
