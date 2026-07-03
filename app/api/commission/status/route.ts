import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();

  // ตรวจว่า Supabase configured ไหม
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      totalSnapshots: 0,
      productsWithCommission: 0,
      productsWithoutCommission: 0,
      lastImportedAt: null,
      error: "Supabase ยังไม่ได้ตั้งค่า",
    });
  }

  try {
    // นับ snapshots ทั้งหมด
    const { count: totalSnapshots, error: snapErr } = await supabase
      .from("commission_snapshots")
      .select("*", { count: "exact", head: true });

    if (snapErr) {
      const isTableNotFound =
        snapErr.message.includes("does not exist") ||
        snapErr.code === "42P01";
      return NextResponse.json({
        totalSnapshots: 0,
        productsWithCommission: 0,
        productsWithoutCommission: 0,
        lastImportedAt: null,
        tableNotFound: isTableNotFound,
        error: isTableNotFound ? undefined : snapErr.message,
      });
    }

    // ดึง import ล่าสุด
    const { data: latest } = await supabase
      .from("commission_snapshots")
      .select("imported_at")
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // นับสินค้า Shopee ที่มีค่าคอมจริง (commission_rate > 0 and commission_status IS NULL)
    const { count: withCommission } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("source_platform", "shopee")
      .gt("commission_rate", 0)
      .is("commission_status", null);

    // นับสินค้า Shopee ที่ยังไม่มีค่าคอม
    const { count: totalShopee } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("source_platform", "shopee");

    return NextResponse.json({
      totalSnapshots: totalSnapshots ?? 0,
      productsWithCommission: withCommission ?? 0,
      productsWithoutCommission: Math.max(0, (totalShopee ?? 0) - (withCommission ?? 0)),
      lastImportedAt: latest?.imported_at ?? null,
    });
  } catch (e) {
    return NextResponse.json({
      totalSnapshots: 0,
      productsWithCommission: 0,
      productsWithoutCommission: 0,
      lastImportedAt: null,
      error: String(e),
    });
  }
}
