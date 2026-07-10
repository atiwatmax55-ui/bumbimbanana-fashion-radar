import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  normalizeTiktokItem,
  type NormalizedTiktokRow,
} from "@/lib/tiktok/normalize-tiktok-item";
import type { TiktokImportRequest, TiktokImportResponse } from "@/lib/tiktok/types";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 500;
const MAX_REASONS = 20;

// ─── Route Handler ─────────────────────────────────────────────────────────

/**
 * POST /api/tiktok/import
 * รับรายการสินค้า TikTok ที่เจ้าของเว็บกรอกเอง (ทีละตัวหรือวาง CSV/JSON — ฝั่ง client
 * แปลงเป็น items แล้ว) ตรวจสอบซ้ำฝั่งเซิร์ฟเวอร์ (ห้ามเชื่อ client อย่างเดียว) แล้ว upsert
 * เข้า public.products ด้วย source_platform='tiktok'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ไม่พบการตั้งค่า Supabase — กรุณาเพิ่ม SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local" },
      { status: 503 },
    );
  }

  let body: TiktokImportRequest;
  try {
    body = (await request.json()) as TiktokImportRequest;
  } catch {
    return NextResponse.json({ error: "Request body ไม่ถูกต้อง — ต้องเป็น JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "ไม่มีรายการสินค้าให้นำเข้า" }, { status: 400 });
  }
  if (body.items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `นำเข้าได้สูงสุด ${MAX_ITEMS} รายการต่อครั้ง (ส่งมา ${body.items.length} รายการ)` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const importedAt = new Date().toISOString();

  // ─── ตรวจสอบทีละรายการ (ซ้ำฝั่งเซิร์ฟเวอร์ — ไม่เชื่อผล validate ฝั่ง client) ──
  const skippedReasons: string[] = [];
  const warnings: string[] = [];
  const okRows: NormalizedTiktokRow[] = [];

  for (const raw of body.items) {
    const result = normalizeTiktokItem(raw, { importedAt });
    if (!result.ok) {
      if (skippedReasons.length < MAX_REASONS) skippedReasons.push(result.reason);
      continue;
    }
    if (result.warnings.length > 0 && warnings.length < MAX_REASONS) {
      warnings.push(`"${result.row.title}": ${result.warnings.join(" / ")}`);
    }
    okRows.push(result.row);
  }

  // ─── กันแถวซ้ำในชุดเดียวกัน (ลิงก์เดียวกัน) — เก็บแถวหลังสุด ─────────────
  const byKey = new Map<string, NormalizedTiktokRow>();
  for (const row of okRows) {
    if (byKey.has(row.source_item_id) && warnings.length < MAX_REASONS) {
      warnings.push(`"${row.title}": ซ้ำกับอีกรายการในชุดเดียวกัน (ลิงก์เดียวกัน) — ใช้ข้อมูลรายการหลังสุดแทน`);
    }
    byKey.set(row.source_item_id, row);
  }
  const finalRows = [...byKey.values()];

  if (finalRows.length === 0) {
    await logImportAttempt(supabase, {
      totalItems: body.items.length,
      inserted: 0,
      updated: 0,
      skipped: skippedReasons.length,
      message: `ไม่มีรายการที่ผ่านการตรวจสอบ — ข้ามทั้งหมด ${skippedReasons.length} รายการ`,
    });
    const response: TiktokImportResponse = {
      totalItems: body.items.length,
      inserted: 0,
      updated: 0,
      skipped: skippedReasons.length,
      skippedReasons,
      warnings,
      completedAt: importedAt,
    };
    return NextResponse.json(response);
  }

  // ─── ตรวจสอบว่ามีสินค้าเดิมอยู่แล้วหรือไม่ (แยกนับเพิ่มใหม่/อัปเดต) ──────
  const keys = finalRows.map((r) => r.source_item_id);
  const { data: existingRows, error: existErr } = await supabase
    .from("products")
    .select("source_item_id")
    .eq("source_platform", "tiktok")
    .in("source_item_id", keys);

  if (existErr) {
    const missingColumn = existErr.code === "42703" || existErr.message.includes("does not exist");
    return NextResponse.json(
      {
        error: missingColumn
          ? "คอลัมน์ source_item_id ยังไม่มีใน public.products — กรุณารัน supabase/migrations/0009_source_item_id.sql ใน Supabase SQL Editor ก่อน"
          : `ตรวจสอบสินค้าเดิมไม่สำเร็จ: ${existErr.message}`,
      },
      { status: 503 },
    );
  }

  const existingKeys = new Set(
    (existingRows ?? []).map((r) => (r as { source_item_id: string }).source_item_id),
  );
  const insertedCount = keys.filter((k) => !existingKeys.has(k)).length;
  const updatedCount = keys.filter((k) => existingKeys.has(k)).length;

  // ─── Upsert (batch 200) ──────────────────────────────────────────────────
  const BATCH_SIZE = 200;
  let failedCount = 0;
  let firstError: string | undefined;
  for (let i = 0; i < finalRows.length; i += BATCH_SIZE) {
    const batch = finalRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "source_platform,source_item_id" });
    if (error) {
      failedCount += batch.length;
      if (!firstError) firstError = error.message;
    }
  }

  if (failedCount > 0) {
    const isSchemaIssue =
      firstError?.includes("no unique or exclusion constraint") ||
      firstError?.includes("does not exist");
    await logImportAttempt(supabase, {
      totalItems: body.items.length,
      inserted: 0,
      updated: 0,
      skipped: skippedReasons.length,
      failed: failedCount,
      message: `นำเข้าล้มเหลว: ${firstError ?? "unknown"}`,
    });
    return NextResponse.json(
      {
        error: isSchemaIssue
          ? `นำเข้าไม่สำเร็จ — โครงสร้างตารางยังไม่พร้อม (${firstError}) กรุณารัน supabase/migrations/0009_source_item_id.sql ใน Supabase SQL Editor ก่อน`
          : `นำเข้าไม่สำเร็จ: ${firstError}`,
      },
      { status: 500 },
    );
  }

  // ─── Snapshot ยอดขายสะสมรายวัน (สำหรับวิเคราะห์ 7/30 วันในอนาคต) ────────
  const snapshotNote = await writeTiktokSnapshots(supabase, finalRows);
  const completedAt = new Date().toISOString();

  await logImportAttempt(supabase, {
    totalItems: body.items.length,
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skippedReasons.length,
    message: `นำเข้าสำเร็จ — เพิ่มใหม่ ${insertedCount}, อัปเดต ${updatedCount}${snapshotNote}`,
    completedAt,
  });

  const response: TiktokImportResponse = {
    totalItems: body.items.length,
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skippedReasons.length,
    skippedReasons,
    warnings,
    snapshotNote: snapshotNote || undefined,
    completedAt,
  };
  return NextResponse.json(response);
}

// ─── Helper: snapshot ยอดขายสะสมรายวัน (เลียนแบบ app/api/shopee/import/route.ts) ──

async function writeTiktokSnapshots(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  rows: NormalizedTiktokRow[],
): Promise<string> {
  if (rows.length === 0) return "";
  try {
    const snapshotDate = new Date().toISOString().slice(0, 10);

    const idMap = new Map<string, number>();
    const keys = rows.map((r) => r.source_item_id);
    for (let i = 0; i < keys.length; i += 500) {
      const { data, error } = await supabase
        .from("products")
        .select("id, source_item_id")
        .eq("source_platform", "tiktok")
        .in("source_item_id", keys.slice(i, i + 500));
      if (error) return ` | snapshot ล้มเหลว: ${error.message}`;
      for (const row of (data ?? []) as { id: number; source_item_id: string }[]) {
        idMap.set(row.source_item_id, row.id);
      }
    }

    const snapshotRows = rows.flatMap((r) => {
      const pid = idMap.get(r.source_item_id);
      if (pid === undefined) return [];
      return [{ product_id: pid, snapshot_date: snapshotDate, item_sold: r.item_sold, price: r.price }];
    });

    let written = 0;
    for (let i = 0; i < snapshotRows.length; i += 500) {
      const { error } = await supabase
        .from("product_sales_snapshots")
        .upsert(snapshotRows.slice(i, i + 500), { onConflict: "product_id,snapshot_date" });
      if (error) {
        return error.code === "PGRST205"
          ? " | ยังไม่ได้รัน migration 0008 — ไม่มีการเก็บ snapshot"
          : ` | snapshot ล้มเหลว: ${error.message}`;
      }
      written += Math.min(500, snapshotRows.length - i);
    }

    await supabase.rpc("radar_prune_snapshots");
    return ` | snapshot ${written} รายการ (${snapshotDate})`;
  } catch (e) {
    return ` | snapshot ล้มเหลว: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// ─── Helper: บันทึกประวัติการนำเข้า (import_logs) ────────────────────────────
// tiktok import เป็นงาน sync ตัวเดียวจบ (ไม่ใช่ streaming scan แบบ shopee)
// จึงเขียน log ครั้งเดียวหลังจบงาน แทนที่จะสร้าง-แล้วอัปเดตแบบ 2 จังหวะ

async function logImportAttempt(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  opts: {
    totalItems: number;
    inserted:   number;
    updated:    number;
    skipped:    number;
    failed?:    number;
    message:    string;
    completedAt?: string;
  },
): Promise<void> {
  try {
    await supabase.from("import_logs").insert({
      source:          "tiktok_manual",
      mode:            "import",
      requested_limit: opts.totalItems,
      scanned_rows:    opts.totalItems,
      eligible_rows:   opts.totalItems - opts.skipped,
      inserted_count:  opts.inserted,
      updated_count:   opts.updated,
      skipped_count:   opts.skipped,
      failed_count:    opts.failed ?? 0,
      message:         opts.message,
      completed_at:    opts.completedAt ?? new Date().toISOString(),
    });
  } catch {
    // บันทึก log ไม่สำเร็จ ไม่ควรทำให้ import ทั้งหมดล้ม — ปล่อยผ่าน
  }
}
