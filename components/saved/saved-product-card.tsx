import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import type { Product, SavedProduct } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBaht, formatNumber, formatPercent, formatThaiDate } from "@/lib/utils/format";

interface SavedProductCardProps {
  product: Product;
  savedEntry: SavedProduct;
  onRemove: () => void;
}

/** การ์ดสินค้าที่บันทึกไว้ แสดงโน้ตส่วนตัวและวันที่บันทึก พร้อมปุ่มเปิดดูรายละเอียด/ลบออกจากรายการ */
export function SavedProductCard({ product, savedEntry, onRemove }: SavedProductCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row">
      <Image
        src={product.productImage}
        alt={product.productName}
        width={80}
        height={80}
        className="size-20 shrink-0 self-start rounded-xl border border-border object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Badge variant="outline" className="w-fit border-border text-[11px] text-muted-foreground">
          {product.category}
        </Badge>
        <Link href={`/products/${product.id}`} className="text-sm font-semibold text-foreground">
          {product.productName}
        </Link>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            ค่าคอมมิชชัน: <span className="font-bold text-brand-gold-hover">{formatPercent(product.commissionRate)}</span>
          </span>
          <span>
            ยอดขาย 30 วัน: <span className="font-bold text-foreground">{formatNumber(product.sales30d)} ชิ้น</span>
          </span>
          <span>
            รายได้โดยประมาณ: <span className="font-bold text-foreground">{formatBaht(product.estimatedRevenue)}</span>
          </span>
        </div>
        {savedEntry.personalNote ? (
          <p className="rounded-lg bg-brand-cream/70 px-3 py-2 text-xs text-foreground">
            โน้ต: {savedEntry.personalNote}
          </p>
        ) : null}
        <span className="text-[11px] text-muted-foreground">
          บันทึกไว้เมื่อ {formatThaiDate(savedEntry.savedAt)}
        </span>
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <Button variant="outline" size="sm" className="flex-1 rounded-full" render={<Link href={`/products/${product.id}`} />} nativeButton={false}>
          ดูรายละเอียด
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 rounded-full text-negative hover:bg-negative/10"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
          ลบออกจากรายการ
        </Button>
      </div>
    </div>
  );
}
