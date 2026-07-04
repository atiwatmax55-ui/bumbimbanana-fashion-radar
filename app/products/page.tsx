import { productRepository } from "@/lib/data-source/product-repository";
import { ProductBrowseView } from "@/components/products/product-browse-view";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams: Promise<{ sort?: string; range?: string; goal?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const [products, syncStatus] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getDataSyncStatus(),
  ]);

  return (
    <ProductBrowseView
      products={products}
      lastUpdatedAt={syncStatus.lastSyncedAt}
      initialSort={params.sort}
      initialRange={params.range}
    />
  );
}
