import { type NextRequest, NextResponse } from "next/server";
import { productRepository } from "@/lib/data-source/product-repository";
import { checkPartnerFeedAuth } from "@/lib/partner-feed/auth";
import { toPartnerFeedProduct } from "@/lib/partner-feed/map-product";

export const dynamic = "force-dynamic";

/** GET /api/partner-feed/products/[id] — สินค้ารายตัว (เฟส 4) ต้องแนบ Authorization: Bearer <PARTNER_FEED_TOKEN> */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = checkPartnerFeedAuth(request);
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const product = await productRepository.getProductById(id);
  if (!product) {
    return NextResponse.json({ error: `ไม่พบสินค้า id=${id}` }, { status: 404 });
  }

  return NextResponse.json(toPartnerFeedProduct(product));
}
