import type { ProductCategory } from "@/types/product";

/** slug รูปภาพ placeholder ต่อหมวดสินค้า ใช้คู่กับไฟล์ public/products/{slug}.svg */
const CATEGORY_IMAGE_SLUG: Record<ProductCategory, string> = {
  กางเกงยีนส์: "jeans",
  กางเกงขากระบอก: "wide-leg-pants",
  เสื้อครอป: "crop-top",
  เสื้อเชิ้ต: "shirt",
  เดรส: "dress",
  กระโปรง: "skirt",
  ชุดเซ็ต: "set",
  เสื้อออกกำลังกาย: "activewear",
  รองเท้า: "shoes",
  กระเป๋า: "bag",
  อื่นๆ: "other",
};

/**
 * รูป placeholder ตามหมวดสินค้า ใช้กับ Mock Data เสมอ และใช้กับข้อมูลจริงจาก Windsor.ai
 * ชั่วคราวจนกว่าจะยืนยันโดเมนรูปภาพจริงและตั้งค่า images.remotePatterns ใน next.config.ts (ดู Phase B)
 */
export function getCategoryPlaceholderImage(category: ProductCategory): string {
  return `/products/${CATEGORY_IMAGE_SLUG[category]}.svg`;
}
