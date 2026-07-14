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
  /**
   * ถ้ามีค่า → แสดงข้อความนี้แทนตัวเลข commissionRate ในทุก UI
   * ใช้สำหรับ Shopee products ที่ไม่มีข้อมูลค่าคอมมิชชันจาก Feed
   */
  commissionStatus?: string;
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
  /** แหล่งข้อมูลสินค้า — ถ้าไม่มีค่า = mock */
  source?: "shopee" | "tiktok";
  /** จำนวนขายสะสมตลอดอายุสินค้าจาก Shopee Feed (ไม่ใช่ยอดขายรายช่วง) */
  itemSold?: number;
  /** เวลาที่ระบบพบสินค้านี้ใน Feed ครั้งแรก (= created_at ในตาราง products) */
  firstSeenAt?: string;
  /** ตัวเลขวิเคราะห์ 7/30 วันจาก Snapshot — undefined เมื่อยังไม่ได้คำนวณ */
  analytics?: ProductAnalytics;
  /**
   * สถานะ workflow ของสินค้านี้ในกระบวนการคัดเลือก
   * radar_found = ค้นพบจากระบบ | strategy_review = รอฝ่ายกลยุทธ์ตรวจ |
   * approved_for_content = อนุมัติทำคอนเทนต์ | rejected = ปฏิเสธ
   */
  workflowStatus?: "radar_found" | "strategy_review" | "approved_for_content" | "rejected";
  /** true = ใส่ได้จริง (เสื้อผ้า/รองเท้า/กระเป๋า) | false = เครื่องประดับ/ของแต่งบ้านที่หลุดผ่าน category filter | undefined = ยังไม่ได้จัดประเภท */
  isOutfitItem?: boolean;
  /** สีหลักของสินค้า 1–3 สี (ภาษาไทย) — มาจาก rule-based extractor หรือ AI vision */
  colors?: string[];
  /** แท็กสไตล์ เช่น มินิมอล, เกาหลี, Y2K, สปอร์ต */
  styleTags?: string[];
  /** ทรงตัด เช่น ครอป, โอเวอร์ไซส์, เอวสูง */
  silhouette?: string;
  /** เนื้อผ้า เช่น คอตตอน, ยีนส์, ซาติน — null ถ้าไม่ทราบ */
  fabric?: string | null;
  /** จุดเด่นการออกแบบ เช่น โบว์, ลูกไม้, กระดุมเยอะ */
  detailPoints?: string[];
  /** คะแนน "น่าถ่ายทำคอนเทนต์" 0–100 ให้โดย AI vision — undefined ถ้ายังไม่ได้ประเมิน */
  contentWorthyScore?: number;
}

/**
 * ตัวเลขวิเคราะห์ต่อช่วงเวลา (7 วัน / 30 วัน) คำนวณจาก Snapshot ยอดขายสะสมรายวัน
 * null = ข้อมูลย้อนหลังยังไม่พอสำหรับช่วงเวลานั้น (ห้ามแต่งตัวเลขแทน)
 */
export interface PeriodMetrics {
  /** จำนวนชิ้นที่ขายในช่วง (item_sold ล่าสุด - item_sold ณ จุดเริ่มช่วง) */
  units: number;
  /** ยอดขายเป็นบาทโดยประมาณ (units × ราคาปัจจุบัน) */
  revenue: number;
  /** จำนวนชิ้นที่ขายในช่วงก่อนหน้า — null ถ้าข้อมูลไม่พอ */
  prevUnits: number | null;
  /** อัตราโต (%) เทียบช่วงก่อนหน้า — null ถ้าฐานก่อนหน้าไม่มีหรือเป็นศูนย์ */
  growthPct: number | null;
  /** คะแนนความมาแรง 0–100 (ยอดขาย 40% + จำนวนชิ้น 30% + อัตราโต 30%) */
  trendScore: number | null;
  /** อันดับยอดขาย (บาท) ในช่วงนี้ — จากข้อมูล Shopee ที่ระบบติดตาม */
  salesRank: number | null;
  /** อันดับความมาแรงในช่วงนี้ */
  trendRank: number | null;
}

/** ป้าย "ควรรีบทำคอนเทนต์" — ติดเมื่ออันดับ TOP 20 และคะแนนโต ≥ 20% */
export interface ContentBadge {
  /** เหตุผลสั้น ๆ เช่น "อันดับมาแรง #8 • โต 27%" */
  reason: string;
}

/**
 * ประมาณการความมาแรงชั่วคราว = ยอดสะสม ÷ จำนวนวันที่ระบบรู้จักสินค้า
 * ใช้เฉพาะตอนที่ยังไม่มีข้อมูล snapshot 7 วันจริง (d7 === null) — ห้ามใช้แทน trendScore จริง
 */
export interface VelocityEstimate {
  /** ยอดสะสม ÷ วัน — ยิ่งสูงยิ่งขายเร็ว */
  value: number;
  /** ป้ายกำกับให้ UI แสดงชัดเจนว่าเป็นค่าประมาณ ไม่ใช่ข้อมูลจริง */
  label: "ประมาณการ (ยังไม่มีข้อมูล 7 วัน)";
}

/** ข้อมูลวิเคราะห์รายสินค้า แยกตามช่วงเวลา */
export interface ProductAnalytics {
  d7: PeriodMetrics | null;
  d30: PeriodMetrics | null;
  badge7: ContentBadge | null;
  badge30: ContentBadge | null;
  /** เป็นสินค้าใหม่ (ระบบพบใน Feed ครั้งแรกภายใน 7 วัน หลังจากเริ่มเก็บข้อมูล) */
  isNew: boolean;
  /** ประมาณการความมาแรงจากยอดสะสม — null เมื่อมีข้อมูล d7 จริงแล้ว (ไม่จำเป็นต้องใช้ค่าประมาณ) */
  velocityEstimate: VelocityEstimate | null;
}

/** สินค้าที่ถูกบันทึกไว้พร้อมโน้ตส่วนตัว สอดคล้องกับตาราง saved_products */
export interface SavedProduct {
  id: string;
  productId: string;
  personalNote: string;
  savedAt: string;
}
