import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * "มาแรงวันนี้" (Top Movers) — สินค้าที่ยอดขายขยับมากที่สุดจาก Snapshot ล่าสุด
 * เทียบกับวันก่อนหน้า (ไม่ใช่ยอดสะสม และไม่ใช่ค่าเฉลี่ย 7/30 วัน)
 *
 * หลักการ:
 * - units วันนี้   = item_sold(วันล่าสุด) - item_sold(วันก่อนหน้า)
 * - อัตราโต (%)    = เทียบกับ units ของวันก่อนหน้า (ต้องมี snapshot อย่างน้อย 3 วัน)
 * - ข้อมูลไม่พอ → คืนลิสต์ว่าง ให้ UI แสดงสถานะ "กำลังเก็บข้อมูล" (ห้ามแต่งตัวเลข)
 */

export interface DailyMover {
  /** id สินค้า (ตรงกับ Product.id ฝั่ง repository) */
  productId: string;
  /** จำนวนชิ้นที่ขายได้ระหว่าง snapshot วันก่อนหน้า → วันล่าสุด */
  unitsToday: number;
  /** จำนวนชิ้นของวันก่อนหน้า — null ถ้า snapshot ไม่ครบ 3 วัน */
  unitsPrevDay: number | null;
  /** อัตราโตเทียบวันก่อนหน้า (%) — null ถ้าฐานเป็น 0 หรือข้อมูลไม่พอ */
  growthPct: number | null;
  /** วันที่ของ snapshot ล่าสุดที่ใช้คำนวณ */
  latestDate: string;
}

interface SnapshotRow {
  product_id: number;
  snapshot_date: string;
  item_sold: number;
}

export interface DailyMoversResult {
  movers: DailyMover[];
  /** จำนวนวันของ snapshot ที่ใช้ (0-3) — UI ใช้บอกสถานะการเก็บข้อมูล */
  daysAvailable: number;
  latestDate: string | null;
}

const EMPTY: DailyMoversResult = { movers: [], daysAvailable: 0, latestDate: null };

export async function fetchDailyMovers(): Promise<DailyMoversResult> {
  try {
    const supabase = getSupabaseServerClient();
    // ดึง snapshot 5 วันล่าสุดพอ (เผื่อวันที่ขาด) — ต้องการแค่ 3 วันล่าสุดที่มีจริง
    const sinceDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("product_sales_snapshots")
      .select("product_id, snapshot_date, item_sold")
      .gte("snapshot_date", sinceDate)
      .order("snapshot_date", { ascending: false })
      .limit(20000);

    if (error) {
      console.warn("[daily-movers] snapshots unavailable:", error.message);
      return EMPTY;
    }

    const rows = (data ?? []) as SnapshotRow[];
    if (rows.length === 0) return EMPTY;

    // 3 วันล่าสุดที่มี snapshot จริง (เรียงใหม่→เก่า)
    const dates = [...new Set(rows.map((r) => r.snapshot_date))].sort().reverse().slice(0, 3);
    if (dates.length < 2) {
      return { movers: [], daysAvailable: dates.length, latestDate: dates[0] ?? null };
    }
    const [dLatest, dPrev, dPrevPrev] = dates;

    const byDate = new Map<string, Map<number, number>>(dates.map((d) => [d, new Map()]));
    for (const r of rows) {
      byDate.get(r.snapshot_date)?.set(r.product_id, Math.max(0, Number(r.item_sold) || 0));
    }

    const latestMap = byDate.get(dLatest)!;
    const prevMap = byDate.get(dPrev)!;
    const prevPrevMap = dPrevPrev ? byDate.get(dPrevPrev)! : null;

    const movers: DailyMover[] = [];
    for (const [productId, latestSold] of latestMap) {
      const prevSold = prevMap.get(productId);
      if (prevSold === undefined) continue;
      // Feed อาจรีเซ็ตยอดสะสม — delta ติดลบถือเป็น 0
      const unitsToday = Math.max(0, latestSold - prevSold);
      if (unitsToday <= 0) continue;

      let unitsPrevDay: number | null = null;
      if (prevPrevMap) {
        const prevPrevSold = prevPrevMap.get(productId);
        if (prevPrevSold !== undefined) unitsPrevDay = Math.max(0, prevSold - prevPrevSold);
      }
      const growthPct =
        unitsPrevDay !== null && unitsPrevDay > 0
          ? ((unitsToday - unitsPrevDay) / unitsPrevDay) * 100
          : null;

      movers.push({
        productId: String(productId),
        unitsToday,
        unitsPrevDay,
        growthPct,
        latestDate: dLatest,
      });
    }

    movers.sort((a, b) => b.unitsToday - a.unitsToday);
    return { movers, daysAvailable: dates.length, latestDate: dLatest };
  } catch (e) {
    console.warn("[daily-movers] failed:", e);
    return EMPTY;
  }
}
