import { parseRow } from "@/lib/shopee/csv-parser";
import type { TiktokRawItem } from "@/lib/tiktok/normalize-tiktok-item";

/**
 * แม็ปหัวคอลัมน์ภาษาไทย (ตาม data contract — docs/TIKTOK_IMPORT_FABLE_PLAN.md หัวข้อ 5)
 * → field ภายใน รองรับช่องว่างรอบวงเล็บที่ต่างกันเล็กน้อย
 */
const HEADER_ALIASES: Record<string, keyof TiktokRawItem> = {
  "ชื่อสินค้า": "productName",
  "ราคา": "price",
  "ค่าคอม(%)": "commissionRate",
  "ค่าคอม (%)": "commissionRate",
  "ค่าคอมมิชชัน(%)": "commissionRate",
  "ค่าคอมมิชชัน (%)": "commissionRate",
  "ลิงก์สินค้า": "productUrl",
  "ลิงก์รูป": "productImage",
  "ยอดขายโดยประมาณ": "estimatedSold",
  "หมวดหมู่": "category",
  "ชื่อร้าน": "shopName",
};

const REQUIRED_FIELDS: (keyof TiktokRawItem)[] = ["productName", "price", "commissionRate", "productUrl"];

export interface ParseTextResult {
  items: TiktokRawItem[];
  /** error ระดับไฟล์ทั้งหมด เช่น หัวคอลัมน์ไม่ครบ / JSON parse ไม่ได้ — items ว่างเมื่อมี error นี้ */
  error: string | null;
}

function looksLikeJson(text: string): boolean {
  const t = text.trim();
  return t.startsWith("{") || t.startsWith("[");
}

function headerLabel(field: keyof TiktokRawItem): string {
  return Object.entries(HEADER_ALIASES).find(([, v]) => v === field)?.[0] ?? field;
}

function parseJsonInput(text: string): ParseTextResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { items: [], error: "แปลง JSON ไม่สำเร็จ — ตรวจรูปแบบข้อความอีกครั้ง" };
  }

  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : null;

  if (!arr) {
    return { items: [], error: 'รูปแบบ JSON ไม่ถูกต้อง — ต้องเป็น { "items": [...] } หรือ array ของรายการสินค้า' };
  }

  const items = arr.map((raw) => (raw && typeof raw === "object" ? (raw as TiktokRawItem) : {}));
  return { items, error: null };
}

function parseDelimitedInput(text: string): ParseTextResult {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { items: [], error: "ไม่พบข้อมูล" };
  }

  // รองรับวางจาก Excel/Google Sheets (คั่นด้วย tab) หรือ CSV ทั่วไป (คั่นด้วย comma)
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headerCells = parseRow(lines[0], delimiter).map((h) => h.replace(/^﻿/, "").trim());
  const fieldByColumn: (keyof TiktokRawItem | null)[] = headerCells.map((h) => HEADER_ALIASES[h] ?? null);

  const missing = REQUIRED_FIELDS.filter((f) => !fieldByColumn.includes(f));
  if (missing.length > 0) {
    return {
      items: [],
      error: `หัวตารางไม่ครบ — ขาดคอลัมน์: ${missing.map(headerLabel).join(", ")}`,
    };
  }

  if (lines.length === 1) {
    return { items: [], error: "มีแต่หัวตาราง ไม่มีข้อมูลสินค้า" };
  }

  const items: TiktokRawItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i], delimiter);
    const item: TiktokRawItem = {};
    fieldByColumn.forEach((field, idx) => {
      if (field) (item[field] as string) = (cells[idx] ?? "").trim();
    });
    items.push(item);
  }

  return { items, error: null };
}

/** จุดเข้าหลัก: แปลงข้อความที่วาง (CSV/TSV ตาม data contract หรือ JSON) เป็นรายการดิบ */
export function parseTiktokInputText(text: string): ParseTextResult {
  if (!text.trim()) return { items: [], error: "ไม่พบข้อมูล — กรุณาวางข้อมูลก่อน" };
  return looksLikeJson(text) ? parseJsonInput(text) : parseDelimitedInput(text);
}
