import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/shopee/sync/stats — ดึงสถิติการซิงก์ล่าสุดจาก import_logs (ไม่ trigger sync)
// ใช้โดย ShopeeAutoSyncCard เพื่อแสดงผลสถานะ (ไม่ต้องการ auth)
export async function GET(): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ lastLog: null });
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data: lastLog } = await supabase
      .from("import_logs")
      .select(
        "id, source, mode, inserted_count, updated_count, skipped_count, failed_count, message, started_at, completed_at",
      )
      .eq("source", "shopee_product_feed")
      .eq("mode", "import")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ lastLog: lastLog ?? null });
  } catch {
    return NextResponse.json({ lastLog: null });
  }
}
