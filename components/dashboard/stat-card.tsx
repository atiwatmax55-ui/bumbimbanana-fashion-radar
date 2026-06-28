import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: LucideIcon;
  valueClassName?: string;
}

/** การ์ดแสดงตัวเลขสำคัญ 1 ค่า ใช้ในแถวสถิติบนหน้า Dashboard เน้นตัวเลขให้เด่นตามแนวทางแบรนด์ */
export function StatCard({ label, value, subLabel, icon: Icon, valueClassName }: StatCardProps) {
  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className={cn("text-2xl font-extrabold tracking-tight text-foreground", valueClassName)}>
            {value}
          </span>
          {subLabel ? <span className="text-xs text-muted-foreground">{subLabel}</span> : null}
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-cream text-brand-gold-hover">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
