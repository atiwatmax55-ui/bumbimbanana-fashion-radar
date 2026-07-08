import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ประวัติ Snapshot รายวันของสินค้า 1 ตัว สำหรับกราฟในหน้ารายละเอียดสินค้า
 * - ยอดขายรายวัน = ผลต่างของยอดสะสมระหว่างวัน (delta ติดลบถือเป็น 0 — Feed อาจรีเซ็ต)
 * - ข้อมูลไม่พอ/ตารางยังไม่พร้อม → คืนลิสต์ว่าง ให้ UI แสดง "กำลังเก็บข้อมูล"
 */

export interface HistoryPoint {
  /** วันที่ของ snapshot (YYYY-MM-DD) */
  date: string;
  /** จำนวนชิ้นที่ขายได้ในวันนั้น (เทียบ snapshot วันก่อนหน้า) — null สำหรับวันแรกสุด */
  unitsSold: number | null;
  /** ราคาที่บันทึกไว้ ณ วันนั้น (บาท) — null ถ้า Feed ไม่ส่งราคามา */
  price: number | null;
  /** ยอดขายสะสม ณ วันนั้น */
  cumulativeSold: number;
}

export async function fetchProductHistory(productId: string, days = 60): Promise<HistoryPoint[]> {
  const numericId = Number(productId);
  if (!Number.isFinite(numericId)) return []; // mock product id เช่น "011" — ไม่มี snapshot

  try {
    const supabase = getSupabaseServerClient();
    const sinceDate = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("product_sales_snapshots")
      .select("snapshot_date, item_sold, price")
      .eq("product_id", numericId)
      .gte("snapshot_date", sinceDate)
      .order("snapshot_date", { ascending: true })
      .limit(days + 10);

    if (error) {
      console.warn("[product-history] snapshots unavailable:", error.message);
      return [];
    }

    const rows = (data ?? []) as { snapshot_date: string; item_sold: number; price: number | null }[];
    return rows.map((row, i) => {
      const sold = Math.max(0, Number(row.item_sold) || 0);
      const prevSold = i > 0 ? Math.max(0, Number(rows[i - 1].item_sold) || 0) : null;
      return {
        date: row.snapshot_date,
        unitsSold: prevSold !== null ? Math.max(0, sold - prevSold) : null,
        price: row.price !== null ? Number(row.price) : null,
        cumulativeSold: sold,
      };
    });
  } catch (e) {
    console.warn("[product-history] failed:", e);
    return [];
  }
}
