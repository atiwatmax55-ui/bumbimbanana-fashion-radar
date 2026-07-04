"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Flame, Hourglass, Sparkles, TrendingUp, Wallet } from "lucide-react";
import type { Product, TimeRange } from "@/types/product";
import {
  bestSellers,
  newProducts,
  topCommission,
  trackingSince,
  trendingProducts,
  urgentProducts,
} from "@/lib/analytics/select-products";
import { formatThaiDate, formatThaiDateTime } from "@/lib/utils/format";
import { ProductCard } from "@/components/shared/product-card";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";

interface HomeViewProps {
  products: Product[];
  lastSyncedAt: string;
}

export function HomeView({ products, lastSyncedAt }: HomeViewProps) {
  const [range, setRange] = useState<TimeRange>("7d");
  const rangeLabel = range === "7d" ? "7 วัน" : "30 วัน";

  const urgent = useMemo(() => urgentProducts(products, range), [products, range]);
  const trending = useMemo(() => trendingProducts(products, range), [products, range]);
  const sellers = useMemo(() => bestSellers(products, range), [products, range]);
  const commission = useMemo(() => topCommission(products), [products]);
  const fresh = useMemo(() => newProducts(products), [products]);
  const since = useMemo(() => trackingSince(products), [products]);

  const hasPeriodData = trending.length > 0;
  const validSync = lastSyncedAt && new Date(lastSyncedAt).getTime() > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-8 md:px-8 md:py-12">
      {/* ─── Hero: ควรรีบทำคอนเทนต์ ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-gold-hover">
            BUMBIMBANANA — Fashion Product Radar
          </span>
          <h1 className="font-display max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
            ควรรีบทำคอนเทนต์
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            เสื้อผ้าแฟชั่นผู้หญิงจาก Shopee Thailand ที่ทั้งติดอันดับ TOP 20
            และคะแนนความมาแรงโตเกิน 20% เทียบช่วงก่อนหน้า — คัดจากข้อมูลจริงที่ระบบติดตาม
          </p>
        </div>

        {/* Global 7/30 Toggle + ความสดข้อมูล */}
        <div className="flex flex-col items-center gap-3">
          <TimeRangeToggle value={range} onChange={setRange} />
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            {validSync ? (
              <span>ซิงก์ข้อมูลจาก Shopee Feed ล่าสุด {formatThaiDateTime(lastSyncedAt)}</span>
            ) : (
              <span>ยังไม่เคยซิงก์ข้อมูล — ระบบจะซิงก์อัตโนมัติทุกวัน</span>
            )}
            {since ? <span>• เริ่มติดตามข้อมูล {formatThaiDate(since)}</span> : null}
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
            detail={`ป้าย "ควรรีบทำคอนเทนต์" ต้องใช้ข้อมูลเปรียบเทียบ ${rangeLabel} เทียบ ${rangeLabel} ก่อนหน้า — ระบบจะแสดงอัตโนมัติเมื่อ Snapshot ครบ${since ? ` (เริ่มเก็บ ${formatThaiDate(since)})` : ""}`}
          />
        )}
      </section>

      {/* ─── สินค้าติดเทรนด์มาแรง ───────────────────────────────────────────── */}
      <HomeSection
        icon={<Flame className="size-4 text-brand-gold-hover" />}
        title="สินค้าติดเทรนด์มาแรง"
        subtitle={`คะแนนความมาแรงจากยอดขาย 40% จำนวนชิ้น 30% และอัตราโต 30% (ช่วง ${rangeLabel})`}
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

      {/* ─── สินค้าขายดี ────────────────────────────────────────────────────── */}
      <HomeSection
        icon={<TrendingUp className="size-4 text-brand-gold-hover" />}
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

      {/* ─── สินค้าค่าคอมสูง ────────────────────────────────────────────────── */}
      <HomeSection
        icon={<Wallet className="size-4 text-brand-gold-hover" />}
        title="สินค้าค่าคอมสูง"
        subtitle="เรียงตามเปอร์เซ็นต์ค่าคอมมิชชันจริงที่นำเข้าจาก Shopee Affiliate"
        href={`/products?sort=commission&range=${range}`}
        empty={
          commission.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-brand-cream/40 px-6 py-12 text-center">
              <Wallet className="size-6 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">ยังไม่มีข้อมูลค่าคอมจริง</p>
              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                Shopee Feed ไม่ส่งค่าคอมมิชชันมาให้ — ต้องนำเข้ารายงานจาก Shopee Affiliate Center
                ระบบจึงจะจัดอันดับค่าคอมได้ (ห้ามเดาค่าแทน)
              </p>
              <Link
                href="/commission-import"
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-80"
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

      {/* ─── สินค้าใหม่ ─────────────────────────────────────────────────────── */}
      <HomeSection
        icon={<Sparkles className="size-4 text-brand-gold-hover" />}
        title="สินค้าใหม่"
        subtitle="สินค้าที่ระบบพบใน Shopee Feed ครั้งแรกภายใน 7 วันที่ผ่านมา"
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
  );
}

// ─── ส่วนย่อยของหน้าแรก ─────────────────────────────────────────────────────

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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="font-display text-2xl font-semibold text-foreground">{title}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="flex w-fit items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline"
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
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-brand-cream/40 px-6 py-12 text-center">
      <Hourglass className="size-6 text-muted-foreground/60" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
