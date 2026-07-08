import { notFound, redirect } from "next/navigation";
import { productRepository } from "@/lib/data-source/product-repository";
import { getLatestCommissionForProduct } from "@/lib/commission/server";
import { fetchProductHistory } from "@/lib/analytics/product-history";
import { ProductDetailView } from "@/components/product-detail/product-detail-view";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) console.log(`[product-detail] rawParam="${id}"`);

  // ── ขั้นที่ 1: ค้นหาด้วย rawParam ตรง ๆ ก่อนเสมอ ──────────────────────────
  // ห้าม redirect ก่อนลองค้นหา เพราะ "011" เป็น ID ที่ถูกต้องของ mock product
  const product = await productRepository.getProductById(id);

  if (isDev) {
    if (product) {
      console.log(
        `[product-detail] FOUND: id="${product.id}" ` +
        `title="${product.productName}" ` +
        `source="${product.source ?? "mock"}" ` +
        `price=${product.price}`
      );
    } else {
      console.log(`[product-detail] NOT FOUND for rawParam="${id}"`);
    }
  }

  if (product) {
    // พบสินค้าตรง ๆ → render ทันที ห้าม redirect เด็ดขาด
    const [commission, history] = await Promise.all([
      getLatestCommissionForProduct(product.id),
      fetchProductHistory(product.id),
    ]);
    return <ProductDetailView product={product} commission={commission} history={history} />;
  }

  // ── ขั้นที่ 2: ไม่พบ → ลอง legacy numeric URL ─────────────────────────────
  // เช่น /products/11 (ไม่มี padding) → /products/011 (mock ID จริง)
  // เฉพาะเมื่อ rawParam เป็นตัวเลขล้วน และ paddedId ≠ rawParam เท่านั้น
  if (/^\d+$/.test(id)) {
    const paddedId = id.padStart(3, "0");
    if (isDev) console.log(`[product-detail] numeric id="${id}" → paddedId="${paddedId}" same=${paddedId === id}`);

    if (paddedId !== id) {
      if (isDev) console.log(`[product-detail] redirecting /products/${paddedId}`);
      // redirect ชั่วคราว (307) ห้ามใช้ permanentRedirect
      redirect(`/products/${paddedId}`);
    }
    // paddedId === id (เช่น "011" → "011") แต่ยังหาไม่เจอ → notFound
  }

  if (isDev) console.log(`[product-detail] notFound for id="${id}"`);
  notFound();
}
