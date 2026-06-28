"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryTotal } from "@/lib/dashboard/aggregate";
import { formatNumber } from "@/lib/utils/format";

interface CategorySalesChartProps {
  data: CategoryTotal[];
  rangeLabel: string;
}

/** กราฟยอดขายตามหมวดสินค้า (Bar Chart) ตามช่วงเวลาที่เลือกบน Dashboard */
export function CategorySalesChart({ data, rangeLabel }: CategorySalesChartProps) {
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
            formatter={(value) => [`${formatNumber(Number(value))} ชิ้น`, `ยอดขาย ${rangeLabel}`]}
            labelStyle={{ color: "#1A1A1A", fontWeight: 600 }}
            contentStyle={{
              borderRadius: 12,
              borderColor: "#E5E1D8",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" name={`ยอดขาย ${rangeLabel}`} fill="#C9A877" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
