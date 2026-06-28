import type { Product } from "@/types/product";
import { fetchWindsorRows, WindsorApiError } from "@/lib/data-source/windsor-client";
import { WINDSOR_FIELDS, mapWindsorRowsToProducts } from "@/lib/data-source/windsor-field-map";
import { applyProductFilters, sortProducts } from "@/lib/data-source/query-products";
import type { DataSyncStatus, ProductQueryOptions, ProductRepository } from "@/lib/data-source/types";

/**
 * ตัวจัดการข้อมูลจริงจาก TikTok Shop ผ่าน Windsor.ai (connector "tiktok_shop")
 *
 * ต้องตั้งค่า WINDSOR_API_KEY ใน environment variable ฝั่งเซิร์ฟเวอร์ก่อนใช้งาน (ดู .env.example)
 * และต้องเชื่อมต่อบัญชี TikTok Shop กับ Windsor.ai ก่อน (ดูคำอธิบายที่หน้า Data Status)
 *
 * ฟิลด์บางส่วน (ค่าคอมมิชชัน, หมวดสินค้า, รูปสินค้า, ลิงก์สินค้า, ยอดขาย 7 วันแยกจาก 30 วัน)
 * ยังเป็นค่าเริ่มต้น/ค่าประมาณไปก่อน จนกว่าจะยืนยันชื่อฟิลด์จริงจาก Windsor.ai ได้ (ดู TODO ใน windsor-field-map.ts)
 */

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function loadProductsFromWindsor(): Promise<{ products: Product[]; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const fields = [...WINDSOR_FIELDS];

  const [currentRows, priorRows] = await Promise.all([
    fetchWindsorRows({ fields, dateFrom: formatDate(daysAgo(30)), dateTo: formatDate(daysAgo(0)) }),
    fetchWindsorRows({ fields, dateFrom: formatDate(daysAgo(60)), dateTo: formatDate(daysAgo(30)) }),
  ]);

  return { products: mapWindsorRowsToProducts(currentRows, priorRows, fetchedAt), fetchedAt };
}

export const windsorProductRepository: ProductRepository = {
  async getAllProducts() {
    const { products } = await loadProductsFromWindsor();
    return products;
  },

  async getProductById(id: string) {
    const { products } = await loadProductsFromWindsor();
    return products.find((p) => p.id === id) ?? null;
  },

  async queryProducts(options: ProductQueryOptions) {
    const { products } = await loadProductsFromWindsor();
    const filtered = applyProductFilters(products, options.timeRange, options.filters);
    return sortProducts(filtered, options.timeRange, options.sortBy);
  },

  async getDataSyncStatus(): Promise<DataSyncStatus> {
    try {
      const { products, fetchedAt } = await loadProductsFromWindsor();
      return {
        source: "windsor",
        lastSyncedAt: fetchedAt,
        totalProducts: products.length,
        syncStatus: "success",
        message: "เชื่อมต่อ Windsor.ai สำเร็จ ระบบดึงข้อมูลสินค้าจาก TikTok Shop จริงแล้ว",
      };
    } catch (error) {
      const message =
        error instanceof WindsorApiError
          ? error.message
          : "เกิดข้อผิดพลาดไม่ทราบสาเหตุระหว่างเชื่อมต่อ Windsor.ai";
      return {
        source: "windsor",
        lastSyncedAt: new Date().toISOString(),
        totalProducts: 0,
        syncStatus: "error",
        message,
      };
    }
  },
};
