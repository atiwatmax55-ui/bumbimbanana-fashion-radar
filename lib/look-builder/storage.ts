import type { LookSlots } from "@/lib/look-builder/matching";

/** ลุคที่บันทึกไว้ 1 ชุด — เก็บใน local storage เหมือน saved-products (ดู lib/saved-products/storage.ts) */
export interface SavedLookSet {
  id: string;
  baseProductId: string;
  colors: string[];
  slots: LookSlots;
  savedAt: string;
}

/**
 * เก็บลุคที่บันทึกไว้ใน local storage ฝั่งผู้ใช้ — ตาม pattern เดียวกับ saved-products/storage.ts
 * ใช้แคชในหน่วยความจำ + subscriber คู่กับ useSyncExternalStore ฝั่ง React
 */
const STORAGE_KEY = "bumbimbanana_look_sets";
const EMPTY_LOOK_SETS: SavedLookSet[] = [];

let cache: SavedLookSet[] | null = null;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readFromLocalStorage(): SavedLookSet[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setCacheAndNotify(items: SavedLookSet[]): SavedLookSet[] {
  cache = items;
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
  listeners.forEach((listener) => listener());
  return items;
}

export function subscribeLookSets(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLookSetsSnapshot(): SavedLookSet[] {
  if (!isBrowser()) return EMPTY_LOOK_SETS;
  if (!cache) cache = readFromLocalStorage();
  return cache;
}

export function getLookSetsServerSnapshot(): SavedLookSet[] {
  return EMPTY_LOOK_SETS;
}

export function addLookSet(baseProductId: string, colors: string[], slots: LookSlots): SavedLookSet[] {
  const items = getLookSetsSnapshot();
  const newItem: SavedLookSet = {
    id: `look-${Date.now()}`,
    baseProductId,
    colors,
    slots,
    savedAt: new Date().toISOString(),
  };
  return setCacheAndNotify([newItem, ...items]);
}

export function removeLookSet(id: string): SavedLookSet[] {
  return setCacheAndNotify(getLookSetsSnapshot().filter((item) => item.id !== id));
}
