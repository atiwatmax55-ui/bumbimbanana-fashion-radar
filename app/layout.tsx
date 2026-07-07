import type { Metadata } from "next";
import { Anton, Archivo, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { TopUtilityBar } from "@/components/layout/top-utility-bar";
import { MainNavbar } from "@/components/layout/main-navbar";
import { BottomNav } from "@/components/layout/bottom-nav";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// ฟอนต์หัวข้อใหญ่แนว Sport-Luxury (อังกฤษ) — ไทยตกไปใช้ Noto Sans Thai หนาอัตโนมัติ
const anton = Anton({
  variable: "--font-display-latin",
  subsets: ["latin"],
  weight: "400",
});

// ฟอนต์ UI ละติน — จับคู่กับ Noto Sans Thai
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BUMBIMBANANA Fashion Product Radar",
  description:
    "เรดาร์คัดสินค้าเสื้อผ้าแฟชั่นผู้หญิงจาก Shopee Thailand ที่กำลังมาแรง ขายดี และค่าคอมสูง สำหรับวางแผนทำคอนเทนต์ Affiliate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${anton.variable} ${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <TopUtilityBar />
        <MainNavbar />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
