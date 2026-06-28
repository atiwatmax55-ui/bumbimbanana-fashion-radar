"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Product } from "@/types/product";
import { getProductInsights } from "@/lib/insights/product-insights";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { DataFreshnessBadge } from "@/components/shared/data-freshness-badge";
import { RankBadges } from "@/components/shared/rank-badges";
import { SaveProductButton } from "@/components/shared/save-product-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductSalesChart } from "@/components/product-detail/product-sales-chart";
import { ProductInsightsCard } from "@/components/product-detail/product-insights-card";
import { PersonalNoteCard } from "@/components/product-detail/personal-note-card";
import {
  formatBaht,
  formatNumber,
  formatPercent,
  growthColorClass,
} from "@/lib/utils/format";

interface ProductDetailViewProps {
  product: Product;
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const { isSaved, toggleSave, save, updateNote, savedProducts } = useSavedProducts();
  const insights = getProductInsights(product);
  const saved = isSaved(product.id);
  const currentNote = savedProducts.find((s) => s.productId === product.id)?.personalNote ?? "";

  function handleSaveNote(note: string) {
    if (saved) {
      updateNote(product.id, note);
    } else {
      save(product.id, note);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <Link href="/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        กลับไปหน้าค้นหาและคัดสินค้า (Product Radar)
      </Link>

      <DataFreshnessBadge lastUpdatedAt={product.lastUpdatedAt} />

      <div className="flex flex-col gap-5 sm:flex-row">
        <Image
          src={product.productImage}
          alt={product.productName}
          width={480}
          height={600}
          className="aspect-[4/5] h-auto w-full max-w-72 shrink-0 rounded-2xl border border-border object-cover"
        />
        <div className="flex flex-1 flex-col gap-3">
          <Badge variant="outline" className="w-fit border-border text-xs text-muted-foreground">
            {product.category}
          </Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{product.productName}</h1>
          <p className="text-sm text-muted-foreground">ร้านค้า: {product.shopName}</p>

          <div className="flex flex-wrap items-baseline gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">ราคา</span>
              <span className="text-2xl font-extrabold text-foreground">{formatBaht(product.price)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">ค่าคอมมิชชัน</span>
              <span className="text-2xl font-extrabold text-brand-gold-hover">
                {formatPercent(product.commissionRate)}
              </span>
            </div>
          </div>

          <RankBadges product={product} />

          <div className="flex flex-wrap gap-2 pt-1">
            <SaveProductButton isSaved={saved} onToggle={() => toggleSave(product.id)} size="default" />
            <Button
              variant="outline"
              className="gap-1.5 rounded-full"
              render={<a href={product.productUrl} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            >
              เปิดลิงก์สินค้า
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBlock label="ยอดขาย 7 วัน" value={`${formatNumber(product.sales7d)} ชิ้น`} />
        <StatBlock label="ยอดขาย 30 วัน" value={`${formatNumber(product.sales30d)} ชิ้น`} />
        <StatBlock label="รายได้โดยประมาณ" value={formatBaht(product.estimatedRevenue)} />
        <StatBlock
          label="อัตราการเติบโต"
          value={formatPercent(product.growthRate, true)}
          valueClassName={growthColorClass(product.growthRate)}
        />
        <StatBlock label="คะแนนความน่าสนใจ" value={`${product.interestScore} คะแนน`} />
      </div>

      <div className="rounded-2xl border border-border p-5">
        <h2 className="mb-2 text-base font-bold text-foreground">เปรียบเทียบยอดขาย 7 วัน และ 30 วัน</h2>
        <ProductSalesChart product={product} />
      </div>

      <ProductInsightsCard insights={insights} />

      <PersonalNoteCard initialNote={currentNote} onSave={handleSaveNote} />
    </div>
  );
}

function StatBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-extrabold text-foreground ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}
