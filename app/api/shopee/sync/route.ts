import { NextRequest, NextResponse } from "next/server";
import { POST as importHandler } from "@/app/api/shopee/import/route";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function checkAuth(request: NextRequest): { allowed: boolean; error?: string } {
  const isDev = process.env.NODE_ENV === "development";

  // ใน development อนุญาต manual sync โดยไม่ต้องส่ง secret
  if (isDev) return { allowed: true };

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return {
      allowed: false,
      error:   "CRON_SECRET ยังไม่ได้ตั้งค่าในระบบ — ห้าม Sync ใน Production โดยไม่มี Secret",
    };
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return {
      allowed: false,
      error:   "ไม่ได้รับอนุญาต — Authorization header ไม่ถูกต้อง",
    };
  }

  return { allowed: true };
}

// ─── Core sync ────────────────────────────────────────────────────────────────

async function runSync(
  request:     NextRequest,
  triggeredBy: "cron" | "manual",
): Promise<NextResponse> {
  // 1. ตรวจ Authorization
  const auth = checkAuth(request);
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // 2. ห้าม sync ถ้าไม่มี Supabase (= Mock Data mode)
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "ไม่พบการตั้งค่า Supabase — Sync รองรับเฉพาะโหมด Shopee เท่านั้น" +
          " (Mock Data mode ไม่สามารถ Sync ได้)",
      },
      { status: 503 },
    );
  }

  // 3. ส่งต่อไปยัง import handler (top 3,000 สินค้าแฟชั่นผู้หญิง)
  const fakeReq = new NextRequest("http://localhost/api/shopee/import", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ mode: "import", limit: 3000 }),
  });

  const importRes  = await importHandler(fakeReq);
  const data       = (await importRes.json()) as Record<string, unknown>;

  const importResult = data.importResult as
    | { inserted?: number; updated?: number; failed?: number; completedAt?: string }
    | undefined;
  const planSummary = data.planSummary as { skipped?: number } | undefined;

  return NextResponse.json({
    ...data,
    triggeredBy,
    // ฟิลด์สรุปที่ผู้เรียกใช้ได้ง่าย
    added:    importResult?.inserted  ?? 0,
    updated:  importResult?.updated   ?? 0,
    skipped:  planSummary?.skipped    ?? 0,
    failed:   importResult?.failed    ?? 0,
    syncedAt: importResult?.completedAt ?? new Date().toISOString(),
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// GET: Vercel Cron เรียก endpoint นี้อัตโนมัติทุกวัน 07:30 น. (เวลาไทย / 00:30 UTC)
// Vercel จะแนบ Authorization: Bearer ${CRON_SECRET} ให้อัตโนมัติ
export async function GET(request: NextRequest): Promise<NextResponse> {
  return runSync(request, "cron");
}

// POST: ปุ่ม "อัปเดตข้อมูลตอนนี้" ใน local development
// (ใน production ต้องแนบ Authorization header ด้วย)
export async function POST(request: NextRequest): Promise<NextResponse> {
  return runSync(request, "manual");
}
