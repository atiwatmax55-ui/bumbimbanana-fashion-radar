import { notFound } from "next/navigation";
import { productRepository } from "@/lib/data-source/product-repository";
import { ProductDetailView } from "@/components/product-detail/product-detail-view";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await productRepository.getProductById(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailView product={product} />;
}
