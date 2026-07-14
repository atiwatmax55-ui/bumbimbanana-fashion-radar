/**
 * Style Metadata — AI Vision tagger (เฟส 2.1/2.2)
 * เรียก Claude API (vision) เฉพาะสินค้าที่ rule-based extractor (thai-keyword-extractor.ts)
 * ครอบไม่ครบ — ให้ผลลัพธ์เดียวกับ rules บวก content_worthy_score ที่ต้องใช้วิจารณญาณภาพจริง
 *
 * Server-only — ต้องตั้งค่า ANTHROPIC_API_KEY ใน .env.local (ห้าม prefix NEXT_PUBLIC_)
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export interface VisionTagResult {
  colors: string[];
  styleTags: string[];
  silhouette: string;
  fabric: string | null;
  detailPoints: string[];
  /** 0-100 คะแนน "น่าถ่ายทำคอนเทนต์" — ให้จากภาพจริง (ความคมชัด+จุดเด่น+สีสัน+ทรงตัด) */
  contentWorthyScore: number;
}

const TAG_SCHEMA = {
  type: "object" as const,
  properties: {
    colors: { type: "array", items: { type: "string" }, description: "สีหลัก 1-3 สี ภาษาไทย" },
    style_tags: { type: "array", items: { type: "string" }, description: "แท็กสไตล์ภาษาไทย เช่น มินิมอล, เกาหลี, Y2K" },
    silhouette: { type: "string", description: "ทรงตัดภาษาไทย เช่น ครอป, โอเวอร์ไซส์, เอวสูง" },
    fabric: { anyOf: [{ type: "string" }, { type: "null" }], description: "เนื้อผ้าภาษาไทย ถ้าดูจากภาพไม่ออกให้เป็น null" },
    detail_points: { type: "array", items: { type: "string" }, description: "จุดเด่นการออกแบบภาษาไทย เช่น โบว์, ลูกไม้" },
    content_worthy_score: {
      type: "integer",
      description: "0-100: ความน่าถ่ายทำคอนเทนต์ จากความคมชัดของรูป + มีจุดเด่น/ดีเทลพิเศษ + สีสันสะดุดตา + ทรงตัดดูดี",
    },
  },
  required: ["colors", "style_tags", "silhouette", "fabric", "detail_points", "content_worthy_score"],
  additionalProperties: false,
};

/** แท็กสินค้า 1 ชิ้นจากรูป — คืน null ถ้าไม่มี ANTHROPIC_API_KEY หรือเรียก API ไม่สำเร็จ (ไม่ throw กัน batch ทั้งชุดล้ม) */
export async function tagProductImageWithVision(
  imageUrl: string,
  title: string,
): Promise<VisionTagResult | null> {
  const anthropic = getClient();
  if (!anthropic || !imageUrl) return null;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      output_config: { format: { type: "json_schema", schema: TAG_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text:
                `วิเคราะห์รูปสินค้าแฟชั่นผู้หญิงนี้ (ชื่อสินค้า: "${title}") ` +
                `แล้วตอบเป็น JSON ตาม schema — เป็นภาษาไทยทุกช่อง`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) return null;

    const parsed = JSON.parse(textBlock.text) as {
      colors: string[];
      style_tags: string[];
      silhouette: string;
      fabric: string | null;
      detail_points: string[];
      content_worthy_score: number;
    };

    return {
      colors: parsed.colors ?? [],
      styleTags: parsed.style_tags ?? [],
      silhouette: parsed.silhouette ?? "",
      fabric: parsed.fabric ?? null,
      detailPoints: parsed.detail_points ?? [],
      contentWorthyScore: Math.max(0, Math.min(100, Math.round(parsed.content_worthy_score ?? 0))),
    };
  } catch (e) {
    console.warn("[vision-tagger] เรียก Claude API ไม่สำเร็จ:", e instanceof Error ? e.message : e);
    return null;
  }
}
