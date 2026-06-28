import { productRepository } from "@/lib/data-source/product-repository";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const [products, syncStatus] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getDataSyncStatus(),
  ]);

  return <DashboardView products={products} lastUpdatedAt={syncStatus.lastSyncedAt} />;
}
