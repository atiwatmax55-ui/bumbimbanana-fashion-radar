import type { Product, TimeRange } from "@/types/product";
import { badgeFor, metricsFor } from "@/lib/analytics/period-metrics";

/**
 * ตัวช่วยคัดสินค้าสำหรับ 4 หัวข้อหลักของเว็บ — ใช้ร่วมกันทั้งหน้าแรกและหน้าเลือกดู
 * ทุกฟังก์ชันใช้ข้อมูลจริงเท่านั้น: ไม่มีข้อมูล = คืนลิสต์ว่าง (ให้ UI แสดง empty state)
 */

/** สินค้า "ควรรีบทำคอนเทนต์" — ติดป้ายในช่วงที่เลือก เรียงตามอันดับมาแรง */
export function urgentProducts(products: Product[], range: TimeRange): Product[] {
  return products
    .filter((p) => badgeFor(p.analytics, range) !== null)
    .sort((a, b) => {
      const ta = metricsFor(a.analytics, range)?.trendRank ?? Infinity;
      const tb = metricsFor(b.analytics, range)?.trendRank ?? Infinity;
      return ta - tb;
    });
}

/** สินค้าติดเทรนด์มาแรง — มีข้อมูลช่วงเวลาครบ เรียงตาม Trend Score */
export function trendingProducts(products: Product[], range: TimeRange): Product[] {
  return products
    .filter((p) => metricsFor(p.analytics, range) !== null)
    .sort((a, b) => {
      const ta = metricsFor(a.analytics, range)?.trendRank ?? Infinity;
      const tb = metricsFor(b.analytics, range)?.trendRank ?? Infinity;
      return ta - tb;
    });
}

export type BestSellerBasis = "period" | "cumulative";

/**
 * สินค้าขายดี — ใช้ยอดขายบาทจริงของช่วงเวลาเมื่อมีข้อมูล
 * ถ้ายังเก็บข้อมูลไม่พอ → เรียงจากยอดขายสะสมจาก Shopee (ต้องระบุบนหน้าเว็บว่าเป็นยอดสะสม)
 */
export function bestSellers(
  products: Product[],
  range: TimeRange,
): { list: Product[]; basis: BestSellerBasis } {
  const withPeriod = products.filter((p) => metricsFor(p.analytics, range) !== null);
  if (withPeriod.length > 0) {
    return {
      basis: "period",
      list: withPeriod.sort(
        (a, b) =>
          (metricsFor(b.analytics, range)?.revenue ?? 0) -
          (metricsFor(a.analytics, range)?.revenue ?? 0),
      ),
    };
  }
  return {
    basis: "cumulative",
    list: [...products].sort((a, b) => (b.itemSold ?? 0) - (a.itemSold ?? 0)),
  };
}

/** สินค้าค่าคอมสูง — เฉพาะสินค้าที่มีข้อมูลค่าคอมจริงจาก Shopee Affiliate */
export function topCommission(products: Product[]): Product[] {
  return products
    .filter((p) => p.commissionRate > 0 && !p.commissionStatus)
    .sort((a, b) => b.commissionRate - a.commissionRate);
}

/** สินค้าใหม่ — ระบบพบใน Feed ครั้งแรกภายใน 7 วัน (ไม่นับชุดข้อมูลตั้งต้น) */
export function newProducts(products: Product[]): Product[] {
  return products
    .filter((p) => p.analytics?.isNew)
    .sort((a, b) => (b.firstSeenAt ?? "").localeCompare(a.firstSeenAt ?? ""));
}

/** เวลาเริ่มติดตามข้อมูลของระบบ (สินค้าที่เก่าที่สุดที่ระบบรู้จัก) */
export function trackingSince(products: Product[]): string | null {
  let earliest: string | null = null;
  for (const p of products) {
    if (p.firstSeenAt && (earliest === null || p.firstSeenAt < earliest)) {
      earliest = p.firstSeenAt;
    }
  }
  return earliest;
}
