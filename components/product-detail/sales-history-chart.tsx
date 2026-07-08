"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Hourglass } from "lucide-react";
import type { HistoryPoint } from "@/lib/analytics/product-history";
import { formatBaht, formatNumber, formatThaiDate } from "@/lib/utils/format";

/**
 * กราฟประวัติจาก Snapshot รายวัน — แยก 2 กราฟ (ยอดขายรายวัน / ราคา)
 * ห้ามใช้แกนคู่ (dual axis) เพราะคนอ่านเทียบสเกลผิดได้ง่าย
 * สีตามแบรนด์: เส้นข้อมูลสีดำ, พื้นที่ไล่จาง, กริดจางเป็นตัวประกอบ
 */

const INK = "#171717"; // foreground
const INK_MUTED = "#737373"; // เทา — เส้นราคา
const GRID = "#e5e5e5";

interface SalesHistoryChartProps {
  history: HistoryPoint[];
}

function shortThaiDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

export function SalesHistoryChart({ history }: SalesHistoryChartProps) {
  const unitsData = useMemo(
    () =>
      history
        .filter((p) => p.unitsSold !== null)
        .map((p) => ({ date: p.date, units: p.unitsSold as number })),
    [history],
  );
  const priceData = useMemo(
    () =>
      history
        .filter((p) => p.price !== null && p.price > 0)
        .map((p) => ({ date: p.date, price: p.price as number })),
    [history],
  );

  const hasUnits = unitsData.length >= 2;
  const hasPrice = priceData.length >= 2;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-xl text-foreground">ประวัติจากข้อมูลที่ระบบเก็บรายวัน</h2>
        <p className="text-xs text-muted-foreground">
          จาก Snapshot (ภาพข้อมูลรายวัน) ยอดขายสะสมและราคาใน Shopee Feed ย้อนหลังสูงสุด 60 วัน
          {history.length > 0 ? ` — เริ่มเก็บ ${formatThaiDate(history[0].date)}` : ""}
        </p>
      </div>

      {!hasUnits && !hasPrice ? (
        <div className="flex flex-col items-center gap-2 border border-dashed border-border bg-secondary px-6 py-10 text-center">
          <Hourglass className="size-5 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">กำลังเก็บข้อมูลเพื่อวาดกราฟ</p>
          <p className="max-w-md text-xs text-muted-foreground">
            ต้องมี Snapshot อย่างน้อย 2 วันจึงแสดงกราฟได้จริง — ระบบซิงก์อัตโนมัติทุก 6 ชั่วโมง
            ยิ่งเก็บนานกราฟยิ่งบอกแนวโน้มได้ชัด
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {hasUnits ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground">ยอดขายรายวัน (ชิ้น)</span>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={unitsData} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
                    <defs>
                      <linearGradient id="unitsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={INK} stopOpacity={0.16} />
                        <stop offset="100%" stopColor={INK} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortThaiDate}
                      tick={{ fontSize: 10, fill: INK_MUTED }}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: INK_MUTED }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ stroke: INK_MUTED, strokeWidth: 1 }}
                      formatter={(value) => [`${formatNumber(Number(value ?? 0))} ชิ้น`, "ขายได้"]}
                      labelFormatter={(label) => formatThaiDate(String(label))}
                      contentStyle={{
                        borderRadius: 8,
                        border: `1px solid ${GRID}`,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="units"
                      stroke={INK}
                      strokeWidth={2}
                      fill="url(#unitsFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: INK }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {hasPrice ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground">ราคา (บาท)</span>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortThaiDate}
                      tick={{ fontSize: 10, fill: INK_MUTED }}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: INK_MUTED }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ stroke: INK_MUTED, strokeWidth: 1 }}
                      formatter={(value) => [formatBaht(Number(value ?? 0)), "ราคา"]}
                      labelFormatter={(label) => formatThaiDate(String(label))}
                      contentStyle={{
                        borderRadius: 8,
                        border: `1px solid ${GRID}`,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="stepAfter"
                      dataKey="price"
                      stroke={INK_MUTED}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: INK_MUTED }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
