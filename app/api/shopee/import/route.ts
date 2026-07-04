import { type NextRequest, NextResponse } from "next/server";
import { extractRows } from "@/lib/shopee/csv-parser";
import {
  classifyWomenFashion,
  checkMaterialViolation,
} from "@/lib/shopee/women-fashion-filter";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizeShopeeRow, type NormalizedShopeeRow } from "@/lib/shopee/normalize-row";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ABSOLUTE_MAX_LIMIT = 200_000;
const MAX_READ_BYTES = 500 * 1024 * 1024;
const DEFAULT_IMPORT_LIMIT = 1000;
const DRY_RUN_SAMPLE_SIZE = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportMode = "dry_run" | "import";

export type ImportDryRunSample = {
  rank:       number;
  itemId:     string;
  title:      string;
  category1:  string;
  category2:  string;
  itemSold:   number;
  price:      string;
  willInsert: boolean;
};

export type ImportPlanSummary = {
  scannedRows:    number;
  eligibleRows:   number;
  requestedLimit: number;
  toInsert:       number;
  toUpdate:       number;
  skipped:        number;   // แถวที่ข้ามจากทั้ง normalizer + pre-upsert validation
};

export type ImportResult = {
  inserted:    number;
  updated:     number;
  failed:      number;
  completedAt: string;
};

export type ShopeeImportResponse = {
  mode:               ImportMode;
  notSavedToSupabase: boolean;
  commissionStatus:   "not_available_from_feed";
  planSummary:        ImportPlanSummary;
  dryRunSamples?:     ImportDryRunSample[];
  importResult?:      ImportResult;
  importError?:       string;
  skippedReasons?:    string[];   // สาเหตุที่ข้าม (สูงสุด 20 รายการแรก)
  totalInSupabase?:   number;
  lastImportedAt?:    string;
  logId?:             string;
};

// ─── Route Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ไม่พบการตั้งค่า Supabase — กรุณาเพิ่ม SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local" },
      { status: 503 },
    );
  }

  const feedUrl = process.env.SHOPEE_PRODUCT_FEED_URL;
  if (!feedUrl) {
    return NextResponse.json(
      { error: "ไม่พบการตั้งค่า SHOPEE_PRODUCT_FEED_URL ในระบบ" },
      { status: 503 },
    );
  }

  let body: { mode?: string; limit?: number };
  try {
    body = (await request.json()) as { mode?: string; limit?: number };
  } catch {
    return NextResponse.json({ error: "Request body ไม่ถูกต้อง — ต้องเป็น JSON" }, { status: 400 });
  }

  const mode: ImportMode = body.mode === "import" ? "import" : "dry_run";
  const requestedLimit = Math.min(
    ABSOLUTE_MAX_LIMIT,
    Math.max(1, body.limit ?? DEFAULT_IMPORT_LIMIT),
  );

  const supabase = getSupabaseServerClient();
  const startedAt = new Date().toISOString();

  // ─── ตรวจสอบ schema ผ่าน RPC (เชื่อถือได้กว่า .select ที่อาจ error "Invalid path") ──
  const { data: missingColsData, error: rpcError } = await supabase.rpc("shopee_missing_columns");

  if (rpcError) {
    return NextResponse.json(
      {
        error:
          `ยังไม่ได้รัน SQL migration — กรุณาเปิดหน้า Data Status` +
          ` และรัน SQL ในส่วน "สถานะตาราง Supabase" (${rpcError.message})`,
      },
      { status: 503 },
    );
  }

  const missingImportColumns = (missingColsData as { column_name: string }[] | null)
    ?.map((r) => r.column_name) ?? [];

  if (missingImportColumns.length > 0) {
    return NextResponse.json(
      {
        error:
          `คอลัมน์ที่ขาดใน public.products: ${missingImportColumns.join(", ")}` +
          ` — กรุณารัน SQL migration ใน Supabase SQL Editor (ดูส่วน "สถานะตาราง Supabase" ในหน้า Data Status)`,
      },
      { status: 503 },
    );
  }

  // บันทึก log เริ่มต้น
  const { data: logRow } = await supabase
    .from("import_logs")
    .insert({
      source:          "shopee_product_feed",
      mode,
      requested_limit: requestedLimit,
      scanned_rows:    0,
      eligible_rows:   0,
      inserted_count:  0,
      updated_count:   0,
      skipped_count:   0,
      failed_count:    0,
      message:         "กำลังสแกน Feed...",
      started_at:      startedAt,
    })
    .select("id")
    .single();

  const logId = logRow?.id as string | undefined;

  // ─── สแกน CSV Feed ──────────────────────────────────────────────────────────

  let feedResponse: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    feedResponse = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { Accept: "text/csv, text/plain, application/octet-stream, */*" },
    });
    clearTimeout(timeoutId);
  } catch {
    await updateLog(supabase, logId, 0, 0, 0, 0, 0, 0, "ไม่สามารถเชื่อมต่อกับ Shopee Feed ได้");
    return NextResponse.json(
      { error: "ไม่สามารถเชื่อมต่อกับ Shopee Product Feed ได้" },
      { status: 502 },
    );
  }

  if (!feedResponse.ok) {
    await updateLog(supabase, logId, 0, 0, 0, 0, 0, 0, `Feed ตอบกลับ HTTP ${feedResponse.status}`);
    return NextResponse.json(
      { error: `Shopee Product Feed ตอบกลับ HTTP ${feedResponse.status}` },
      { status: 502 },
    );
  }

  const ct = (feedResponse.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    await updateLog(supabase, logId, 0, 0, 0, 0, 0, 0, "Feed URL ส่งกลับ HTML — URL อาจหมดอายุ");
    return NextResponse.json(
      { error: "Feed URL ส่งกลับ HTML แทน CSV — Feed URL อาจหมดอายุ" },
      { status: 422 },
    );
  }

  const reader = feedResponse.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "ไม่สามารถอ่านข้อมูลจาก Feed ได้" }, { status: 502 });
  }

  // ─── Top-N Buffer ────────────────────────────────────────────────────────────

  type BufferItem = { record: NormalizedShopeeRow; soldNum: number };
  const topBuffer: BufferItem[] = [];
  const importedAt = new Date().toISOString();
  const skippedReasons: string[] = [];   // เหตุผลที่ข้ามทุกกรณี (เก็บสูงสุด 100)

  function addToBuffer(record: NormalizedShopeeRow, soldNum: number) {
    if (topBuffer.length < requestedLimit) {
      topBuffer.push({ record, soldNum });
      if (topBuffer.length === requestedLimit) {
        topBuffer.sort((a, b) => b.soldNum - a.soldNum);
      }
    } else {
      const minEntry = topBuffer[requestedLimit - 1];
      if (minEntry && soldNum > minEntry.soldNum) {
        topBuffer[requestedLimit - 1] = { record, soldNum };
        topBuffer.sort((a, b) => b.soldNum - a.soldNum);
      }
    }
  }

  const decoder = new TextDecoder("utf-8");
  let remainder = "";
  let firstChunk = true;
  let bytesRead = 0;
  let dataRowCount = 0;
  let eligibleCount = 0;
  let headerRow: string[] = [];
  const headerIdx: Record<string, number> = {};

  // แปลงแถว CSV array → Record ด้วย normalized header keys
  function rowToRecord(row: string[]): Record<string, string> {
    const rec: Record<string, string> = {};
    headerRow.forEach((h, i) => { rec[h] = (row[i] ?? "").trim(); });
    return rec;
  }

  function processRow(row: string[]): boolean {
    if (headerRow.length === 0) {
      // normalize headers: ลบ BOM, trim, lowercase — รองรับ CSV encoding หลากหลาย
      headerRow = row.map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
      headerRow.forEach((h, i) => { headerIdx[h] = i; });
      return true;
    }
    if (dataRowCount >= ABSOLUTE_MAX_LIMIT) return false;
    dataRowCount++;

    const raw = rowToRecord(row);

    // ─── Women Fashion Filter (Deny-First) ──────────────────────────────
    const cat1 = raw["global_category1"] ?? "";
    const cat2 = raw["global_category2"] ?? "";
    const cat3 = raw["global_category3"] ?? "";
    // ชื่อสินค้าเพื่อ filter — ใช้ fallback chain เดียวกับ normalizer (ก่อน auto-gen)
    const rawTitle = (
      raw["title"] ?? raw["product_name"] ?? raw["item_name"] ?? raw["name"] ?? ""
    ).replace(/^﻿/, "").trim();

    const cl = classifyWomenFashion(cat1, cat2, cat3);
    if (!cl.pass) return true;

    // ─── Material/Tools/Care Exclusion ──────────────────────────────────
    const mv = checkMaterialViolation(cat1, cat2, cat3, rawTitle);
    if (mv.violated) return true;

    eligibleCount++;

    // ─── Normalize และ validate แถวนี้ ──────────────────────────────────
    const result = normalizeShopeeRow(raw, {
      importedAt,
      passedByRule: cl.rule,
      filterReason: cl.filterReason,
    });

    if (!result.ok) {
      if (skippedReasons.length < 100) skippedReasons.push(result.reason);
      return true;
    }

    addToBuffer(result.row, result.itemSold);
    return true;
  }

  try {
    let isPartialScan = false;
    while (!isPartialScan) {
      const { done, value } = await reader.read();
      if (done) {
        const { rows } = extractRows(remainder, true);
        for (const row of rows) {
          if (!processRow(row)) { isPartialScan = true; break; }
        }
        break;
      }

      let chunk = decoder.decode(value, { stream: true });
      bytesRead += value.byteLength;
      if (firstChunk) {
        if (chunk.startsWith("﻿")) chunk = chunk.slice(1);
        firstChunk = false;
      }

      const { rows, remainder: rem } = extractRows(remainder + chunk, false);
      remainder = rem;

      for (const row of rows) {
        if (!processRow(row)) { isPartialScan = true; break; }
      }

      if (bytesRead >= MAX_READ_BYTES) isPartialScan = true;
    }
  } catch {
    // best effort
  } finally {
    reader.cancel().catch(() => {});
  }

  // ─── Pre-upsert validation ───────────────────────────────────────────────────
  // Buffer เรียง desc แล้ว slice top-N → ตรวจแต่ละแถวก่อน upsert
  // แถว invalid ไม่หยุด batch ทั้งหมด — ไปอยู่ใน skippedReasons แทน

  const finalRecords: NormalizedShopeeRow[] = [];
  for (const { record } of topBuffer.sort((a, b) => b.soldNum - a.soldNum)) {
    const valid =
      record.source_item_id.length > 0 &&
      record.title.length > 0 &&
      record.product_name.length > 0 &&
      record.source_platform === "shopee";

    if (!valid) {
      if (skippedReasons.length < 100) {
        skippedReasons.push(
          `source_item_id="${record.source_item_id}": ฟิลด์จำเป็นว่าง (pre-upsert validation)`,
        );
      }
    } else {
      finalRecords.push(record);
    }
  }

  const planSummary: ImportPlanSummary = {
    scannedRows:    dataRowCount,
    eligibleRows:   eligibleCount,
    requestedLimit,
    toInsert:       0,
    toUpdate:       0,
    skipped:        skippedReasons.length,
  };

  // ─── ตรวจสอบข้อมูลที่มีอยู่ใน Supabase ───────────────────────────────────────

  const itemIds = finalRecords.map((r) => r.source_item_id);

  const { data: existingRows } = await supabase
    .from("products")
    .select("source_item_id")
    .eq("source_platform", "shopee")
    .in("source_item_id", itemIds);

  const existingIds = new Set(
    (existingRows ?? []).map((r) => (r as { source_item_id: string }).source_item_id),
  );

  planSummary.toInsert = itemIds.filter((id) => !existingIds.has(id)).length;
  planSummary.toUpdate = itemIds.filter((id) => existingIds.has(id)).length;

  // ─── DRY RUN ─────────────────────────────────────────────────────────────────

  if (mode === "dry_run") {
    const samples: ImportDryRunSample[] = finalRecords
      .slice(0, DRY_RUN_SAMPLE_SIZE)
      .map((r, i) => ({
        rank:       i + 1,
        itemId:     r.source_item_id,
        title:      r.title,
        category1:  r.category_level_1 ?? "—",
        category2:  r.category_level_2 ?? "—",
        itemSold:   r.item_sold,
        price:      r.raw_sale_price ?? "—",
        willInsert: !existingIds.has(r.source_item_id),
      }));

    const skipMsg = skippedReasons.length > 0
      ? `, ข้าม ${skippedReasons.length} แถว`
      : "";

    await updateLog(
      supabase, logId, dataRowCount, eligibleCount, 0, 0,
      skippedReasons.length, 0,
      `Dry Run สำเร็จ — จะเพิ่มใหม่ ${planSummary.toInsert} รายการ, อัปเดต ${planSummary.toUpdate} รายการ${skipMsg}`,
    );

    const result: ShopeeImportResponse = {
      mode: "dry_run",
      notSavedToSupabase: true,
      commissionStatus:   "not_available_from_feed",
      planSummary,
      dryRunSamples:      samples,
      skippedReasons:     skippedReasons.slice(0, 20),
    };
    return NextResponse.json(result);
  }

  // ─── IMPORT จริง ─────────────────────────────────────────────────────────────

  let insertedCount = 0;
  let updatedCount  = 0;
  let failedCount   = 0;
  let firstImportError: string | undefined;

  const BATCH_SIZE = 200;
  for (let i = 0; i < finalRecords.length; i += BATCH_SIZE) {
    const batch      = finalRecords.slice(i, i + BATCH_SIZE);
    const batchIds   = batch.map((r) => r.source_item_id);
    const batchInserts = batchIds.filter((id) => !existingIds.has(id)).length;
    const batchUpdates = batchIds.filter((id) =>  existingIds.has(id)).length;

    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "source_platform,source_item_id" });

    if (error) {
      failedCount += batch.length;
      if (!firstImportError) firstImportError = error.message;
    } else {
      insertedCount += batchInserts;
      updatedCount  += batchUpdates;
    }
  }

  // ─── บันทึก Snapshot ยอดขายสะสมรายวัน (สำหรับวิเคราะห์ 7/30 วัน) ─────────────
  // ความล้มเหลวของ snapshot ต้องไม่ทำให้ sync ทั้งรอบล้มเหลว — เก็บเป็นข้อความแทน
  const snapshotNote = await writeDailySnapshots(supabase, finalRecords);

  const completedAt = new Date().toISOString();

  await updateLog(
    supabase, logId, dataRowCount, eligibleCount,
    insertedCount, updatedCount, skippedReasons.length, failedCount,
    failedCount > 0
      ? `Import มีปัญหา — เพิ่มใหม่ ${insertedCount}, อัปเดต ${updatedCount}, ล้มเหลว ${failedCount}: ${firstImportError ?? "unknown"}${snapshotNote}`
      : `Import สำเร็จ — เพิ่มใหม่ ${insertedCount}, อัปเดต ${updatedCount}${snapshotNote}`,
    completedAt,
  );

  const { count: totalInSupabase } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("source_platform", "shopee");

  const { data: lastLog } = await supabase
    .from("import_logs")
    .select("completed_at")
    .eq("source", "shopee_product_feed")
    .eq("mode", "import")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const result: ShopeeImportResponse = {
    mode:  "import",
    notSavedToSupabase: false,
    commissionStatus:   "not_available_from_feed",
    planSummary: {
      ...planSummary,
      toInsert: insertedCount,
      toUpdate: updatedCount,
    },
    importResult: {
      inserted:    insertedCount,
      updated:     updatedCount,
      failed:      failedCount,
      completedAt,
    },
    importError:     firstImportError,
    skippedReasons:  skippedReasons.slice(0, 20),
    totalInSupabase: totalInSupabase ?? 0,
    lastImportedAt:
      (lastLog as { completed_at?: string } | null)?.completed_at ?? completedAt,
    logId,
  };

  return NextResponse.json(result);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * บันทึก snapshot ยอดขายสะสมของสินค้าที่ sync สำเร็จ (1 แถว/สินค้า/วัน)
 * และลบ snapshot ที่เก่ากว่า 100 วัน — คืนข้อความสรุปสั้น ๆ ต่อท้าย log
 * ตาราง/ฟังก์ชันยังไม่ถูก migrate → คืนข้อความเตือน ไม่ throw
 */
async function writeDailySnapshots(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  records: NormalizedShopeeRow[],
): Promise<string> {
  if (records.length === 0) return "";
  try {
    const snapshotDate = new Date().toISOString().slice(0, 10);

    // จับคู่ external_product_id → products.id (BIGINT) เป็น batch
    const idMap = new Map<string, number>();
    const extIds = records.map((r) => r.source_item_id);
    for (let i = 0; i < extIds.length; i += 500) {
      const { data, error } = await supabase
        .from("products")
        .select("id, external_product_id")
        .eq("source_platform", "shopee")
        .in("external_product_id", extIds.slice(i, i + 500));
      if (error) return ` | snapshot ล้มเหลว: ${error.message}`;
      for (const row of (data ?? []) as { id: number; external_product_id: string }[]) {
        idMap.set(row.external_product_id, row.id);
      }
    }

    const rows = records.flatMap((r) => {
      const pid = idMap.get(r.source_item_id);
      if (pid === undefined) return [];
      return [{
        product_id:    pid,
        snapshot_date: snapshotDate,
        item_sold:     r.item_sold,
        price:         r.price,
      }];
    });

    let written = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase
        .from("product_sales_snapshots")
        .upsert(rows.slice(i, i + 500), { onConflict: "product_id,snapshot_date" });
      if (error) {
        // ตารางยังไม่ถูกสร้าง (PGRST205) หรือ error อื่น — รายงานใน log แต่ไม่ล้ม sync
        return error.code === "PGRST205"
          ? " | ยังไม่ได้รัน migration 0008 — ไม่มีการเก็บ snapshot"
          : ` | snapshot ล้มเหลว: ${error.message}`;
      }
      written += Math.min(500, rows.length - i);
    }

    // retention: เก็บย้อนหลัง 100 วัน
    await supabase.rpc("radar_prune_snapshots");

    return ` | snapshot ${written} รายการ (${snapshotDate})`;
  } catch (e) {
    return ` | snapshot ล้มเหลว: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function updateLog(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  logId: string | undefined,
  scannedRows: number,
  eligibleRows: number,
  insertedCount: number,
  updatedCount: number,
  skippedCount: number,
  failedCount: number,
  message: string,
  completedAt?: string,
) {
  if (!logId) return;
  await supabase
    .from("import_logs")
    .update({
      scanned_rows:   scannedRows,
      eligible_rows:  eligibleRows,
      inserted_count: insertedCount,
      updated_count:  updatedCount,
      skipped_count:  skippedCount,
      failed_count:   failedCount,
      message,
      ...(completedAt ? { completed_at: completedAt } : {}),
    })
    .eq("id", logId);
}
