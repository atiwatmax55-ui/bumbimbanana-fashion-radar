import { Clock3, FlaskConical, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatThaiDateTime } from "@/lib/utils/format";

interface DataFreshnessBadgeProps {
  lastUpdatedAt: string;
  /** แหล่งข้อมูล — ถ้าไม่ระบุจะแสดง "Mock Data" (safe default สำหรับ dev/test) */
  source?: "shopee" | "windsor" | "mock" | "tiktok";
  className?: string;
}

const SOURCE_CONFIG = {
  shopee: {
    label: "Shopee Product Feed",
    icon: ShoppingBag,
    className: "bg-[#EE4D2D]/10 text-[#EE4D2D] border-[#EE4D2D]/30",
  },
  windsor: {
    label: "Windsor.ai (TikTok Shop)",
    icon: FlaskConical,
    className: "bg-brand-cream text-foreground border-border",
  },
  tiktok: {
    label: "TikTok Shop (นำเข้าด้วยมือ)",
    icon: ShoppingBag,
    className: "bg-brand-gold/10 text-brand-gold-hover border-brand-gold/30",
  },
  mock: {
    label: "Mock Data (ข้อมูลตัวอย่าง)",
    icon: FlaskConical,
    className: "bg-brand-cream text-foreground border-border",
  },
} as const;

/** แสดงสถานะ "ข้อมูลล่าสุด" และแหล่งข้อมูลจริง — ใช้ทุกหน้าที่แสดงข้อมูลสินค้า */
export function DataFreshnessBadge({ lastUpdatedAt, source, className }: DataFreshnessBadgeProps) {
  const cfg = SOURCE_CONFIG[source ?? "mock"];
  const Icon = cfg.icon;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Badge variant="outline" className="gap-1.5 border-border text-muted-foreground">
        <Clock3 className="size-3" />
        ข้อมูลล่าสุด: {formatThaiDateTime(lastUpdatedAt)}
      </Badge>
      <Badge variant="outline" className={`gap-1.5 ${cfg.className}`}>
        <Icon className="size-3" />
        {cfg.label}
      </Badge>
    </div>
  );
}
