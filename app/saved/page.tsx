import { productRepository } from "@/lib/data-source/product-repository";
import { SavedProductsView } from "@/components/saved/saved-products-view";

export const dynamic = "force-dynamic";

export default async function SavedProductsPage() {
  const [products, syncStatus] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getDataSyncStatus(),
  ]);

  return <SavedProductsView products={products} lastUpdatedAt={syncStatus.lastSyncedAt} />;
}
