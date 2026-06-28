import { LayoutGrid, Radar, Bookmark, DatabaseZap } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "ภาพรวม", icon: LayoutGrid },
  { href: "/products", label: "ค้นหาสินค้า", icon: Radar },
  { href: "/saved", label: "บันทึกไว้", icon: Bookmark },
  { href: "/data-status", label: "สถานะข้อมูล", icon: DatabaseZap },
] as const;
