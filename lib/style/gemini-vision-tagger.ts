/**
 * Style Metadata — Google Gemini vision tagger (ตัวหลัก แทน Claude เพราะมี Free Tier ไม่ต้องผูกบัตร)
 * ให้ผลลัพธ์ shape เดียวกับ lib/style/vision-tagger.ts (VisionTagResult) ทุกประการ
 * โค้ดฝั่ง batch/DB จึงสลับ provider ได้โดยไม่ต้องแก้อะไร
 *
 * Server-only — ต้องตั้งค่า GEMINI_API_KEY ใน .env.local (ห้าม prefix NEXT_PUBLIC_)
 * สร้างคีย์ฟรีได้ที่ https://aistudio.google.com/apikey (ใช้บัญชี Google ธรรมดา)
 *
 * เรียกผ่าน REST API ตรง ๆ (raw fetch) ไม่เพิ่ม dependency — คีย์ส่งใน header
 * x-goog-api-key เท่านั้น ห้ามใส่ใน URL query (กันคีย์หลุดลง log/error)
 */
import type { VisionTagResult } from "@/lib/style/vision-tagger";

/**
 * รุ่น default — เปลี่ยนได้ผ่าน env GEMINI_MODEL
 * ใช้ตระกูล flash-lite เพราะโควตาฟรีต่อวันสูงสุด (รุ่น 2.5-flash-lite เดิมปิดรับบัญชีใหม่แล้ว
 * — ทดสอบจริง 2026-07-14 บัญชีใหม่ใช้ 3.1-flash-lite ได้)
 */
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 30_000;

/**
 * ผลการเรียก 1 ครั้ง — แยกเหตุผลที่พังเพื่อให้ batch ตัดสินใจถูก:
 * quota = โควตาฟรีหมด (หยุดทั้ง batch รอรอบถัดไป) | error = พังชั่วคราว (ข้ามแถวนี้ ลองใหม่รอบหน้า)
 * no_image = ไม่มีรูป/โหลดรูปไม่ได้ (แท็กด้วย rule-based แล้วปิดงานแถวนี้ได้เลย)
 */
export type GeminiTagOutcome =
  | { ok: true; result: VisionTagResult }
  | { ok: false; reason: "quota" | "error" | "no_image" };

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

// ─── โหลดรูปสินค้าเป็น base64 (Gemini ไม่รับ URL ตรง ๆ ต่างจาก Claude) ─────────
async function fetchImageAsBase64(
  url: string,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;

    return { mimeType: contentType, data: Buffer.from(buf).toString("base64") };
  } catch {
    return null;
  }
}

// ─── Schema บังคับให้ Gemini ตอบ JSON โครงเดียวกับ Claude tagger เดิม ──────────
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    colors: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "สีหลักของสินค้า 1-3 สี เป็นภาษาไทย เช่น ครีม, น้ำตาล",
    },
    style_tags: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "แท็กสไตล์ภาษาไทย เช่น มินิมอล, เกาหลี, Y2K, สปอร์ต",
    },
    silhouette: {
      type: "STRING",
      description: "ทรงตัดภาษาไทย เช่น ครอป, โอเวอร์ไซส์, เอวสูง",
    },
    fabric: {
      type: "STRING",
      nullable: true,
      description: "เนื้อผ้าภาษาไทย ถ้าดูจากภาพไม่ออกให้เป็น null",
    },
    detail_points: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "จุดเด่นการออกแบบภาษาไทย เช่น โบว์, ลูกไม้, กระดุมเยอะ",
    },
    content_worthy_score: {
      type: "INTEGER",
      description:
        "0-100 ความน่าถ่ายทำคอนเทนต์: ความคมชัดของรูป + จุดเด่น/ดีเทลพิเศษ + สีสันสะดุดตา + ทรงตัดดูดี",
    },
  },
  required: ["colors", "style_tags", "silhouette", "fabric", "detail_points", "content_worthy_score"],
};

type GeminiRawResult = {
  colors?: string[];
  style_tags?: string[];
  silhouette?: string;
  fabric?: string | null;
  detail_points?: string[];
  content_worthy_score?: number;
};

/**
 * แท็กสินค้า 1 ชิ้นจากรูปด้วย Gemini — ไม่ throw เด็ดขาด (คืน outcome ให้ batch ตัดสินใจ)
 */
export async function tagProductImageWithGemini(
  imageUrl: string | null,
  title: string,
): Promise<GeminiTagOutcome> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "error" };
  if (!imageUrl) return { ok: false, reason: "no_image" };

  const image = await fetchImageAsBase64(imageUrl);
  if (!image) return { ok: false, reason: "no_image" };

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          // คีย์อยู่ใน header เท่านั้น — ห้ามต่อท้าย URL (?key=...) เพราะ URL มักติดไปกับ log
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: image.mimeType, data: image.data } },
                {
                  text:
                    `วิเคราะห์รูปสินค้าแฟชั่นผู้หญิงนี้ (ชื่อสินค้า: "${title}") ` +
                    `แล้วตอบเป็น JSON ตาม schema — เป็นภาษาไทยทุกช่อง`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            maxOutputTokens: 1000,
            temperature: 0.2,
          },
        }),
      },
    );
    clearTimeout(timeoutId);

    // 429 = โควตา free tier หมด (RESOURCE_EXHAUSTED) — ต้องหยุดทั้ง batch ไม่ใช่แค่ข้าม
    if (res.status === 429) {
      console.warn("[gemini-tagger] โควตา Gemini หมด (HTTP 429) — หยุดรอบนี้ รอรอบถัดไป");
      return { ok: false, reason: "quota" };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[gemini-tagger] Gemini ตอบ HTTP ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, reason: "error" };
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };

    if (json.promptFeedback?.blockReason) {
      console.warn(`[gemini-tagger] ถูก block: ${json.promptFeedback.blockReason}`);
      return { ok: false, reason: "error" };
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, reason: "error" };

    const parsed = JSON.parse(text) as GeminiRawResult;

    return {
      ok: true,
      result: {
        colors: parsed.colors ?? [],
        styleTags: parsed.style_tags ?? [],
        silhouette: parsed.silhouette ?? "",
        fabric: parsed.fabric ?? null,
        detailPoints: parsed.detail_points ?? [],
        contentWorthyScore: Math.max(0, Math.min(100, Math.round(parsed.content_worthy_score ?? 0))),
      },
    };
  } catch (e) {
    console.warn("[gemini-tagger] เรียก Gemini ไม่สำเร็จ:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "error" };
  }
}
