import type { Metadata } from "next";
import { Noto_Sans_Thai, Noto_Serif_Thai, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// ฟอนต์หัวเรื่องแนว Fashion Editorial — serif ไทย + ละติน
const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-display-thai",
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-display-latin",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    <html lang="th" className={`${notoSansThai.variable} ${notoSerifThai.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
