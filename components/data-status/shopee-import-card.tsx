"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  CloudUpload,
  Database,
  Info,
  Loader2,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ImportDryRunSample,
  ImportPlanSummary,
  ShopeeImportResponse,
} from "@/app/api/shopee/import/route";

// ─── State machine ────────────────────────────────────────────────────────────

type CardState =
  | { status: "idle" }
  | { status: "loading"; action: "dry_run" | "import" }
  | { status: "dry_run_done"; data: ShopeeImportResponse }
  | { status: "confirming"; data: ShopeeImportResponse }
  | { status: "import_done"; data: ShopeeImportResponse }
  | { status: "error"; message: string };

export function ShopeeImportCard() {
  const [state, setState] = useState<CardState>({ status: "idle" });
  const [showSamples, setShowSamples] = useState(true);

  // ─── Dry Run ──────────────────────────────────────────────────────────────

  async function runDryRun() {
    setState({ status: "loading", action: "dry_run" });
    try {
      const res = await fetch("/api/shopee/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "dry_run", limit: 1000 }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : `HTTP ${res.status}`;
        setState({ status: "error", message: msg });
        return;
      }
      setState({ status: "dry_run_done", data: json as ShopeeImportResponse });
    } catch {
      setState({ status: "error", message: "ไม่สามารถเชื่อมต่อกับ Server ได้" });
    }
  }

  // ─── Confirm → Import ─────────────────────────────────────────────────────

  function confirmImport() {
    if (state.status !== "dry_run_done") return;
    setState({ status: "confirming", data: state.data });
  }

  async function runImport() {
    setState({ status: "loading", action: "import" });
    try {
      const res = await fetch("/api/shopee/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", limit: 1000 }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : `HTTP ${res.status}`;
        setState({ status: "error", message: msg });
        return;
      }
      setState({ status: "import_done", data: json as ShopeeImportResponse });
    } catch {
      setState({ status: "error", message: "ไม่สามารถเชื่อมต่อกับ Server ได้" });
    }
  }

  const isDryRunDone = state.status === "dry_run_done";
  const isConfirming = state.status === "confirming";
  const isLoading = state.status === "loading";
  const isImportDone = state.status === "import_done";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-positive/50 bg-positive/5 p-5">
      {/* ─ Header ─── */}
      <div className="flex items-center gap-2">
        <CloudUpload className="size-4 text-positive" />
        <h2 className="text-sm font-bold text-foreground">นำเข้าข้อมูลสินค้าเข้า Supabase</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        นำเข้า Top 1,000 แฟชั่นผู้หญิง (เรียงจากจำนวนขายสะสมมากไปน้อย) ผ่านการกรอง
        Deny-First + Material Exclusion แล้ว — ต้องทำ Dry Run ตรวจสอบก่อนเสมอ
      </p>

      {/* ─ Commission Notice ─── */}
      <div className="flex items-start gap-2 rounded-xl border border-negative/20 bg-negative/5 px-4 py-2.5">
        <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
        <span className="text-sm text-negative">
          ไม่มีข้อมูลค่าคอมมิชชันจาก Feed — commission_rate จะเก็บเป็น null ใน Supabase
        </span>
      </div>

      {/* ─ Action Buttons ─── */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="gap-2 rounded-full"
          onClick={runDryRun}
          disabled={isLoading || isImportDone}
        >
          {isLoading && state.action === "dry_run" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              กำลังตรวจสอบ...
            </>
          ) : (
            <>
              <Search className="size-4" />
              ตรวจสอบก่อนนำเข้า 1,000 รายการ
            </>
          )}
        </Button>

        <Button
          className="gap-2 rounded-full bg-positive text-white hover:bg-positive/90"
          onClick={isDryRunDone ? confirmImport : undefined}
          disabled={!isDryRunDone || isLoading || isConfirming || isImportDone}
        >
          {isLoading && state.action === "import" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              กำลังนำเข้า...
            </>
          ) : (
            <>
              <Database className="size-4" />
              นำเข้า 1,000 รายการเข้า Supabase
            </>
          )}
        </Button>
      </div>

      {/* ─ Error ─── */}
      {state.status === "error" ? (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm">
          <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
          <p className="text-negative">{state.message}</p>
        </div>
      ) : null}

      {/* ─ Confirm Dialog ─── */}
      {isConfirming ? (
        <ConfirmDialog
          plan={(state as Extract<CardState, { status: "confirming" }>).data.planSummary}
          onConfirm={runImport}
          onCancel={() =>
            setState({
              status: "dry_run_done",
              data: (state as Extract<CardState, { status: "confirming" }>).data,
            })
          }
        />
      ) : null}

      {/* ─ Dry Run Results ─── */}
      {(isDryRunDone || isImportDone) ? (
        <ResultPanel
          data={
            isDryRunDone
              ? (state as Extract<CardState, { status: "dry_run_done" }>).data
              : (state as Extract<CardState, { status: "import_done" }>).data
          }
          isImportDone={isImportDone}
          showSamples={showSamples}
          onToggleSamples={() => setShowSamples((p) => !p)}
        />
      ) : null}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  plan,
  onConfirm,
  onCancel,
}: {
  plan: ImportPlanSummary;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/40 bg-brand-gold/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-brand-gold-hover" />
        <div>
          <p className="text-sm font-bold text-foreground">ยืนยันการนำเข้าข้อมูลเข้า Supabase</p>
          <p className="mt-1 text-xs text-muted-foreground">
            จะเพิ่มใหม่ <strong>{plan.toInsert.toLocaleString("th-TH")}</strong> รายการ
            และอัปเดต <strong>{plan.toUpdate.toLocaleString("th-TH")}</strong> รายการ
            — ไม่สามารถย้อนกลับได้โดยอัตโนมัติ
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          className="rounded-full bg-positive text-white hover:bg-positive/90"
          onClick={onConfirm}
        >
          ยืนยัน นำเข้าเลย
        </Button>
        <Button variant="outline" className="rounded-full" onClick={onCancel}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}

// ─── Result Panel ─────────────────────────────────────────────────────────────

function ResultPanel({
  data,
  isImportDone,
  showSamples,
  onToggleSamples,
}: {
  data: ShopeeImportResponse;
  isImportDone: boolean;
  showSamples: boolean;
  onToggleSamples: () => void;
}) {
  const { planSummary, importResult, totalInSupabase, lastImportedAt } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* สถานะ Import */}
      {isImportDone && importResult ? (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
            importResult.failed > 0 && importResult.inserted === 0
              ? "border-negative/30 bg-negative/5"
              : "border-positive/30 bg-positive/5"
          }`}
        >
          {importResult.failed > 0 && importResult.inserted === 0 ? (
            <XCircle className="mt-0.5 size-5 shrink-0 text-negative" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-positive" />
          )}
          <div className="flex flex-col gap-1">
            <p
              className={`text-sm font-semibold ${
                importResult.failed > 0 && importResult.inserted === 0
                  ? "text-negative"
                  : "text-positive"
              }`}
            >
              {importResult.inserted > 0 || importResult.updated > 0
                ? `นำเข้าสำเร็จ — ${importResult.inserted.toLocaleString("th-TH")} รายการใหม่, ${importResult.updated.toLocaleString("th-TH")} อัปเดต`
                : "นำเข้าไม่สำเร็จ — ไม่มีรายการที่บันทึกได้"}
              {importResult.failed > 0
                ? ` (ล้มเหลว ${importResult.failed.toLocaleString("th-TH")} รายการ)`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              สินค้าใน Supabase ทั้งหมด: {(totalInSupabase ?? 0).toLocaleString("th-TH")} รายการ
              {lastImportedAt ? ` — อัปเดต ${formatDateTh(lastImportedAt)}` : ""}
            </p>
            {/* แสดง Supabase error จริงถ้ามี */}
            {data.importError ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-negative">
                  สาเหตุที่ล้มเหลว (คลิกเพื่อดู)
                </summary>
                <pre className="mt-1 overflow-x-auto rounded bg-negative/5 p-2 font-mono text-[10px] text-negative">
                  {data.importError}
                </pre>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* สรุปแผนการนำเข้า */}
      <div className="flex flex-wrap gap-x-5 gap-y-3 rounded-xl bg-muted/50 px-4 py-3">
        <Stat label="แถวที่สแกน" value={planSummary.scannedRows.toLocaleString("th-TH")} />
        <Stat label="ผ่านการกรอง" value={planSummary.eligibleRows.toLocaleString("th-TH")} highlight />
        <div className="my-1 w-px bg-border" />
        <Stat label="เพิ่มใหม่" value={planSummary.toInsert.toLocaleString("th-TH")} />
        <Stat label="อัปเดต" value={planSummary.toUpdate.toLocaleString("th-TH")} />
        <Stat label="คัดมาจาก Feed (limit)" value={planSummary.requestedLimit.toLocaleString("th-TH")} dim />
      </div>

      {/* ข้อความ Dry Run */}
      {!isImportDone ? (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
          <span className="text-sm text-blue-700">
            ผลด้านบนเป็นการ Dry Run (ตรวจสอบเท่านั้น) — ยังไม่มีการบันทึกข้อมูลเข้า Supabase
          </span>
        </div>
      ) : null}

      {/* ตัวอย่างสินค้า */}
      {data.dryRunSamples && data.dryRunSamples.length > 0 ? (
        <section>
          <Button
            variant="ghost"
            className="gap-1.5 rounded-full text-xs text-muted-foreground"
            onClick={onToggleSamples}
          >
            {showSamples ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ShoppingBag className="size-3.5" />
            )}
            {showSamples ? "ซ่อน" : "แสดง"} ตัวอย่าง {data.dryRunSamples.length} รายการแรก
          </Button>

          {showSamples ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <DryRunSampleTable samples={data.dryRunSamples} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

// ─── Dry Run Sample Table ─────────────────────────────────────────────────────

function DryRunSampleTable({ samples }: { samples: ImportDryRunSample[] }) {
  return (
    <table className="w-full min-w-[700px] text-xs">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ชื่อสินค้า</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">cat1</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">cat2</th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
            จำนวนขายสะสมจาก Feed
          </th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ราคา (฿)</th>
          <th className="px-3 py-2 text-center font-semibold text-muted-foreground">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        {samples.map((s) => (
          <tr key={s.itemId} className="border-b border-border/50 hover:bg-muted/30">
            <td className="px-3 py-2 text-muted-foreground">{s.rank}</td>
            <td className="max-w-[200px] px-3 py-2">
              <span className="line-clamp-1 text-foreground" title={s.title}>
                {s.title || "—"}
              </span>
            </td>
            <td className="px-3 py-2 text-muted-foreground">{s.category1}</td>
            <td className="px-3 py-2 text-muted-foreground">{s.category2}</td>
            <td className="px-3 py-2 text-right font-semibold text-foreground">
              {s.itemSold.toLocaleString("th-TH")}
            </td>
            <td className="px-3 py-2 text-right text-foreground">
              {s.price !== "—"
                ? `฿${parseFloat(s.price).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                : "—"}
            </td>
            <td className="px-3 py-2 text-center">
              {s.willInsert ? (
                <span className="rounded-full bg-positive/10 px-2 py-0.5 text-[10px] font-semibold text-positive">
                  เพิ่มใหม่
                </span>
              ) : (
                <span className="rounded-full bg-brand-gold/10 px-2 py-0.5 text-[10px] font-semibold text-brand-gold-hover">
                  อัปเดต
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  highlight,
  dim,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-bold ${
          highlight
            ? "text-positive"
            : dim
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatDateTh(iso: string): string {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
