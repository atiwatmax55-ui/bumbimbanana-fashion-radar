import { productRepository } from "@/lib/data-source/product-repository";
import { ProductRadarView } from "@/components/products/product-radar-view";

interface ProductsPageProps {
  searchParams: Promise<{ goal?: string; range?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const [products, syncStatus] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getDataSyncStatus(),
  ]);

  return (
    <ProductRadarView
      products={products}
      lastUpdatedAt={syncStatus.lastSyncedAt}
      initialGoal={params.goal}
      initialRange={params.range}
    />
  );
}
