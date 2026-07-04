/**
 * Women's Fashion Filter v2 — Deny-First + Hierarchical Allow-List
 *
 * กติกา:
 * 1. DENY FIRST — ถ้าหมวดใดอยู่ใน deny list ตัดออกทันที (จัดการปัญหา "Men Clothes / Innerwear")
 * 2. ALLOW HIERARCHY — Women Clothes cat1 → ผ่านทุก subcat
 *                      Standalone women cat1 (Dresses, Skirts, ...) → ผ่าน
 *                      Fashion Accessories → ผ่านเฉพาะ subcat ที่ระบุ
 * 3. DEFAULT DENY — อื่น ๆ ทั้งหมดตัดออก
 *
 * ⚠️ ห้ามใช้ includes("men") — "women" มีคำ "men" อยู่ข้างใน ต้องใช้ exact Set lookup เท่านั้น
 */

// ─── Deny List ────────────────────────────────────────────────────────────────
// ถ้าหมวดใด (ระดับใดก็ตาม) ตรงกับ deny list → ตัดออกทันที ไม่ดูกฎอื่น

const DENY_SET = new Set<string>([
  "men clothes",
  "men bags",
  "men shoes",
  "men muslim wear",
  "boy clothes",
  "boy shoes",
  "baby clothes",
  "baby & kids fashion",
  "baby & kids accessories",
  "girl clothes",
  "girl shoes",
  "sports footwear",
  // v3 — เว็บนี้แสดงเฉพาะ "เสื้อผ้า" ผู้หญิงเท่านั้น: ตัดรองเท้า กระเป๋า
  // เครื่องประดับ นาฬิกา แว่นตา และของใช้อื่นออกทั้งหมด
  "women shoes",
  "women bags",
  "women watches",
  "fashion accessories",
  "fine jewelry",
  "hair accessories",
  "eyewear",
  "loafers & boat shoes",
  "jewellery",
  "jewelry",
  "watches",
  "bags",
  "shoes",
  "socks & stockings",
  "socks & tights",
  // ชุดชั้นใน/ชุดนอน — ไม่ใช่กลุ่มคอนเทนต์ของเว็บนี้ (ไม่มั่นใจ = ซ่อน)
  "lingerie & underwear",
  "innerwear & underwear",
  "sleepwear",
  "sleepwear & pajamas",
  "panties",
  "bras",
  "maternity wear",
  "safety pants",
  "shapewear",
  "costumes",
]);

// ─── Allow Lists ──────────────────────────────────────────────────────────────

/**
 * หมวดหลัก "เสื้อผ้าผู้หญิง" — เมื่อเป็น cat1 ให้ผ่านทุก subcat
 * ยกเว้น subcat ที่อยู่ใน DENY_SET (deny ตรวจก่อนเสมอ เช่น ถุงเท้า/ชุดชั้นใน)
 */
const CAT1_WOMEN_SET = new Set<string>([
  "women clothes",
]);

/**
 * หมวดเสื้อผ้าแฟชั่นผู้หญิงโดยตรง — เมื่อปรากฏเป็น cat1 ให้ผ่านได้เลย
 * (เดรส กระโปรง ชุดเซ็ต เสื้อฮู้ด/สเวตเตอร์ ชุดแต่งงาน — เป็นเสื้อผ้าทั้งหมด)
 */
const STANDALONE_WOMEN_SET = new Set<string>([
  "dresses",
  "skirts",
  "wedding dresses",
  "hoodies & sweatshirts",
  "sets",
  "jumpsuits, playsuits & overalls",
]);

// ─── Violation Sets (ใช้ตรวจสอบซ้ำหลัง filter) ───────────────────────────────

const VIOLATION_MEN_SET = new Set<string>([
  "men clothes",
  "men bags",
  "men shoes",
  "men muslim wear",
]);
const VIOLATION_BOY_GIRL_SET = new Set<string>([
  "boy clothes",
  "boy shoes",
  "girl clothes",
  "girl shoes",
]);
const VIOLATION_BABY_SET = new Set<string>([
  "baby clothes",
  "baby & kids fashion",
  "baby & kids accessories",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type WomenFashionRule =
  | "cat1_women"              // cat1 = Women Clothes (เสื้อผ้าผู้หญิง)
  | "standalone_women"        // cat1 ∈ Dresses/Skirts/Sets/…
  | "denied_cat1"             // cat1 ∈ deny list
  | "denied_cat2"             // cat2 ∈ deny list
  | "denied_cat3"             // cat3 ∈ deny list
  | "not_women_fashion";      // ไม่อยู่ใน allow list ใด

export type WomenFashionClassification = {
  pass: boolean;
  rule: WomenFashionRule;
  filterReason: string;
};

export type ProductViolation = {
  menViolation: boolean;
  boyGirlViolation: boolean;
  babyViolation: boolean;
  violatingCategory: string | null;
};

// ─── Functions ────────────────────────────────────────────────────────────────

function norm(cat: string): string {
  return cat.trim().toLowerCase();
}

/**
 * จำแนกสินค้าว่าเป็นแฟชั่นผู้หญิงหรือไม่
 * ใช้ deny-first + hierarchical allow — ห้ามใช้ includes("men")
 */
export function classifyWomenFashion(
  cat1: string,
  cat2: string,
  cat3: string | undefined,
): WomenFashionClassification {
  const n1 = norm(cat1);
  const n2 = norm(cat2);
  const n3 = cat3 ? norm(cat3) : "";

  // ─ Step 1: DENY FIRST ─────────────────────────────────────────────────────
  if (n1 && DENY_SET.has(n1)) {
    return { pass: false, rule: "denied_cat1", filterReason: `ตัดออก (cat1): ${cat1}` };
  }
  if (n2 && DENY_SET.has(n2)) {
    return { pass: false, rule: "denied_cat2", filterReason: `ตัดออก (cat2): ${cat2}` };
  }
  if (n3 && DENY_SET.has(n3)) {
    return { pass: false, rule: "denied_cat3", filterReason: `ตัดออก (cat3): ${cat3 ?? ""}` };
  }

  // ─ Step 2: Women's main cat1 → allow all subcategories ───────────────────
  if (CAT1_WOMEN_SET.has(n1)) {
    return {
      pass: true,
      rule: "cat1_women",
      filterReason: `เสื้อผ้าผู้หญิง: ${cat1}${cat2 ? ` / ${cat2}` : ""}`,
    };
  }

  // ─ Step 3: Standalone women fashion as cat1 ───────────────────────────────
  if (STANDALONE_WOMEN_SET.has(n1)) {
    return {
      pass: true,
      rule: "standalone_women",
      filterReason: `เสื้อผ้าแฟชั่นผู้หญิง: ${cat1}`,
    };
  }

  // ─ Step 4: Default deny ───────────────────────────────────────────────────
  return {
    pass: false,
    rule: "not_women_fashion",
    filterReason: `ไม่ใช่แฟชั่นผู้หญิง: ${cat1 || "ไม่มีหมวด"}`,
  };
}

/** ตรวจซ้ำหลัง filter — ต้องได้ 0 ทุกช่อง ก่อน Import */
export function validateProductCategories(
  cat1: string,
  cat2: string,
  cat3: string,
): ProductViolation {
  const cats = [cat1, cat2, cat3].filter(Boolean).map((c) => c.trim().toLowerCase());
  for (const c of cats) {
    if (VIOLATION_MEN_SET.has(c)) {
      return { menViolation: true, boyGirlViolation: false, babyViolation: false, violatingCategory: c };
    }
    if (VIOLATION_BOY_GIRL_SET.has(c)) {
      return { menViolation: false, boyGirlViolation: true, babyViolation: false, violatingCategory: c };
    }
    if (VIOLATION_BABY_SET.has(c)) {
      return { menViolation: false, boyGirlViolation: false, babyViolation: true, violatingCategory: c };
    }
  }
  return { menViolation: false, boyGirlViolation: false, babyViolation: false, violatingCategory: null };
}

// ─── Material / Tools / Care Deny Sets ───────────────────────────────────────
// ตัดออกหลังจากผ่าน women's filter แล้ว (ชั้นที่ 2)
// กำจัดวัสดุดิบ, อุปกรณ์ดูแล, และหมวดกว้างที่ไม่ใช่สินค้าพร้อมใส่

const MATERIAL_CATEGORY_DENY = new Set<string>([
  "fabric",
  "leather",
  "shoe care & accessories",
  "additional accessories",
  "accessories sets & packages",
  "product care",
  "cleaning",
  "repair",
  "tools",
  "materials",
]);

// Title keywords บ่งชี้ว่าเป็นวัสดุ/อุปกรณ์ (ตามที่ผู้ใช้ระบุ)
// ⚠️ ไม่มี "ผ้า" — เสื้อผ้าปกติมักมีคำนั้นอยู่
const MATERIAL_TITLE_KEYWORDS_TH = [
  "เครื่องมือ",
  "วัสดุ",
  "อะไหล่",
  "ซ่อม",
  "diy",
  "ยางดิบ",
  "หนังเทียม",
  "น้ำยาดูแลรองเท้า",
  "แปรงรองเท้า",
];
const MATERIAL_TITLE_KEYWORDS_EN = [
  "shoe care",
  "fabric",
  "material",
  "repair",
  "tools",
];

export type MaterialViolationResult = {
  violated: boolean;
  violationType: "category" | "title" | null;
  violatingValue: string | null;
};

/**
 * ตรวจสอบว่าสินค้าเป็นวัสดุ/อุปกรณ์ที่ไม่ใช่แฟชั่นพร้อมใส่หรือไม่
 * เรียกหลังจาก classifyWomenFashion() ผ่านแล้ว
 *
 * ลำดับ: category check (ก่อน) → title check (หลัง)
 */
export function checkMaterialViolation(
  cat1: string,
  cat2: string,
  cat3: string | undefined,
  title: string,
): MaterialViolationResult {
  // Category check — ทุกระดับ
  const cats = [cat1, cat2, cat3].filter(Boolean) as string[];
  for (const cat of cats) {
    if (MATERIAL_CATEGORY_DENY.has(cat.trim().toLowerCase())) {
      return { violated: true, violationType: "category", violatingValue: cat };
    }
  }

  // Title check
  const lower = title.toLowerCase();
  for (const kw of MATERIAL_TITLE_KEYWORDS_TH) {
    if (lower.includes(kw)) {
      return { violated: true, violationType: "title", violatingValue: kw };
    }
  }
  for (const kw of MATERIAL_TITLE_KEYWORDS_EN) {
    if (lower.includes(kw)) {
      return { violated: true, violationType: "title", violatingValue: kw };
    }
  }

  return { violated: false, violationType: null, violatingValue: null };
}

// ─── Exposed constants (for docs / UI display) ───────────────────────────────

export const WOMEN_FASHION_WHITELIST_COUNT = CAT1_WOMEN_SET.size + STANDALONE_WOMEN_SET.size;
export const DENY_LIST_ITEMS = [...DENY_SET];
export const MATERIAL_DENY_CATEGORIES = [...MATERIAL_CATEGORY_DENY];
