"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addSavedProduct,
  getSavedProductsServerSnapshot,
  getSavedProductsSnapshot,
  removeSavedProduct,
  subscribeSavedProducts,
  updateSavedProductNote,
} from "@/lib/saved-products/storage";

/** Hook จัดการสินค้าที่บันทึกไว้ (อ่าน/เขียนจาก local storage ฝั่งเบราว์เซอร์ ผ่าน useSyncExternalStore) */
export function useSavedProducts() {
  const savedProducts = useSyncExternalStore(
    subscribeSavedProducts,
    getSavedProductsSnapshot,
    getSavedProductsServerSnapshot
  );

  const isSaved = useCallback(
    (productId: string) => savedProducts.some((item) => item.productId === productId),
    [savedProducts]
  );

  const save = useCallback((productId: string, personalNote = "") => {
    addSavedProduct(productId, personalNote);
  }, []);

  const unsave = useCallback((productId: string) => {
    removeSavedProduct(productId);
  }, []);

  const toggleSave = useCallback(
    (productId: string) => {
      if (isSaved(productId)) {
        unsave(productId);
      } else {
        save(productId);
      }
    },
    [isSaved, save, unsave]
  );

  const updateNote = useCallback((productId: string, personalNote: string) => {
    updateSavedProductNote(productId, personalNote);
  }, []);

  return { savedProducts, isSaved, save, unsave, toggleSave, updateNote };
}
