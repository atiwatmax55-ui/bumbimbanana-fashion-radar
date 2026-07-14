/**
 * Look Builder — rule-based matching (เฟส 3)
 * จับคู่ชุด "บน+ล่าง(หรือเดรส/ชุดเซ็ต)+รองเท้า+กระเป๋า" จากสี/ทรงตัดที่ระบบมีอยู่แล้ว
 * ไม่ใช้ ML — กฎง่าย ๆ ที่ตรวจสอบได้: กลุ่มสีเดียวกัน, คู่สีตัดกัน, ทรงตัดสมดุล (fit/loose)
 */
import type { Product, ProductCategory } from "@/types/product";

export type LookSlotRole = "dress" | "top" | "bottom" | "shoes" | "bag" | "accessory";

export interface LookSlots {
  dress: string | null;
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  bag: string | null;
  accessory: string | null;
}

/** หมวดสินค้า → บทบาทในชุด (ใช้ PRODUCT_CATEGORIES ที่มีอยู่แล้วใน types/product.ts) */
export const CATEGORY_TO_ROLE: Record<ProductCategory, LookSlotRole> = {
  "กางเกงยีนส์": "bottom",
  "กางเกงขากระบอก": "bottom",
  "เสื้อครอป": "top",
  "เสื้อเชิ้ต": "top",
  "เดรส": "dress",
  "กระโปรง": "bottom",
  "ชุดเซ็ต": "dress",
  "เสื้อออกกำลังกาย": "top",
  "รองเท้า": "shoes",
  "กระเป๋า": "bag",
  "อื่นๆ": "accessory",
};

/** กลุ่มสีที่ไปด้วยกันได้ (นู้ด/เอิร์ธโทน, โทนเข้ม, พาสเทล ฯลฯ) */
export const SAME_COLOR_FAMILIES: string[][] = [
  ["ดำ", "ขาว", "เทา", "ครีม", "เบจ"],
  ["น้ำตาล", "กากี", "เบจ", "ครีม", "ทอง"],
  ["น้ำเงิน", "กรม", "ฟ้า", "ขาว"],
  ["ชมพู", "ม่วง", "แดง", "ขาว"],
];

/** คู่สีตัดกันที่ดูดี แม้ไม่ได้อยู่กลุ่มเดียวกัน */
export const COMPLEMENTARY_PAIRS: [string, string][] = [
  ["กรม", "ครีม"],
  ["ขาว", "เบจ"],
  ["ดำ", "ขาว"],
  ["ชมพู", "เทา"],
  ["น้ำตาล", "ครีม"],
  ["เขียว", "ขาว"],
  ["แดง", "ดำ"],
];

/** เข้ากันได้ถ้า: ยังไม่มีข้อมูลสีฝั่งใดฝั่งหนึ่ง (ไม่ตัดออก), สีตรงกัน, อยู่กลุ่มเดียวกัน หรือเป็นคู่ตัดกัน */
export function colorsCompatible(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return true;
  for (const ca of a) {
    for (const cb of b) {
      if (ca === cb) return true;
      if (SAME_COLOR_FAMILIES.some((family) => family.includes(ca) && family.includes(cb))) return true;
      if (COMPLEMENTARY_PAIRS.some(([x, y]) => (x === ca && y === cb) || (x === cb && y === ca))) return true;
    }
  }
  return false;
}

const FITTED_SILHOUETTES = new Set(["ครอป", "เข้ารูป", "บอดี้คอน", "เอวสูง"]);
const LOOSE_SILHOUETTES = new Set(["โอเวอร์ไซส์", "ทรงตรง"]);

/** ทรงตัดสมดุล: fit+loose คู่กันดี, ไม่ทราบทรงฝั่งใดฝั่งหนึ่งไม่ตัดออก, เหมือนกันเป๊ะถือว่าไม่บาลานซ์ */
export function silhouetteBalance(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true;
  const aFitted = FITTED_SILHOUETTES.has(a);
  const bFitted = FITTED_SILHOUETTES.has(b);
  const aLoose = LOOSE_SILHOUETTES.has(a);
  const bLoose = LOOSE_SILHOUETTES.has(b);
  if (!aFitted && !aLoose) return true;
  if (!bFitted && !bLoose) return true;
  return aFitted !== bFitted || aLoose !== bLoose;
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * แนะนำชุดจากสินค้าตั้งต้น (base) + สีที่เลือก — เติมเฉพาะ slot ที่ไม่ได้ lock ไว้
 * @param locked slot ที่ผู้ใช้ล็อกไว้แล้ว (จากปุ่ม "สุ่มลุคใหม่" ที่ไม่อยากสุ่มตัวนี้ใหม่)
 */
export function suggestLook(
  baseProduct: Product,
  selectedColors: string[],
  allProducts: Product[],
  locked: Partial<LookSlots> = {},
): LookSlots {
  const baseRole = CATEGORY_TO_ROLE[baseProduct.category] ?? "accessory";
  const isFullOutfitBase = baseRole === "dress";
  const neededRoles: LookSlotRole[] = isFullOutfitBase
    ? ["dress", "shoes", "bag"]
    : ["top", "bottom", "shoes", "bag"];

  const slots: LookSlots = { dress: null, top: null, bottom: null, shoes: null, bag: null, accessory: null };
  slots[baseRole] = baseProduct.id;

  const referenceColors = selectedColors.length > 0 ? selectedColors : (baseProduct.colors ?? []);

  for (const role of neededRoles) {
    if (role === baseRole) continue;
    if (locked[role]) {
      slots[role] = locked[role]!;
      continue;
    }

    const candidates = allProducts.filter((p) => {
      if (p.id === baseProduct.id) return false;
      if (p.isOutfitItem === false) return false;
      if (CATEGORY_TO_ROLE[p.category] !== role) return false;
      if (!colorsCompatible(referenceColors, p.colors ?? [])) return false;
      if ((role === "top" || role === "bottom") && !silhouetteBalance(baseProduct.silhouette, p.silhouette)) {
        return false;
      }
      return true;
    });

    const picked = pickRandom(candidates);
    if (picked) slots[role] = picked.id;
  }

  // Accessory เสริม (ไม่บังคับ) — "1 จุดหมุด" ที่มีดีเทลเด่น
  if (locked.accessory) {
    slots.accessory = locked.accessory;
  } else {
    const accessoryCandidates = allProducts.filter(
      (p) =>
        p.id !== baseProduct.id &&
        p.isOutfitItem !== false &&
        CATEGORY_TO_ROLE[p.category] === "accessory" &&
        (p.detailPoints?.length ?? 0) > 0 &&
        colorsCompatible(referenceColors, p.colors ?? []),
    );
    const picked = pickRandom(accessoryCandidates);
    if (picked) slots.accessory = picked.id;
  }

  return slots;
}

export const LOOK_SLOT_LABELS: Record<LookSlotRole, string> = {
  dress: "เดรส/ชุดเซ็ต",
  top: "เสื้อ",
  bottom: "กางเกง/กระโปรง",
  shoes: "รองเท้า",
  bag: "กระเป๋า",
  accessory: "ของแต่งเสริม",
};
