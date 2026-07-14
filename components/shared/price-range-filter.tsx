"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PriceRange {
  min: number | null;
  max: number | null;
}

export const PRICE_RANGE_ALL: PriceRange = { min: null, max: null };

interface PriceRangeFilterProps {
  value: PriceRange;
  onChange: (value: PriceRange) => void;
  className?: string;
}

/** ตัวกรองช่วงราคา (บาท) — ช่องว่าง = ไม่จำกัดฝั่งนั้น */
export function PriceRangeFilter({ value, onChange, className }: PriceRangeFilterProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="ราคาต่ำสุด"
        value={value.min ?? ""}
        onChange={(e) =>
          onChange({ ...value, min: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })
        }
        className="w-28 rounded-none"
        aria-label="ราคาต่ำสุด"
      />
      <span className="text-xs text-muted-foreground">–</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="ราคาสูงสุด"
        value={value.max ?? ""}
        onChange={(e) =>
          onChange({ ...value, max: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })
        }
        className="w-28 rounded-none"
        aria-label="ราคาสูงสุด"
      />
    </div>
  );
}

/** กรองสินค้าตามช่วงราคา — min/max เป็น null = ไม่จำกัดฝั่งนั้น */
export function filterByPriceRange<T extends { price: number }>(products: T[], range: PriceRange): T[] {
  if (range.min === null && range.max === null) return products;
  return products.filter((p) => {
    if (range.min !== null && p.price < range.min) return false;
    if (range.max !== null && p.price > range.max) return false;
    return true;
  });
}
