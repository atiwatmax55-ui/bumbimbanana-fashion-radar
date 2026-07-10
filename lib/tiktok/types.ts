import type { TiktokRawItem } from "@/lib/tiktok/normalize-tiktok-item";

export type { TiktokRawItem };

/** request body ของ POST /api/tiktok/import — ใช้ shape เดียวกันทั้งโหมดกรอกทีละตัวและวาง CSV/JSON */
export interface TiktokImportRequest {
  items: TiktokRawItem[];
}

export interface TiktokImportResponse {
  totalItems:     number;
  inserted:       number;
  updated:        number;
  skipped:        number;
  /** เหตุผลที่ข้ามแต่ละแถว (สูงสุด 20 รายการแรก) */
  skippedReasons: string[];
  /** คำเตือนที่ไม่ถึงกับข้าม เช่น รูป/หมวดหมู่ fallback (สูงสุด 20 รายการแรก) */
  warnings:       string[];
  snapshotNote?:  string;
  completedAt:    string;
}
