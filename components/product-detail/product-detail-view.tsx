"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Copy, ExternalLink, Flame, ShoppingBag } from "lucide-react";
import type { Product, TimeRange } from "@/types/product";
import type { CommissionSnapshot } from "@/lib/commission/types";
import type { HistoryPoint } from "@/lib/analytics/product-history";
import { badgeFor, metricsFor } from "@/lib/analytics/period-metrics";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { DataFreshnessBadge } from "@/components/shared/data-freshness-badge";
import { SaveProductButton } from "@/components/shared/save-product-button";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import { RadarScore } from "@/components/shared/radar-score";
import { Button } from "@/components/ui/button";
import { PersonalNoteCard } from "@/components/product-detail/personal-note-card";
import { CommissionCard } from "@/components/product-detail/commission-card";
import { WorkflowButton } from "@/components/product-detail/workflow-button";
import { ProductBriefCard } from "@/components/product-detail/product-brief-card";
import { SalesHistoryChart } from "@/components/product-detail/sales-history-chart";
import { ContentGeneratorCard } from "@/components/product-detail/content-generator-card";
import {
  commissionColorClass,
  displayCommission,
  formatBaht,
  formatNumber,
  formatPercent,
  formatThaiDate,
} from "@/lib/utils/format";

interface ProductDetailViewProps {
  product:     Product;
  commission:  CommissionSnapshot | null;
  /** ประวัติ Snapshot รายวันสำหรับกราฟ — [] เมื่อยังไม่มีข้อมูล */
  history?:    HistoryPoint[];
}

export function ProductDetailView({ product, commission, history = [] }: ProductDetailViewProps) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { isSaved, toggleSave, save, updateNote, savedProducts } = useSavedProducts();
  const saved = isSaved(product.id);
  const currentNote = savedProducts.find((s) => s.productId === product.id)?.personalNote ?? "";

  const metrics = metricsFor(product.analytics, range);
  const badge = badgeFor(product.analytics, range);
  const rangeLabel = range === "7d" ? "7 วัน" : "30 วัน";
  const hasCommission = product.commissionRate > 0 && !product.commissionStatus;

  function handleSaveNote(note: string) {
    if (saved) updateNote(product.id, note);
    else save(product.id, note);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <Link href="/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        กลับไปหน้าเลือกดูสินค้า
      </Link>

      <DataFreshnessBadge lastUpdatedAt={product.lastUpdatedAt} source={product.source ?? "mock"} />

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative w-full max-w-80 shrink-0">
          <Image
            src={product.productImage}
            alt={product.productName}
            width={480}
            height={640}
            className="aspect-[3/4] h-auto w-full rounded-3xl border border-border object-cover"
          />
          {badge ? (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background shadow-md">
              <Flame className="size-3.5 text-brand-gold" />
              ควรรีบทำคอนเทนต์
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            {badge ? (
              <span className="w-fit rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-xs font-semibold text-brand-gold-hover">
                {badge.reason}
              </span>
            ) : null}
            <h1 className="font-display break-words text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
              {product.productName}
            </h1>
            <p className="break-words text-sm text-muted-foreground">
              ร้านค้า: {product.shopName}
              {product.analytics?.isNew && product.firstSeenAt ? (
                <span> • สินค้าใหม่ (พบครั้งแรก {formatThaiDate(product.firstSeenAt)})</span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">ราคา (อ้างอิงจาก Shopee Feed)</span>
              <span className="text-3xl font-extrabold text-foreground">{formatBaht(product.price)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">ค่าคอมมิชชัน (Affiliate)</span>
              <span className={`text-2xl font-extrabold ${commissionColorClass(product)}`}>
                {displayCommission(product)}
              </span>
              {!hasCommission && product.source === "shopee" ? (
                <span className="text-[11px] text-muted-foreground/70">
                  ต้องนำเข้าจากรายงาน Shopee Affiliate โดยตรง
                </span>
              ) : null}
            </div>
          </div>

          {/* ─── อันดับ 3 ประเภท ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-brand-cream/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">อันดับในช่วง {rangeLabel}</span>
              <TimeRangeToggle value={range} onChange={setRange} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <RankBlock label="อันดับยอดขาย" rank={metrics?.salesRank ?? null} />
              <RankBlock label="อันดับมาแรง" rank={metrics?.trendRank ?? null} />
              <RankBlock
                label="อันดับค่าคอม"
                rank={product.commissionRank > 0 ? product.commissionRank : null}
                missingText="ไม่มีข้อมูลค่าคอม"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              อันดับจากข้อมูล Shopee ที่ระบบติดตาม (เฉพาะเสื้อผ้าแฟชั่นผู้หญิงในระบบ) —
              Shopee Feed ไม่ได้ส่งอันดับทางการมาให้
            </p>
          </div>

          {/* ─── ปุ่ม action ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <SaveProductButton isSaved={saved} onToggle={() => toggleSave(product.id)} size="default" className="w-full sm:w-auto" />
            <ShopeeLinkButton productUrl={product.productUrl} />
            <CopyLinkButton productUrl={product.productUrl} />
            {product.source === "shopee" ? (
              <WorkflowButton
                productId={product.id}
                initialStatus={product.workflowStatus}
                className="w-full sm:w-auto"
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* ─── ตัวเลขช่วงเวลา ─────────────────────────────────────────────────── */}
      {metrics ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label={`ยอดขาย ${rangeLabel} (โดยประมาณ)`} value={formatBaht(metrics.revenue)} />
          <StatBlock label={`จำนวนชิ้นที่ขาย ${rangeLabel}`} value={`${formatNumber(metrics.units)} ชิ้น`} />
          <StatBlock
            label={`อัตราโตเทียบ ${rangeLabel} ก่อนหน้า`}
            value={metrics.growthPct !== null ? formatPercent(metrics.growthPct, true) : "ข้อมูลไม่พอ"}
            valueClassName={
              metrics.growthPct === null
                ? "text-muted-foreground text-base"
                : metrics.growthPct >= 0
                  ? "text-positive"
                  : "text-negative"
            }
          />
          <StatBlock
            label="RADAR SCORE (คะแนนความมาแรง)"
            value={metrics.trendScore !== null ? `${metrics.trendScore} / 100` : "ข้อมูลไม่พอ"}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-brand-cream/40 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-foreground">กำลังเก็บข้อมูลเพื่อวิเคราะห์ช่วง {rangeLabel}</p>
          <p className="max-w-md text-xs text-muted-foreground">
            ระบบต้องมี Snapshot ยอดขายย้อนหลังครบ {rangeLabel} ก่อนจึงแสดงยอดขายและอัตราโตของช่วงนี้ได้จริง
          </p>
        </div>
      )}

      {metrics && metrics.trendScore !== null ? (
        <RadarScore metrics={metrics} rangeLabel={rangeLabel} />
      ) : null}

      {product.source === "shopee" ? <SalesHistoryChart history={history} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <StatBlock
          label="ยอดขายสะสมตลอดอายุสินค้า (จาก Shopee)"
          value={`${formatNumber(product.itemSold ?? 0)} ชิ้น`}
        />
        <StatBlock
          label="ระบบพบสินค้าครั้งแรก"
          value={product.firstSeenAt ? formatThaiDate(product.firstSeenAt) : "—"}
        />
      </div>

      <CommissionCard snapshot={commission} productPrice={product.price} />

      <ProductBriefCard product={product} commission={commission} />

      <ContentGeneratorCard product={product} />

      <PersonalNoteCard initialNote={currentNote} onSave={handleSaveNote} />
    </div>
  );
}

// ─── ส่วนย่อย ────────────────────────────────────────────────────────────────

function RankBlock({
  label,
  rank,
  missingText = "กำลังเก็บข้อมูล",
}: {
  label: string;
  rank: number | null;
  missingText?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-background p-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {rank !== null ? (
        <span className="font-display text-xl font-semibold text-foreground">#{rank}</span>
      ) : (
        <span className="text-xs text-muted-foreground/80">{missingText}</span>
      )}
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

function ShopeeLinkButton({ productUrl }: { productUrl: string }) {
  if (!isValidShopeeUrl(productUrl)) {
    return (
      <Button variant="outline" className="w-full gap-1.5 rounded-full opacity-50 sm:w-auto" disabled>
        <ShoppingBag className="size-3.5" />
        ยังไม่มีลิงก์สินค้าจาก Shopee Feed
      </Button>
    );
  }
  return (
    <Button
      className="w-full gap-1.5 rounded-full bg-[#EE4D2D] text-white hover:bg-[#d94426] sm:w-auto"
      render={<a href={productUrl} target="_blank" rel="noopener noreferrer" />}
      nativeButton={false}
    >
      <ShoppingBag className="size-3.5" />
      เปิดหน้าสินค้าบน Shopee
      <ExternalLink className="size-3.5" />
    </Button>
  );
}

/**
 * คัดลอกลิงก์หน้าสินค้า (จาก Feed) — Feed ไม่ส่งลิงก์ Affiliate ส่วนตัวมาให้
 * จึงระบุตรงไปตรงมาว่าเป็น "ลิงก์สินค้า" สำหรับนำไปสร้างลิงก์ Affiliate เองใน Shopee
 */
function CopyLinkButton({ productUrl }: { productUrl: string }) {
  const [copied, setCopied] = useState(false);
  if (!isValidShopeeUrl(productUrl)) return null;

  function handleCopy() {
    navigator.clipboard.writeText(productUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button variant="outline" className="w-full gap-1.5 rounded-full sm:w-auto" onClick={handleCopy}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "คัดลอกแล้ว!" : "คัดลอกลิงก์สินค้า"}
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
