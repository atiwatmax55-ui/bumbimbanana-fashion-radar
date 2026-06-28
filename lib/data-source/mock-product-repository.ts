import { mockProducts, MOCK_DATA_LAST_SYNCED_AT } from "@/lib/mock-data/products";
import { applyProductFilters, sortProducts } from "@/lib/data-source/query-products";
import type {
  DataSyncStatus,
  ProductQueryOptions,
  ProductRepository,
} from "@/lib/data-source/types";

/** ตัวจัดการข้อมูลตัวอย่าง (Mock Data) ใช้งานจริงในเวอร์ชันแรกของเว็บไซต์ */
export const mockProductRepository: ProductRepository = {
  async getAllProducts() {
    return mockProducts;
  },

  async getProductById(id: string) {
    return mockProducts.find((p) => p.id === id) ?? null;
  },

  async queryProducts(options: ProductQueryOptions) {
    const filtered = applyProductFilters(mockProducts, options.timeRange, options.filters);
    return sortProducts(filtered, options.timeRange, options.sortBy);
  },

  async getDataSyncStatus(): Promise<DataSyncStatus> {
    return {
      source: "mock",
      lastSyncedAt: MOCK_DATA_LAST_SYNCED_AT,
      totalProducts: mockProducts.length,
      syncStatus: "success",
      message: "ระบบใช้ Mock Data (ข้อมูลตัวอย่าง) เพื่อสาธิตการทำงาน ยังไม่เชื่อมต่อ Windsor.ai จริง",
    };
  },
};
