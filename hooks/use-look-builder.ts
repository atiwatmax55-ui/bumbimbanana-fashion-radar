"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { LookSlots } from "@/lib/look-builder/matching";
import {
  addLookSet,
  getLookSetsServerSnapshot,
  getLookSetsSnapshot,
  removeLookSet,
  subscribeLookSets,
} from "@/lib/look-builder/storage";

/** Hook จัดการลุคที่บันทึกไว้ (อ่าน/เขียนจาก local storage ฝั่งเบราว์เซอร์ ผ่าน useSyncExternalStore) */
export function useLookBuilder() {
  const lookSets = useSyncExternalStore(
    subscribeLookSets,
    getLookSetsSnapshot,
    getLookSetsServerSnapshot,
  );

  const saveLook = useCallback((baseProductId: string, colors: string[], slots: LookSlots) => {
    addLookSet(baseProductId, colors, slots);
  }, []);

  const deleteLook = useCallback((id: string) => {
    removeLookSet(id);
  }, []);

  return { lookSets, saveLook, deleteLook };
}
