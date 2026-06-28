"use client";

import type { ProductSortKey } from "@/lib/data-source/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS: { value: ProductSortKey; label: string }[] = [
  { value: "sales", label: "ยอดขายสูงสุด" },
  { value: "revenue", label: "รายได้สูงสุด" },
  { value: "commission", label: "ค่าคอมมิชชันสูงสุด" },
  { value: "growth", label: "เติบโตเร็วที่สุด" },
  { value: "interest", label: "คะแนนความน่าสนใจสูงสุด" },
  { value: "salesRank", label: "อันดับยอดขายดีที่สุด" },
];

interface ProductSortSelectProps {
  value: ProductSortKey;
  onChange: (value: ProductSortKey) => void;
}

/** ตัวเลือกเรียงข้อมูลสินค้า ใช้บนหน้า Product Radar (หน้าค้นหาและคัดสินค้า) */
export function ProductSortSelect({ value, onChange }: ProductSortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ProductSortKey)}>
      <SelectTrigger className="rounded-full">
        <SelectValue placeholder="เรียงข้อมูล">
          {(v: ProductSortKey) => SORT_OPTIONS.find((option) => option.value === v)?.label ?? "เรียงข้อมูล"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
