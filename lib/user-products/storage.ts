import type { Product } from "@/types/product";
import { buildProductFromDraft, type ProductDraft } from "@/lib/data-source/build-product";

/**
 * สินค้าที่เจ้าของเว็บพิมพ์เพิ่มเองด้วยมือ (Manual Curation) หลังไปดูเทรนด์จาก
 * TikTok Shop Affiliate Center มาแล้ว — เก็บใน local storage ฝั่งเบราว์เซอร์เท่านั้น
 * (เหมือน lib/saved-products/storage.ts) เพราะยังไม่เชื่อมฐานข้อมูลจริง
 *
 * เก็บเป็น Product เต็มรูปแบบยกเว้น salesRank/commissionRank/growthRank เพราะอันดับ
 * ต้องคำนวณรวมกับสินค้าจากแหล่งข้อมูลหลักทุกครั้งที่แสดงผล (ดู ProductRadarView)
 */
export type UserProduct = Omit<Product, "salesRank" | "commissionRank" | "growthRank">;

const STORAGE_KEY = "bumbimbanana_user_products";
const EMPTY_USER_PRODUCTS: UserProduct[] = [];

let cache: UserProduct[] | null = null;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readFromLocalStorage(): UserProduct[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setCacheAndNotify(items: UserProduct[]): UserProduct[] {
  cache = items;
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
  listeners.forEach((listener) => listener());
  return items;
}

export function subscribeUserProducts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** snapshot สำหรับฝั่งเบราว์เซอร์ ใช้คู่กับ useSyncExternalStore */
export function getUserProductsSnapshot(): UserProduct[] {
  if (!isBrowser()) return EMPTY_USER_PRODUCTS;
  if (!cache) cache = readFromLocalStorage();
  return cache;
}

/** snapshot สำหรับฝั่งเซิร์ฟเวอร์ (SSR) ใช้คู่กับ useSyncExternalStore */
export function getUserProductsServerSnapshot(): UserProduct[] {
  return EMPTY_USER_PRODUCTS;
}

export function addUserProduct(draft: ProductDraft): UserProduct[] {
  const items = getUserProductsSnapshot();
  const id = `usr-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const newItem = buildProductFromDraft(draft, id, now);
  return setCacheAndNotify([newItem, ...items]);
}

export function updateUserProduct(id: string, draft: ProductDraft): UserProduct[] {
  const now = new Date().toISOString();
  const updated = getUserProductsSnapshot().map((item) =>
    item.id === id ? buildProductFromDraft(draft, id, now) : item
  );
  return setCacheAndNotify(updated);
}

export function removeUserProduct(id: string): UserProduct[] {
  const updated = getUserProductsSnapshot().filter((item) => item.id !== id);
  return setCacheAndNotify(updated);
}
