import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CommissionImportRequest,
  CommissionImportResponse,
  CommissionSnapshot,
} from "@/lib/commission/types";

export const dynamic = "force-dynamic";

/** แปลงสตริงค่าคอมมิชชันเป็นตัวเลข เช่น "5.5%", "5,50" → 5.5 */
function parseRate(raw: string): number | null {
  const cleaned = String(raw).replace(/[%,\s฿]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) || n < 0 ? null : n;
}

/** แปลงสตริงตัวเลขทั่วไปเป็น number */
function parseAmount(raw: string): number | null {
  const cleaned = String(raw).replace(/[,\s฿]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

type ProductLookup = {
  id:                  string;
  external_product_id: string | null;
  product_url:         string | null;
  title:               string | null;
  product_name:        string | null;
  shop_name:           string | null;
};

/**
 * POST /api/commission/import
 * รับข้อมูลแถวจาก CSV/XLSX (parse แล้ว client-side) พร้อม column mapping
 * จับคู่กับ products แล้วบันทึกใน commission_snapshots
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: CommissionImportRequest;
  try {
    body = (await req.json()) as CommissionImportRequest;
  } catch {
    return NextResponse.json({ error: "JSON body ไม่ถูกต้อง" }, { status: 400 });
  }

  const { rows, mapping, sourceFile } = body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลในไฟล์" }, { status: 400 });
  }
  if (!mapping.commission_rate) {
    return NextResponse.json({ error: "ต้องระบุคอลัมน์ 'อัตราค่าคอม (%)' ก่อนนำเข้า" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const errors: string[] = [];

  // ─── 1. โหลดสินค้าทั้งหมดสำหรับ matching ─────────────────────────────────
  const { data: allProducts, error: productErr } = await supabase
    .from("products")
    .select("id, external_product_id, product_url, title, product_name, shop_name")
    .eq("source_platform", "shopee");

  if (productErr) {
    return NextResponse.json({ error: `ดึงสินค้าจาก Supabase ไม่ได้: ${productErr.message}` }, { status: 500 });
  }

  // ─── 2. สร้าง lookup maps สำหรับ matching ─────────────────────────────────
  const byExtId  = new Map<string, string>();  // extId → productId
  const byUrl    = new Map<string, string>();  // url → productId
  const byName   = new Map<string, string>();  // "name|shop" → productId

  for (const p of (allProducts as ProductLookup[] | null) ?? []) {
    if (p.external_product_id) {
      byExtId.set(p.external_product_id.toLowerCase().trim(), p.id);
    }
    if (p.product_url) {
      byUrl.set(p.product_url.toLowerCase().trim(), p.id);
    }
    const name = (p.title || p.product_name || "").toLowerCase().trim();
    const shop = (p.shop_name || "").toLowerCase().trim();
    if (name) {
      byName.set(`${name}|${shop}`, p.id);
      byName.set(`${name}|`, p.id); // fallback ไม่มีชื่อร้าน
    }
  }

  // ─── 3. จับคู่แต่ละแถว ─────────────────────────────────────────────────────
  type MatchResult = {
    productId: string | null;
    method:    "extId" | "url" | "name" | "none";
  };

  function matchRow(raw: Record<string, string>): MatchResult {
    const extId = mapping.external_product_id
      ? raw[mapping.external_product_id]?.toLowerCase().trim()
      : undefined;
    if (extId && byExtId.has(extId)) {
      return { productId: byExtId.get(extId)!, method: "extId" };
    }

    const url = mapping.product_url
      ? raw[mapping.product_url]?.toLowerCase().trim()
      : undefined;
    if (url && byUrl.has(url)) {
      return { productId: byUrl.get(url)!, method: "url" };
    }

    const name = mapping.product_name
      ? raw[mapping.product_name]?.toLowerCase().trim()
      : undefined;
    const shop = mapping.shop_name
      ? raw[mapping.shop_name]?.toLowerCase().trim()
      : undefined;
    if (name) {
      const key = `${name}|${shop ?? ""}`;
      if (byName.has(key)) return { productId: byName.get(key)!, method: "name" };
      if (shop && byName.has(`${name}|`)) return { productId: byName.get(`${name}|`)!, method: "name" };
    }

    return { productId: null, method: "none" };
  }

  // ─── 4. สร้าง snapshot records ────────────────────────────────────────────
  let matchedByExtId = 0;
  let matchedByUrl   = 0;
  let matchedByName  = 0;
  let unmatched      = 0;

  const snapshots: Omit<CommissionSnapshot, "id" | "imported_at">[] = [];
  const productUpdates = new Map<string, number>(); // productId → commission_rate (take first match)

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];

    const rateRaw = mapping.commission_rate ? raw[mapping.commission_rate] : "";
    const rate = parseRate(rateRaw ?? "");
    if (rate === null) {
      errors.push(`แถว ${i + 2}: อัตราค่าคอม "${rateRaw}" ไม่ใช่ตัวเลข — ข้ามแถวนี้`);
      continue;
    }

    const { productId, method } = matchRow(raw);
    if (method === "extId") matchedByExtId++;
    else if (method === "url") matchedByUrl++;
    else if (method === "name") matchedByName++;
    else unmatched++;

    const amountRaw = mapping.commission_amount ? raw[mapping.commission_amount] : undefined;
    const effectiveRaw = mapping.effective_at ? raw[mapping.effective_at] : undefined;

    snapshots.push({
      product_id:          productId,
      external_product_id: mapping.external_product_id ? (raw[mapping.external_product_id] || null) : null,
      product_url:         mapping.product_url ? (raw[mapping.product_url] || null) : null,
      product_name:        mapping.product_name ? (raw[mapping.product_name] || "") : "",
      shop_name:           mapping.shop_name ? (raw[mapping.shop_name] || null) : null,
      commission_rate:     rate,
      commission_amount:   amountRaw ? parseAmount(amountRaw) : null,
      campaign_name:       mapping.campaign_name ? (raw[mapping.campaign_name] || null) : null,
      channel:             mapping.channel ? (raw[mapping.channel] || null) : null,
      source_file:         sourceFile || null,
      effective_at:        effectiveRaw || null,
    });

    // จดการอัปเดต commission_rate สำหรับ products ที่ match (ใช้ค่าแรกที่พบ)
    if (productId && !productUpdates.has(productId)) {
      productUpdates.set(productId, rate);
    }
  }

  // ─── 5. บันทึก commission_snapshots (batch 500) ───────────────────────────
  let insertedCount = 0;
  const BATCH = 500;
  for (let i = 0; i < snapshots.length; i += BATCH) {
    const batch = snapshots.slice(i, i + BATCH);
    const { error: insErr, count } = await supabase
      .from("commission_snapshots")
      .insert(batch, { count: "exact" });
    if (insErr) {
      const isTableMissing =
        insErr.message.includes("does not exist") || (insErr as { code?: string }).code === "42P01";
      if (isTableMissing) {
        return NextResponse.json(
          {
            error:
              "ตาราง commission_snapshots ยังไม่มีใน Supabase — " +
              "กรุณารัน SQL migration จากหน้า Data Status (สถานะข้อมูล) ก่อน แล้วลองใหม่อีกครั้ง",
            tableNotFound: true,
          },
          { status: 422 },
        );
      }
      errors.push(`insert batch ${Math.floor(i / BATCH) + 1} ล้มเหลว: ${insErr.message}`);
    } else {
      insertedCount += count ?? batch.length;
    }
  }

  // ─── 6. อัปเดต products.commission_rate + ล้าง commission_status ──────────
  let updatedProductsCount = 0;
  for (const [productId, rate] of productUpdates) {
    const { error: upErr } = await supabase
      .from("products")
      .update({
        commission_rate:   rate,
        commission_status: null,  // ล้างข้อความ "ไม่มีข้อมูลจาก Feed"
      })
      .eq("id", productId);
    if (upErr) {
      errors.push(`อัปเดตสินค้า ${productId} ล้มเหลว: ${upErr.message}`);
    } else {
      updatedProductsCount++;
    }
  }

  const response: CommissionImportResponse = {
    totalRows:            rows.length,
    matchedByExtId,
    matchedByUrl,
    matchedByName,
    unmatched,
    insertedCount,
    updatedProductsCount,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
  };

  return NextResponse.json(response);
}
