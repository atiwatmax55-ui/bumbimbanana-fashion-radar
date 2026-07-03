import Link from "next/link";
import { BadgePercent, Clock, Info } from "lucide-react";
import type { CommissionSnapshot } from "@/lib/commission/types";
import { formatBaht, formatPercent, formatThaiDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

interface CommissionCardProps {
  snapshot: CommissionSnapshot | null;
  productPrice: number;
}

/** แสดงข้อมูลค่าคอมมิชชันจริงจาก Shopee Affiliate CSV/XLSX Import บนหน้ารายละเอียดสินค้า */
export function CommissionCard({ snapshot, productPrice }: CommissionCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2">
        <BadgePercent className="size-4 text-brand-gold-hover" />
        <h2 className="text-base font-bold text-foreground">ค่าคอมมิชชัน Shopee Affiliate (ข้อมูลจริง)</h2>
      </div>

      {!snapshot ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>ยังไม่มีข้อมูลค่าคอมจริงจาก Shopee Affiliate — นำเข้าไฟล์รายงานจาก Shopee Affiliate เพื่อดูค่าคอมจริงสินค้านี้</span>
          </div>
          <Link
            href="/commission-import"
            className="self-start rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-foreground hover:bg-brand-gold-hover"
          >
            นำเข้าข้อมูลค่าคอม
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ตัวเลขหลัก */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricBlock
              label="อัตราค่าคอม"
              value={formatPercent(snapshot.commission_rate)}
              valueClassName="text-brand-gold-hover"
            />
            <MetricBlock
              label="ค่าคอมโดยประมาณ (฿)"
              value={
                snapshot.commission_amount != null
                  ? formatBaht(snapshot.commission_amount)
                  : formatBaht(Math.round(productPrice * snapshot.commission_rate / 100))
              }
              valueClassName="text-brand-gold-hover"
            />
            {snapshot.campaign_name ? (
              <MetricBlock label="แคมเปญ" value={snapshot.campaign_name} />
            ) : null}
          </div>

          {/* แท็กช่องทาง + วันที่ */}
          <div className="flex flex-wrap items-center gap-2">
            {snapshot.channel ? (
              <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                ช่องทาง: {snapshot.channel}
              </Badge>
            ) : null}
            {snapshot.source_file ? (
              <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                ไฟล์: {snapshot.source_file}
              </Badge>
            ) : null}
          </div>

          {/* เวลาอัปเดต */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>
              ข้อมูลล่าสุด:{" "}
              {formatThaiDateTime(snapshot.effective_at ?? snapshot.imported_at)}
            </span>
          </div>

          {/* ลิงก์ไปนำเข้าใหม่ */}
          <Link href="/commission-import" className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
            อัปเดตข้อมูลค่าคอม
          </Link>
        </div>
      )}
    </div>
  );
}

function MetricBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-lg font-extrabold text-foreground ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}
