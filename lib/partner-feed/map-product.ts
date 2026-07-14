import type { Product } from "@/types/product";

/** field set สำหรับ read-only JSON API ให้ agency/AI agent ภายนอกเรียก (ดู CLAUDE.md เฟส 4) */
export interface PartnerFeedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  shop: string;
  product_url: string;
  /** โปรเจกต์นี้เก็บรูปหลักรูปเดียวต่อสินค้า — คืนเป็น array (0-1 รายการ) เผื่ออนาคตรองรับหลายรูป */
  image_urls: string[];
  colors: string[] | null;
  style_tags: string[] | null;
  silhouette: string | null;
  fabric: string | null;
  detail_points: string[] | null;
  content_worthy_score: number | null;
  sales_cum: number;
  sales_7d: number | null;
  velocity: number | null;
  commission_status: string;
  first_seen: string | null;
  last_sync: string;
}

export function toPartnerFeedProduct(p: Product): PartnerFeedProduct {
  return {
    id: p.id,
    name: p.productName,
    category: p.category,
    price: p.price,
    shop: p.shopName,
    product_url: p.productUrl,
    image_urls: p.productImage ? [p.productImage] : [],
    colors: p.colors ?? null,
    style_tags: p.styleTags ?? null,
    silhouette: p.silhouette ?? null,
    fabric: p.fabric ?? null,
    detail_points: p.detailPoints ?? null,
    content_worthy_score: p.contentWorthyScore ?? null,
    sales_cum: p.itemSold ?? 0,
    sales_7d: p.analytics?.d7?.units ?? null,
    velocity: p.analytics?.velocityEstimate?.value ?? null,
    commission_status:
      p.commissionStatus ?? (p.commissionRate > 0 ? `${p.commissionRate}%` : "ไม่มีข้อมูล"),
    first_seen: p.firstSeenAt ?? null,
    last_sync: p.lastUpdatedAt,
  };
}

/** เกณฑ์ "ของสวยถ่ายลง" — ใช้ร่วมกับ tab=content-worthy (ตรงกับ product-browse-view.tsx) */
export function isContentWorthy(p: Product): boolean {
  return (
    (p.contentWorthyScore ?? 0) >= 70 &&
    p.isOutfitItem !== false &&
    (p.analytics?.isNew === true || p.analytics?.badge7 !== null || p.analytics?.badge30 !== null)
  );
}
