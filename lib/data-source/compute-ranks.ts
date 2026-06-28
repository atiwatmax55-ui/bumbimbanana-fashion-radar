/**
 * คำนวณอันดับยอดขาย/ค่าคอมมิชชัน/การเติบโต ของสินค้าทุกรายการในระบบ (1 = ดีที่สุด)
 * ใช้ร่วมกันทั้ง Mock Data (lib/mock-data/products.ts) และข้อมูลจริงจาก Windsor.ai
 * (lib/data-source/windsor-field-map.ts) เพื่อให้กฎการจัดอันดับเหมือนกันทุกแหล่งข้อมูล
 */
export function computeProductRanks<
  T extends { id: string; sales30d: number; commissionRate: number; growthRate: number },
>(items: T[]): (T & { salesRank: number; commissionRank: number; growthRank: number })[] {
  const bySales = [...items].sort((a, b) => b.sales30d - a.sales30d);
  const byCommission = [...items].sort((a, b) => b.commissionRate - a.commissionRate);
  const byGrowth = [...items].sort((a, b) => b.growthRate - a.growthRate);

  const salesRankMap = new Map(bySales.map((item, index) => [item.id, index + 1]));
  const commissionRankMap = new Map(byCommission.map((item, index) => [item.id, index + 1]));
  const growthRankMap = new Map(byGrowth.map((item, index) => [item.id, index + 1]));

  return items.map((item) => ({
    ...item,
    salesRank: salesRankMap.get(item.id)!,
    commissionRank: commissionRankMap.get(item.id)!,
    growthRank: growthRankMap.get(item.id)!,
  }));
}
