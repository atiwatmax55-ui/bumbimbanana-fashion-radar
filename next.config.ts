import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // รูปสินค้าตัวอย่าง (Mock Data) เป็นไฟล์ SVG ที่สร้างขึ้นเองในโปรเจกต์ (public/products/)
    // ไม่ใช่ไฟล์จากภายนอก จึงเปิดใช้งานอย่างปลอดภัยได้
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
