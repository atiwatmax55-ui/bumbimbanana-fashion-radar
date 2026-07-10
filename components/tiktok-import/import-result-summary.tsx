import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import type { TiktokImportResponse } from "@/lib/tiktok/types";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils/format";

interface ImportResultSummaryProps {
  result: TiktokImportResponse;
  onReset: () => void;
}

/** สรุปผลหลังนำเข้าสำเร็จ — จำนวนเพิ่มใหม่/อัปเดต/ข้าม + ลิงก์ไปหน้าแรกแท็บ TIKTOK */
export function ImportResultSummary({ result, onReset }: ImportResultSummaryProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-positive">
        <CheckCircle2 className="size-6" />
        <span className="text-lg font-bold">นำเข้าสำเร็จ</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="ทั้งหมด" value={formatNumber(result.totalItems)} />
        <SummaryStat label="เพิ่มใหม่" value={formatNumber(result.inserted)} valueClassName="text-positive" />
        <SummaryStat label="อัปเดต" value={formatNumber(result.updated)} valueClassName="text-brand-gold-hover" />
        <SummaryStat
          label="ข้าม"
          value={formatNumber(result.skipped)}
          valueClassName={result.skipped > 0 ? "text-negative" : undefined}
        />
      </div>

      {result.skippedReasons.length > 0 && (
        <div className="rounded-xl border border-negative/30 bg-negative/5 p-4">
          <p className="text-sm font-semibold text-negative">รายการที่ข้าม ({result.skippedReasons.length}):</p>
          <ul className="mt-1 space-y-0.5 text-xs text-negative">
            {result.skippedReasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            คำเตือน ({result.warnings.length}):
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
            {result.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">
        <Clock3 className="mt-0.5 size-3.5 shrink-0" />
        สินค้าที่เพิ่งนำเข้าอาจใช้เวลาถึง 1 นาทีก่อนแสดงผลที่หน้าแรก (ระบบพักข้อมูลไว้ชั่วคราวเพื่อความเร็ว)
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          className="rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover hover:text-background"
          onClick={onReset}
        >
          นำเข้าเพิ่มเติม
        </Button>
        <Button variant="outline" className="rounded-full" render={<Link href="/?platform=tiktok" />}>
          ไปดูสินค้า TikTok ที่หน้าแรก
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SummaryStat({
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
