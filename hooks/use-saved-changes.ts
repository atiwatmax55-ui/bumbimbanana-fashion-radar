"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types/product";

/**
 * ไฮไลต์ความเปลี่ยนแปลงของสินค้าที่บันทึกไว้ เทียบกับ "ครั้งล่าสุดที่ผู้ใช้เปิดหน้านี้"
 *
 * เก็บค่าที่เห็นล่าสุด (ราคา/ยอดสะสม/ค่าคอม) ไว้ใน local storage (ที่จัดเก็บข้อมูล
 * ในเบราว์เซอร์) — เมื่อเปิดหน้าอีกครั้งจะเทียบกับค่าปัจจุบันแล้วแสดงป้ายเฉพาะจุด
 * ที่เปลี่ยนจริง จากนั้นบันทึกค่าใหม่ทับเป็นฐานของการเปิดครั้งถัดไป
 *
 * "ฐานเดิม" ถูกอ่านครั้งเดียวตอนเปิดหน้า (lazy init ของ useState) เพื่อไม่ให้ป้าย
 * หายไประหว่างใช้งาน เช่น ตอนผู้ใช้ลบสินค้าออกหรือเปลี่ยนวิธีเรียง
 */

const STORAGE_KEY = "bumbimbanana_saved_lastseen";
const EMPTY_CHANGES: Map<string, SavedChange> = new Map();

interface LastSeenEntry {
  price: number;
  itemSold: number;
  commissionRate: number;
  seenAt: string;
}

export interface SavedChange {
  /** ราคาเปลี่ยน: ราคาเดิม → ราคาใหม่ — undefined ถ้าไม่เปลี่ยน */
  price?: { before: number; now: number };
  /** ยอดขายสะสมเพิ่มขึ้นกี่ชิ้นตั้งแต่ดูครั้งก่อน */
  unitsGained?: number;
  /** ค่าคอมเปลี่ยน: ค่าเดิม → ค่าใหม่ (%) */
  commission?: { before: number; now: number };
}

function readLastSeen(): Record<string, LastSeenEntry> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function computeChanges(
  products: Product[],
  lastSeen: Record<string, LastSeenEntry>,
): Map<string, SavedChange> {
  const result = new Map<string, SavedChange>();

  for (const p of products) {
    const prev = lastSeen[p.id];
    if (!prev) continue; // เพิ่งบันทึก/เพิ่งเปิดครั้งแรก — ยังไม่มีฐานให้เทียบ
    const change: SavedChange = {};
    if (p.price > 0 && prev.price > 0 && p.price !== prev.price) {
      change.price = { before: prev.price, now: p.price };
    }
    const sold = p.itemSold ?? 0;
    if (sold > prev.itemSold) change.unitsGained = sold - prev.itemSold;
    const commNow = p.commissionStatus ? 0 : p.commissionRate;
    if (commNow > 0 && prev.commissionRate > 0 && commNow !== prev.commissionRate) {
      change.commission = { before: prev.commissionRate, now: commNow };
    }
    if (Object.keys(change).length > 0) result.set(p.id, change);
  }
  return result;
}

export function useSavedChanges(products: Product[]): Map<string, SavedChange> {
  // อ่านฐานเดิมครั้งเดียวตอนเปิดหน้า — ฝั่ง SSR ไม่มี localStorage ให้ใช้ค่าว่าง
  // (ตอน SSR/hydration รายการสินค้าที่บันทึกไว้ยังว่างอยู่แล้ว จึงไม่เกิด UI ไม่ตรงกัน)
  const [baseline] = useState<Record<string, LastSeenEntry>>(() =>
    typeof window === "undefined" ? {} : readLastSeen(),
  );

  const changes = useMemo(
    () => (products.length === 0 ? EMPTY_CHANGES : computeChanges(products, baseline)),
    [products, baseline],
  );

  // บันทึกค่าปัจจุบันเป็นฐานสำหรับการเปิดครั้งถัดไป (หลัง render — ไม่มี setState)
  useEffect(() => {
    if (products.length === 0) return;
    const updated: Record<string, LastSeenEntry> = {};
    for (const p of products) {
      updated[p.id] = {
        price: p.price,
        itemSold: p.itemSold ?? 0,
        commissionRate: p.commissionStatus ? 0 : p.commissionRate,
        seenAt: new Date().toISOString(),
      };
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage เต็ม/ถูกปิด — ข้ามได้ ไม่กระทบการแสดงผล
    }
  }, [products]);

  return changes;
}
