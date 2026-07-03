"use client";

import { useMemo, useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";
import type { Product, ProductGoal, TimeRange } from "@/types/product";
import type { ProductFilters, ProductSortKey } from "@/lib/data-source/types";
import { applyProductFilters, sortProducts } from "@/lib/data-source/query-products";
import { computeProductRanks } from "@/lib/data-source/compute-ranks";
import type { ProductDraft } from "@/lib/data-source/build-product";
import {
  DEFAULT_RADAR_FILTERS,
  QUICK_FILTER_LABELS,
  type QuickFilterKey,
  type RadarFilterState,
} from "@/components/products/product-filters";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { useUserProducts } from "@/hooks/use-user-products";
import { PageHeader } from "@/components/shared/page-header";
import { DataFreshnessBadge } from "@/components/shared/data-freshness-badge";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import { ProductFiltersSheet } from "@/components/products/product-filters-sheet";
import { ProductSortSelect } from "@/components/products/product-sort-select";
import { ProductTable } from "@/components/products/product-table";
import { ProductCardMobile } from "@/components/products/product-card-mobile";
import { ProductFormSheet } from "@/components/products/product-form-sheet";
import { Button } from "@/components/ui/button";

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
  const { userProducts, isUserProduct, addProduct, updateProduct, removeProduct } = useUserProducts();

  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [formState, setFormState] = useState<{ open: boolean; editingProduct?: Product }>({
    open: false,
  });

  const allProducts = useMemo(
    () => computeProductRanks([...products, ...userProducts]),
    [products, userProducts]
  );

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
    const filtered = applyProductFilters(allProducts, timeRange, queryFilters);
    const sorted = sortProducts(filtered, timeRange, sortBy);

    // ── Quick filter chip ─────────────────────────────────────────────────────
    switch (quickFilter) {
      case "best_seller":
        return sorted.filter((p) => p.salesRank > 0 && p.salesRank <= 50);
      case "trending":
        return sorted.filter((p) => p.growthRate >= 20);
      case "has_commission":
        return sorted.filter((p) => p.commissionRate > 0 && !p.commissionStatus);
      case "wait_commission":
        return sorted.filter((p) => p.source === "shopee" && !(p.commissionRate > 0 && !p.commissionStatus));
      case "strategy_review":
        return sorted.filter((p) => p.workflowStatus === "strategy_review");
      case "approved":
        return sorted.filter((p) => p.workflowStatus === "approved_for_content");
      default:
        return sorted;
    }
  }, [allProducts, timeRange, sortBy, filters, savedProducts, quickFilter]);

  function openAddForm() {
    setFormState({ open: true, editingProduct: undefined });
  }

  function openEditForm(product: Product) {
    setFormState({ open: true, editingProduct: product });
  }

  function handleFormSubmit(draft: ProductDraft) {
    if (formState.editingProduct) {
      updateProduct(formState.editingProduct.id, draft);
    } else {
      addProduct(draft);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="ค้นหาและคัดสินค้า (Product Radar)"
        description="ค้นหา เปรียบเทียบ และคัดเลือกสินค้าแฟชั่นผู้หญิงที่น่าทำคอนเทนต์"
      >
        <DataFreshnessBadge
          lastUpdatedAt={lastUpdatedAt}
          source={products.some((p) => p.source === "shopee") ? "shopee" : "mock"}
        />
        {products.some((p) => p.source === "shopee") ? (
          <span className="flex items-center gap-1.5 rounded-full border border-positive/40 bg-positive/10 px-3 py-1 text-xs font-semibold text-positive">
            <ShoppingBag className="size-3.5" />
            ข้อมูลสินค้าจริงจาก Shopee Feed
          </span>
        ) : null}
      </PageHeader>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(QUICK_FILTER_LABELS) as QuickFilterKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setQuickFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              quickFilter === key
                ? "border-transparent bg-brand-gold text-foreground"
                : "border-border text-muted-foreground hover:bg-brand-cream hover:text-foreground"
            }`}
          >
            {QUICK_FILTER_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
          <ProductSortSelect value={sortBy} onChange={setSortBy} />
          <ProductFiltersSheet filters={filters} onChange={setFilters} />
          <Button variant="outline" className="gap-1.5 rounded-full" onClick={openAddForm}>
            <Plus className="size-4" />
            เพิ่มสินค้าใหม่
          </Button>
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
            isUserProduct={isUserProduct(product.id)}
            onEdit={() => openEditForm(product)}
            onRemove={() => removeProduct(product.id)}
          />
        ))}
        {visibleProducts.length === 0 ? (
          <p className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            ไม่พบสินค้าที่ตรงกับตัวกรองที่เลือก
          </p>
        ) : null}
      </div>

      <div className="hidden md:block">
        <ProductTable
          products={visibleProducts}
          isSaved={isSaved}
          onToggleSave={toggleSave}
          isUserProduct={isUserProduct}
          onEdit={openEditForm}
          onRemove={removeProduct}
        />
      </div>

      <ProductFormSheet
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        initialValues={formState.editingProduct ? productToDraft(formState.editingProduct) : undefined}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

/** แปลง Product ที่มีอยู่แล้วกลับเป็น ProductDraft เพื่อเอาไปเติมในฟอร์มแก้ไข */
function productToDraft(product: Product): ProductDraft {
  return {
    productName: product.productName,
    shopName: product.shopName,
    category: product.category,
    price: product.price,
    commissionRate: product.commissionRate,
    sales7d: product.sales7d,
    sales30d: product.sales30d,
    growthRate: product.growthRate,
    interestScore: product.interestScore,
    productUrl: product.productUrl,
  };
}
