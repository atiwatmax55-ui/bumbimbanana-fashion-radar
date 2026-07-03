"use client";

import { useMemo } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { Product } from "@/types/product";
import { buildProductColumns } from "@/components/products/product-columns";

interface ProductTableProps {
  products: Product[];
  isSaved: (productId: string) => boolean;
  onToggleSave: (productId: string) => void;
  isUserProduct: (productId: string) => boolean;
  onEdit: (product: Product) => void;
  onRemove: (productId: string) => void;
}

/** ตารางสินค้าสำหรับหน้าจอคอมพิวเตอร์ของ Product Radar (ใช้ TanStack Table) */
export function ProductTable({
  products,
  isSaved,
  onToggleSave,
  isUserProduct,
  onEdit,
  onRemove,
}: ProductTableProps) {
  const columns = useMemo(
    () => buildProductColumns({ isSaved, onToggleSave, isUserProduct, onEdit, onRemove }),
    [isSaved, onToggleSave, isUserProduct, onEdit, onRemove]
  );

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[1400px] border-collapse text-left">
        <thead className="bg-brand-cream">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted-foreground"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className={`border-t border-border ${index % 2 === 1 ? "bg-muted/40" : "bg-card"}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                ไม่พบสินค้าที่ตรงกับตัวกรองที่เลือก
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
