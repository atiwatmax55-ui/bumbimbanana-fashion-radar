/**
 * Fashion Category Filter สำหรับ Shopee Product Feed
 *
 * ใช้ Whitelist แบบเข้มงวด (ชื่อหมวดจริงจาก Feed) แทน keyword matching
 * เพื่อกำจัด false positive จากคำว่า "accessories" ที่จับหมวดรถยนต์/คอม/สัตว์เลี้ยงติดมาด้วย
 */

/** หมวดสินค้าแฟชั่นที่ยืนยันแล้วว่ามีอยู่ใน Feed จริง */
export const FASHION_WHITELIST_ITEMS: ReadonlyArray<string> = [
  "Women Clothes",
  "Women Bags",
  "Women Shoes",
  "Women Watches",
  "Fashion Accessories",
  "Dresses",
  "Skirts",
  "Hoodies & Sweatshirts",
  "Lingerie & Underwear",
  "Innerwear & Underwear",
  "Hair Accessories",
  "Fine Jewelry",
  "Eyewear",
  "Loafers & Boat Shoes",
  "Sleepwear",
  "Sleepwear & Pajamas",
  "Traditional Wear",
  "Wedding Dresses",
  "Women Muslim Wear",
  "Men Clothes",
  "Men Bags",
  "Men Shoes",
  "Men Muslim Wear",
  "Baby & Kids Fashion",
  "Baby Clothes",
  "Girl Clothes",
  "Girl Shoes",
  "Boy Clothes",
  "Boy Shoes",
  "Sports Footwear",
  "Sports & Outdoor Apparel",
];

/**
 * หมวดสินค้าที่ไม่ใช่แฟชั่น — ใช้เป็น Exclusion List
 * ส่วนใหญ่ซ้อนทับกับ keyword เดิม (เช่น "accessories") แต่ไม่ติด Whitelist แล้ว
 * เก็บไว้เพื่อเป็นเอกสารและ safety net ในอนาคต
 */
export const FASHION_EXCLUSION_ITEMS: ReadonlyArray<string> = [
  "Automobile Accessories",
  "Automobile Exterior Accessories",
  "Automobile Interior Accessories",
  "Computer Accessories",
  "Camera Accessories",
  "Console Accessories",
  "Drone Accessories",
  "Lens Accessories",
  "Laptop Bags",
  "Motorcycle Accessories",
  "Motorcycle Helmets & Accessories",
  "Pet Accessories",
  "Pet Clothing & Accessories",
  "TVs & Accessories",
  "Mobile & Gadgets",
  "Home & Living",
  "Home Appliances",
  "Sports & Outdoors",
  "Baby & Kids Accessories",
  "Medical / Health accessories",
];

// Pre-normalize เป็น lowercase Set สำหรับ O(1) lookup
const WHITELIST_LOWER = new Set(FASHION_WHITELIST_ITEMS.map((c) => c.toLowerCase()));
const EXCLUSION_LOWER = new Set(FASHION_EXCLUSION_ITEMS.map((c) => c.toLowerCase()));

function norm(cat: string): string {
  return cat.trim().toLowerCase();
}

export function isFashionWhitelisted(cat: string): boolean {
  return Boolean(cat) && WHITELIST_LOWER.has(norm(cat));
}

export function isFashionExcluded(cat: string): boolean {
  return Boolean(cat) && EXCLUSION_LOWER.has(norm(cat));
}

/**
 * วิธีใหม่ (เข้มงวด): ตรวจสอบด้วย Whitelist ที่ยืนยันแล้ว
 * - ถ้า cat ใดอยู่ใน Whitelist → ถือว่าเป็นแฟชั่น (ไม่สนใจ Exclusion)
 * - สินค้าที่ไม่มีหมวดใดใน Whitelist เลย → ไม่ใช่แฟชั่น
 */
export function isFashionByWhitelist(cat1: string, cat2: string, cat3?: string): boolean {
  return (
    isFashionWhitelisted(cat1) ||
    isFashionWhitelisted(cat2) ||
    (cat3 !== undefined && isFashionWhitelisted(cat3))
  );
}

// ─── วิธีเดิม (keyword) สำหรับนับ "ก่อนกรอง" เพื่อเปรียบเทียบ ────────────────

const FASHION_KEYWORDS_TH = [
  "แฟชั่น", "เสื้อผ้า", "เสื้อ", "กางเกง", "กระโปรง", "เดรส", "ชุด",
  "รองเท้า", "กระเป๋า", "เครื่องประดับ", "จิวเวลรี่", "สตรี", "ผ้า",
];
const FASHION_KEYWORDS_EN = [
  "fashion", "clothing", "clothes", "apparel", "shirt", "pants", "skirt",
  "dress", "wear", "shoes", "bag", "handbag", "jewelry", "accessories",
  "outfit", "women", "woman",
];

/**
 * วิธีเดิม: keyword substring matching
 * มี false positive เพราะ "accessories" จับหมวดรถยนต์/คอม/สัตว์เลี้ยงด้วย
 * ยังเก็บไว้เพื่อแสดงยอด "ก่อนกรอง" ให้เปรียบเทียบ
 */
export function isFashionByKeyword(cat: string): boolean {
  if (!cat) return false;
  const lower = cat.toLowerCase();
  return (
    FASHION_KEYWORDS_TH.some((k) => lower.includes(k)) ||
    FASHION_KEYWORDS_EN.some((k) => lower.includes(k))
  );
}
