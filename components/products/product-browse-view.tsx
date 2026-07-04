"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Product, TimeRange } from "@/types/product";
import { badgeFor, metricsFor } from "@/lib/analytics/period-metrics";
import { formatThaiDateTime } from "@/lib/utils/format";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { ProductCard } from "@/components/shared/product-card";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** ตัวเลือกเรียงข้อมูล — เฉพาะข้อมูลที่ Feed/ระบบมีจริง */
export type BrowseSortKey = "sales" | "commission" | "trend" | "new" | "cumulative";

const SORT_OPTIONS: { value: BrowseSortKey; label: string }[] = [
  { value: "trend", label: "ความมาแรง" },
  { value: "sales", label: "ยอดขายในช่วงที่เลือก" },
  { value: "commission", label: "ค่าคอมมิชชันสูงสุด" },
  { value: "new", label: "สินค้าใหม่ล่าสุด" },
  { value: "cumulative", label: "ยอดขายสะสมจาก Shopee" },
];

type ChipKey = "all" | "urgent" | "has_commission" | "new" | "saved";

const CHIP_LABELS: Record<ChipKey, string> = {
  all: "ทั้งหมด",
  urgent: "ควรรีบทำคอนเทนต์",
  has_commission: "มีค่าคอมจริง",
  new: "สินค้าใหม่",
  saved: "บันทึกไว้",
};

interface ProductBrowseViewProps {
  products: Product[];
  lastUpdatedAt: string;
  initialSort?: string;
  initialRange?: string;
}

export function ProductBrowseView({
  products,
  lastUpdatedAt,
  initialSort,
  initialRange,
}: ProductBrowseViewProps) {
  const [range, setRange] = useState<TimeRange>(initialRange === "30d" ? "30d" : "7d");
  const [sortBy, setSortBy] = useState<BrowseSortKey>(
    SORT_OPTIONS.some((o) => o.value === initialSort) ? (initialSort as BrowseSortKey) : "trend",
  );
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<ChipKey>("all");
  const { isSaved } = useSavedProducts();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => !q || p.productName.toLowerCase().includes(q));

    switch (chip) {
      case "urgent":
        list = list.filter((p) => badgeFor(p.analytics, range) !== null);
        break;
      case "has_commission":
        list = list.filter((p) => p.commissionRate > 0 && !p.commissionStatus);
        break;
      case "new":
        list = list.filter((p) => p.analytics?.isNew);
        break;
      case "saved":
        list = list.filter((p) => isSaved(p.id));
        break;
    }

    const m = (p: Product) => metricsFor(p.analytics, range);
    switch (sortBy) {
      case "sales":
        // มีข้อมูลช่วงเวลา → มาก่อนเสมอ, ที่เหลือเรียงยอดสะสม
        return [...list].sort((a, b) => {
          const ra = m(a)?.revenue;
          const rb = m(b)?.revenue;
          if (ra !== undefined && rb !== undefined) return rb - ra;
          if (ra !== undefined) return -1;
          if (rb !== undefined) return 1;
          return (b.itemSold ?? 0) - (a.itemSold ?? 0);
        });
      case "commission":
        return [...list].sort((a, b) => b.commissionRate - a.commissionRate);
      case "trend":
        return [...list].sort((a, b) => {
          const ta = m(a)?.trendRank ?? Infinity;
          const tb = m(b)?.trendRank ?? Infinity;
          if (ta !== tb) return ta - tb;
          return (b.itemSold ?? 0) - (a.itemSold ?? 0);
        });
      case "new":
        return [...list].sort((a, b) => (b.firstSeenAt ?? "").localeCompare(a.firstSeenAt ?? ""));
      case "cumulative":
      default:
        return [...list].sort((a, b) => (b.itemSold ?? 0) - (a.itemSold ?? 0));
    }
  }, [products, query, chip, sortBy, range, isSaved]);


  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">เลือกดูสินค้า</h1>
        <p className="text-sm text-muted-foreground">
          เสื้อผ้าแฟชั่นผู้หญิงจาก Shopee Thailand ทั้งหมดที่ระบบติดตาม — ข้อมูลล่าสุด{" "}
          {formatThaiDateTime(lastUpdatedAt)}
        </p>
      </div>

      {/* แถวควบคุม: ค้นหา + ช่วงเวลา + เรียง */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า…"
            className="rounded-full pl-10"
            aria-label="ค้นหาชื่อสินค้า"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeToggle value={range} onChange={setRange} />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as BrowseSortKey)}>
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="เรียงข้อมูล">
                {(v: BrowseSortKey) =>
                  `เรียงตาม: ${SORT_OPTIONS.find((o) => o.value === v)?.label ?? ""}`
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chips ตัวกรองด่วน */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(CHIP_LABELS) as ChipKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setChip(key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              chip === key
                ? "border-transparent bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-brand-cream hover:text-foreground"
            }`}
          >
            {CHIP_LABELS[key]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          พบ {visible.length.toLocaleString("th-TH")} รายการ
        </span>
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} range={range} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-brand-cream/40 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-muted-foreground">
            ลองล้างคำค้นหา เปลี่ยนตัวกรอง หรือรอรอบซิงก์ข้อมูลถัดไป
          </p>
        </div>
      )}
    </div>
  );
}
