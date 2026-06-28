import { mockProductRepository } from "@/lib/data-source/mock-product-repository";
import { windsorProductRepository } from "@/lib/data-source/windsor-product-repository";

/**
 * จุดเดียวที่หน้าเว็บไซต์และ component ทุกตัวควร import เพื่อดึงข้อมูลสินค้า
 *
 * เลือกแหล่งข้อมูลตามตัวแปรสภาพแวดล้อม DATA_SOURCE_MODE (ดู .env.example):
 * - "mock" (ค่าเริ่มต้น) — ใช้ Mock Data ในโค้ด ไม่ต้องตั้งค่าอะไรเพิ่ม
 * - "windsor" — ใช้ข้อมูลจริงจาก TikTok Shop ผ่าน Windsor.ai (ต้องตั้ง WINDSOR_API_KEY ด้วย)
 *
 * ตั้งค่านี้แยกตามสภาพแวดล้อมได้ (เช่น local dev ใช้ mock, production ใช้ windsor)
 * โดยไม่ต้องแก้โค้ดไฟล์นี้ — แก้เฉพาะกรณีต้องการบังคับโหมดใดโหมดหนึ่งไว้ตายตัว
 *
 * ห้าม import mock-product-repository.ts หรือ windsor-product-repository.ts ตรง ๆ จากหน้า UI
 * — ให้ import จากไฟล์นี้เท่านั้น
 */
const dataSourceMode = process.env.DATA_SOURCE_MODE === "windsor" ? "windsor" : "mock";

export const productRepository =
  dataSourceMode === "windsor" ? windsorProductRepository : mockProductRepository;

export type {
  DataSyncStatus,
  ProductFilters,
  ProductQueryOptions,
  ProductRepository,
  ProductSortKey,
} from "@/lib/data-source/types";
