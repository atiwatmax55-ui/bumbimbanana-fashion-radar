import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Flame, Hourglass } from "lucide-react";
import { productRepository } from "@/lib/data-source/product-repository";
import { fetchDailyMovers } from "@/lib/analytics/daily-movers";
import { formatBaht, formatNumber, formatPercent, formatThaiDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "มาแรงวันนี้ — BUMBIMBANANA Fashion Radar",
  description: "10 อันดับสินค้าที่ยอดขายพุ่งแรงที่สุดจาก Snapshot ล่าสุด",
};

/**
 * หน้า "มาแรงวันนี้" (Top Movers) — สินค้าที่ยอดขายขยับมากที่สุด
 * เทียบ Snapshot วันล่าสุดกับวันก่อนหน้า (ข้อมูลจริงเท่านั้น)
 */
export default async function TrendingPage() {
  const [products, result] = await Promise.all([
    productRepository.getAllProducts(),
    fetchDailyMovers(),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  // join กับสินค้าที่ผ่านตัวกรองเสื้อผ้าผู้หญิง — snapshot อาจมีสินค้าที่ถูกซ่อนไปแล้ว
  const top = result.movers
    .map((m) => ({ mover: m, product: productById.get(m.productId) }))
    .filter((row): row is { mover: (typeof row)["mover"]; product: NonNullable<(typeof row)["product"]> } =>
      Boolean(row.product),
    )
    .slice(0, 10);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          กลับหน้าแรก
        </Link>
        <div className="flex items-center gap-3">
          <Flame className="size-7 text-foreground" />
          <h1 className="font-display text-4xl leading-none text-foreground sm:text-6xl">มาแรงวันนี้</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          10 อันดับสินค้าที่ยอดขายพุ่งแรงที่สุด เทียบ Snapshot (ภาพข้อมูลรายวัน) วันล่าสุดกับวันก่อนหน้า
          {result.latestDate ? ` — ข้อมูลล่าสุด ${formatThaiDate(result.latestDate)}` : ""}
        </p>
      </div>

      {top.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-secondary px-6 py-16 text-center">
          <Hourglass className="size-7 text-muted-foreground/60" />
          <p className="font-display text-xl text-foreground">กำลังเก็บข้อมูลเพื่อจัดอันดับ</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            ต้องมี Snapshot ยอดขายอย่างน้อย 2 วันจึงคำนวณ &ldquo;ยอดขายวันนี้&rdquo; ได้จริง
            (ตอนนี้มี {result.daysAvailable} วัน) — ระบบซิงก์อัตโนมัติทุก 6 ชั่วโมง
            อันดับจะแสดงที่นี่ทันทีเมื่อข้อมูลพอ ห้ามแต่งตัวเลขแทน
          </p>
          <Link
            href="/products?sort=sales"
            className="mt-2 bg-foreground px-5 py-2.5 text-xs font-bold tracking-wide text-background transition-opacity hover:opacity-85"
          >
            ดูสินค้าขายดี (ยอดสะสม) ระหว่างรอ
          </Link>
        </div>
      ) : (
        <ol className="flex flex-col divide-y divide-border border-y border-border">
          {top.map(({ mover, product }, i) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.id}`}
                className="group flex items-center gap-4 py-4 transition-colors hover:bg-secondary/60 sm:gap-6"
              >
                <span className="font-display w-12 shrink-0 text-center text-3xl text-foreground sm:text-4xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Image
                  src={product.productImage}
                  alt={product.productName}
                  width={96}
                  height={120}
                  className="aspect-[4/5] w-16 shrink-0 border border-border object-cover sm:w-20"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                    {product.productName}
                  </h2>
                  <p className="truncate text-[11px] text-muted-foreground">{product.shopName}</p>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                    {product.price > 0 ? (
                      <span className="font-extrabold text-foreground">{formatBaht(product.price)}</span>
                    ) : null}
                    {product.commissionRate > 0 && !product.commissionStatus ? (
                      <span className="bg-brand-lime px-1.5 py-0.5 font-bold text-foreground">
                        ค่าคอม {formatPercent(product.commissionRate)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 pr-1">
                  <span className="font-display text-2xl leading-none text-foreground sm:text-3xl">
                    +{formatNumber(mover.unitsToday)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    ชิ้น/วันล่าสุด
                  </span>
                  {mover.growthPct !== null ? (
                    <span
                      className={`text-[11px] font-semibold ${mover.growthPct >= 0 ? "text-positive" : "text-negative"}`}
                    >
                      {formatPercent(mover.growthPct, true)} เทียบวันก่อน
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70">รอข้อมูลวันที่ 3 เพื่อคิด %</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        หมายเหตุ: &ldquo;ยอดขายวันล่าสุด&rdquo; คือผลต่างของยอดขายสะสมระหว่าง Snapshot 2 วันล่าสุด
        จากข้อมูล Shopee ที่ระบบติดตาม (เฉพาะเสื้อผ้าแฟชั่นผู้หญิงในระบบ) — ไม่ใช่อันดับทางการจาก Shopee
      </p>
    </div>
  );
}
