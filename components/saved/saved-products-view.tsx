"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import type { Product } from "@/types/product";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { PageHeader } from "@/components/shared/page-header";
import { DataFreshnessBadge } from "@/components/shared/data-freshness-badge";
import { SavedProductCard } from "@/components/saved/saved-product-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SavedSortKey = "savedAt" | "commission" | "sales";

const SORT_OPTIONS: { value: SavedSortKey; label: string }[] = [
  { value: "savedAt", label: "วันที่บันทึกล่าสุด" },
  { value: "commission", label: "ค่าคอมมิชชันสูงสุด" },
  { value: "sales", label: "ยอดขายสูงสุด" },
];

interface SavedProductsViewProps {
  products: Product[];
  lastUpdatedAt: string;
}

export function SavedProductsView({ products, lastUpdatedAt }: SavedProductsViewProps) {
  const { savedProducts, unsave } = useSavedProducts();
  const [sortBy, setSortBy] = useState<SavedSortKey>("savedAt");

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const joined = useMemo(() => {
    return savedProducts
      .map((entry) => ({ entry, product: productMap.get(entry.productId) }))
      .filter((row): row is { entry: typeof row.entry; product: Product } => Boolean(row.product));
  }, [savedProducts, productMap]);

  const filtered = useMemo(() => {
    const sorted = [...joined];
    switch (sortBy) {
      case "commission":
        sorted.sort((a, b) => b.product.commissionRate - a.product.commissionRate);
        break;
      case "sales":
        sorted.sort((a, b) => (b.product.itemSold ?? 0) - (a.product.itemSold ?? 0));
        break;
      default:
        sorted.sort((a, b) => new Date(b.entry.savedAt).getTime() - new Date(a.entry.savedAt).getTime());
    }
    return sorted;
  }, [joined, sortBy]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="สินค้าที่บันทึกไว้ (Saved Products)"
        description="รวมสินค้าที่เลือกเก็บไว้ทำคอนเทนต์ พร้อมโน้ตส่วนตัวของคุณ"
      >
        <DataFreshnessBadge lastUpdatedAt={lastUpdatedAt} />
      </PageHeader>

      {joined.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border p-10 text-center">
          <Bookmark className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">ยังไม่มีสินค้าที่บันทึกไว้</p>
          <Button
            className="rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover"
            render={<Link href="/products" />}
            nativeButton={false}
          >
            ไปค้นหาสินค้าใน Product Radar
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              บันทึกไว้ {filtered.length.toLocaleString("th-TH")} รายการ
            </span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SavedSortKey)}>
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="เรียงตาม">
                  {(v: SavedSortKey) => SORT_OPTIONS.find((option) => option.value === v)?.label ?? "เรียงตาม"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map(({ entry, product }) => (
              <SavedProductCard
                key={entry.id}
                product={product}
                savedEntry={entry}
                onRemove={() => unsave(product.id)}
              />
            ))}
            {filtered.length === 0 ? (
              <p className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
                ไม่พบสินค้าที่ตรงกับตัวกรองที่เลือก
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
