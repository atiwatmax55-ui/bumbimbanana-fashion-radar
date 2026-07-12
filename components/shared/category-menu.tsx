"use client";

import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from "@/types/product";
import { cn } from "@/lib/utils";

export type CategoryKey = ProductCategory | "all";

interface CategoryMenuProps {
  products: Product[];
  value: CategoryKey;
  onChange: (value: CategoryKey) => void;
  className?: string;
}

/** แถบเมนูกรองหมวดหมู่สินค้า แนวนอนเลื่อนได้ (mobile-first) — ซ่อนหมวดที่ไม่มีสินค้า */
export function CategoryMenu({ products, value, onChange, className }: CategoryMenuProps) {
  const counts = new Map<ProductCategory, number>();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }

  const categories = PRODUCT_CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0);

  return (
    <div
      role="group"
      aria-label="กรองตามหมวดหมู่สินค้า"
      className={cn("flex items-center gap-2 overflow-x-auto pb-1", className)}
    >
      <button
        type="button"
        onClick={() => onChange("all")}
        aria-pressed={value === "all"}
        className={cn(
          "shrink-0 whitespace-nowrap rounded-none border px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors",
          value === "all"
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        ทั้งหมด
      </button>
      {categories.map((category) => {
        const isActive = value === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-none border px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

/** กรองสินค้าตามหมวดหมู่ที่เลือก — "all" คืนสินค้าทั้งหมด */
export function filterByCategory<T extends { category: ProductCategory }>(
  products: T[],
  category: CategoryKey,
): T[] {
  if (category === "all") return products;
  return products.filter((p) => p.category === category);
}
