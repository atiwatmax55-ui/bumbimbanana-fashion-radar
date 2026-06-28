import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/product";
import { formatBaht, formatPercent, growthColorClass } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

interface ProductMiniCardProps {
  product: Product;
  metricLabel: string;
  metricValue: string;
  metricClassName?: string;
}

/** การ์ดสินค้าขนาดย่อ ใช้แสดงสินค้าเด่นบนหน้า Dashboard (สินค้าขายดีที่สุด / กำลังโตเร็ว / รายการตามเป้าหมาย) */
export function ProductMiniCard({
  product,
  metricLabel,
  metricValue,
  metricClassName,
}: ProductMiniCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <Image
        src={product.productImage}
        alt={product.productName}
        width={64}
        height={64}
        className="size-16 shrink-0 rounded-xl border border-border object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Badge variant="outline" className="w-fit border-border text-[10px] text-muted-foreground">
          {product.category}
        </Badge>
        <span className="truncate text-sm font-semibold text-foreground">{product.productName}</span>
        <span className="text-xs text-muted-foreground">{product.shopName}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[11px] text-muted-foreground">{metricLabel}</span>
        <span className={`text-base font-bold ${metricClassName ?? "text-foreground"}`}>
          {metricValue}
        </span>
      </div>
    </Link>
  );
}

export function formatGrowthMetric(value: number) {
  return { value: formatPercent(value, true), className: growthColorClass(value) };
}

export function formatBahtMetric(value: number) {
  return formatBaht(value);
}
