import type { Product } from "@/types/product";
import { formatBaht, formatNumber } from "@/lib/utils/format";

export interface OpportunityResult {
  /** คะแนนโอกาส 0-100 */
  score: number;
  /** เหตุผลประกอบคะแนน (ภาษาไทย) */
  reasoning: string[];
}

const CATEGORY_SCORES: Record<string, number> = {
  "เดรส": 20,
  "ชุดเซ็ต": 20,
  "เสื้อครอป": 18,
  "กระโปรง": 17,
  "กางเกงยีนส์": 16,
  "เสื้อเชิ้ต": 15,
  "กางเกงขากระบอก": 14,
  "รองเท้า": 12,
  "กระเป๋า": 12,
  "เสื้อออกกำลังกาย": 10,
  "อื่นๆ": 8,
};

/**
 * คำนวณ Opportunity Score 0-100 จากข้อมูลจริงของสินค้า
 * ใช้ allProducts เพื่อเปรียบเทียบเชิง percentile
 * ถ้าเป็น mock data จะใช้ interestScore เป็นฐาน
 */
export function computeOpportunityScore(
  product: Product,
  allProducts: Product[],
): OpportunityResult {
  if (product.source !== "shopee") {
    return {
      score: product.interestScore,
      reasoning: [`คะแนนความน่าสนใจ ${product.interestScore} คะแนน (จากข้อมูลตัวอย่าง Mock Data)`],
    };
  }

  const reasoning: string[] = [];
  let score = 0;

  // ─── 1. Sales Score (40 pts) ─────────────────────────────────────────────────
  const shopeeProd = allProducts.filter((p) => p.source === "shopee");
  const sortedBySales = [...shopeeProd].sort((a, b) => b.sales30d - a.sales30d);
  const salesIdx = sortedBySales.findIndex((p) => p.id === product.id);
  const salesPercent = salesIdx === -1 ? 1 : (salesIdx + 1) / Math.max(1, sortedBySales.length);
  let salesScore: number;
  if (salesPercent <= 0.1) {
    salesScore = 40;
    reasoning.push(`ยอดขายสะสมติด Top 10% (${formatNumber(product.sales30d)} ชิ้น) — สินค้าที่ตลาดพิสูจน์แล้วว่าขายดี`);
  } else if (salesPercent <= 0.25) {
    salesScore = 30;
    reasoning.push(`ยอดขายสะสมติด Top 25% (${formatNumber(product.sales30d)} ชิ้น)`);
  } else if (salesPercent <= 0.5) {
    salesScore = 20;
    reasoning.push(`ยอดขายสะสม ${formatNumber(product.sales30d)} ชิ้น อยู่ครึ่งบน`);
  } else {
    salesScore = 8;
    reasoning.push(`ยอดขายสะสม ${formatNumber(product.sales30d)} ชิ้น ยังน้อยกว่าครึ่งของสินค้าอื่น`);
  }
  score += salesScore;

  // ─── 2. Commission Score (25 pts) ────────────────────────────────────────────
  const hasRealCommission = product.commissionRate > 0 && !product.commissionStatus;
  if (hasRealCommission) {
    const commScore = Math.min(25, Math.round((product.commissionRate / 30) * 25));
    score += commScore;
    reasoning.push(`มีข้อมูลค่าคอมจริง ${product.commissionRate.toFixed(1)}% จาก Shopee Affiliate (+${commScore} คะแนน)`);
  } else {
    reasoning.push("ยังไม่มีข้อมูลค่าคอมจริง — นำเข้าไฟล์ Shopee Affiliate เพื่อรับคะแนนส่วนนี้ (+0 คะแนน)");
  }

  // ─── 3. Price Sweet Spot (15 pts) ────────────────────────────────────────────
  let priceScore: number;
  if (product.price >= 100 && product.price <= 600) {
    priceScore = 15;
    reasoning.push(`ราคา ${formatBaht(product.price)} อยู่ในช่วงที่ลูกค้าตัดสินใจซื้อง่าย (100–600 บาท)`);
  } else if (product.price >= 50 && product.price <= 1000) {
    priceScore = 8;
  } else {
    priceScore = 3;
  }
  score += priceScore;

  // ─── 4. Category Appeal (20 pts) ─────────────────────────────────────────────
  const catScore = CATEGORY_SCORES[product.category] ?? 8;
  score += catScore;
  if (catScore >= 18) {
    reasoning.push(`หมวด "${product.category}" เป็นหมวดที่ได้รับความนิยมสูงในคอนเทนต์แฟชั่น`);
  } else if (catScore >= 14) {
    reasoning.push(`หมวด "${product.category}" มีโอกาสทำคอนเทนต์หลากหลายรูปแบบ`);
  }

  return { score: Math.min(100, Math.round(score)), reasoning };
}
