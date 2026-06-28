"use client";

import { SlidersHorizontal } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/types/product";
import {
  COMMISSION_BOUNDS,
  countActiveFilters,
  DEFAULT_RADAR_FILTERS,
  GROWTH_BOUNDS,
  PRICE_BOUNDS,
  SALES_BOUNDS,
  type RadarFilterState,
} from "@/components/products/product-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function firstSliderValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : value[0];
}

interface ProductFiltersSheetProps {
  filters: RadarFilterState;
  onChange: (filters: RadarFilterState) => void;
}

export function ProductFiltersSheet({ filters, onChange }: ProductFiltersSheetProps) {
  const activeCount = countActiveFilters(filters);

  function toggleCategory(category: RadarFilterState["categories"][number]) {
    const exists = filters.categories.includes(category);
    onChange({
      ...filters,
      categories: exists
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    });
  }

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" className="gap-2 rounded-full" />}>
        <SlidersHorizontal className="size-4" />
        ตัวกรอง
        {activeCount > 0 ? (
          <Badge className="bg-brand-gold text-foreground">{activeCount}</Badge>
        ) : null}
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-sm">
        <SheetHeader className="border-b border-border">
          <SheetTitle>ตัวกรองสินค้า</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <Label>หมวดสินค้า</Label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((category) => {
                const isActive = filters.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-transparent bg-brand-gold text-foreground"
                        : "border-border text-muted-foreground hover:bg-brand-cream hover:text-foreground"
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>ช่วงราคา (บาท)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={PRICE_BOUNDS.min}
                value={filters.minPrice}
                onChange={(e) => onChange({ ...filters, minPrice: Number(e.target.value) || 0 })}
                placeholder="ต่ำสุด"
              />
              <span className="text-muted-foreground">ถึง</span>
              <Input
                type="number"
                inputMode="numeric"
                max={PRICE_BOUNDS.max}
                value={filters.maxPrice}
                onChange={(e) =>
                  onChange({ ...filters, maxPrice: Number(e.target.value) || PRICE_BOUNDS.max })
                }
                placeholder="สูงสุด"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              ค่าคอมมิชชันขั้นต่ำ: <span className="font-bold text-foreground">{filters.minCommissionRate}%</span>
            </Label>
            <Slider
              value={[filters.minCommissionRate]}
              min={COMMISSION_BOUNDS.min}
              max={COMMISSION_BOUNDS.max}
              step={1}
              onValueChange={(value) => onChange({ ...filters, minCommissionRate: firstSliderValue(value) })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              ยอดขายขั้นต่ำ: <span className="font-bold text-foreground">{filters.minSales.toLocaleString("th-TH")} ชิ้น</span>
            </Label>
            <Slider
              value={[filters.minSales]}
              min={SALES_BOUNDS.min}
              max={SALES_BOUNDS.max}
              step={100}
              onValueChange={(value) => onChange({ ...filters, minSales: firstSliderValue(value) })}
            />
            <p className="text-xs text-muted-foreground">อ้างอิงตามช่วงเวลาที่เลือกอยู่ด้านบน (7 วัน หรือ 30 วัน)</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              อัตราการเติบโตขั้นต่ำ: <span className="font-bold text-foreground">{filters.minGrowthRate}%</span>
            </Label>
            <Slider
              value={[filters.minGrowthRate]}
              min={GROWTH_BOUNDS.min}
              max={GROWTH_BOUNDS.max}
              step={5}
              onValueChange={(value) => onChange({ ...filters, minGrowthRate: firstSliderValue(value) })}
            />
          </div>

          <button
            type="button"
            onClick={() => onChange({ ...filters, savedOnly: !filters.savedOnly })}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
              filters.savedOnly
                ? "border-transparent bg-brand-gold text-foreground"
                : "border-border text-muted-foreground hover:bg-brand-cream hover:text-foreground"
            )}
          >
            เฉพาะสินค้าที่บันทึกแล้ว
            <span
              className={cn(
                "flex h-5 w-9 items-center rounded-full border border-border bg-background p-0.5 transition-colors",
                filters.savedOnly && "bg-foreground"
              )}
            >
              <span
                className={cn(
                  "size-3.5 rounded-full bg-muted-foreground transition-transform",
                  filters.savedOnly && "translate-x-4 bg-brand-gold"
                )}
              />
            </span>
          </button>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => onChange(DEFAULT_RADAR_FILTERS)}>
            ล้างตัวกรองทั้งหมด
          </Button>
          <SheetClose render={<Button className="flex-1 rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover" />}>
            ดูผลลัพธ์
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
