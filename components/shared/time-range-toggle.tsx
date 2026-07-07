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
      className="inline-flex items-stretch border border-border bg-background"
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
              "px-4 py-2 text-xs font-bold tracking-wide transition-colors duration-200",
              isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
