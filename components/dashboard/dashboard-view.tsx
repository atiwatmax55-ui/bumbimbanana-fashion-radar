"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package, TrendingUp, Wallet, Sparkles, Flame, Rocket } from "lucide-react";
import type { Product, ProductGoal, TimeRange } from "@/types/product";
import {
  getCategoryPeriodComparison,
  getCategoryTotals,
  getDashboardTotals,
  getProductsByGoal,
  getTopCategory,
  GOAL_LABELS,
} from "@/lib/dashboard/aggregate";
import { displayCommission, formatBaht, formatBahtCompact, formatNumber, formatNumberCompact, formatPercent } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/page-header";
import { DataFreshnessBadge } from "@/components/shared/data-freshness-badge";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import { GoalSelector } from "@/components/dashboard/goal-selector";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProductMiniCard } from "@/components/dashboard/product-mini-card";
import { CategorySalesChart } from "@/components/dashboard/category-sales-chart";
import { PeriodComparisonChart } from "@/components/dashboard/period-comparison-chart";
import { Button } from "@/components/ui/button";

interface DashboardViewProps {
  products: Product[];
  lastUpdatedAt: string;
}

export function DashboardView({ products, lastUpdatedAt }: DashboardViewProps) {
  const [goal, setGoal] = useState<ProductGoal>("interest");
  const [range, setRange] = useState<TimeRange>("30d");
  const isShopeeData = products.length > 0 && products.every((p) => p.source === "shopee");

  const totals = useMemo(() => getDashboardTotals(products), [products]);
  const categoryTotals = useMemo(() => getCategoryTotals(products, range), [products, range]);
  const periodComparison = useMemo(() => getCategoryPeriodComparison(products), [products]);
  const topCategory = useMemo(() => getTopCategory(products), [products]);
  const bestSeller = products.find((p) => p.salesRank === 1);
  const fastestGrowing = products.find((p) => p.growthRank === 1);
  const goalRanked = useMemo(
    () => getProductsByGoal(products, goal, range, 5),
    [products, goal, range]
  );

  const rangeLabel = range === "7d" ? "7 วัน" : "30 วัน";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="ภาพรวม (Dashboard)"
        description={
          isShopeeData
            ? "สรุปภาพรวมสินค้าแฟชั่นผู้หญิงจาก Shopee Product Feed (ข้อมูลจริง)"
            : "สรุปภาพรวมสินค้าแฟชั่นผู้หญิงที่มีแนวโน้มขายดีบน TikTok Shop"
        }
      >
        <DataFreshnessBadge lastUpdatedAt={lastUpdatedAt} />
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="จำนวนสินค้าแฟชั่นทั้งหมด" value={formatNumber(totals.totalProducts)} subLabel="รายการในระบบ" icon={Package} />
        <StatCard label="ยอดขายรวม 7 วัน" value={formatNumberCompact(totals.totalSales7d)} subLabel="ชิ้น" icon={TrendingUp} />
        <StatCard label="ยอดขายรวม 30 วัน" value={formatNumberCompact(totals.totalSales30d)} subLabel="ชิ้น" icon={TrendingUp} />
        {isShopeeData ? (
          <StatCard
            label="จำนวนขายสะสมรวม (Feed)"
            value={formatNumberCompact(totals.totalSales30d)}
            subLabel="ชิ้น (ยอดสะสมจาก Shopee Feed)"
            icon={Package}
          />
        ) : (
          <StatCard
            label="ค่าคอมมิชชันรวมโดยประมาณ"
            value={formatBahtCompact(totals.totalEstimatedCommission)}
            subLabel="ประมาณการจาก 30 วัน"
            icon={Wallet}
            valueClassName="text-brand-gold-hover"
          />
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {bestSeller ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Flame className="size-4 text-brand-gold-hover" />
              สินค้าขายดีที่สุด
            </div>
            <ProductMiniCard
              product={bestSeller}
              metricLabel="ยอดขาย 30 วัน"
              metricValue={`${formatNumber(bestSeller.sales30d)} ชิ้น`}
            />
          </div>
        ) : null}
        {fastestGrowing ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Rocket className="size-4 text-brand-gold-hover" />
              สินค้าที่กำลังโตเร็ว
            </div>
            <ProductMiniCard
              product={fastestGrowing}
              metricLabel="อัตราการเติบโต"
              metricValue={formatPercent(fastestGrowing.growthRate, true)}
              metricClassName="text-positive"
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-brand-cream p-5">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-brand-gold-hover" />
          หมวดสินค้าที่น่าสนใจ
        </div>
        <p className="mt-1 text-2xl font-extrabold text-foreground">{topCategory.category}</p>
        <p className="text-sm text-muted-foreground">
          ยอดขายรวม 30 วันสูงสุดในระบบ ที่ {formatNumber(topCategory.value)} ชิ้น
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-foreground">เลือกเป้าหมายเพื่อดูสินค้าที่น่าสนใจ</h2>
          <TimeRangeToggle value={range} onChange={setRange} />
        </div>
        <GoalSelector value={goal} onChange={setGoal} />

        {/* แจ้งเตือนเมื่อเลือกค่าคอมแต่ยังไม่มีข้อมูลจริง */}
        {goal === "commission" && goalRanked.every((p) => !p.commissionRate || p.commissionRate === 0) ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              ยังไม่มีข้อมูลค่าคอมจริงจาก Shopee Affiliate
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              นำเข้าไฟล์รายงานจาก Shopee Affiliate Center เพื่อดูค่าคอมจริงและใช้ตัวกรองนี้ได้อย่างแม่นยำ
            </p>
            <Link
              href="/commission-import"
              className="self-start rounded-full bg-brand-gold px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-brand-gold-hover"
            >
              นำเข้าค่าคอมมิชชัน
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {goalRanked.map((product) => (
              <ProductMiniCard
                key={product.id}
                product={product}
                metricLabel={GOAL_LABELS[goal]}
                metricValue={goalMetricValue(product, goal, range)}
                metricClassName={goal === "growth" ? (product.growthRate >= 0 ? "text-positive" : "text-negative") : "text-brand-gold-hover"}
              />
            ))}
          </div>
        )}
        <Button
          variant="outline"
          className="self-start rounded-full"
          render={<Link href={`/products?goal=${goal}&range=${range}`} />}
          nativeButton={false}
        >
          ดูสินค้าทั้งหมดใน Product Radar (หน้าค้นหาและคัดสินค้า)
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-foreground">ยอดขายตามหมวดสินค้า ({rangeLabel})</h2>
          <CategorySalesChart data={categoryTotals} rangeLabel={rangeLabel} />
        </div>
        <div className="rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-bold text-foreground">เปรียบเทียบยอดขาย 7 วัน และ 30 วัน</h2>
          <PeriodComparisonChart data={periodComparison} />
        </div>
      </section>
    </div>
  );
}

function goalMetricValue(product: Product, goal: ProductGoal, range: TimeRange): string {
  switch (goal) {
    case "commission":
      return displayCommission(product);
    case "sales":
      return `${formatNumber(range === "7d" ? product.sales7d : product.sales30d)} ชิ้น`;
    case "revenue":
      return formatBaht(product.estimatedRevenue);
    case "growth":
      return formatPercent(product.growthRate, true);
    case "interest":
      return `${product.interestScore} คะแนน`;
    default:
      return "";
  }
}
