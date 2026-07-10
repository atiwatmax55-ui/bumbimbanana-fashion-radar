"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ClipboardPaste, Loader2 } from "lucide-react";
import { parseTiktokInputText } from "@/lib/tiktok/parse-csv-input";
import { normalizeTiktokItem, type TiktokRawItem } from "@/lib/tiktok/normalize-tiktok-item";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImportPreviewTable, type PreviewRow } from "@/components/tiktok-import/import-preview-table";

interface CsvPastePanelProps {
  onSubmit: (items: TiktokRawItem[]) => void;
  isSubmitting: boolean;
}

const PLACEHOLDER =
  "ชื่อสินค้า,ราคา,ค่าคอม(%),ลิงก์สินค้า,ลิงก์รูป,ยอดขายโดยประมาณ,หมวดหมู่,ชื่อร้าน\n" +
  "เดรสลายดอก คอวี แขนสั้น,259,15,https://shop.tiktok.com/view/product/xxxx,,1200,เดรส,ร้านตัวอย่าง";

/** โหมดวาง CSV/TSV (จาก Excel, Google Sheets) หรือ JSON หลายรายการพร้อมกัน พร้อม preview ก่อนยืนยัน */
export function CsvPastePanel({ onSubmit, isSubmitting }: CsvPastePanelProps) {
  const [text, setText] = useState("");

  const parsed = useMemo(() => parseTiktokInputText(text), [text]);

  const previewRows: PreviewRow[] = useMemo(
    () =>
      parsed.items.map((raw, index) => ({
        index,
        result: normalizeTiktokItem(raw, { importedAt: new Date().toISOString() }),
      })),
    [parsed.items],
  );

  const validCount = previewRows.filter((r) => r.result.ok).length;
  const invalidCount = previewRows.length - validCount;

  function handleConfirm() {
    if (validCount === 0) return;
    onSubmit(parsed.items);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          วางข้อมูลได้ทั้ง CSV (คั่นด้วย comma), คัดลอกจาก Excel/Google Sheets (คั่นด้วย tab) หรือ JSON —
          บรรทัดแรกต้องเป็นหัวตารางภาษาไทยตามตัวอย่าง
        </p>
      </div>

      {parsed.error && (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {parsed.error}
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">
            ตัวอย่างข้อมูล — พบ {previewRows.length} รายการ
            <span className="ml-1.5 font-normal text-muted-foreground">
              (พร้อมนำเข้า {validCount} รายการ{invalidCount > 0 ? ` • มีปัญหา ${invalidCount} รายการ` : ""})
            </span>
          </p>
          <ImportPreviewTable rows={previewRows} />
        </div>
      )}

      <Button
        type="button"
        disabled={validCount === 0 || isSubmitting}
        onClick={handleConfirm}
        className="w-fit rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover hover:text-background disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> กำลังนำเข้า...
          </>
        ) : (
          <>
            <ClipboardPaste className="size-4" /> ยืนยันนำเข้า ({validCount} รายการ)
          </>
        )}
      </Button>
    </div>
  );
}
