"use client";

import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

export type ColorKey = string | "all";

interface ColorSwatchFilterProps {
  products: Product[];
  value: ColorKey;
  onChange: (value: ColorKey) => void;
  className?: string;
}

/** สีอ้างอิงสำหรับวาดวงกลมตัวอย่าง — ไม่มีในนี้ = ใช้สีเทากลาง */
const COLOR_SWATCH_MAP: Record<string, string> = {
  "ดำ": "#111111", "ขาว": "#ffffff", "แดง": "#dc2626", "ฟ้า": "#38bdf8",
  "น้ำเงิน": "#1d4ed8", "เขียว": "#16a34a", "เหลือง": "#eab308", "ส้ม": "#f97316",
  "ชมพู": "#ec4899", "ม่วง": "#9333ea", "น้ำตาล": "#92400e", "เทา": "#6b7280",
  "ครีม": "#fef3c7", "เบจ": "#e7d8c9", "กรม": "#1e3a8a", "ทอง": "#ca8a04",
  "เงิน": "#9ca3af", "กากี": "#a3a380",
};

/** แถบกรองสีหลัก — สร้างจากสีที่พบจริงในสินค้า (colors จาก style metadata) ซ่อนถ้ายังไม่มีข้อมูลสี */
export function ColorSwatchFilter({ products, value, onChange, className }: ColorSwatchFilterProps) {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const c of p.colors ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const colors = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  if (colors.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="กรองตามสี"
      className={cn("flex items-center gap-1.5 overflow-x-auto pb-1", className)}
    >
      <button
        type="button"
        onClick={() => onChange("all")}
        aria-pressed={value === "all"}
        className={cn(
          "shrink-0 whitespace-nowrap rounded-none border px-3 py-1 text-[11px] font-bold tracking-wide transition-colors",
          value === "all"
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        ทุกสี
      </button>
      {colors.map((color) => {
        const isActive = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-pressed={isActive}
            title={color}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              isActive ? "border-foreground bg-secondary" : "border-border hover:bg-secondary",
            )}
          >
            <span
              className="size-3 shrink-0 rounded-full border border-border/60"
              style={{ backgroundColor: COLOR_SWATCH_MAP[color] ?? "#d4d4d4" }}
            />
            {color}
          </button>
        );
      })}
    </div>
  );
}

/** กรองสินค้าตามสีที่เลือก — "all" คืนสินค้าทั้งหมด */
export function filterByColor<T extends { colors?: string[] }>(products: T[], color: ColorKey): T[] {
  if (color === "all") return products;
  return products.filter((p) => (p.colors ?? []).includes(color));
}
