import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Trash2, TrendingUp } from "lucide-react";
import type { Product, SavedProduct } from "@/types/product";
import type { SavedChange } from "@/hooks/use-saved-changes";
import { Button } from "@/components/ui/button";
import { formatBaht, formatNumber, formatPercent, formatThaiDate } from "@/lib/utils/format";

interface SavedProductCardProps {
  product:     Product;
  savedEntry:  SavedProduct;
  onRemove:    () => void;
  /** ความเปลี่ยนแปลงตั้งแต่เปิดหน้านี้ครั้งล่าสุด — undefined = ไม่มีอะไรเปลี่ยน */
  change?:     SavedChange;
}

/** การ์ดสินค้าที่บันทึกไว้ แสดงโน้ตส่วนตัวและวันที่บันทึก พร้อมปุ่มดูรายละเอียด/ลบ */
export function SavedProductCard({ product, savedEntry, onRemove, change }: SavedProductCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {change ? <ChangeHighlights change={change} /> : null}
      <div className="flex gap-3">
        <Image
          src={product.productImage}
          alt={product.productName}
          width={80}
          height={80}
          className="size-16 shrink-0 rounded-xl border border-border object-cover sm:size-20"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-semibold text-foreground">
            {product.productName}
          </Link>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              ราคา: <span className="font-bold text-foreground">{formatBaht(product.price)}</span>
            </span>
            {product.commissionRate > 0 && !product.commissionStatus ? (
              <span>
                ค่าคอม: <span className="font-bold text-brand-gold-hover">{formatPercent(product.commissionRate)}</span>
              </span>
            ) : null}
            <span>
              ยอดขายสะสม: <span className="font-bold text-foreground">{formatNumber(product.itemSold ?? 0)} ชิ้น</span>
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
      </div>

      {/* ปุ่มดูรายละเอียด + ลบ — แถวแนวนอน เต็มความกว้าง */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full"
          render={<Link href={`/products/${product.id}`} />}
          nativeButton={false}
        >
          ดูรายละเอียด
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 rounded-full text-negative hover:bg-negative/10"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
          ลบออก
        </Button>
      </div>
    </div>
  );
}

/** ป้ายความเปลี่ยนแปลงตั้งแต่เปิดหน้าครั้งล่าสุด — แสดงเฉพาะจุดที่เปลี่ยนจริง */
function ChangeHighlights({ change }: { change: SavedChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {change.unitsGained !== undefined ? (
        <span className="flex items-center gap-1 bg-brand-lime px-2 py-0.5 text-[11px] font-bold text-foreground">
          <TrendingUp className="size-3" />
          ขายเพิ่ม +{formatNumber(change.unitsGained)} ชิ้น ตั้งแต่ดูครั้งก่อน
        </span>
      ) : null}
      {change.price ? (
        change.price.now < change.price.before ? (
          <span className="flex items-center gap-1 bg-positive/15 px-2 py-0.5 text-[11px] font-bold text-positive">
            <ArrowDownRight className="size-3" />
            ราคาลด {formatBaht(change.price.before)} → {formatBaht(change.price.now)}
          </span>
        ) : (
          <span className="flex items-center gap-1 bg-negative/10 px-2 py-0.5 text-[11px] font-bold text-negative">
            <ArrowUpRight className="size-3" />
            ราคาขึ้น {formatBaht(change.price.before)} → {formatBaht(change.price.now)}
          </span>
        )
      ) : null}
      {change.commission ? (
        <span
          className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold ${
            change.commission.now >= change.commission.before
              ? "bg-positive/15 text-positive"
              : "bg-negative/10 text-negative"
          }`}
        >
          ค่าคอม {formatPercent(change.commission.before)} → {formatPercent(change.commission.now)}
        </span>
      ) : null}
    </div>
  );
}
