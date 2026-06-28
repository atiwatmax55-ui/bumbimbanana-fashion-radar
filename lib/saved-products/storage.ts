import type { SavedProduct } from "@/types/product";

/**
 * เวอร์ชันนี้เก็บสินค้าที่บันทึกไว้ใน local storage (ที่จัดเก็บข้อมูลในเบราว์เซอร์)
 * ของฝั่งผู้ใช้เอง เพราะยังไม่เชื่อมฐานข้อมูลจริง โครงสร้างข้อมูลตรงกับตาราง
 * saved_products ใน Supabase ทำให้ย้ายไปเขียนฐานข้อมูลจริงได้ทันทีในอนาคต
 * โดยไม่ต้องแก้ shape ของข้อมูล
 *
 * ใช้แคชในหน่วยความจำ + ตัวสมัครรับการเปลี่ยนแปลง (subscriber) คู่กับ
 * useSyncExternalStore ในฝั่ง React เพื่อให้ snapshot อ้างอิงเดิมเสมอจนกว่าจะมีการเขียนจริง
 * (ป้องกัน re-render วนซ้ำและปัญหา hydration ไม่ตรงกันระหว่างเซิร์ฟเวอร์กับเบราว์เซอร์)
 */
const STORAGE_KEY = "bumbimbanana_saved_products";
const EMPTY_SAVED_PRODUCTS: SavedProduct[] = [];

let cache: SavedProduct[] | null = null;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readFromLocalStorage(): SavedProduct[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setCacheAndNotify(items: SavedProduct[]): SavedProduct[] {
  cache = items;
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
  listeners.forEach((listener) => listener());
  return items;
}

export function subscribeSavedProducts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** snapshot สำหรับฝั่งเบราว์เซอร์ ใช้คู่กับ useSyncExternalStore */
export function getSavedProductsSnapshot(): SavedProduct[] {
  if (!isBrowser()) return EMPTY_SAVED_PRODUCTS;
  if (!cache) cache = readFromLocalStorage();
  return cache;
}

/** snapshot สำหรับฝั่งเซิร์ฟเวอร์ (SSR) ใช้คู่กับ useSyncExternalStore */
export function getSavedProductsServerSnapshot(): SavedProduct[] {
  return EMPTY_SAVED_PRODUCTS;
}

export function addSavedProduct(productId: string, personalNote = ""): SavedProduct[] {
  const items = getSavedProductsSnapshot();
  if (items.some((item) => item.productId === productId)) return items;
  const newItem: SavedProduct = {
    id: `${productId}-${Date.now()}`,
    productId,
    personalNote,
    savedAt: new Date().toISOString(),
  };
  return setCacheAndNotify([newItem, ...items]);
}

export function removeSavedProduct(productId: string): SavedProduct[] {
  const updated = getSavedProductsSnapshot().filter((item) => item.productId !== productId);
  return setCacheAndNotify(updated);
}

export function updateSavedProductNote(productId: string, personalNote: string): SavedProduct[] {
  const updated = getSavedProductsSnapshot().map((item) =>
    item.productId === productId ? { ...item, personalNote } : item
  );
  return setCacheAndNotify(updated);
}
