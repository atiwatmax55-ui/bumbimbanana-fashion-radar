"use client";

import { useEffect, useState } from "react";
import type { PeriodMetrics } from "@/types/product";
import { formatBaht, formatNumber, formatPercent } from "@/lib/utils/format";

interface RadarScoreProps {
  metrics: PeriodMetrics;
  rangeLabel: string;
}

/**
 * RADAR SCORE — แสดงคะแนนความมาแรงจริง (0–100) แบบแถบดำ + จุดเน้น Lime
 * องค์ประกอบคะแนน (ยอดขาย 40% / จำนวนชิ้น 30% / อัตราโต 30%) แสดงเป็นตัวเลขจริง
 * ห้ามแต่งตัวเลข: ถ้า trendScore เป็น null คอมโพเนนต์นี้จะไม่ถูก render
 */
export function RadarScore({ metrics, rangeLabel }: RadarScoreProps) {
  const score = metrics.trendScore ?? 0;
  const [width, setWidth] = useState(0);

  // Animation ตอนโหลด — วิ่งจาก 0 ไปคะแนนจริง
  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(score));
    return () => cancelAnimationFrame(t);
  }, [score]);

  return (
    <div className="flex flex-col gap-3 border border-border p-5">
      <div className="flex items-end justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Radar Score (คะแนนความมาแรง ช่วง {rangeLabel})
        </span>
        <span className="font-display text-4xl leading-none text-foreground">{score}</span>
      </div>
      <div className="h-2 w-full bg-secondary" role="img" aria-label={`คะแนนความมาแรง ${score} จาก 100`}>
        <div
          className="relative h-full bg-foreground transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, width))}%` }}
        >
          <span className="absolute -right-1 top-1/2 size-3 -translate-y-1/2 bg-brand-lime" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <ScorePart label="ยอดขาย (40%)" value={formatBaht(metrics.revenue)} />
        <ScorePart label="จำนวนชิ้น (30%)" value={`${formatNumber(metrics.units)} ชิ้น`} />
        <ScorePart
          label="อัตราโต (30%)"
          value={metrics.growthPct !== null ? formatPercent(metrics.growthPct, true) : "ข้อมูลไม่พอ"}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/80">
        คำนวณจากข้อมูล Shopee ที่ระบบติดตาม เทียบกับสินค้าทั้งหมดในระบบ — ไม่ใช่คะแนนทางการจาก Shopee
      </p>
    </div>
  );
}

function ScorePart({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-secondary px-2 py-2.5">
      <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-xs font-extrabold text-foreground">{value}</span>
    </div>
  );
}
