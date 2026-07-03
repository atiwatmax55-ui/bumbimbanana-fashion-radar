import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type { SupabaseClient };

/**
 * สร้าง Supabase client ฝั่ง server โดยใช้ service role key
 * ใช้ได้เฉพาะใน Server Components และ Route Handlers เท่านั้น (ห้าม import ฝั่ง client)
 *
 * ต้องตั้งค่า environment variables ใน .env.local ก่อน:
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "ไม่พบการตั้งค่า SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY — ดู .env.example สำหรับวิธีตั้งค่า",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** ตรวจสอบว่าตั้งค่า Supabase ไว้แล้วหรือยัง (ไม่ throw) */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
