import type { Product, TimeRange } from "@/types/product";
import { metricsFor } from "@/lib/analytics/period-metrics";

/**
 * คะแนน "น่าโปรโมท" (Opportunity Score) 0–100 — ตอบคำถามเดียว: วันนี้ควรโปรโมทตัวไหน
 *
 * สูตร (โปร่งใส ใช้เฉพาะข้อมูลจริง):
 * - ความมาแรง (Trend Score ของช่วงที่เลือก) น้ำหนัก 60%
 * - ค่าคอมมิชชันจริงจาก Shopee Affiliate น้ำหนัก 40% (20% ขึ้นไป = คะแนนเต็ม)
 * - ไม่มีข้อมูลค่าคอม → ใช้ความมาแรงอย่างเดียว และติดธง hasCommissionData=false
 *   ให้ UI บอกตรง ๆ (ห้ามเดาค่าแทน)
 * - ไม่มีข้อมูลช่วงเวลา (Snapshot ยังไม่พอ) → null (ห้ามแต่งตัวเลข)
 */

/** ค่าคอมที่ถือว่า "เต็มคะแนน" — 20% ขึ้นไปคือดีมากสำหรับแฟชั่น Shopee */
const COMMISSION_FULL_SCORE_PCT = 20;

export interface OpportunityScore {
  /** คะแนนรวม 0–100 */
  score: number;
  /** มีข้อมูลค่าคอมจริงร่วมคำนวณหรือไม่ */
  hasCommissionData: boolean;
  /** ส่วนคะแนนความมาแรง (0–100) */
  trendPart: number;
  /** ส่วนคะแนนค่าคอม (0–100) — null เมื่อไม่มีข้อมูลค่าคอมจริง */
  commissionPart: number | null;
}

export function opportunityScore(product: Product, range: TimeRange): OpportunityScore | null {
  const metrics = metricsFor(product.analytics, range);
  if (!metrics || metrics.trendScore === null) return null;

  const hasCommission = product.commissionRate > 0 && !product.commissionStatus;
  if (!hasCommission) {
    return {
      score: Math.round(metrics.trendScore),
      hasCommissionData: false,
      trendPart: metrics.trendScore,
      commissionPart: null,
    };
  }

  const commissionPart =
    (Math.min(product.commissionRate, COMMISSION_FULL_SCORE_PCT) / COMMISSION_FULL_SCORE_PCT) * 100;
  return {
    score: Math.round(0.6 * metrics.trendScore + 0.4 * commissionPart),
    hasCommissionData: true,
    trendPart: metrics.trendScore,
    commissionPart,
  };
}

/** สินค้าเรียงตามคะแนนน่าโปรโมท (มากไปน้อย) — เฉพาะที่คำนวณคะแนนได้จริง */
export function opportunityProducts(
  products: Product[],
  range: TimeRange,
): { product: Product; opportunity: OpportunityScore }[] {
  return products
    .map((product) => ({ product, opportunity: opportunityScore(product, range) }))
    .filter(
      (row): row is { product: Product; opportunity: OpportunityScore } => row.opportunity !== null,
    )
    .sort((a, b) => {
      // สินค้าที่มีข้อมูลค่าคอมครบมาก่อน (คะแนนน่าเชื่อถือกว่า) แล้วค่อยเรียงตามคะแนน
      if (a.opportunity.hasCommissionData !== b.opportunity.hasCommissionData) {
        return a.opportunity.hasCommissionData ? -1 : 1;
      }
      return b.opportunity.score - a.opportunity.score;
    });
}
