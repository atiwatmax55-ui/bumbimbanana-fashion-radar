import { mockProductRepository } from "@/lib/data-source/mock-product-repository";
import { windsorProductRepository } from "@/lib/data-source/windsor-product-repository";
import { shopeeProductRepository } from "@/lib/data-source/shopee-product-repository";

/**
 * จุดเดียวที่หน้าเว็บไซต์และ component ทุกตัวควร import เพื่อดึงข้อมูลสินค้า
 *
 * เลือกแหล่งข้อมูลตามตัวแปรสภาพแวดล้อม DATA_SOURCE_MODE (ดู .env.example):
 * - "mock" (ค่าเริ่มต้น) — ใช้ Mock Data ในโค้ด ไม่ต้องตั้งค่าอะไรเพิ่ม
 * - "windsor" — ใช้ข้อมูลจริงจาก TikTok Shop ผ่าน Windsor.ai (ต้องตั้ง WINDSOR_API_KEY ด้วย)
 * - "shopee" — ใช้ข้อมูลสินค้าแฟชั่นผู้หญิงจาก Supabase (ต้องตั้ง SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ด้วย)
 *
 * ตั้งค่านี้แยกตามสภาพแวดล้อมได้ (เช่น local dev ใช้ mock, production ใช้ shopee)
 * โดยไม่ต้องแก้โค้ดไฟล์นี้ — แก้เฉพาะกรณีต้องการบังคับโหมดใดโหมดหนึ่งไว้ตายตัว
 *
 * ห้าม import mock-/windsor-/shopee-product-repository.ts ตรง ๆ จากหน้า UI
 * — ให้ import จากไฟล์นี้เท่านั้น
 */
// เลือกโหมดโดยอัตโนมัติ:
//   DATA_SOURCE_MODE=windsor  → windsor เสมอ
//   DATA_SOURCE_MODE=mock     → mock เสมอ (บังคับใช้ mock แม้ตั้ง Supabase ไว้)
//   DATA_SOURCE_MODE=shopee หรือ ตั้ง SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY ไว้ → shopee
//   ไม่ได้ตั้งค่าอะไร → mock (ค่าเริ่มต้น)
const dataSourceMode =
  process.env.DATA_SOURCE_MODE === "windsor"
    ? "windsor"
    : process.env.DATA_SOURCE_MODE === "mock"
      ? "mock"
      : process.env.DATA_SOURCE_MODE === "shopee" ||
          Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
        ? "shopee"
        : "mock";

export const productRepository =
  dataSourceMode === "windsor"
    ? windsorProductRepository
    : dataSourceMode === "shopee"
      ? shopeeProductRepository
      : mockProductRepository;

export type {
  DataSyncStatus,
  ProductFilters,
  ProductQueryOptions,
  ProductRepository,
  ProductSortKey,
} from "@/lib/data-source/types";
