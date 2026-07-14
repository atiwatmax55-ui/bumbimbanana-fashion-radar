"use client";

import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

export type StyleTagKey = string | "all";

interface StyleTagFilterProps {
  products: Product[];
  value: StyleTagKey;
  onChange: (value: StyleTagKey) => void;
  className?: string;
}

/** แถบกรองแท็กสไตล์ — สร้างจากแท็กที่พบจริงในสินค้า (styleTags จาก style metadata) ซ่อนถ้ายังไม่มีข้อมูล */
export function StyleTagFilter({ products, value, onChange, className }: StyleTagFilterProps) {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const t of p.styleTags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const tags = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  if (tags.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="กรองตามสไตล์"
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
        ทุกสไตล์
      </button>
      {tags.map((tag) => {
        const isActive = value === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(tag)}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 whitespace-nowrap border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

/** กรองสินค้าตามแท็กสไตล์ที่เลือก — "all" คืนสินค้าทั้งหมด */
export function filterByStyleTag<T extends { styleTags?: string[] }>(
  products: T[],
  tag: StyleTagKey,
): T[] {
  if (tag === "all") return products;
  return products.filter((p) => (p.styleTags ?? []).includes(tag));
}
