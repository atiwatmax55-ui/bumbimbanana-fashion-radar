import { productRepository } from "@/lib/data-source/product-repository";
import { LookBuilderView } from "@/components/look-builder/look-builder-view";

export const dynamic = "force-dynamic";

export default async function LookBuilderPage() {
  const products = await productRepository.getAllProducts();
  return <LookBuilderView products={products} />;
}
