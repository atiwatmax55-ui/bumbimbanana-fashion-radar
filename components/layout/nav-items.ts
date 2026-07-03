import { LayoutGrid, Radar, Bookmark, DatabaseZap, BadgePercent, Send } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "ภาพรวม", icon: LayoutGrid },
  { href: "/products", label: "ค้นหาสินค้า", icon: Radar },
  { href: "/saved", label: "บันทึกไว้", icon: Bookmark },
  { href: "/commission-import", label: "ค่าคอม", icon: BadgePercent },
  { href: "/data-status", label: "สถานะข้อมูล", icon: DatabaseZap },
] as const;

/** รายการเมนูรอง (ไม่แสดงใน Bottom Nav แต่ปรากฏใน Site Header) */
export const SECONDARY_NAV_ITEMS = [
  { href: "/agency-data", label: "ฝ่ายกลยุทธ์", icon: Send },
] as const;
