"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, ShoppingBag } from "lucide-react";
import type { Product } from "@/types/product";
import type { CommissionSnapshot } from "@/lib/commission/types";
import { getProductInsights } from "@/lib/insights/product-insights";
import { computeOpportunityScore } from "@/lib/insights/opportunity-score";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { DataFreshnessBadge } from "@/components/shared/data-freshness-badge";
import { RankBadges } from "@/components/shared/rank-badges";
import { SaveProductButton } from "@/components/shared/save-product-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductSalesChart } from "@/components/product-detail/product-sales-chart";
import { ProductInsightsCard } from "@/components/product-detail/product-insights-card";
import { PersonalNoteCard } from "@/components/product-detail/personal-note-card";
import { CommissionCard } from "@/components/product-detail/commission-card";
import { OpportunityScoreCard } from "@/components/product-detail/opportunity-score-card";
import { WorkflowButton } from "@/components/product-detail/workflow-button";
import { ProductBriefCard } from "@/components/product-detail/product-brief-card";
import {
  commissionColorClass,
  displayCommission,
  formatBaht,
  formatNumber,
  formatPercent,
  growthColorClass,
} from "@/lib/utils/format";

interface ProductDetailViewProps {
  product:     Product;
  commission:  CommissionSnapshot | null;
  allProducts: Product[];
}

export function ProductDetailView({ product, commission, allProducts }: ProductDetailViewProps) {
  const { isSaved, toggleSave, save, updateNote, savedProducts } = useSavedProducts();
  const insights = getProductInsights(product);
  const opportunityResult = computeOpportunityScore(product, allProducts);
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

      <DataFreshnessBadge lastUpdatedAt={product.lastUpdatedAt} source={product.source ?? "mock"} />

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
              <span className="text-xs text-muted-foreground">
                ราคา{product.source === "shopee" ? " (อ้างอิงจาก Shopee Feed)" : ""}
              </span>
              <span className="text-2xl font-extrabold text-foreground">{formatBaht(product.price)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">ค่าคอมมิชชัน (Affiliate)</span>
              <span className={`text-2xl font-extrabold ${commissionColorClass(product)}`}>
                {displayCommission(product)}
              </span>
              {product.source === "shopee" && !(!product.commissionStatus && product.commissionRate > 0) ? (
                <span className="text-[11px] text-muted-foreground/70">
                  ต้องนำเข้าจากรายงาน Shopee Affiliate โดยตรง
                </span>
              ) : null}
            </div>
          </div>

          <RankBadges product={product} />

          <div className="flex flex-wrap gap-2 pt-1">
            <SaveProductButton isSaved={saved} onToggle={() => toggleSave(product.id)} size="default" />
            <ShopeeOrGenericLinkButton productUrl={product.productUrl} source={product.source} />
            {product.source === "shopee" ? (
              <WorkflowButton
                productId={product.id}
                initialStatus={product.workflowStatus}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBlock
          label={product.source === "shopee" ? "จำนวนขายสะสม (Feed)" : "ยอดขาย 7 วัน"}
          value={`${formatNumber(product.sales30d)} ชิ้น`}
        />
        {product.source !== "shopee" ? (
          <StatBlock label="ยอดขาย 30 วัน" value={`${formatNumber(product.sales30d)} ชิ้น`} />
        ) : null}
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

      <CommissionCard snapshot={commission} productPrice={product.price} />

      <OpportunityScoreCard result={opportunityResult} />

      <ProductInsightsCard insights={insights} />

      <ProductBriefCard product={product} commission={commission} />

      <PersonalNoteCard initialNote={currentNote} onSave={handleSaveNote} />
    </div>
  );
}

function isValidShopeeUrl(url: string): boolean {
  if (!url || url === "#") return false;
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (hostname === "shopee.co.th" ||
        hostname.endsWith(".shopee.co.th") ||
        hostname === "shopee.com" ||
        hostname.endsWith(".shopee.com"))
    );
  } catch {
    return false;
  }
}

function ShopeeOrGenericLinkButton({
  productUrl,
  source,
}: {
  productUrl: string;
  source?: string;
}) {
  if (source === "shopee") {
    const valid = isValidShopeeUrl(productUrl);
    return valid ? (
      <Button
        className="gap-1.5 rounded-full bg-[#EE4D2D] text-white hover:bg-[#d94426]"
        render={<a href={productUrl} target="_blank" rel="noopener noreferrer" />}
        nativeButton={false}
      >
        <ShoppingBag className="size-3.5" />
        ดูสินค้าบน Shopee
        <ExternalLink className="size-3.5" />
      </Button>
    ) : (
      <Button variant="outline" className="gap-1.5 rounded-full opacity-50" disabled>
        <ShoppingBag className="size-3.5" />
        ยังไม่มีลิงก์สินค้าจาก Shopee Product Feed
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      className="gap-1.5 rounded-full"
      render={<a href={productUrl} target="_blank" rel="noopener noreferrer" />}
      nativeButton={false}
    >
      เปิดลิงก์สินค้า
      <ExternalLink className="size-3.5" />
    </Button>
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
