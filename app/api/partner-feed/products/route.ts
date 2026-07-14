import { type NextRequest, NextResponse } from "next/server";
import { productRepository } from "@/lib/data-source/product-repository";
import { checkPartnerFeedAuth } from "@/lib/partner-feed/auth";
import { isContentWorthy, toPartnerFeedProduct } from "@/lib/partner-feed/map-product";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

/**
 * GET /api/partner-feed/products — read-only JSON feed สำหรับ agency/AI agent ภายนอก (เฟส 4)
 * ต้องแนบ Authorization: Bearer <PARTNER_FEED_TOKEN>
 * query params: tab=content-worthy, theme_colors=สี1,สี2, limit (default 25, สูงสุด 200)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = checkPartnerFeedAuth(request);
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab");
  const themeColors = (searchParams.get("theme_colors") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(searchParams.get("limit")) || DEFAULT_LIMIT));

  const all = await productRepository.getAllProducts();

  let filtered = all;
  if (tab === "content-worthy") {
    filtered = filtered.filter(isContentWorthy);
  }
  if (themeColors.length > 0) {
    filtered = filtered.filter((p) => (p.colors ?? []).some((c) => themeColors.includes(c)));
  }

  const products = filtered.slice(0, limit).map(toPartnerFeedProduct);

  return NextResponse.json({ count: products.length, products });
}
