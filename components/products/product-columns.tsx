"use client";

import Link from "next/link";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaveProductButton } from "@/components/shared/save-product-button";
import {
  formatBaht,
  formatNumber,
  formatPercent,
  formatThaiDate,
  growthColorClass,
} from "@/lib/utils/format";

interface BuildColumnsArgs {
  isSaved: (productId: string) => boolean;
  onToggleSave: (productId: string) => void;
}

/** กำหนดคอลัมน์ตารางสินค้าสำหรับหน้าจอคอมพิวเตอร์ของ Product Radar (ใช้ TanStack Table) */
export function buildProductColumns({ isSaved, onToggleSave }: BuildColumnsArgs): ColumnDef<Product>[] {
  return [
    {
      id: "image",
      header: "รูปสินค้า",
      cell: ({ row }) => (
        <Image
          src={row.original.productImage}
          alt={row.original.productName}
          width={48}
          height={48}
          className="size-12 rounded-lg border border-border object-cover"
        />
      ),
    },
    {
      accessorKey: "productName",
      header: "ชื่อสินค้า",
      cell: ({ row }) => (
        <Link
          href={`/products/${row.original.id}`}
          className="line-clamp-2 max-w-50 text-sm font-semibold text-foreground hover:text-brand-gold-hover"
        >
          {row.original.productName}
        </Link>
      ),
    },
    {
      accessorKey: "category",
      header: "หมวดสินค้า",
      cell: ({ row }) => (
        <Badge variant="outline" className="border-border text-xs text-muted-foreground">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "shopName",
      header: "ชื่อร้าน",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.shopName}</span>,
    },
    {
      accessorKey: "price",
      header: "ราคา",
      cell: ({ row }) => <span className="text-sm font-semibold">{formatBaht(row.original.price)}</span>,
    },
    {
      accessorKey: "commissionRate",
      header: "ค่าคอมมิชชัน",
      cell: ({ row }) => (
        <span className="text-sm font-bold text-brand-gold-hover">
          {formatPercent(row.original.commissionRate)}
        </span>
      ),
    },
    {
      id: "sales7d",
      header: "ยอดขาย 7 วัน",
      cell: ({ row }) => <span className="text-sm">{formatNumber(row.original.sales7d)} ชิ้น</span>,
    },
    {
      id: "sales30d",
      header: "ยอดขาย 30 วัน",
      cell: ({ row }) => <span className="text-sm">{formatNumber(row.original.sales30d)} ชิ้น</span>,
    },
    {
      accessorKey: "estimatedRevenue",
      header: "รายได้โดยประมาณ",
      cell: ({ row }) => (
        <span className="text-sm font-semibold">{formatBaht(row.original.estimatedRevenue)}</span>
      ),
    },
    {
      accessorKey: "growthRate",
      header: "อัตราการเติบโต",
      cell: ({ row }) => (
        <span className={`text-sm font-bold ${growthColorClass(row.original.growthRate)}`}>
          {formatPercent(row.original.growthRate, true)}
        </span>
      ),
    },
    {
      accessorKey: "interestScore",
      header: "คะแนนความน่าสนใจ",
      cell: ({ row }) => <span className="text-sm font-bold">{row.original.interestScore}</span>,
    },
    {
      accessorKey: "salesRank",
      header: "อันดับยอดขาย",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">#{row.original.salesRank}</span>,
    },
    {
      accessorKey: "commissionRank",
      header: "อันดับค่าคอมมิชชัน",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">#{row.original.commissionRank}</span>,
    },
    {
      accessorKey: "growthRank",
      header: "อันดับการเติบโต",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">#{row.original.growthRank}</span>,
    },
    {
      accessorKey: "lastUpdatedAt",
      header: "วันที่อัปเดตล่าสุด",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatThaiDate(row.original.lastUpdatedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "การจัดการ",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            render={<Link href={`/products/${row.original.id}`} />}
            nativeButton={false}
          >
            ดูรายละเอียด
          </Button>
          <SaveProductButton
            isSaved={isSaved(row.original.id)}
            onToggle={() => onToggleSave(row.original.id)}
          />
        </div>
      ),
    },
  ];
}
