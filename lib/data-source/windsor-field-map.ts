import type { Product, ProductCategory } from "@/types/product";
import { computeProductRanks } from "@/lib/data-source/compute-ranks";
import { getCategoryPlaceholderImage } from "@/lib/data-source/category-image";
import type { WindsorRow } from "@/lib/data-source/windsor-client";

/**
 * รายชื่อฟิลด์ที่ขอจาก Windsor.ai connector "tiktok_shop"
 *
 * ฟิลด์ด้านล่างยืนยันแล้วจากเอกสารของ Windsor.ai เอง (Phase 0) ส่วนฟิลด์ค่าคอมมิชชัน,
 * หมวดสินค้า, รูปสินค้า, ลิงก์สินค้า ยังไม่ยืนยัน — ต้องเรียก get_fields หลังเชื่อมต่อ
 * บัญชี TikTok Shop จริงก่อน (ดู Phase A ในแผนงาน) แล้วเติมเข้าด้านล่างนี้
 */
export const WINDSOR_FIELDS: readonly string[] = [
  "order_id",
  "order_status",
  "create_time",
  "product_name",
  "sku_id",
  "original_total_price",
  "seller_discount",
  "is_affiliate_order",
  // TODO(Phase A): เติมฟิลด์ commission rate, category, product image, product url
];

const CANCELLED_STATUSES = new Set(["CANCELLED", "REFUNDED", "Cancelled", "Refunded", "cancelled", "refunded"]);

/** TODO(Phase B): เติม mapping จากชื่อหมวดสินค้าจริงของ TikTok Shop ไปเป็นหมวดของเรา หลังเห็นค่าจริงจาก get_fields */
const RAW_CATEGORY_TO_PRODUCT_CATEGORY: Record<string, ProductCategory> = {};

/** แปลงชื่อหมวดสินค้าดิบของ TikTok Shop เป็นหมวดของเรา ถ้าไม่รู้จักให้ตกเข้าหมวด "อื่นๆ" เสมอ */
export function normalizeCategory(rawCategory: string | undefined | null): ProductCategory {
  if (!rawCategory) return "อื่นๆ";
  return RAW_CATEGORY_TO_PRODUCT_CATEGORY[rawCategory] ?? "อื่นๆ";
}

/** อัตราการเติบโต % เทียบช่วงก่อนหน้า (ป้องกันหารด้วยศูนย์) */
export function computeGrowthRate(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return ((current - prior) / prior) * 100;
}

/** สร้าง id คงที่จากชื่อสินค้า เพื่อให้สินค้าเดียวกันได้ id เดิมทุกครั้งที่ดึงข้อมูลใหม่ (สำคัญต่อสินค้าที่บันทึกไว้) */
function stableIdFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return `wd-${Math.abs(hash).toString(36)}`;
}

interface AggregatedProduct {
  productName: string;
  category: ProductCategory;
  unitsSold: number;
  netRevenue: number;
}

/** รวมข้อมูลดิบระดับ order ให้เป็นยอดขาย/รายได้ต่อสินค้า 1 รายการ (ไม่รวมออเดอร์ที่ถูกยกเลิก/คืนเงิน) */
function aggregateByProduct(rows: WindsorRow[]): Map<string, AggregatedProduct> {
  const groups = new Map<string, AggregatedProduct>();

  for (const row of rows) {
    const status = String(row.order_status ?? "");
    if (CANCELLED_STATUSES.has(status)) continue;

    const productName = String(row.product_name ?? "ไม่ทราบชื่อสินค้า");
    const price = Number(row.original_total_price ?? 0);
    const discount = Number(row.seller_discount ?? 0);

    const existing = groups.get(productName);
    if (existing) {
      existing.unitsSold += 1;
      existing.netRevenue += price - discount;
    } else {
      groups.set(productName, {
        productName,
        // TODO(Phase A): ส่งฟิลด์หมวดสินค้าจริงจาก row เข้า normalizeCategory() ที่นี่ เมื่อยืนยันชื่อฟิลด์แล้ว
        category: normalizeCategory(undefined),
        unitsSold: 1,
        netRevenue: price - discount,
      });
    }
  }

  return groups;
}

/**
 * แปลงข้อมูลดิบระดับ order จาก Windsor.ai เป็นรายการสินค้าตาม Product type ของเรา
 *
 * รับข้อมูล 2 ช่วงเวลา (30 วันปัจจุบันและ 30 วันก่อนหน้า) เพื่อคำนวณอัตราการเติบโต
 * ช่วงยอดขาย 7 วันยังใช้ค่าเดียวกับ 30 วันไปก่อน (TODO Phase B: ดึงช่วง 7 วันแยกต่างหาก)
 */
export function mapWindsorRowsToProducts(
  currentRows: WindsorRow[],
  priorRows: WindsorRow[],
  lastUpdatedAt: string
): Product[] {
  const current = aggregateByProduct(currentRows);
  const prior = aggregateByProduct(priorRows);

  const withoutRanks = [...current.values()].map((item) => {
    const priorItem = prior.get(item.productName);
    const sales30d = item.unitsSold;
    const price = sales30d > 0 ? Math.round(item.netRevenue / sales30d) : 0;

    return {
      id: stableIdFromName(item.productName),
      productName: item.productName,
      productImage: getCategoryPlaceholderImage(item.category),
      shopName: "TikTok Shop", // TODO(Phase A): ยังไม่ยืนยันฟิลด์ชื่อร้าน
      productUrl: "https://shop.tiktok.com", // TODO(Phase A): ยังไม่ยืนยันฟิลด์ลิงก์สินค้า
      category: item.category,
      price,
      commissionRate: 0, // TODO(Phase A): ยังไม่ยืนยันฟิลด์ค่าคอมมิชชัน
      sales7d: sales30d,
      sales30d,
      estimatedRevenue: Math.round(item.netRevenue),
      growthRate: computeGrowthRate(sales30d, priorItem?.unitsSold ?? 0),
      lastUpdatedAt,
    };
  });

  const ranked = computeProductRanks(withoutRanks);
  if (ranked.length === 0) return [];

  return ranked.map((item) => ({
    ...item,
    // คะแนนความน่าสนใจคำนวณจากอันดับทั้ง 3 ด้าน (จะแม่นยำขึ้นเมื่อค่าคอมมิชชันจริงพร้อมใช้งานใน Phase B)
    interestScore: Math.round(
      100 - ((item.salesRank + item.commissionRank + item.growthRank) / (3 * ranked.length)) * 100
    ),
  }));
}
