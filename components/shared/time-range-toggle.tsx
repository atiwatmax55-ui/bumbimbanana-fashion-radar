"use client";

import type { TimeRange } from "@/types/product";
import { cn } from "@/lib/utils";

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

/** ปุ่มสลับช่วงเวลา 7 วัน หรือ 30 วัน ใช้ทั้งหน้า Dashboard และ Product Radar */
export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  return (
    <div
      className="inline-flex rounded-full border border-border bg-background p-1"
      role="group"
      aria-label="เลือกช่วงเวลา"
    >
      {(["7d", "30d"] as const).map((range) => {
        const isActive = value === range;
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={isActive}
          >
            {range === "7d" ? "7 วัน" : "30 วัน"}
          </button>
        );
      })}
    </div>
  );
}
