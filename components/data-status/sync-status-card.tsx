import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { DataSyncStatus } from "@/lib/data-source/types";
import { Badge } from "@/components/ui/badge";
import { formatThaiDateTime } from "@/lib/utils/format";

const STATUS_CONFIG = {
  success: { label: "สำเร็จ", icon: CheckCircle2, className: "text-positive" },
  pending: { label: "กำลังดำเนินการ", icon: Clock, className: "text-brand-gold-hover" },
  error: { label: "ผิดพลาด", icon: XCircle, className: "text-negative" },
} as const;

interface SyncStatusCardProps {
  status: DataSyncStatus;
}

/** การ์ดแสดงสถานะการซิงก์ข้อมูลล่าสุด บนหน้า Data Status (หน้าสถานะข้อมูล) */
export function SyncStatusCard({ status }: SyncStatusCardProps) {
  const config = STATUS_CONFIG[status.syncStatus];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">สถานะการซิงก์ข้อมูล</h2>
        <Badge variant="outline" className={`gap-1.5 border-border ${config.className}`}>
          <Icon className="size-3.5" />
          {config.label}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field
          label="แหล่งข้อมูลปัจจุบัน"
          value={
            status.source === "shopee"
              ? "Shopee Product Feed (Supabase)"
              : status.source === "mock"
                ? "Mock Data (ข้อมูลตัวอย่าง)"
                : "Windsor.ai"
          }
        />
        <Field label="จำนวนสินค้าในระบบ" value={`${status.totalProducts.toLocaleString("th-TH")} รายการ`} />
        <Field label="ซิงก์ล่าสุด" value={formatThaiDateTime(status.lastSyncedAt)} />
      </div>
      <p className="text-sm text-muted-foreground">{status.message}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
