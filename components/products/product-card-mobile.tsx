import Link from "next/link";
import Image from "next/image";
import type { Product, TimeRange } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankBadges } from "@/components/shared/rank-badges";
import { SaveProductButton } from "@/components/shared/save-product-button";
import {
  formatBaht,
  formatNumber,
  formatPercent,
  formatThaiDate,
  growthColorClass,
} from "@/lib/utils/format";

interface ProductCardMobileProps {
  product: Product;
  timeRange: TimeRange;
  isSaved: boolean;
  onToggleSave: () => void;
}

/** การ์ดสินค้าสำหรับมือถือ ใช้แทนตารางบนหน้าจอขนาดเล็กของ Product Radar */
export function ProductCardMobile({ product, timeRange, isSaved, onToggleSave }: ProductCardMobileProps) {
  const sales = timeRange === "7d" ? product.sales7d : product.sales30d;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Image
          src={product.productImage}
          alt={product.productName}
          width={80}
          height={80}
          className="size-20 shrink-0 rounded-xl border border-border object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Badge variant="outline" className="w-fit border-border text-[11px] text-muted-foreground">
            {product.category}
          </Badge>
          <Link href={`/products/${product.id}`} className="text-sm font-semibold text-foreground">
            {product.productName}
          </Link>
          <span className="text-xs text-muted-foreground">{product.shopName}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-brand-cream/60 p-3 text-center">
        <Metric label="ราคา" value={formatBaht(product.price)} />
        <Metric label="ค่าคอมมิชชัน" value={formatPercent(product.commissionRate)} valueClassName="text-brand-gold-hover" />
        <Metric label={`ยอดขาย ${timeRange === "7d" ? "7 วัน" : "30 วัน"}`} value={`${formatNumber(sales)} ชิ้น`} />
        <Metric label="รายได้โดยประมาณ" value={formatBaht(product.estimatedRevenue)} />
        <Metric
          label="อัตราการเติบโต"
          value={formatPercent(product.growthRate, true)}
          valueClassName={growthColorClass(product.growthRate)}
        />
        <Metric label="คะแนนความน่าสนใจ" value={`${product.interestScore}`} />
      </div>

      <RankBadges product={product} />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>อัปเดตล่าสุด: {formatThaiDate(product.lastUpdatedAt)}</span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 rounded-full" render={<Link href={`/products/${product.id}`} />} nativeButton={false}>
          ดูรายละเอียด
        </Button>
        <SaveProductButton isSaved={isSaved} onToggle={onToggleSave} className="flex-1" />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold text-foreground ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}
