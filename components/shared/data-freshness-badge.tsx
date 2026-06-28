import { Clock3, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatThaiDateTime } from "@/lib/utils/format";

interface DataFreshnessBadgeProps {
  lastUpdatedAt: string;
  className?: string;
}

/** แสดงสถานะ "ข้อมูลล่าสุด" และโหมด Mock Data (ข้อมูลตัวอย่าง) ให้เห็นชัดเจน ใช้ทุกหน้าที่เกี่ยวข้องกับข้อมูลสินค้า ตามกฎข้อ 10 ของโครงการ */
export function DataFreshnessBadge({ lastUpdatedAt, className }: DataFreshnessBadgeProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Badge variant="outline" className="gap-1.5 border-border text-muted-foreground">
        <Clock3 className="size-3" />
        ข้อมูลล่าสุด: {formatThaiDateTime(lastUpdatedAt)}
      </Badge>
      <Badge variant="secondary" className="gap-1.5 bg-brand-cream text-foreground">
        <FlaskConical className="size-3" />
        Mock Data (ข้อมูลตัวอย่าง)
      </Badge>
    </div>
  );
}
