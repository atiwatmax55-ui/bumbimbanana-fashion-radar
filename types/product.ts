/** หมวดสินค้าแฟชั่นผู้หญิงที่รองรับในระบบ (10 หมวดหลัก + "อื่นๆ" สำหรับสินค้าจริงที่จัดหมวดจาก TikTok Shop ไม่ตรงกับหมวดหลัก) */
export const PRODUCT_CATEGORIES = [
  "กางเกงยีนส์",
  "กางเกงขากระบอก",
  "เสื้อครอป",
  "เสื้อเชิ้ต",
  "เดรส",
  "กระโปรง",
  "ชุดเซ็ต",
  "เสื้อออกกำลังกาย",
  "รองเท้า",
  "กระเป๋า",
  "อื่นๆ",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** เป้าหมายการคัดสินค้าที่ผู้ใช้เลือกได้บนหน้า Dashboard (หน้าสรุปภาพรวม) และ Product Radar (หน้าค้นหาและคัดสินค้า) */
export type ProductGoal =
  | "commission" // ค่าคอมสูง
  | "sales" // ยอดขายแรง
  | "revenue" // รายได้สูง
  | "growth" // เติบโตเร็ว
  | "interest"; // คะแนนความน่าสนใจสูง

/** ช่วงเวลาที่ใช้คำนวณยอดขาย: 7 วัน หรือ 30 วัน */
export type TimeRange = "7d" | "30d";

/** โครงสร้างข้อมูลสินค้าแฟชั่น 1 รายการ สอดคล้องกับตาราง products ใน Supabase/PostgreSQL */
export interface Product {
  id: string;
  productName: string;
  productImage: string;
  shopName: string;
  productUrl: string;
  category: ProductCategory;
  /** ราคาขาย หน่วยบาท */
  price: number;
  /** ค่าคอมมิชชัน หน่วยเปอร์เซ็นต์ */
  commissionRate: number;
  sales7d: number;
  sales30d: number;
  /** รายได้โดยประมาณ หน่วยบาท (คำนวณจากยอดขาย 30 วัน x ราคา) */
  estimatedRevenue: number;
  /** อัตราการเติบโตของยอดขาย หน่วยเปอร์เซ็นต์ เทียบช่วงก่อนหน้า อาจเป็นค่าลบได้ */
  growthRate: number;
  /** คะแนนความน่าสนใจโดยรวม 0-100 คะแนน */
  interestScore: number;
  /** อันดับยอดขาย (1 = ขายดีที่สุดในระบบ) */
  salesRank: number;
  /** อันดับค่าคอมมิชชัน (1 = ค่าคอมสูงที่สุดในระบบ) */
  commissionRank: number;
  /** อันดับการเติบโต (1 = เติบโตเร็วที่สุดในระบบ) */
  growthRank: number;
  lastUpdatedAt: string;
}

/** สินค้าที่ถูกบันทึกไว้พร้อมโน้ตส่วนตัว สอดคล้องกับตาราง saved_products */
export interface SavedProduct {
  id: string;
  productId: string;
  personalNote: string;
  savedAt: string;
}
