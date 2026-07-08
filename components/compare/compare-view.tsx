"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Scale, Search, X } from "lucide-react";
import type { Product, TimeRange } from "@/types/product";
import { metricsFor } from "@/lib/analytics/period-metrics";
import { opportunityScore } from "@/lib/analytics/opportunity-score";
import { displayCommission, formatBaht, formatNumber, formatPercent } from "@/lib/utils/format";
import { TimeRangeToggle } from "@/components/shared/time-range-toggle";
import { PageHeader } from "@/components/shared/page-header";

/**
 * หน้าเปรียบเทียบสินค้าแบบวางคู่กัน (2–4 ตัว)
 * ค้นหา → เพิ่มเข้าตาราง → ช่องที่ "ดีที่สุด" ของแต่ละแถวถูกไฮไลต์ด้วยสี Lime
 * ใช้ข้อมูลจริงเท่านั้น: ช่องที่ไม่มีข้อมูลแสดง "—" (ห้ามแต่งตัวเลข)
 */

const MAX_COMPARE = 4;

interface CompareViewProps {
  products: Product[];
}

export function CompareView({ products }: CompareViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<TimeRange>("7d");
  const rangeLabel = range === "7d" ? "7 วัน" : "30 วัน";

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p)),
    [selectedIds, products],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter(
        (p) =>
          !selectedIds.includes(p.id) &&
          (p.productName.toLowerCase().includes(q) || p.shopName.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [query, products, selectedIds]);

  function add(id: string) {
    if (selectedIds.length >= MAX_COMPARE || selectedIds.includes(id)) return;
    setSelectedIds([...selectedIds, id]);
    setQuery("");
  }
  function remove(id: string) {
    setSelectedIds(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="เปรียบเทียบสินค้า (Compare)"
        description={`เลือกสินค้า 2–${MAX_COMPARE} ตัวมาเทียบราคา ค่าคอม ยอดขาย และความมาแรงในหน้าเดียว — ช่องที่ดีที่สุดของแต่ละแถวถูกไฮไลต์`}
      >
        <TimeRangeToggle value={range} onChange={setRange} />
      </PageHeader>

      {/* ─── ช่องค้นหาเพิ่มสินค้า ─────────────────────────────────────────── */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-border bg-secondary/60 px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              selectedIds.length >= MAX_COMPARE
                ? `เทียบได้สูงสุด ${MAX_COMPARE} ตัว — เอาบางตัวออกก่อน`
                : "พิมพ์ชื่อสินค้าหรือร้านค้าอย่างน้อย 2 ตัวอักษรเพื่อค้นหา…"
            }
            disabled={selectedIds.length >= MAX_COMPARE}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        {results.length > 0 ? (
          <ul className="absolute inset-x-0 top-full z-20 max-h-80 overflow-y-auto border border-t-0 border-border bg-background shadow-lg">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => add(p.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                >
                  <Image
                    src={p.productImage}
                    alt=""
                    width={40}
                    height={50}
                    className="aspect-[4/5] w-9 shrink-0 border border-border object-cover"
                  />
                  <span className="line-clamp-2 flex-1 text-xs font-semibold text-foreground">
                    {p.productName}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-foreground">
                    {p.price > 0 ? formatBaht(p.price) : ""}
                  </span>
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ─── ตารางเปรียบเทียบ ─────────────────────────────────────────────── */}
      {selected.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-secondary px-6 py-16 text-center">
          <Scale className="size-7 text-muted-foreground/60" />
          <p className="font-display text-xl text-foreground">ยังไม่ได้เลือกสินค้ามาเปรียบเทียบ</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            ค้นหาแล้วเพิ่มสินค้า 2–{MAX_COMPARE} ตัวจากช่องด้านบน หรือไปเลือกจากหน้า
            &ldquo;เลือกดูสินค้า&rdquo; แล้วกลับมาเทียบกันที่นี่
          </p>
          <Link
            href="/products"
            className="mt-2 bg-foreground px-5 py-2.5 text-xs font-bold tracking-wide text-background transition-opacity hover:opacity-85"
          >
            ไปเลือกดูสินค้า
          </Link>
        </div>
      ) : (
        <CompareTable products={selected} range={range} rangeLabel={rangeLabel} onRemove={remove} />
      )}
    </div>
  );
}

// ─── ตาราง ────────────────────────────────────────────────────────────────────

interface RowSpec {
  label: string;
  /** ค่าเป็นตัวเลขเพื่อหา "ดีที่สุด" — null = ไม่มีข้อมูล */
  value: (p: Product) => number | null;
  render: (p: Product) => string;
  /** ทิศทางที่ดีกว่า: มาก่าดี (desc) หรือน้อยกว่าดี (asc) */
  better: "desc" | "asc";
}

function CompareTable({
  products,
  range,
  rangeLabel,
  onRemove,
}: {
  products: Product[];
  range: TimeRange;
  rangeLabel: string;
  onRemove: (id: string) => void;
}) {
  const rows: RowSpec[] = [
    {
      label: "ราคา",
      value: (p) => (p.price > 0 ? p.price : null),
      render: (p) => (p.price > 0 ? formatBaht(p.price) : "—"),
      better: "asc",
    },
    {
      label: "ค่าคอมมิชชัน",
      value: (p) => (p.commissionRate > 0 && !p.commissionStatus ? p.commissionRate : null),
      render: (p) => displayCommission(p),
      better: "desc",
    },
    {
      label: `ยอดขาย ${rangeLabel} (ชิ้น)`,
      value: (p) => metricsFor(p.analytics, range)?.units ?? null,
      render: (p) => {
        const m = metricsFor(p.analytics, range);
        return m ? `${formatNumber(m.units)} ชิ้น` : "—";
      },
      better: "desc",
    },
    {
      label: `อัตราโตเทียบ ${rangeLabel} ก่อนหน้า`,
      value: (p) => metricsFor(p.analytics, range)?.growthPct ?? null,
      render: (p) => {
        const g = metricsFor(p.analytics, range)?.growthPct;
        return g !== null && g !== undefined ? formatPercent(g, true) : "—";
      },
      better: "desc",
    },
    {
      label: "RADAR SCORE (ความมาแรง)",
      value: (p) => metricsFor(p.analytics, range)?.trendScore ?? null,
      render: (p) => {
        const s = metricsFor(p.analytics, range)?.trendScore;
        return s !== null && s !== undefined ? `${s} / 100` : "—";
      },
      better: "desc",
    },
    {
      label: "คะแนนน่าโปรโมท (Opportunity Score)",
      value: (p) => opportunityScore(p, range)?.score ?? null,
      render: (p) => {
        const o = opportunityScore(p, range);
        if (!o) return "—";
        return o.hasCommissionData ? `${o.score} / 100` : `${o.score} / 100 (ยังไม่มีค่าคอม)`;
      },
      better: "desc",
    },
    {
      label: "ยอดขายสะสมตลอดอายุสินค้า",
      value: (p) => p.itemSold ?? null,
      render: (p) => (p.itemSold !== undefined ? `${formatNumber(p.itemSold)} ชิ้น` : "—"),
      better: "desc",
    },
  ];

  function bestId(row: RowSpec): string | null {
    const vals = products
      .map((p) => ({ id: p.id, v: row.value(p) }))
      .filter((x): x is { id: string; v: number } => x.v !== null);
    if (vals.length < 2) return null; // ต้องมีอย่างน้อย 2 ค่าให้เทียบ
    vals.sort((a, b) => (row.better === "desc" ? b.v - a.v : a.v - b.v));
    // เสมอกัน = ไม่มีตัวที่ดีที่สุด
    return vals[0].v === vals[1].v ? null : vals[0].id;
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-44 bg-secondary/60 p-3 text-left align-bottom text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              เทียบ {products.length} ตัว
            </th>
            {products.map((p) => (
              <th key={p.id} className="min-w-40 border-l border-border p-3 text-left align-top">
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Image
                      src={p.productImage}
                      alt={p.productName}
                      width={160}
                      height={200}
                      className="aspect-[4/5] w-full max-w-28 border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      aria-label="เอาสินค้านี้ออกจากการเปรียบเทียบ"
                      className="absolute -right-1 -top-1 flex size-6 items-center justify-center bg-foreground text-background transition-opacity hover:opacity-80"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <Link
                    href={`/products/${p.id}`}
                    className="line-clamp-3 text-xs font-bold leading-snug text-foreground hover:underline"
                  >
                    {p.productName}
                  </Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const best = bestId(row);
            return (
              <tr key={row.label} className="border-b border-border last:border-b-0">
                <td className="bg-secondary/60 p-3 text-xs font-semibold text-muted-foreground">
                  {row.label}
                </td>
                {products.map((p) => (
                  <td
                    key={p.id}
                    className={`border-l border-border p-3 text-sm ${
                      best === p.id ? "bg-brand-lime/60 font-extrabold text-foreground" : "text-foreground"
                    }`}
                  >
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
