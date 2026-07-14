/**
 * Style Metadata — Rule-based extractor (เฟส 2.1)
 * ดึง colors/styleTags/silhouette/fabric/detailPoints จากชื่อสินค้าภาษาไทยด้วย keyword rules
 * เป้าหมาย ~70% coverage — ที่เหลือให้ AI vision (lib/style/vision-tagger.ts) เติมเฉพาะช่องที่ขาด
 */

const COLOR_KEYWORDS = [
  "ดำ", "ขาว", "แดง", "ฟ้า", "น้ำเงิน", "เขียว", "เหลือง", "ส้ม",
  "ชมพู", "ม่วง", "น้ำตาล", "เทา", "ครีม", "เบจ", "กรม", "ทอง", "เงิน", "กากี",
];

const STYLE_TAG_KEYWORDS = [
  "มินิมอล", "เกาหลี", "วินเทจ", "หวาน", "เท่", "คลาสสิก", "ลำลอง",
  "หรูหรา", "เรียบหรู", "สปอร์ต", "ญี่ปุ่น", "ฝรั่งเศส", "y2k",
];

/** ลำดับตรวจสำคัญก่อน — คำที่เจอก่อนใน title ชนะ (กันเคส "ครอปโอเวอร์ไซส์" ชนกัน) */
const SILHOUETTE_KEYWORDS = [
  "โอเวอร์ไซส์", "ครอป", "เอวสูง", "เข้ารูป", "ทรงเอ", "ทรงตรง", "บอดี้คอน",
];

const FABRIC_KEYWORDS = [
  "คอตตอน", "ยีนส์", "เดนิม", "ลินิน", "ซาติน", "ผ้าฝ้าย", "ลูกไม้ทั้งตัว",
  "หนัง", "ผ้าไหม", "เกล็ดปลา", "โพลีเอสเตอร์",
];

const DETAIL_KEYWORDS = [
  "โบว์", "ลูกไม้", "กระดุม", "ซิป", "แต่งระบาย", "จับจีบ", "ปัก", "สายเดี่ยว", "แขนพอง",
];

function findAllMatches(title: string, keywords: string[], max: number): string[] {
  const lower = title.toLowerCase();
  const found: string[] = [];
  for (const kw of keywords) {
    if (found.length >= max) break;
    if (lower.includes(kw.toLowerCase())) found.push(kw);
  }
  return found;
}

function findFirstMatch(title: string, keywords: string[]): string | null {
  const lower = title.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return kw;
  }
  return null;
}

export type StyleCoverage = "full" | "partial" | "none";

export interface StyleExtractionResult {
  colors: string[];
  styleTags: string[];
  silhouette: string | null;
  fabric: string | null;
  detailPoints: string[];
  /** "full" = ครบทุกช่อง (colors+styleTags+silhouette) ไม่ต้องเรียก AI vision เพิ่ม */
  coverage: StyleCoverage;
}

/** ดึง style metadata จากชื่อสินค้าล้วน ๆ (ไม่ใช้รูป) — เร็ว ไม่มีค่าใช้จ่าย */
export function extractStyleFromTitle(title: string): StyleExtractionResult {
  const colors = findAllMatches(title, COLOR_KEYWORDS, 3);
  const styleTags = findAllMatches(title, STYLE_TAG_KEYWORDS, 3);
  const silhouette = findFirstMatch(title, SILHOUETTE_KEYWORDS);
  const fabric = findFirstMatch(title, FABRIC_KEYWORDS);
  const detailPoints = findAllMatches(title, DETAIL_KEYWORDS, 3);

  const hasAny = colors.length > 0 || styleTags.length > 0 || silhouette || fabric || detailPoints.length > 0;
  const isFull = colors.length > 0 && styleTags.length > 0 && silhouette !== null;

  return {
    colors,
    styleTags,
    silhouette,
    fabric,
    detailPoints,
    coverage: isFull ? "full" : hasAny ? "partial" : "none",
  };
}
