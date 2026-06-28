import type { Product, ProductCategory, TimeRange } from "@/types/product";

/** ตัวกรองข้อมูลสินค้า ใช้ร่วมกันทั้งหน้า Dashboard และ Product Radar */
export interface ProductFilters {
  categories?: ProductCategory[];
  minPrice?: number;
  maxPrice?: number;
  minCommissionRate?: number;
  minSales?: number;
  minGrowthRate?: number;
  savedProductIds?: string[];
  savedOnly?: boolean;
}

export type ProductSortKey =
  | "sales" // ยอดขายสูงสุด
  | "revenue" // รายได้สูงสุด
  | "commission" // ค่าคอมมิชชันสูงสุด
  | "growth" // เติบโตเร็วที่สุด
  | "interest" // คะแนนความน่าสนใจสูงสุด
  | "salesRank"; // อันดับยอดขายดีที่สุด

export interface ProductQueryOptions {
  timeRange: TimeRange;
  filters?: ProductFilters;
  sortBy?: ProductSortKey;
}

/** สถานะการเชื่อมต่อ/ซิงก์ข้อมูล แสดงในหน้า Data Status (หน้าสถานะข้อมูล) */
export interface DataSyncStatus {
  source: "mock" | "windsor";
  lastSyncedAt: string;
  totalProducts: number;
  syncStatus: "success" | "pending" | "error";
  message: string;
}

/** สัญญากลางของแหล่งข้อมูลสินค้า ทุก implementation (Mock Data หรือ Windsor.ai ในอนาคต) ต้องทำตามสัญญานี้ */
export interface ProductRepository {
  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  queryProducts(options: ProductQueryOptions): Promise<Product[]>;
  getDataSyncStatus(): Promise<DataSyncStatus>;
}
