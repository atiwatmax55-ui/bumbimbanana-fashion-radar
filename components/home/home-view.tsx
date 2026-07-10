"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Flame,
  Hourglass,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Product, TimeRange } from "@/types/product";
import {
  bestSellers,
  newProducts,
  topCommission,
  trackingSince,
  trendingProducts,
  urgentProducts,
} from "@/lib/analytics/select-products";
import { metricsFor } from "@/lib/analytics/period-metrics";
import { opportunityProducts } from "@/lib/analytics/opportunity-score";
import { formatThaiDate, formatThaiDateTime } from "@/lib/utils/format";
import { ProductCard } from "@/components/shared/product-card";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import {
  PlatformSwitch,
  filterByPlatform,
  type PlatformKey,
} from "@/components/shared/platform-switch";

interface HomeViewProps {
  products: Product[];
  lastSyncedAt: string;
}

export function HomeView({ products: allProducts, lastSyncedAt }: HomeViewProps) {
  const [range, setRange] = useState<TimeRange>("7d");
  // รองรับ deep link "/?platform=tiktok" (เช่นจากหน้านำเข้าสินค้า TikTok) — เลือกแท็บให้ตั้งแต่เข้าเว็บ
  const searchParams = useSearchParams();
  const initialPlatform = searchParams.get("platform");
  const [platform, setPlatform] = useState<PlatformKey>(
    initialPlatform === "shopee" || initialPlatform === "tiktok" ? initialPlatform : "all",
  );
  const rangeLabel = range === "7d" ? "7 วัน" : "30 วัน";

  const products = useMemo(() => filterByPlatform(allProducts, platform), [allProducts, platform]);

  const urgent = useMemo(() => urgentProducts(products, range), [products, range]);
  const trending = useMemo(() => trendingProducts(products, range), [products, range]);
  const sellers = useMemo(() => bestSellers(products, range), [products, range]);
  const commission = useMemo(() => topCommission(products), [products]);
  const fresh = useMemo(() => newProducts(products), [products]);
  const opportunities = useMemo(() => opportunityProducts(products, range), [products, range]);
  const since = useMemo(() => trackingSince(allProducts), [allProducts]);

  // ตัวเลขจริงทั้งหมด — ห้าม hardcode
  const risingCount = useMemo(
    () =>
      products.filter((p) => {
        const g = metricsFor(p.analytics, range)?.growthPct;
        return g !== null && g !== undefined && g >= 20;
      }).length,
    [products, range],
  );
  const platformsConnected = useMemo(
    () => new Set(allProducts.map((p) => p.source ?? "")).size,
    [allProducts],
  );

  const hasPeriodData = trending.length > 0;
  const validSync = lastSyncedAt && new Date(lastSyncedAt).getTime() > 0;

  // Trend Strip + Hero ใช้สินค้าจริง: มาแรงก่อน ถ้ายังไม่มีข้อมูลช่วงเวลา → ขายดีสะสม
  const stripProducts = (urgent.length > 0 ? urgent : hasPeriodData ? trending : sellers.list).slice(0, 12);
  const heroImages = sellers.list.slice(0, 3);
  const contentIdeas = (urgent.length > 0 ? urgent : hasPeriodData ? trending : sellers.list).slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* ═══ HERO — Fashion Campaign ═══ */}
      <section className="relative overflow-hidden bg-foreground text-background">
        {/* Collage รูปสินค้าจริง 3 ช่อง */}
        <div className="absolute inset-0 grid grid-cols-3 opacity-45">
          {heroImages.length > 0
            ? heroImages.map((p) => (
                <div key={p.id} className="relative">
                  <Image
                    src={p.productImage}
                    alt=""
                    fill
                    sizes="34vw"
                    className="object-cover"
                    priority
                  />
                </div>
              ))
            : [0, 1, 2].map((i) => (
                <div key={i} className="border-r border-background/10 bg-neutral-800" />
              ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/30" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 md:px-8 md:py-24 lg:py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-brand-lime">
            BUMBIMBANANA — Fashion Radar
          </p>
          <h1 className="font-display max-w-4xl break-words text-[2.4rem] leading-[0.95] sm:text-7xl lg:text-8xl">
            Find the look
            <br />
            before it{" "}
            <span className="whitespace-nowrap bg-brand-lime px-1.5 text-foreground sm:px-2">blows up.</span>
          </h1>
          <p className="max-w-xl text-base font-semibold sm:text-lg">
            ค้นหาสินค้าแฟชั่นที่กำลังมา ก่อนจะกลายเป็นกระแส
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-background/70">
            วิเคราะห์สินค้า ค่าคอมมิชชัน ราคา ความแรงของเทรนด์ และโอกาสสร้างคอนเทนต์
            จาก Shopee Thailand ในที่เดียว (โครงสร้างรองรับ TikTok Shop เตรียมไว้แล้ว)
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products?sort=trend&range=7d"
              className="group flex items-center justify-center gap-2 bg-brand-lime px-7 py-3.5 text-sm font-bold tracking-[0.08em] text-foreground transition-transform active:scale-[0.98]"
            >
              EXPLORE THE RADAR
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/products?sort=trend&range=7d"
              className="flex items-center justify-center border border-background/40 px-7 py-3.5 text-sm font-semibold text-background transition-colors hover:bg-background hover:text-foreground"
            >
              ดูสินค้ากำลังมาแรง
            </Link>
          </div>
        </div>

        {/* ตัวเลขจริงใต้ Hero */}
        <div className="relative border-t border-background/15">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-background/15 px-0 md:grid-cols-4">
            <HeroStat value={products.length} label="Products Tracked" thai="สินค้าที่ติดตาม" />
            <HeroStat value={commission.length} label="High Commission Items" thai="สินค้ามีค่าคอมจริง" />
            <HeroStat value={risingCount} label="Rising Trends" thai={`โต ≥20% ใน ${rangeLabel}`} />
            <HeroStat value={platformsConnected} label="Platforms Connected" thai="แพลตฟอร์มที่เชื่อมต่อ" />
          </div>
        </div>
      </section>

      {/* ═══ TREND STRIP — สินค้าที่ขยับจริงตอนนี้ ═══ */}
      <section className="overflow-hidden border-b border-border bg-foreground py-4 text-background">
        <div className="mx-auto mb-3 flex max-w-7xl items-baseline justify-between px-4 md:px-8">
          <h2 className="font-display text-lg tracking-wide">What&rsquo;s moving right now</h2>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-background/50">
            {urgent.length > 0
              ? "จากป้ายควรรีบทำคอนเทนต์"
              : hasPeriodData
                ? "จากคะแนนความมาแรงจริง"
                : "จากยอดขายสะสมจริง (กำลังเก็บข้อมูลเทรนด์)"}
          </span>
        </div>
        {stripProducts.length > 0 ? (
          <div className="flex">
            <div className="animate-marquee flex shrink-0 items-center gap-3 pr-3">
              {[...stripProducts, ...stripProducts].map((p, i) => (
                <Link
                  key={`${p.id}-${i}`}
                  href={`/products/${p.id}`}
                  className={
                    i % stripProducts.length < 3
                      ? "whitespace-nowrap border border-brand-lime bg-brand-lime px-4 py-1.5 text-xs font-bold text-foreground"
                      : "whitespace-nowrap border border-background/30 px-4 py-1.5 text-xs font-semibold text-background transition-colors hover:border-brand-lime hover:text-brand-lime"
                  }
                >
                  {p.productName.slice(0, 42)}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="mx-auto max-w-7xl px-4 text-xs text-background/60 md:px-8">
            ยังไม่มีข้อมูลสินค้า — ระบบจะแสดงอัตโนมัติหลังซิงก์ข้อมูลรอบแรก
          </p>
        )}
      </section>

      {/* ═══ PLATFORM CONTROL BAR ═══ */}
      <section className="sticky top-[68px] z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-col">
            <span className="font-display text-sm tracking-wide text-foreground">
              Fashion Radar / Live Product Intelligence
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock3 className="size-3" />
              {validSync
                ? `ซิงก์ข้อมูลล่าสุด ${formatThaiDateTime(lastSyncedAt)}`
                : "ยังไม่เคยซิงก์ข้อมูล — ระบบซิงก์อัตโนมัติทุกวัน"}
              {since ? ` • เริ่มติดตาม ${formatThaiDate(since)}` : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PlatformSwitch value={platform} onChange={setPlatform} />
            <TimeRangeToggle value={range} onChange={setRange} />
          </div>
        </div>
      </section>

      {platform === "tiktok" ? (
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <CollectingState
            title="TikTok Shop ยังไม่เชื่อมต่อ"
            detail="โครงสร้างระบบรองรับ TikTok Shop เตรียมไว้แล้ว แต่ยังไม่มีแหล่งข้อมูลที่เชื่อมต่อได้จริง — เมื่อเชื่อมต่อสำเร็จ สินค้าจะแสดงที่นี่อัตโนมัติ"
          />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-10 md:px-8 md:py-14">
          {/* ═══ ควรรีบทำคอนเทนต์ (เด่นที่สุด) ═══ */}
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-3xl leading-none text-foreground sm:text-5xl">
                ควรรีบทำคอนเทนต์
              </h2>
              <p className="text-sm text-muted-foreground">
                ติดอันดับ TOP 20 และคะแนนความมาแรงโตเกิน 20% เทียบช่วง {rangeLabel} ก่อนหน้า — จากข้อมูลจริงที่ระบบติดตาม
              </p>
            </div>
            {urgent.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {urgent.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} range={range} />
                ))}
              </div>
            ) : (
              <CollectingState
                title="กำลังเก็บข้อมูลเพื่อวิเคราะห์ความมาแรง"
                detail={`ป้าย "ควรรีบทำคอนเทนต์" ต้องใช้ข้อมูลเปรียบเทียบ ${rangeLabel} เทียบ ${rangeLabel} ก่อนหน้า — จะแสดงอัตโนมัติเมื่อ Snapshot ครบ${since ? ` (เริ่มเก็บ ${formatThaiDate(since)})` : ""}`}
              />
            )}
          </section>

          {/* ═══ OPPORTUNITY SCORE — น่าโปรโมทวันนี้ ═══ */}
          <HomeSection
            icon={<Target className="size-4" />}
            title="น่าโปรโมทวันนี้"
            subtitle={`Opportunity Score (คะแนนน่าโปรโมท) = ความมาแรงช่วง ${rangeLabel} 60% + ค่าคอมจริง 40% — สินค้าที่ยังไม่มีข้อมูลค่าคอมใช้ความมาแรงอย่างเดียว`}
            href={`/products?sort=trend&range=${range}`}
            empty={
              opportunities.length === 0 ? (
                <CollectingState
                  title="กำลังเก็บข้อมูลเพื่อคำนวณคะแนนน่าโปรโมท"
                  detail={`ต้องมี Snapshot ยอดขายครบช่วง ${rangeLabel} ก่อน — จะแสดงอัตโนมัติเมื่อข้อมูลพอ`}
                />
              ) : null
            }
          >
            {opportunities.slice(0, 4).map(({ product: p }, i) => (
              <ProductCard key={p.id} product={p} range={range} rankNumber={i + 1} />
            ))}
          </HomeSection>

          {/* ═══ HOT PRODUCT RADAR — 4 หัวข้อเดิม ═══ */}
          <HomeSection
            icon={<Flame className="size-4" />}
            title="Hot Product Radar"
            subtitle={`สินค้าติดเทรนด์มาแรง — คะแนนจากยอดขาย 40% จำนวนชิ้น 30% อัตราโต 30% (ช่วง ${rangeLabel})`}
            href={`/products?sort=trend&range=${range}`}
            empty={
              !hasPeriodData ? (
                <CollectingState
                  title="กำลังเก็บข้อมูลเพื่อวิเคราะห์"
                  detail={`ต้องมี Snapshot ยอดขายย้อนหลังครบ ${rangeLabel} ก่อนจึงคำนวณคะแนนความมาแรงได้จริง`}
                />
              ) : null
            }
          >
            {trending.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} range={range} rankNumber={i + 1} />
            ))}
          </HomeSection>

          <HomeSection
            icon={<TrendingUp className="size-4" />}
            title="สินค้าขายดี"
            subtitle={
              sellers.basis === "period"
                ? `เรียงตามยอดขายเป็นบาทในช่วง ${rangeLabel} จากข้อมูล Shopee ที่ระบบติดตาม`
                : `เรียงตามยอดขายสะสมจาก Shopee Feed — ข้อมูลราย ${rangeLabel} กำลังเก็บ Snapshot`
            }
            href={`/products?sort=sales&range=${range}`}
            empty={
              sellers.list.length === 0 ? (
                <CollectingState title="ยังไม่มีข้อมูลสินค้า" detail="ระบบยังไม่ได้ซิงก์ข้อมูลจาก Shopee Feed" />
              ) : null
            }
          >
            {sellers.list.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} range={range} rankNumber={i + 1} />
            ))}
          </HomeSection>

          <HomeSection
            icon={<Wallet className="size-4" />}
            title="High Commission"
            subtitle="สินค้าค่าคอมสูง — เรียงตามเปอร์เซ็นต์ค่าคอมมิชชันจริงจาก Shopee Affiliate"
            href={`/products?sort=commission&range=${range}`}
            empty={
              commission.length === 0 ? (
                <div className="flex flex-col items-start gap-3 border border-border bg-secondary px-6 py-10">
                  <p className="font-display text-xl text-foreground">ยังไม่มีข้อมูลค่าคอมจริง</p>
                  <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
                    Shopee Feed ไม่ส่งค่าคอมมิชชันมาให้ — ต้องนำเข้ารายงานจาก Shopee Affiliate Center
                    ระบบจึงจะจัดอันดับค่าคอมได้ (ห้ามเดาค่าแทน)
                  </p>
                  <Link
                    href="/commission-import"
                    className="bg-foreground px-5 py-2.5 text-xs font-bold tracking-wide text-background transition-opacity hover:opacity-85"
                  >
                    นำเข้าข้อมูลค่าคอม
                  </Link>
                </div>
              ) : null
            }
          >
            {commission.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} range={range} rankNumber={i + 1} />
            ))}
          </HomeSection>

          <HomeSection
            icon={<Sparkles className="size-4" />}
            title="New Drop"
            subtitle="สินค้าใหม่ — ระบบพบใน Shopee Feed ครั้งแรกภายใน 7 วันที่ผ่านมา"
            href={`/products?sort=new&range=${range}`}
            empty={
              fresh.length === 0 ? (
                <CollectingState
                  title="ยังไม่พบสินค้าใหม่ใน 7 วันที่ผ่านมา"
                  detail={`ระบบเปรียบเทียบกับสินค้าที่ติดตามอยู่เดิม${since ? ` (เริ่มติดตาม ${formatThaiDate(since)})` : ""} — สินค้าที่เพิ่งเข้ามาใน Feed จะแสดงที่นี่อัตโนมัติ`}
                />
              ) : null
            }
          >
            {fresh.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} range={range} />
            ))}
          </HomeSection>
        </div>
      )}

      {/* ═══ FEATURED PLATFORM — Campaign Banner ═══ */}
      <section className="grid md:grid-cols-2">
        <div className="flex flex-col items-start gap-4 bg-foreground px-6 py-14 text-background md:px-12 md:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-brand-lime">Shopee</p>
          <h2 className="font-display text-4xl leading-[0.95] sm:text-5xl">
            Commission
            <br />
            Scout
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-background/70">
            ค้นหาสินค้าที่ค่าคอมสูงและมีโอกาสปักตะกร้าทำยอดได้จริง
          </p>
          <Link
            href="/products?sort=commission"
            className="group mt-2 flex items-center gap-2 bg-brand-lime px-6 py-3 text-xs font-bold tracking-[0.1em] text-foreground transition-transform active:scale-[0.98]"
          >
            OPEN SHOPEE RADAR
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <div className="flex flex-col items-start gap-4 bg-secondary px-6 py-14 text-foreground md:px-12 md:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
            TikTok Shop
          </p>
          <h2 className="font-display text-4xl leading-[0.95] sm:text-5xl">
            Viral
            <br />
            Watch
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            เตรียมไว้สำหรับติดตามสินค้าที่กำลังไวรัล — ยังไม่เชื่อมต่อแหล่งข้อมูลจริง
            สถานะการเชื่อมต่อดูได้ที่หน้าสถานะระบบ
          </p>
          <Link
            href="/data-status"
            className="mt-2 flex items-center gap-2 border border-foreground px-6 py-3 text-xs font-bold tracking-[0.1em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            ดูสถานะการเชื่อมต่อ
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ═══ CONTENT THAT SELLS — จากสินค้าจริง ═══ */}
      <section id="content-ideas" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-14 md:px-8">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="font-display text-3xl leading-none text-foreground sm:text-5xl">
            Content that sells
          </h2>
          <p className="text-sm text-muted-foreground">
            สินค้าเด่นจากข้อมูลจริงที่เหมาะรีบทำคอนเทนต์ — กดเพื่อเปิด Content Brief (สรุปข้อมูลสินค้า) ในหน้ารายละเอียด
          </p>
        </div>
        {contentIdeas.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {contentIdeas.map((p) => {
              const m = metricsFor(p.analytics, range);
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group flex flex-col border border-border transition-colors hover:border-foreground"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                    <Image
                      src={p.productImage}
                      alt={p.productName}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <span className="absolute left-3 top-3 bg-foreground px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-background">
                      SHOPEE
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
                      {p.productName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {m?.trendScore !== null && m?.trendScore !== undefined
                        ? `RADAR SCORE ${m.trendScore} • โตจริงเทียบช่วงก่อนหน้า`
                        : `ยอดขายสะสม ${(p.itemSold ?? 0).toLocaleString("th-TH")} ชิ้นจาก Shopee`}
                    </p>
                    <span className="mt-auto flex items-center gap-1.5 pt-2 text-xs font-bold tracking-wide text-foreground">
                      สร้าง Content Brief
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <CollectingState
            title="กำลังเก็บข้อมูลเพื่อคัดสินค้าทำคอนเทนต์"
            detail="เมื่อระบบมีข้อมูลสินค้าและเทรนด์เพียงพอ ไอเดียคอนเทนต์จากสินค้าจริงจะแสดงที่นี่"
          />
        )}
      </section>
    </div>
  );
}

// ─── ส่วนย่อย ────────────────────────────────────────────────────────────────

function HeroStat({ value, label, thai }: { value: number; label: string; thai: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-5 md:px-8">
      <span className="font-display text-3xl leading-none text-background sm:text-4xl">
        {value.toLocaleString("th-TH")}
      </span>
      <span className="break-words text-[9px] font-bold uppercase leading-tight tracking-[0.14em] text-brand-lime sm:text-[10px] sm:tracking-[0.18em]">{label}</span>
      <span className="text-[10px] text-background/60">{thai}</span>
    </div>
  );
}

function HomeSection({
  icon,
  title,
  subtitle,
  href,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  empty: React.ReactNode | null;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-border pt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-foreground">
            {icon}
            <h2 className="font-display text-2xl leading-none sm:text-4xl">{title}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="flex w-fit items-center gap-1.5 border border-foreground px-4 py-2 text-[11px] font-bold tracking-[0.1em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          ดูทั้งหมด
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {empty ?? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {children}
        </div>
      )}
    </section>
  );
}

function CollectingState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-secondary px-6 py-12 text-center">
      <Hourglass className="size-6 text-muted-foreground/60" />
      <p className="font-display text-lg text-foreground">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
