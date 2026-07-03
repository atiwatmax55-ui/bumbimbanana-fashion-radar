"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; columns: string[]; totalColumns: number }
  | { status: "error"; message: string };

/** การ์ดแสดงสถานะ Shopee Product Feed และตรวจสอบโครงสร้างคอลัมน์ */
export function ShopeeFeedCard() {
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [showAll, setShowAll] = useState(false);

  async function checkColumns() {
    setFetchState({ status: "loading" });
    try {
      const res = await fetch("/api/shopee/sync", { method: "POST" });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg = typeof json === "object" && json !== null && "error" in json
          ? String((json as Record<string, unknown>).error)
          : `HTTP ${res.status}`;
        setFetchState({ status: "error", message: msg });
        return;
      }
      if (
        typeof json === "object" && json !== null &&
        "columns" in json && Array.isArray((json as Record<string, unknown>).columns)
      ) {
        const data = json as { columns: string[]; totalColumns: number };
        setFetchState({ status: "success", columns: data.columns, totalColumns: data.totalColumns });
      } else {
        setFetchState({ status: "error", message: "รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง" });
      }
    } catch {
      setFetchState({ status: "error", message: "ไม่สามารถเชื่อมต่อกับ Server ได้" });
    }
  }

  const PREVIEW_LIMIT = 12;
  const columns = fetchState.status === "success" ? fetchState.columns : [];
  const visibleColumns = showAll ? columns : columns.slice(0, PREVIEW_LIMIT);
  const hasMore = columns.length > PREVIEW_LIMIT;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-positive" />
          <h2 className="text-sm font-bold text-foreground">Shopee Product Feed (ฟีดสินค้า Shopee)</h2>
        </div>
        <Badge variant="outline" className="gap-1.5 border-border text-positive">
          <CheckCircle2 className="size-3.5" />
          พบการตั้งค่าแล้ว
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        ระบบตรวจพบ <code className="rounded bg-muted px-1.5 py-0.5 text-xs">SHOPEE_PRODUCT_FEED_URL</code>{" "}
        ใน environment variable ฝั่งเซิร์ฟเวอร์แล้ว —
        กดปุ่มด้านล่างเพื่อทดสอบเชื่อมต่อและอ่านโครงสร้างคอลัมน์จาก Feed
      </p>

      <div className="rounded-xl bg-muted/50 p-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-positive" />
          <span>URL ถูกเก็บเป็นความลับ — ไม่แสดงในหน้าเว็บหรือ log ใด ๆ ทั้งสิ้น</span>
        </div>
        <div className="mt-1.5 flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-positive" />
          <span>การดึงข้อมูลเกิดขึ้นฝั่งเซิร์ฟเวอร์ผ่าน <code className="rounded bg-background px-1 py-0.5">/api/shopee/sync</code> เท่านั้น</span>
        </div>
        <div className="mt-1.5 flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-positive" />
          <span>รอบนี้อ่านแค่ชื่อคอลัมน์ (บรรทัดแรก) — ยังไม่ import ข้อมูลจริง</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="self-start gap-2 rounded-full"
        onClick={checkColumns}
        disabled={fetchState.status === "loading"}
      >
        {fetchState.status === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            กำลังอ่านคอลัมน์...
          </>
        ) : (
          <>
            <FileSpreadsheet className="size-4" />
            ตรวจสอบโครงสร้างคอลัมน์ CSV
          </>
        )}
      </Button>

      {fetchState.status === "error" ? (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm">
          <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
          <p className="text-negative">{fetchState.message}</p>
        </div>
      ) : null}

      {fetchState.status === "success" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-positive" />
            <span className="text-sm font-semibold text-foreground">
              พบ {fetchState.totalColumns} คอลัมน์ในไฟล์ CSV
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleColumns.map((col) => (
              <Badge key={col} variant="outline" className="border-border text-xs text-foreground">
                {col}
              </Badge>
            ))}
          </div>
          {hasMore ? (
            <Button
              variant="ghost"
              className="self-start gap-1.5 rounded-full text-xs text-muted-foreground"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="size-3.5" />
                  แสดงน้อยลง
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  แสดงอีก {columns.length - PREVIEW_LIMIT} คอลัมน์
                </>
              )}
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            รายชื่อด้านบนคือ header row จริงจาก Shopee Product Feed —
            ถัดไปเลือกคอลัมน์ที่ต้องการ map เข้า Product type ของระบบ
          </p>
        </div>
      ) : null}
    </div>
  );
}
