import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CommissionSnapshot } from "./types";

/**
 * ดึง commission snapshot ล่าสุดสำหรับสินค้านี้
 * ใช้ใน Server Component เท่านั้น (ต้องการ SUPABASE_SERVICE_ROLE_KEY)
 */
export async function getLatestCommissionForProduct(
  productId: string,
): Promise<CommissionSnapshot | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("commission_snapshots")
      .select("*")
      .eq("product_id", productId)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // ตาราง commission_snapshots อาจยังไม่มี — ไม่ต้อง throw เพียง return null
      console.warn("[commission] getLatestCommission failed:", error.message);
      return null;
    }
    return (data as CommissionSnapshot | null) ?? null;
  } catch {
    return null;
  }
}
