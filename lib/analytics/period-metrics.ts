import type { ContentBadge, PeriodMetrics, ProductAnalytics, TimeRange } from "@/types/product";

/**
 * คำนวณตัวเลข 7/30 วันจาก baseline ยอดขายสะสม (ผลจาก RPC radar_baselines)
 *
 * หลักการ:
 * - units ของช่วง = ยอดสะสมล่าสุด - ยอดสะสม ณ จุดเริ่มช่วง (null = ข้อมูลไม่พอ)
 * - อัตราโตเทียบ "ช่วงก่อนหน้า" ความยาวเท่ากัน (7 เทียบ 7 ก่อนหน้า, 30 เทียบ 30 ก่อนหน้า)
 * - ฐานก่อนหน้าเป็น 0 หรือไม่มีข้อมูล → growthPct = null (ห้ามหารศูนย์/Infinity)
 * - Trend Score = ยอดขายบาท 40% + จำนวนชิ้น 30% + อัตราโต 30% (normalize ด้วยค่าสูงสุดในระบบ)
 *   ถ้าไม่มีข้อมูลอัตราโต → ใช้เฉพาะ 2 ส่วนแรกแล้วปรับน้ำหนักเป็น 4:3 อย่างโปร่งใส
 */

/** แถวผลลัพธ์จาก RPC radar_baselines (คีย์ตรงกับคอลัมน์ SQL) */
export interface BaselineRow {
  product_id: number;
  latest_sold: number;
  latest_date: string;
  sold_7d_ago: number | null;
  sold_14d_ago: number | null;
  sold_30d_ago: number | null;
  sold_60d_ago: number | null;
  earliest_date: string;
  snapshot_days: number;
}

interface RawWindow {
  units: number | null;
  prevUnits: number | null;
}

function windowUnits(latest: number, baseline: number | null): number | null {
  if (baseline === null || baseline === undefined) return null;
  // Feed อาจรีเซ็ตค่า item_sold — delta ติดลบให้ถือเป็น 0 ไม่ใช่ค่าลบปลอม
  return Math.max(0, latest - baseline);
}

function rawWindows(row: BaselineRow): { d7: RawWindow; d30: RawWindow } {
  const u7 = windowUnits(row.latest_sold, row.sold_7d_ago);
  const p7 =
    row.sold_7d_ago !== null && row.sold_14d_ago !== null
      ? Math.max(0, row.sold_7d_ago - row.sold_14d_ago)
      : null;
  const u30 = windowUnits(row.latest_sold, row.sold_30d_ago);
  const p30 =
    row.sold_30d_ago !== null && row.sold_60d_ago !== null
      ? Math.max(0, row.sold_30d_ago - row.sold_60d_ago)
      : null;
  return { d7: { units: u7, prevUnits: p7 }, d30: { units: u30, prevUnits: p30 } };
}

export function computeGrowthPct(units: number, prevUnits: number | null): number | null {
  if (prevUnits === null || prevUnits <= 0) return null;
  return ((units - prevUnits) / prevUnits) * 100;
}

interface ProductInput {
  productId: number;
  price: number;
  commissionRate: number | null;
  firstSeenAt: string;
}

export interface AnalyticsResult {
  byProductId: Map<number, ProductAnalytics>;
  /** อันดับค่าคอม (เฉพาะสินค้าที่มีค่าคอมจริง) — ไม่ผูกช่วงเวลา */
  commissionRankById: Map<number, number>;
  /** วันแรกที่ระบบเริ่มเก็บ snapshot (null = ยังไม่มีข้อมูลเลย) */
  earliestSnapshotDate: string | null;
}

/** เกณฑ์ป้าย "ควรรีบทำคอนเทนต์": TOP 20 (มาแรงหรือยอดขาย) และโต ≥ 20% */
const BADGE_TOP_N = 20;
const BADGE_MIN_GROWTH_PCT = 20;

function buildPeriod(
  win: RawWindow,
  price: number,
): Omit<PeriodMetrics, "trendScore" | "salesRank" | "trendRank"> | null {
  if (win.units === null) return null;
  return {
    units: win.units,
    revenue: Math.round(win.units * Math.max(0, price)),
    prevUnits: win.prevUnits,
    growthPct: computeGrowthPct(win.units, win.prevUnits),
  };
}

function finishRange(
  entries: {
    productId: number;
    m: Omit<PeriodMetrics, "trendScore" | "salesRank" | "trendRank"> | null;
  }[],
): Map<number, PeriodMetrics> {
  const present = entries.filter(
    (e): e is { productId: number; m: NonNullable<(typeof entries)[number]["m"]> } => e.m !== null,
  );

  const maxRevenue = Math.max(1, ...present.map((e) => e.m.revenue));
  const maxUnits = Math.max(1, ...present.map((e) => e.m.units));

  // trendScore: normalize ต่อค่าสูงสุดในระบบ, growth map จาก [-100, +300] → [0, 1]
  const scored = present.map((e) => {
    const revN = e.m.revenue / maxRevenue;
    const unitsN = e.m.units / maxUnits;
    let score: number;
    if (e.m.growthPct === null) {
      // ไม่มีข้อมูลอัตราโต — ใช้ 2 ส่วนที่มีจริง น้ำหนัก 4:3 (ปรับสัดส่วนให้รวมเป็น 1)
      score = (0.4 * revN + 0.3 * unitsN) / 0.7;
    } else {
      const growthN = Math.min(1, Math.max(0, (e.m.growthPct + 100) / 400));
      score = 0.4 * revN + 0.3 * unitsN + 0.3 * growthN;
    }
    return { productId: e.productId, m: e.m, score: Math.round(score * 100) };
  });

  const bySales = [...scored].sort((a, b) => b.m.revenue - a.m.revenue);
  const byTrend = [...scored].sort((a, b) => b.score - a.score);
  const salesRank = new Map(bySales.map((e, i) => [e.productId, i + 1]));
  const trendRank = new Map(byTrend.map((e, i) => [e.productId, i + 1]));

  return new Map(
    scored.map((e) => [
      e.productId,
      {
        ...e.m,
        trendScore: e.score,
        salesRank: salesRank.get(e.productId) ?? null,
        trendRank: trendRank.get(e.productId) ?? null,
      },
    ]),
  );
}

function buildBadge(m: PeriodMetrics | null): ContentBadge | null {
  if (!m || m.growthPct === null || m.growthPct < BADGE_MIN_GROWTH_PCT) return null;
  const growthLabel = `โต ${Math.round(m.growthPct)}%`;
  if (m.trendRank !== null && m.trendRank <= BADGE_TOP_N) {
    return { reason: `อันดับมาแรง #${m.trendRank} • ${growthLabel}` };
  }
  if (m.salesRank !== null && m.salesRank <= BADGE_TOP_N) {
    return { reason: `ยอดขายติด TOP ${BADGE_TOP_N} • ${growthLabel}` };
  }
  return null;
}

/**
 * ประกอบผลวิเคราะห์ทั้งหมด: PeriodMetrics 7/30 วัน + ป้าย + สินค้าใหม่ + อันดับค่าคอม
 * @param systemBaselineAt เวลา import ครั้งแรกสุดของระบบ — สินค้าที่เข้ามาพร้อมชุดแรก
 *        ไม่นับเป็น "สินค้าใหม่" (ระบบเพิ่งรู้จัก ไม่ใช่สินค้าเพิ่งเปิดขาย)
 */
export function computeAnalytics(
  products: ProductInput[],
  baselines: BaselineRow[],
  systemBaselineAt: string | null,
  now: Date = new Date(),
): AnalyticsResult {
  const baselineById = new Map(baselines.map((b) => [b.product_id, b]));

  const d7Entries = products.map((p) => {
    const b = baselineById.get(p.productId);
    return {
      productId: p.productId,
      m: b ? buildPeriod(rawWindows(b).d7, p.price) : null,
    };
  });
  const d30Entries = products.map((p) => {
    const b = baselineById.get(p.productId);
    return {
      productId: p.productId,
      m: b ? buildPeriod(rawWindows(b).d30, p.price) : null,
    };
  });

  const d7Map = finishRange(d7Entries);
  const d30Map = finishRange(d30Entries);

  // อันดับค่าคอม — เฉพาะสินค้าที่มีข้อมูลค่าคอมจริง (> 0)
  const withCommission = products
    .filter((p) => p.commissionRate !== null && p.commissionRate > 0)
    .sort((a, b) => (b.commissionRate ?? 0) - (a.commissionRate ?? 0));
  const commissionRankById = new Map(withCommission.map((p, i) => [p.productId, i + 1]));

  // สินค้าใหม่: พบครั้งแรกภายใน 7 วัน และหลังชุด import แรกของระบบเกิน 24 ชม.
  const sevenDaysAgo = now.getTime() - 7 * 24 * 3600 * 1000;
  const baselineCutoff = systemBaselineAt
    ? new Date(systemBaselineAt).getTime() + 24 * 3600 * 1000
    : null;

  // วันที่มีสินค้า "พบครั้งแรก" เป็นชุดใหญ่ = วันเปลี่ยนตัวกรอง/ตั้งฐานข้อมูลใหม่
  // ไม่ใช่สินค้าเพิ่งเปิดขายจริง — ห้ามติดป้าย "สินค้าใหม่" ให้ทั้งชุด
  const firstSeenDateCount = new Map<string, number>();
  for (const p of products) {
    const d = p.firstSeenAt.slice(0, 10);
    firstSeenDateCount.set(d, (firstSeenDateCount.get(d) ?? 0) + 1);
  }
  const bulkThreshold = Math.max(50, Math.floor(products.length * 0.2));
  const bulkDates = new Set(
    [...firstSeenDateCount.entries()].filter(([, c]) => c >= bulkThreshold).map(([d]) => d),
  );

  const byProductId = new Map<number, ProductAnalytics>(
    products.map((p) => {
      const firstSeen = new Date(p.firstSeenAt).getTime();
      const isNew =
        Number.isFinite(firstSeen) &&
        firstSeen >= sevenDaysAgo &&
        !bulkDates.has(p.firstSeenAt.slice(0, 10)) &&
        (baselineCutoff === null || firstSeen > baselineCutoff);
      const d7 = d7Map.get(p.productId) ?? null;
      const d30 = d30Map.get(p.productId) ?? null;
      return [
        p.productId,
        { d7, d30, badge7: buildBadge(d7), badge30: buildBadge(d30), isNew },
      ];
    }),
  );

  let earliest: string | null = null;
  for (const b of baselines) {
    if (earliest === null || b.earliest_date < earliest) earliest = b.earliest_date;
  }

  return { byProductId, commissionRankById, earliestSnapshotDate: earliest };
}

/** helper อ่าน metrics ตามช่วงเวลาที่เลือก */
export function metricsFor(a: ProductAnalytics | undefined, range: TimeRange): PeriodMetrics | null {
  if (!a) return null;
  return range === "7d" ? a.d7 : a.d30;
}

/** helper อ่านป้ายตามช่วงเวลาที่เลือก */
export function badgeFor(a: ProductAnalytics | undefined, range: TimeRange): ContentBadge | null {
  if (!a) return null;
  return range === "7d" ? a.badge7 : a.badge30;
}
