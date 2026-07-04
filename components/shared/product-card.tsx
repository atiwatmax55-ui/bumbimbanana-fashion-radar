import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";
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
 * การ์ดสินค้าแนว Fashion Editorial — โปร่ง เน้นรูปสินค้า แสดงเฉพาะข้อมูลที่มีจริง
 * ห้ามแสดงชื่อหมวดสินค้าบนการ์ดตามกติกาเว็บ
 */
export function ProductCard({ product, range, rankNumber }: ProductCardProps) {
  const metrics = metricsFor(product.analytics, range);
  const badge = badgeFor(product.analytics, range);
  const rangeLabel = range === "7d" ? "7 วัน" : "30 วัน";
  const hasCommission = product.commissionRate > 0 && !product.commissionStatus;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col gap-3"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-brand-cream">
        <Image
          src={product.productImage}
          alt={product.productName}
          width={480}
          height={640}
          className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {badge ? (
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
            <span className="flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background shadow-md">
              <Flame className="size-3 text-brand-gold" />
              ควรรีบทำคอนเทนต์
            </span>
            <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
              {badge.reason}
            </span>
          </div>
        ) : null}
        {product.analytics?.isNew ? (
          <span className="absolute right-2.5 top-2.5 rounded-full border border-border bg-background/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground backdrop-blur">
            สินค้าใหม่
          </span>
        ) : null}
        {rankNumber !== undefined ? (
          <span className="font-display absolute bottom-2.5 left-2.5 text-3xl font-semibold italic leading-none text-background drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
            {rankNumber}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {product.productName}
        </h3>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {product.price > 0 ? (
            <span className="text-sm font-bold text-foreground">{formatBaht(product.price)}</span>
          ) : null}
          {hasCommission ? (
            <span className="text-xs font-semibold text-brand-gold-hover">
              ค่าคอม {formatPercent(product.commissionRate)}
            </span>
          ) : null}
        </div>
        {metrics ? (
          <p className="text-xs text-muted-foreground">
            ขาย {formatNumber(metrics.units)} ชิ้นใน {rangeLabel}
            {metrics.growthPct !== null ? (
              <span className={metrics.growthPct >= 0 ? "text-positive" : "text-negative"}>
                {" "}• {formatPercent(metrics.growthPct, true)}
              </span>
            ) : null}
          </p>
        ) : product.itemSold !== undefined && product.itemSold > 0 ? (
          <p className="text-xs text-muted-foreground">
            ยอดขายสะสม {formatNumber(product.itemSold)} ชิ้น
            <span className="text-muted-foreground/70"> • กำลังเก็บข้อมูลราย {rangeLabel}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
