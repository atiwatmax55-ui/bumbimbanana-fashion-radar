import { productRepository } from "@/lib/data-source/product-repository";
import { CompareView } from "@/components/compare/compare-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "เปรียบเทียบสินค้า — BUMBIMBANANA Fashion Radar",
  description: "เลือกสินค้า 2–4 ตัว เทียบราคา ค่าคอม ยอดขาย และความมาแรงในหน้าเดียว",
};

export default async function ComparePage() {
  const products = await productRepository.getAllProducts();
  return <CompareView products={products} />;
}
