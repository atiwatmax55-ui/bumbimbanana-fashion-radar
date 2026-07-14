/**
 * ทดสอบ Gemini vision tagger ด้วยรูปสินค้าจริงจาก Supabase (ยิง API จริง 1 คำขอ)
 * วิธีรัน: npx tsx scripts/test-gemini-tagger.ts
 * ต้องมี GEMINI_API_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env.local
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// โหลด .env.local เอง (tsx ไม่โหลดให้อัตโนมัติ) — ค่าใน env จริงมาก่อนเสมอ
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^"(.*)"$/, "$1").trim();
    }
  } catch {
    // ไม่มี .env.local — ใช้ env ที่ตั้งไว้ในเชลล์
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ไม่พบ GEMINI_API_KEY ใน .env.local — สร้างคีย์ฟรีได้ที่ https://aistudio.google.com/apikey");
    process.exit(1);
  }

  // import หลังโหลด env เพื่อความชัดเจน (ทั้งสอง module อ่าน env ตอนเรียกฟังก์ชันอยู่แล้ว)
  const { getSupabaseServerClient } = await import("../lib/supabase/server");
  const { tagProductImageWithGemini } = await import("../lib/style/gemini-vision-tagger");

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, title, product_name, product_image")
    .not("product_image", "is", null)
    .order("item_sold", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("❌ ดึงสินค้าตัวอย่างจาก Supabase ไม่สำเร็จ:", error?.message ?? "ไม่มีข้อมูล");
    process.exit(1);
  }

  const row = data as { id: number; title: string | null; product_name: string | null; product_image: string };
  const title = (row.title || row.product_name || "").trim();
  console.log(`🧪 ทดสอบกับสินค้าจริง id=${row.id}`);
  console.log(`   ชื่อ: ${title.slice(0, 80)}`);
  console.log(`   รูป: ${row.product_image.slice(0, 80)}`);
  console.log("   กำลังเรียก Gemini...\n");

  const startedAt = Date.now();
  const outcome = await tagProductImageWithGemini(row.product_image, title);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (outcome.ok) {
    console.log(`✅ Gemini ตอบกลับสำเร็จใน ${elapsed} วิ ผลลัพธ์:`);
    console.log(JSON.stringify(outcome.result, null, 2));
    const r = outcome.result;
    const shapeOk =
      Array.isArray(r.colors) &&
      Array.isArray(r.styleTags) &&
      typeof r.silhouette === "string" &&
      Array.isArray(r.detailPoints) &&
      typeof r.contentWorthyScore === "number" &&
      r.contentWorthyScore >= 0 &&
      r.contentWorthyScore <= 100;
    console.log(shapeOk ? "\n🎉 โครงสร้าง JSON ครบถูกต้อง — Gemini พร้อมใช้งานจริง" : "\n⚠️ โครงสร้าง JSON ไม่ครบ — ตรวจ schema");
    process.exit(shapeOk ? 0 : 1);
  } else {
    const messages: Record<string, string> = {
      quota: "โควตา Gemini Free Tier หมดชั่วคราว — รอสักพักแล้วลองใหม่ (ระบบจริงจะรอรอบ sync ถัดไปเอง)",
      error: "เรียก Gemini ไม่สำเร็จ — ตรวจว่า GEMINI_API_KEY ถูกต้อง/อินเทอร์เน็ตใช้ได้ (ดู warning ด้านบนประกอบ)",
      no_image: "โหลดรูปสินค้าไม่ได้ — ลองรันใหม่ (อาจเป็นที่ CDN ของ Shopee ชั่วคราว)",
    };
    console.error(`❌ ไม่สำเร็จ (${outcome.reason}): ${messages[outcome.reason]}`);
    process.exit(1);
  }
}

main();
