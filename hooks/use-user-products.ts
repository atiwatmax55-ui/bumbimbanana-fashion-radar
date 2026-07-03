"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ProductDraft } from "@/lib/data-source/build-product";
import {
  addUserProduct,
  getUserProductsServerSnapshot,
  getUserProductsSnapshot,
  removeUserProduct,
  subscribeUserProducts,
  updateUserProduct,
} from "@/lib/user-products/storage";

/** Hook จัดการสินค้าที่เจ้าของเว็บพิมพ์เพิ่มเอง (อ่าน/เขียนจาก local storage ฝั่งเบราว์เซอร์ ผ่าน useSyncExternalStore) */
export function useUserProducts() {
  const userProducts = useSyncExternalStore(
    subscribeUserProducts,
    getUserProductsSnapshot,
    getUserProductsServerSnapshot
  );

  const isUserProduct = useCallback(
    (productId: string) => userProducts.some((item) => item.id === productId),
    [userProducts]
  );

  const addProduct = useCallback((draft: ProductDraft) => {
    addUserProduct(draft);
  }, []);

  const updateProduct = useCallback((id: string, draft: ProductDraft) => {
    updateUserProduct(id, draft);
  }, []);

  const removeProduct = useCallback((id: string) => {
    removeUserProduct(id);
  }, []);

  return { userProducts, isUserProduct, addProduct, updateProduct, removeProduct };
}
