import Link from "next/link";
import Image from "next/image";
import type { Product, TimeRange } from "@/types/product";
import { badgeFor, metricsFor } from "@/lib/analytics/period-metrics";
import { formatBaht, formatNumber, formatPercent } from "@/lib/utils/format";

interface ProductCardProps {
  product: Product;
  range: TimeRange;
  /** ตัวเลขอันดับที่แสดงมุมการ์ด (เช่น 1–20) — ไม่แสดงถ้าไม่ระบุ */
  rankNumber?: number;
}

/**
 * การ์ดสินค้าแนว Sport-Luxury Editorial — คม โปร่ง แสดงเฉพาะข้อมูลที่มีจริง
 * Badge ทุกใบผูกกับสัญญาณจริง: HOT = ป้ายควรรีบทำคอนเทนต์, RISING = โต ≥20%,
 * NEW DROP = พบครั้งแรกใน 7 วัน, HIGH COMMISSION = มีค่าคอมจริง ≥ 10%
 * ห้ามแสดงชื่อหมวดสินค้าบนการ์ดตามกติกาเว็บ
 */
export function ProductCard({ product, range, rankNumber }: ProductCardProps) {
  const metrics = metricsFor(product.analytics, range);
  const badge = badgeFor(product.analytics, range);
  const rangeLabel = range === "7d" ? "7 วัน" : "30 วัน";
  const hasCommission = product.commissionRate > 0 && !product.commissionStatus;
  const isRising = metrics?.growthPct !== null && metrics?.growthPct !== undefined && metrics.growthPct >= 20;

  return (
    <Link href={`/products/${product.id}`} className="group flex flex-col gap-3">
      <div className="relative overflow-hidden border border-border bg-secondary">
        <Image
          src={product.productImage}
          alt={product.productName}
          width={480}
          height={600}
          className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Badge แพลตฟอร์ม (จากฟิลด์ source จริง) */}
        <span className="absolute right-0 top-0 bg-foreground px-2.5 py-1 text-[9px] font-bold tracking-[0.18em] text-background">
          {product.source === "shopee" ? "SHOPEE" : "DATA"}
        </span>

        {/* Badge สัญญาณจริง — จำกัดความกว้างไม่ให้ทับ badge แพลตฟอร์มมุมขวา */}
        <div className="absolute left-2.5 top-2.5 flex max-w-[72%] flex-col items-start gap-1 [&>span]:max-w-full [&>span]:truncate">
          {badge ? (
            <>
              <span className="bg-brand-lime px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-foreground shadow-sm">
                HOT — ควรรีบทำคอนเทนต์
              </span>
              <span className="bg-background/95 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
                {badge.reason}
              </span>
            </>
          ) : isRising ? (
            <span className="bg-foreground px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-brand-lime">
              RISING — โต {formatPercent(metrics!.growthPct!, true)}
            </span>
          ) : null}
          {product.analytics?.isNew ? (
            <span className="border border-foreground/20 bg-background/95 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-foreground backdrop-blur">
              NEW DROP — สินค้าใหม่
            </span>
          ) : null}
          {hasCommission && product.commissionRate >= 10 ? (
            <span className="border border-foreground/20 bg-background/95 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-foreground backdrop-blur">
              HIGH COMMISSION {formatPercent(product.commissionRate)}
            </span>
          ) : null}
        </div>

        {rankNumber !== undefined ? (
          <span className="font-display absolute bottom-2 left-3 text-4xl leading-none text-background drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
            {String(rankNumber).padStart(2, "0")}
          </span>
        ) : null}

        {/* Hover action — desktop */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-full items-center justify-center gap-2 bg-foreground/95 py-2.5 text-[11px] font-bold tracking-[0.12em] text-background transition-transform duration-300 group-hover:translate-y-0 md:flex">
          ดูสินค้า
        </span>
      </div>

      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-[15px]">
          {product.productName}
        </h3>
        <p className="truncate text-[11px] text-muted-foreground">{product.shopName}</p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {product.price > 0 ? (
            <span className="text-sm font-extrabold text-foreground">{formatBaht(product.price)}</span>
          ) : null}
          {hasCommission ? (
            <span className="bg-brand-lime px-1.5 py-0.5 text-[11px] font-bold text-foreground">
              ค่าคอม {formatPercent(product.commissionRate)}
            </span>
          ) : null}
        </div>
        {metrics ? (
          <p className="text-[11px] text-muted-foreground">
            ขาย {formatNumber(metrics.units)} ชิ้นใน {rangeLabel}
            {metrics.growthPct !== null ? (
              <span className={metrics.growthPct >= 0 ? "font-semibold text-positive" : "font-semibold text-negative"}>
                {" "}• {formatPercent(metrics.growthPct, true)}
              </span>
            ) : null}
            {metrics.trendScore !== null ? (
              <span className="text-foreground"> • RADAR {metrics.trendScore}</span>
            ) : null}
          </p>
        ) : product.itemSold !== undefined && product.itemSold > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            ยอดขายสะสม {formatNumber(product.itemSold)} ชิ้น
            <span className="text-muted-foreground/70"> • กำลังเก็บข้อมูลราย {rangeLabel}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
