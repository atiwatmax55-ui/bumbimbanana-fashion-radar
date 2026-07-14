"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Product, TimeRange } from "@/types/product";
import { badgeFor, metricsFor } from "@/lib/analytics/period-metrics";
import { formatThaiDateTime } from "@/lib/utils/format";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { ProductCard } from "@/components/shared/product-card";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import {
  PlatformSwitch,
  filterByPlatform,
  type PlatformKey,
} from "@/components/shared/platform-switch";
import {
  CategoryMenu,
  filterByCategory,
  type CategoryKey,
} from "@/components/shared/category-menu";
import {
  ColorSwatchFilter,
  filterByColor,
  type ColorKey,
} from "@/components/shared/color-swatch-filter";
import {
  StyleTagFilter,
  filterByStyleTag,
  type StyleTagKey,
} from "@/components/shared/style-tag-filter";
import {
  PriceRangeFilter,
  filterByPriceRange,
  PRICE_RANGE_ALL,
  type PriceRange,
} from "@/components/shared/price-range-filter";
import { ShopSearchFilter, filterByShop } from "@/components/shared/shop-search-filter";
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

type ChipKey = "all" | "urgent" | "has_commission" | "new" | "saved" | "content_worthy";

const CHIP_LABELS: Record<ChipKey, string> = {
  all: "ทั้งหมด",
  urgent: "ควรรีบทำคอนเทนต์",
  has_commission: "มีค่าคอมจริง",
  new: "สินค้าใหม่",
  saved: "บันทึกไว้",
  content_worthy: "ของสวยถ่ายลง",
};

/** เกณฑ์ "ของสวยถ่ายลง": คะแนน AI vision ≥70 + ใส่ได้จริง + (สินค้าใหม่ หรือ ติดป้ายมาแรง) */
const CONTENT_WORTHY_SCORE_MIN = 70;

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
  const [platform, setPlatform] = useState<PlatformKey>("all");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [showAll, setShowAll] = useState(false);
  const [color, setColor] = useState<ColorKey>("all");
  const [styleTag, setStyleTag] = useState<StyleTagKey>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>(PRICE_RANGE_ALL);
  const [shopQuery, setShopQuery] = useState("");
  const { isSaved } = useSavedProducts();

  const platformFiltered = useMemo(
    () => filterByPlatform(products, platform),
    [products, platform],
  );

  const hiddenCount = useMemo(
    () => platformFiltered.filter((p) => p.isOutfitItem === false).length,
    [platformFiltered],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = filterByCategory(platformFiltered, category)
      // ตัวกรอง "ใส่ได้จริง" — ซ่อนเครื่องประดับ/ของแต่งบ้านที่หลุดผ่าน category filter มา
      // เป็น default เท่านั้น กด "แสดงทั้งหมด" เพื่อดูของที่ถูกซ่อนได้
      .filter((p) => showAll || p.isOutfitItem !== false)
      .filter((p) => !q || p.productName.toLowerCase().includes(q));
    list = filterByColor(list, color);
    list = filterByStyleTag(list, styleTag);
    list = filterByPriceRange(list, priceRange);
    list = filterByShop(list, shopQuery);

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
      case "content_worthy":
        list = list.filter(
          (p) =>
            (p.contentWorthyScore ?? 0) >= CONTENT_WORTHY_SCORE_MIN &&
            p.isOutfitItem !== false &&
            (p.analytics?.isNew || badgeFor(p.analytics, range) !== null),
        );
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
          // ยังไม่มีข้อมูล 7 วันจริงทั้งคู่ — ใช้ velocity (ยอดสะสม ÷ วันที่ระบบรู้จัก) แทนยอดสะสมดิบ
          // กันสินค้าเก่าที่ยอดสะสมสูงแต่ขายช้าลงแล้ว ครอบงำอันดับ "มาแรง"
          const va = a.analytics?.velocityEstimate?.value ?? 0;
          const vb = b.analytics?.velocityEstimate?.value ?? 0;
          return vb - va;
        });
      case "new":
        return [...list].sort((a, b) => (b.firstSeenAt ?? "").localeCompare(a.firstSeenAt ?? ""));
      case "cumulative":
      default:
        return [...list].sort((a, b) => (b.itemSold ?? 0) - (a.itemSold ?? 0));
    }
  }, [
    platformFiltered, query, chip, sortBy, range, isSaved, category, showAll,
    color, styleTag, priceRange, shopQuery,
  ]);


  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-3 border-b border-border pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
          Live Product Intelligence
        </p>
        <h1 className="font-display text-4xl leading-none text-foreground sm:text-6xl">
          Hot Product Radar
        </h1>
        <p className="text-sm text-muted-foreground">
          สินค้าที่มีสัญญาณขายดี ค่าคอมสูง และเหมาะกับการทำคอนเทนต์ — เสื้อผ้าแฟชั่นผู้หญิงจาก
          Shopee Thailand ที่ระบบติดตาม • ข้อมูลล่าสุด {formatThaiDateTime(lastUpdatedAt)}
        </p>
        <PlatformSwitch value={platform} onChange={setPlatform} className="w-fit" />
      </div>

      <CategoryMenu products={platformFiltered} value={category} onChange={setCategory} />

      {/* แถบกรองเพิ่มเติม: สี, สไตล์, ราคา, ร้านค้า (สี/สไตล์ซ่อนเองถ้ายังไม่มีข้อมูล) */}
      <div className="flex flex-col gap-2.5 border-b border-border pb-4 lg:flex-row lg:flex-wrap lg:items-center">
        <ColorSwatchFilter products={platformFiltered} value={color} onChange={setColor} />
        <StyleTagFilter products={platformFiltered} value={styleTag} onChange={setStyleTag} />
        <PriceRangeFilter value={priceRange} onChange={setPriceRange} />
        <ShopSearchFilter value={shopQuery} onChange={setShopQuery} className="w-full lg:w-56" />
      </div>

      {/* แถวควบคุม: ค้นหา + ช่วงเวลา + เรียง */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า…"
            className="rounded-none pl-10"
            aria-label="ค้นหาชื่อสินค้า"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeToggle value={range} onChange={setRange} />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as BrowseSortKey)}>
            <SelectTrigger className="rounded-none">
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
            className={`border px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors ${
              chip === key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {CHIP_LABELS[key]}
          </button>
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className={`border px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors ${
              showAll
                ? "border-foreground bg-foreground text-background"
                : "border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            title="เครื่องประดับ/ของแต่งบ้านที่หลุดผ่านตัวกรองหมวดหมู่ — ปกติซ่อนไว้"
          >
            {showAll ? "ซ่อนของที่ไม่ใช่เสื้อผ้า" : `แสดงทั้งหมด (+${hiddenCount})`}
          </button>
        ) : null}
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
        <div className="flex flex-col items-center gap-2 border border-dashed border-border bg-secondary px-6 py-16 text-center">
          <p className="font-display text-lg text-foreground">
            {platform === "tiktok" ? "ไม่พบสินค้า TikTok ที่ตรงกับเงื่อนไข" : "ไม่พบสินค้าที่ตรงกับเงื่อนไข"}
          </p>
          <p className="text-xs text-muted-foreground">
            {platform === "tiktok"
              ? "ลองล้างคำค้นหาหรือตัวกรอง หรือนำเข้าสินค้าเพิ่มที่หน้า “นำเข้าสินค้า TikTok”"
              : "ลองล้างคำค้นหา เปลี่ยนตัวกรอง หรือรอรอบซิงก์ข้อมูลถัดไป"}
          </p>
        </div>
      )}
    </div>
  );
}
