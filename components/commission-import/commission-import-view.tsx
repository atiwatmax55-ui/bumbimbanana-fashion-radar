"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, X } from "lucide-react";
import {
  type ColumnMapping,
  type CommissionImportResponse,
  COMMISSION_FIELD_LABELS,
  REQUIRED_COMMISSION_FIELDS,
  autoDetectMapping,
} from "@/lib/commission/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils/format";

type Step = "upload" | "map" | "result";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const XLSX = await import("xlsx");
        const wb = XLSX.read(new Uint8Array(buffer), { type: "array", raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (rawRows.length === 0) throw new Error("ไฟล์ว่างเปล่าหรือไม่มีข้อมูล");
        const headers = Object.keys(rawRows[0]);
        const rows = rawRows.map((r) => {
          const out: Record<string, string> = {};
          for (const h of headers) out[h] = String(r[h] ?? "");
          return out;
        });
        resolve({ headers, rows });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่ได้"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommissionImportView() {
  const [step, setStep]               = useState<Step>("upload");
  const [fileName, setFileName]       = useState("");
  const [headers, setHeaders]         = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows]         = useState<Record<string, string>[]>([]);
  const [mapping, setMapping]         = useState<ColumnMapping>({});
  const [isLoading, setIsLoading]     = useState(false);
  const [parseError, setParseError]   = useState<string | null>(null);
  const [result, setResult]           = useState<CommissionImportResponse | null>(null);
  const [isDragOver, setIsDragOver]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setIsLoading(true);
    try {
      const { headers: hdrs, rows } = await parseFile(file);
      setFileName(file.name);
      setHeaders(hdrs);
      setPreviewRows(rows.slice(0, 5));
      setAllRows(rows);
      setMapping(autoDetectMapping(hdrs));
      setStep("map");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "อ่านไฟล์ไม่ได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ─── Import ───────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!mapping.commission_rate) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/commission/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: allRows, mapping, sourceFile: fileName }),
      });
      const data = (await res.json()) as CommissionImportResponse & { error?: string; tableNotFound?: boolean };
      if (!res.ok) {
        if (data.tableNotFound) {
          throw new Error(
            data.error ??
            "ตาราง commission_snapshots ยังไม่มีใน Supabase — กรุณาไปหน้า Data Status แล้วรัน SQL Migration ก่อน"
          );
        }
        throw new Error(data.error ?? "นำเข้าไม่สำเร็จ");
      }
      setResult(data);
      setStep("result");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setPreviewRows([]);
    setAllRows([]);
    setMapping({});
    setResult(null);
    setParseError(null);
  };

  const isImportEnabled =
    !!mapping.commission_rate &&
    (!!mapping.external_product_id || !!mapping.product_url || !!mapping.product_name);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          นำเข้าค่าคอมมิชชัน Shopee Affiliate
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          อัปโหลดไฟล์รายงาน CSV หรือ XLSX จาก Shopee Affiliate Center เพื่อนำเข้าข้อมูลค่าคอมมิชชันจริง
        </p>
      </div>

      {/* ─── Step 1: Upload ─────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="flex flex-col gap-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors ${
              isDragOver
                ? "border-brand-gold bg-brand-cream"
                : "border-border hover:border-brand-gold/60 hover:bg-brand-cream/40"
            }`}
          >
            {isLoading ? (
              <Loader2 className="size-10 animate-spin text-brand-gold-hover" />
            ) : (
              <FileSpreadsheet className="size-10 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold text-foreground">วางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                รองรับ .csv และ .xlsx จาก Shopee Affiliate Center
              </p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={(e) => e.stopPropagation()}>
              <Upload className="size-4" />
              เลือกไฟล์
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onFileChange}
          />

          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {parseError}
            </div>
          )}

          <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">วิธีดาวน์โหลดไฟล์จาก Shopee Affiliate:</p>
            <ol className="mt-1.5 list-inside list-decimal space-y-1">
              <li>เปิด Shopee Affiliate Center → &ldquo;รายงาน&rdquo; (Reports)</li>
              <li>เลือกรายงาน เช่น &ldquo;รายงานสินค้า&rdquo; หรือ &ldquo;รายงานค่าคอมมิชชัน&rdquo;</li>
              <li>กด Export เป็น CSV หรือ XLSX</li>
              <li>อัปโหลดที่หน้านี้</li>
            </ol>
          </div>
        </div>
      )}

      {/* ─── Step 2: Column Mapping ────────────────────────────────────────── */}
      {step === "map" && (
        <div className="flex flex-col gap-6">
          {/* Header info */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-brand-cream/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FileSpreadsheet className="size-4 text-brand-gold-hover" />
              <span className="font-semibold">{fileName}</span>
              <Badge variant="outline" className="text-xs">{formatNumber(allRows.length)} แถว</Badge>
            </div>
            <button
              onClick={reset}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="ยกเลิก เลือกไฟล์ใหม่"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Preview table */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">ตัวอย่างข้อมูล (5 แถวแรก)</p>
            <div className="overflow-auto rounded-xl border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {headers.map((h) => (
                        <td key={h} className="max-w-40 truncate px-3 py-2 text-foreground">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column mapping form */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">
              จับคู่คอลัมน์ — ระบุว่าคอลัมน์ใดในไฟล์ตรงกับฟิลด์ใด
            </p>
            <p className="text-xs text-muted-foreground">
              ฟิลด์ที่มีเครื่องหมาย <span className="font-semibold text-negative">*</span> จำเป็นต้องระบุ
              ต้องระบุอย่างน้อย 1 ฟิลด์สำหรับจับคู่สินค้า (รหัส / ลิงก์ / ชื่อสินค้า)
            </p>

            <div className="overflow-hidden rounded-2xl border border-border">
              {(Object.entries(COMMISSION_FIELD_LABELS) as [keyof typeof COMMISSION_FIELD_LABELS, string][]).map(
                ([field, label]) => {
                  const isRequired = REQUIRED_COMMISSION_FIELDS.includes(field);
                  return (
                    <div
                      key={field}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <div className="w-52 shrink-0 text-sm text-foreground">
                        {label}
                        {isRequired && <span className="ml-1 text-negative">*</span>}
                      </div>
                      <select
                        value={mapping[field] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [field]: e.target.value || undefined,
                          }))
                        }
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                      >
                        <option value="">-- ไม่จับคู่ --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {parseError}
            </div>
          )}

          {!isImportEnabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              กรุณาระบุ &ldquo;อัตราค่าคอม (%)&rdquo; และอย่างน้อยหนึ่งฟิลด์จับคู่สินค้า (รหัสสินค้า / ลิงก์ / ชื่อสินค้า)
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="rounded-full" onClick={reset}>
              ยกเลิก
            </Button>
            <Button
              className="rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover disabled:opacity-50"
              disabled={!isImportEnabled || isLoading}
              onClick={handleImport}
            >
              {isLoading ? (
                <><Loader2 className="size-4 animate-spin" /> กำลังนำเข้า...</>
              ) : (
                <>นำเข้าข้อมูลค่าคอม ({formatNumber(allRows.length)} แถว)</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Result ───────────────────────────────────────────────── */}
      {step === "result" && result && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-positive">
            <CheckCircle2 className="size-6" />
            <span className="text-lg font-bold">นำเข้าสำเร็จ</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultBlock label="แถวทั้งหมด"    value={formatNumber(result.totalRows)} />
            <ResultBlock label="จับคู่ได้"
              value={formatNumber(result.matchedByExtId + result.matchedByUrl + result.matchedByName)}
              valueClassName="text-positive" />
            <ResultBlock label="ไม่พบสินค้า"  value={formatNumber(result.unmatched)}
              valueClassName={result.unmatched > 0 ? "text-amber-600" : undefined} />
            <ResultBlock label="อัปเดตค่าคอม" value={`${formatNumber(result.updatedProductsCount)} สินค้า`}
              valueClassName="text-brand-gold-hover" />
          </div>

          {/* รายละเอียดการจับคู่ */}
          {(result.matchedByExtId > 0 || result.matchedByUrl > 0 || result.matchedByName > 0) && (
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <p className="font-semibold text-foreground">รายละเอียดการจับคู่:</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {result.matchedByExtId > 0 && <li>• ตรงรหัสสินค้า: {formatNumber(result.matchedByExtId)} รายการ</li>}
                {result.matchedByUrl   > 0 && <li>• ตรงลิงก์สินค้า: {formatNumber(result.matchedByUrl)} รายการ</li>}
                {result.matchedByName  > 0 && <li>• ตรงชื่อสินค้า + ร้าน: {formatNumber(result.matchedByName)} รายการ</li>}
              </ul>
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                ข้อผิดพลาดบางแถว ({result.errors.length} รายการ):
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            ข้อมูลค่าคอมมิชชันถูกบันทึกแล้ว — เปิดหน้ารายละเอียดสินค้าเพื่อดูค่าคอมจริง
            หรือดูหน้า &ldquo;ภาพรวม&rdquo; เพื่อใช้ตัวกรองค่าคอมสูง
          </p>

          <div className="flex gap-3">
            <Button className="rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover" onClick={reset}>
              นำเข้าไฟล์ใหม่
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xl font-extrabold text-foreground ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}
