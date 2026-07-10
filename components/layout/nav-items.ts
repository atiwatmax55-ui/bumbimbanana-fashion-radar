import { LayoutGrid, Radar, Bookmark, DatabaseZap, BadgePercent, PackagePlus, Send } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "หน้าแรก", icon: LayoutGrid },
  { href: "/products", label: "เลือกดูสินค้า", icon: Radar },
  { href: "/saved", label: "บันทึกไว้", icon: Bookmark },
  { href: "/commission-import", label: "ค่าคอม", icon: BadgePercent },
  { href: "/tiktok-import", label: "นำเข้า TikTok", icon: PackagePlus },
  { href: "/data-status", label: "สถานะระบบ", icon: DatabaseZap },
] as const;

/** รายการเมนูรอง (ไม่แสดงใน Bottom Nav แต่ปรากฏใน Site Header) */
export const SECONDARY_NAV_ITEMS = [
  { href: "/agency-data", label: "ฝ่ายกลยุทธ์", icon: Send },
] as const;
