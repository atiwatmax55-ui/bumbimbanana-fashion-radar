"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryPeriodComparison } from "@/lib/dashboard/aggregate";
import { formatNumber } from "@/lib/utils/format";

interface PeriodComparisonChartProps {
  data: CategoryPeriodComparison[];
}

/** กราฟเปรียบเทียบยอดขาย 7 วัน และ 30 วัน แยกตามหมวดสินค้า บนหน้า Dashboard */
export function PeriodComparisonChart({ data }: PeriodComparisonChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 36 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: "#6B6B6B" }}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: "#6B6B6B" }} width={48} />
          <Tooltip
            formatter={(value) => `${formatNumber(Number(value))} ชิ้น`}
            labelStyle={{ color: "#1A1A1A", fontWeight: 600 }}
            contentStyle={{ borderRadius: 12, borderColor: "#E5E1D8", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="sales7d" name="ยอดขาย 7 วัน" fill="#1A1A1A" radius={[6, 6, 0, 0]} />
          <Bar dataKey="sales30d" name="ยอดขาย 30 วัน" fill="#C9A877" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
