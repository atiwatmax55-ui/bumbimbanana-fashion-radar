import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type SupabaseHealthResponse = {
  configured:          boolean;
  tablesReady:         boolean;
  shopeeProductsCount: number;
  missingColumns:      string[];   // คอลัมน์ Shopee ที่ขาดจริงใน public.products
  missingTables:       string[];   // ตารางที่ขาด (import_logs ฯลฯ)
  error?:              string;
};

/**
 * GET /api/supabase/health
 * ตรวจสอบความพร้อมของ Supabase โดยเรียก RPC shopee_missing_columns()
 * เพื่อให้รู้ว่าคอลัมน์ Shopee ไหนขาดจริง ไม่เดาจาก filter ที่ PostgREST อาจไม่ error
 */
export async function GET(): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json<SupabaseHealthResponse>({
      configured:          false,
      tablesReady:         false,
      shopeeProductsCount: 0,
      missingColumns:      [],
      missingTables:       ["products + Shopee columns", "import_logs"],
    });
  }

  const supabase = getSupabaseServerClient();
  const missingTables: string[] = [];
  let missingColumns: string[] = [];

  // ─── 1. ตรวจคอลัมน์ Shopee ผ่าน RPC (เชื่อถือได้กว่า .eq() ที่ PostgREST อาจไม่ error) ─
  const { data: rpcData, error: rpcError } = await supabase.rpc("shopee_missing_columns");

  if (rpcError) {
    // function ยังไม่มี — แสดงว่า migration 0004 ยังไม่ได้รัน
    missingColumns = [
      "source_item_id", "source_platform", "external_product_id",
      "item_sold", "item_rating", "like_count", "raw_sale_price",
      "commission_status", "data_source", "is_preferred_shop", "is_official_shop",
      "category_level_1", "category_level_2", "category_level_3", "shop_rating",
      "passed_by_rule", "filter_reason", "imported_at",
    ];
    missingTables.push(`products + Shopee columns (${rpcError.message})`);
  } else {
    missingColumns = (rpcData as { column_name: string }[] | null)
      ?.map((r) => r.column_name) ?? [];
  }

  // ─── 2. ตรวจ import_logs ──────────────────────────────────────────────────────
  const { error: ilError } = await supabase
    .from("import_logs")
    .select("id", { head: true })
    .limit(1);
  if (ilError) missingTables.push(`import_logs (${ilError.message})`);

  // ─── 3. นับสินค้า Shopee (เฉพาะถ้า schema ครบ) ───────────────────────────────
  let shopeeProductsCount = 0;
  if (missingColumns.length === 0 && missingTables.length === 0) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("source_platform", "shopee");
    shopeeProductsCount = count ?? 0;
  }

  const tablesReady = missingColumns.length === 0 && missingTables.length === 0;

  return NextResponse.json<SupabaseHealthResponse>({
    configured:          true,
    tablesReady,
    shopeeProductsCount,
    missingColumns,
    missingTables,
    error: !tablesReady
      ? [
          ...missingTables,
          missingColumns.length > 0
            ? `คอลัมน์ที่ขาด: ${missingColumns.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ")
      : undefined,
  });
}
