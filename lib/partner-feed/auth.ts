import type { NextRequest } from "next/server";

/**
 * ตรวจสิทธิ์เรียก /api/partner-feed/* — bearer token เทียบกับ PARTNER_FEED_TOKEN
 * ไม่มี dev-bypass (ต่างจาก CRON_SECRET ใน shopee/sync) เพราะ endpoint นี้ให้บุคคลภายนอกเรียก
 */
export function checkPartnerFeedAuth(request: NextRequest): { allowed: boolean; error?: string } {
  const token = process.env.PARTNER_FEED_TOKEN;
  if (!token) {
    return {
      allowed: false,
      error: "PARTNER_FEED_TOKEN ยังไม่ได้ตั้งค่าในระบบ — endpoint นี้ปิดใช้งานจนกว่าจะตั้งค่า",
    };
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${token}`) {
    return { allowed: false, error: "ไม่ได้รับอนุญาต — Authorization header ไม่ถูกต้อง" };
  }

  return { allowed: true };
}
