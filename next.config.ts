import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // รูป Mock Data เป็น SVG ใน public/products/ — เปิดใช้อย่างปลอดภัย
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // CDN รูปสินค้าจาก Shopee Product Feed
    remotePatterns: [
      { protocol: "https", hostname: "cf.shopee.co.th" },
      { protocol: "https", hostname: "*.shopee.co.th" },
      { protocol: "https", hostname: "down-th.img.susercontent.com" },
      { protocol: "https", hostname: "*.susercontent.com" },
      { protocol: "https", hostname: "*.shopee.com" },
    ],
  },
};

export default nextConfig;
