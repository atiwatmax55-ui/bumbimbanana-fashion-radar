"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ShopSearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** ค้นหาสินค้าจากชื่อร้านค้า (แบรนด์) */
export function ShopSearchFilter({ value, onChange, className }: ShopSearchFilterProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ค้นหาร้านค้า…"
        className="rounded-none pl-9"
        aria-label="ค้นหาร้านค้า"
      />
    </div>
  );
}

/** กรองสินค้าตามชื่อร้านค้า (ค้นหาแบบ substring, ไม่สนตัวพิมพ์ใหญ่-เล็ก) */
export function filterByShop<T extends { shopName: string }>(products: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => p.shopName.toLowerCase().includes(q));
}
