import type { Metadata } from "next";
import { TiktokImportView } from "@/components/tiktok-import/tiktok-import-view";

export const metadata: Metadata = {
  title: "นำเข้าสินค้า TikTok Shop | BUMBIMBANANA Fashion Radar",
  description: "จดข้อมูลสินค้าจากศูนย์ครีเอเตอร์ TikTok Shop ของตัวเอง แล้วนำเข้าระบบด้วยฟอร์มหรือไฟล์ CSV",
};

export default function TiktokImportPage() {
  return <TiktokImportView />;
}
