import { productRepository } from "@/lib/data-source/product-repository";
import { HomeView } from "@/components/home/home-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, syncStatus] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getDataSyncStatus(),
  ]);

  return <HomeView products={products} lastSyncedAt={syncStatus.lastSyncedAt} />;
}
