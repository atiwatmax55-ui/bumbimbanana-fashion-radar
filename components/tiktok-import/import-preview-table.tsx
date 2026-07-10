import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { NormalizeResult } from "@/lib/tiktok/normalize-tiktok-item";
import { formatBaht, formatNumber, formatPercent } from "@/lib/utils/format";

export interface PreviewRow {
  index:  number;
  result: NormalizeResult;
}

interface ImportPreviewTableProps {
  rows: PreviewRow[];
}

/** ตารางตัวอย่างก่อนนำเข้า — ไฮไลต์แถวที่ผิดพร้อมเหตุผลภาษาไทย */
export function ImportPreviewTable({ rows }: ImportPreviewTableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-border">
      <table className="min-w-full text-xs">
        <thead className="bg-muted/60">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground">สถานะ</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground">ชื่อสินค้า</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-muted-foreground">ราคา</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-muted-foreground">ค่าคอม</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-muted-foreground">ยอดขาย</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground">หมวดหมู่</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ index, result }) => {
            const hasWarning = result.ok && result.warnings.length > 0;
            const rowClass = !result.ok
              ? "bg-negative/5"
              : hasWarning
                ? "bg-amber-50 dark:bg-amber-950/20"
                : "";
            return (
              <tr key={index} className={`border-t border-border ${rowClass}`}>
                <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-2">
                  {!result.ok ? (
                    <AlertCircle className="size-4 text-negative" aria-label="ข้าม" />
                  ) : hasWarning ? (
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-label="มีคำเตือน" />
                  ) : (
                    <CheckCircle2 className="size-4 text-positive" aria-label="พร้อมนำเข้า" />
                  )}
                </td>
                {result.ok ? (
                  <>
                    <td className="max-w-48 truncate px-3 py-2 text-foreground">{result.row.title}</td>
                    <td className="px-3 py-2 text-right text-foreground">{formatBaht(result.row.price)}</td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatPercent(result.row.commission_rate)}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{formatNumber(result.row.item_sold)}</td>
                    <td className="px-3 py-2 text-foreground">{result.row.category}</td>
                    <td className="max-w-56 px-3 py-2 text-amber-700 dark:text-amber-400">
                      {result.warnings.join(" / ")}
                    </td>
                  </>
                ) : (
                  <td colSpan={6} className="px-3 py-2 text-negative">
                    {result.reason}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
