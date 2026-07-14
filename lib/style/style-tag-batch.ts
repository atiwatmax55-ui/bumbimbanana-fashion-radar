/**
 * Style Metadata — Batch job (เฟส 2.1/2.2)
 * รันต่อท้ายทุกรอบ sync (ทุก 6 ชม.) — หยิบเฉพาะสินค้าที่ style_tagged_at ยังเป็น null
 * จำกัดจำนวน/รอบเพื่อคุมโควตา + เวลา — รอบถัดไปจะหยิบตัวที่เหลือต่อเอง (cursor = style_tagged_at IS NULL)
 *
 * เลือก AI provider อัตโนมัติ:
 *   1. GEMINI_API_KEY → Google Gemini (ตัวหลัก — Free Tier ไม่ต้องผูกบัตร)
 *   2. ANTHROPIC_API_KEY → Claude (ระบบเดิม คงไว้เป็นตัวสำรอง)
 *   3. ไม่มีทั้งคู่ → ข้ามทั้ง batch (ไม่ error)
 */
import type { getSupabaseServerClient } from "@/lib/supabase/server";
import { extractStyleFromTitle } from "@/lib/style/thai-keyword-extractor";
import { tagProductImageWithVision } from "@/lib/style/vision-tagger";
import {
  isGeminiConfigured,
  tagProductImageWithGemini,
  type GeminiTagOutcome,
} from "@/lib/style/gemini-vision-tagger";

const CLAUDE_BATCH_SIZE = 50;
/** Gemini free tier จำกัด ~10-15 คำขอ/นาที + route มี maxDuration 60 วิ — เอาน้อยแต่ชัวร์ */
const GEMINI_BATCH_SIZE = 8;
/** เว้นระยะระหว่างคำขอ Gemini กันชน rate limit ต่อนาที (15 RPM = 1 คำขอ/4 วิ) */
const GEMINI_CALL_SPACING_MS = 4_000;
/** งบเวลาของ batch — เกินแล้วหยุด เหลือเท่าไหร่รอบ sync หน้าเก็บต่อ (route จำกัด 60 วิรวม import) */
const TIME_BUDGET_MS = 35_000;
/** error ติดกันกี่ครั้งถึงยอมแพ้รอบนี้ (กัน API ล่มแล้วไล่ยิงต่อจนหมดเวลา) */
const MAX_CONSECUTIVE_ERRORS = 3;

type StyleTagRow = {
  id: number;
  title: string | null;
  product_name: string | null;
  product_image: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** ห่อ Claude tagger เดิม (ห้ามแก้ไฟล์นั้น) ให้คืน outcome รูปแบบเดียวกับ Gemini */
async function tagWithClaude(
  imageUrl: string | null,
  title: string,
): Promise<GeminiTagOutcome> {
  if (!imageUrl) return { ok: false, reason: "no_image" };
  const result = await tagProductImageWithVision(imageUrl, title);
  return result ? { ok: true, result } : { ok: false, reason: "error" };
}

/**
 * แท็ก style metadata ให้สินค้าที่ยังไม่เคยทำ (เรียงตามยอดขายสะสม มากก่อน)
 * คืนข้อความสรุปสั้น ๆ ต่อท้าย log ของ sync — ไม่ throw เด็ดขาด (sync ต้องไม่ล้มเพราะ batch นี้)
 */
export async function runStyleTagBatch(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  batchSize?: number,
): Promise<string> {
  const provider: "gemini" | "claude" | null = isGeminiConfigured()
    ? "gemini"
    : process.env.ANTHROPIC_API_KEY
      ? "claude"
      : null;
  if (!provider) return "";

  const limit = batchSize ?? (provider === "gemini" ? GEMINI_BATCH_SIZE : CLAUDE_BATCH_SIZE);

  const { data, error } = await supabase
    .from("products")
    .select("id, title, product_name, product_image")
    .is("style_tagged_at", null)
    .order("item_sold", { ascending: false })
    .limit(limit);

  if (error) return ` | style-tag ล้มเหลว: ${error.message}`;
  if (!data || data.length === 0) return "";

  const startedAt = Date.now();
  let visionOk = 0;
  let ruleOnly = 0;
  let retryLater = 0;
  let consecutiveErrors = 0;
  let stopNote = "";
  let calledApi = false;

  for (const row of data as StyleTagRow[]) {
    // งบเวลา: route sync มีเพดาน 60 วิรวมงาน import — batch นี้ห้ามกินเกิน ~35 วิ
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      stopNote = " (หมดงบเวลารอบนี้ ที่เหลือรอรอบถัดไป)";
      break;
    }

    const title = (row.title || row.product_name || "").trim();
    const rule = extractStyleFromTitle(title);

    // เว้นระยะระหว่างคำขอ Gemini กันชน rate limit ต่อนาทีของ free tier
    if (provider === "gemini" && calledApi) await sleep(GEMINI_CALL_SPACING_MS);
    calledApi = true;

    const outcome =
      provider === "gemini"
        ? await tagProductImageWithGemini(row.product_image, title)
        : await tagWithClaude(row.product_image, title);

    if (!outcome.ok && outcome.reason === "quota") {
      // โควตาฟรีหมด — หยุดทันที ไม่แตะแถวที่เหลือ (style_tagged_at ยัง null รอบหน้าหยิบต่อเอง)
      stopNote = " (โควตา Gemini หมด — รอรอบถัดไป)";
      break;
    }

    if (!outcome.ok && outcome.reason === "error") {
      // พังชั่วคราว — ไม่ mark ว่าเสร็จ ให้รอบหน้าลองแถวนี้ใหม่
      retryLater++;
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        stopNote = ` (หยุดเพราะ error ติดกัน ${MAX_CONSECUTIVE_ERRORS} ครั้ง)`;
        break;
      }
      continue;
    }

    consecutiveErrors = 0;

    let colors = rule.colors;
    let styleTags = rule.styleTags;
    let silhouette: string | null = rule.silhouette;
    let fabric = rule.fabric;
    let detailPoints = rule.detailPoints;
    let contentWorthyScore: number | null = null;

    if (outcome.ok) {
      visionOk++;
      const v = outcome.result;
      colors = v.colors.length > 0 ? v.colors : colors;
      styleTags = v.styleTags.length > 0 ? v.styleTags : styleTags;
      silhouette = v.silhouette || silhouette;
      fabric = v.fabric ?? fabric;
      detailPoints = v.detailPoints.length > 0 ? v.detailPoints : detailPoints;
      contentWorthyScore = v.contentWorthyScore;
    } else {
      // no_image: ไม่มีรูปให้ AI ดูตลอดกาล — บันทึกผลจาก rule-based แล้วปิดงานแถวนี้
      ruleOnly++;
    }

    await supabase
      .from("products")
      .update({
        colors: colors.length > 0 ? colors : null,
        style_tags: styleTags.length > 0 ? styleTags : null,
        silhouette,
        fabric,
        detail_points: detailPoints.length > 0 ? detailPoints : null,
        content_worthy_score: contentWorthyScore,
        style_tagged_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  const tagged = visionOk + ruleOnly;
  const retryNote = retryLater > 0 ? `, รอลองใหม่ ${retryLater}` : "";
  return ` | style-tag[${provider}] เสร็จ ${tagged} ตัว (vision ${visionOk}, rule-only ${ruleOnly}${retryNote})${stopNote}`;
}
