"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Product } from "@/types/product";
import { formatNumber } from "@/lib/utils/format";

interface ProductSalesChartProps {
  product: Product;
}

/** กราฟเปรียบเทียบยอดขาย 7 วัน และ 30 วัน ของสินค้ารายการนี้ บนหน้า Product Detail */
export function ProductSalesChart({ product }: ProductSalesChartProps) {
  const data = [
    { label: "ยอดขาย 7 วัน", value: product.sales7d },
    { label: "ยอดขาย 30 วัน", value: product.sales30d },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B6B6B" }} />
          <YAxis dataKey="label" type="category" width={90} tick={{ fontSize: 12, fill: "#1A1A1A" }} />
          <Tooltip
            formatter={(value) => `${formatNumber(Number(value))} ชิ้น`}
            contentStyle={{ borderRadius: 12, borderColor: "#E5E1D8", fontSize: 12 }}
          />
          <Bar dataKey="value" fill="#C9A877" radius={[0, 8, 8, 0]} barSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
