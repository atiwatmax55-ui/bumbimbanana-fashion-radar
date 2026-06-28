"use client";

import { useMemo, useState } from "react";
import type { Product, ProductGoal, TimeRange } from "@/types/product";
import type { ProductFilters, ProductSortKey } from "@/lib/data-source/types";
import { applyProductFilters, sortProducts } from "@/lib/data-source/query-products";
import { DEFAULT_RADAR_FILTERS, type RadarFilterState } from "@/components/products/product-filters";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { PageHeader } from "@/components/shared/page-header";
import { DataFreshnessBadge } from "@/components/shared/data-freshness-badge";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import { ProductFiltersSheet } from "@/components/products/product-filters-sheet";
import { ProductSortSelect } from "@/components/products/product-sort-select";
import { ProductTable } from "@/components/products/product-table";
import { ProductCardMobile } from "@/components/products/product-card-mobile";

const VALID_GOALS: ProductGoal[] = ["commission", "sales", "revenue", "growth", "interest"];

interface ProductRadarViewProps {
  products: Product[];
  lastUpdatedAt: string;
  initialGoal?: string;
  initialRange?: string;
}

export function ProductRadarView({
  products,
  lastUpdatedAt,
  initialGoal,
  initialRange,
}: ProductRadarViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange === "7d" ? "7d" : "30d");
  const [sortBy, setSortBy] = useState<ProductSortKey>(
    VALID_GOALS.includes(initialGoal as ProductGoal) ? (initialGoal as ProductSortKey) : "salesRank"
  );
  const [filters, setFilters] = useState<RadarFilterState>(DEFAULT_RADAR_FILTERS);
  const { savedProducts, isSaved, toggleSave } = useSavedProducts();

  const visibleProducts = useMemo(() => {
    const queryFilters: ProductFilters = {
      categories: filters.categories,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minCommissionRate: filters.minCommissionRate,
      minSales: filters.minSales,
      minGrowthRate: filters.minGrowthRate,
      savedOnly: filters.savedOnly,
      savedProductIds: savedProducts.map((s) => s.productId),
    };
    const filtered = applyProductFilters(products, timeRange, queryFilters);
    return sortProducts(filtered, timeRange, sortBy);
  }, [products, timeRange, sortBy, filters, savedProducts]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="ค้นหาและคัดสินค้า (Product Radar)"
        description="ค้นหา เปรียบเทียบ และคัดเลือกสินค้าแฟชั่นผู้หญิงที่น่าทำคอนเทนต์"
      >
        <DataFreshnessBadge lastUpdatedAt={lastUpdatedAt} />
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
          <ProductSortSelect value={sortBy} onChange={setSortBy} />
          <ProductFiltersSheet filters={filters} onChange={setFilters} />
        </div>
        <span className="text-sm text-muted-foreground">พบ {visibleProducts.length} รายการ</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:hidden">
        {visibleProducts.map((product) => (
          <ProductCardMobile
            key={product.id}
            product={product}
            timeRange={timeRange}
            isSaved={isSaved(product.id)}
            onToggleSave={() => toggleSave(product.id)}
          />
        ))}
        {visibleProducts.length === 0 ? (
          <p className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            ไม่พบสินค้าที่ตรงกับตัวกรองที่เลือก
          </p>
        ) : null}
      </div>

      <div className="hidden md:block">
        <ProductTable products={visibleProducts} isSaved={isSaved} onToggleSave={toggleSave} />
      </div>
    </div>
  );
}
