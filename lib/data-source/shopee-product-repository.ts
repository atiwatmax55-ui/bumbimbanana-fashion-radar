import type { Product, ProductCategory } from "@/types/product";
import type {
  DataSyncStatus,
  ProductQueryOptions,
  ProductRepository,
} from "@/lib/data-source/types";
import { applyProductFilters, sortProducts } from "@/lib/data-source/query-products";
import { getCategoryPlaceholderImage } from "@/lib/data-source/category-image";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  classifyWomenFashion,
  checkMaterialViolation,
} from "@/lib/shopee/women-fashion-filter";
import {
  computeAnalytics,
  type BaselineRow,
} from "@/lib/analytics/period-metrics";

// ─── Row type จาก public.products (source_platform = 'shopee') ────────────────
type ShopeeProductRow = {
  id:                 number;
  title:              string | null;
  product_name:       string | null;
  product_image:      string | null;
  product_url:        string | null;
  shop_name:          string | null;
  category:           string | null;
  category_level_1:   string | null;
  category_level_2:   string | null;
  category_level_3:   string | null;
  price:              number | null;
  item_sold:          number;
  commission_status:  string | null;
  interest_score:     number | null;
  created_at:         string | null;
  updated_at:         string | null;
  workflow_status?:   string | null;
};

const SHOPEE_SELECT =
  "id, title, product_name, product_image, product_url, shop_name, " +
  "category, category_level_1, category_level_2, category_level_3, " +
  "price, item_sold, commission_status, interest_score, " +
  "created_at, updated_at, workflow_status";

// ─── Cache ระดับ module (อายุสั้น) — ลดจำนวน query ต่อ 1 page render ───────────
let cache: { at: number; products: Product[] } | null = null;
const CACHE_TTL_MS = 60_000;

// ─── Commission จริงจาก commission_snapshots (import จาก Shopee Affiliate) ────
async function fetchCommissionMap(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<Map<number, { rate: number; at: string }>> {
  const map = new Map<number, { rate: number; at: string }>();
  const { data, error } = await supabase
    .from("commission_snapshots")
    .select("product_id, commission_rate, imported_at")
    .not("product_id", "is", null)
    .order("imported_at", { ascending: false })
    .limit(5000);

  if (error) {
    // ตารางอาจยังไม่มี/ยังไม่ grant สิทธิ์ — ไม่มีข้อมูลค่าคอม ไม่ใช่ error ร้ายแรง
    console.warn("[shopee-repo] commission_snapshots unavailable:", error.message);
    return map;
  }
  for (const row of (data ?? []) as {
    product_id: number; commission_rate: number; imported_at: string;
  }[]) {
    if (!map.has(row.product_id) && row.commission_rate > 0) {
      map.set(row.product_id, { rate: Number(row.commission_rate), at: row.imported_at });
    }
  }
  return map;
}

// ─── Baseline จาก snapshot (RPC radar_baselines) ──────────────────────────────
async function fetchBaselines(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<BaselineRow[]> {
  const { data, error } = await supabase.rpc("radar_baselines");
  if (error) {
    // RPC ยังไม่ถูก migrate → ทุกสินค้าอยู่ในสถานะ "กำลังเก็บข้อมูล"
    console.warn("[shopee-repo] radar_baselines unavailable:", error.message);
    return [];
  }
  return (data ?? []) as BaselineRow[];
}

// ─── กรองซ้ำตอนอ่าน: เสื้อผ้าผู้หญิงเท่านั้น ─────────────────────────────────
// ข้อมูลเดิมใน Supabase อาจ import มาด้วยตัวกรองรุ่นเก่า (มีรองเท้า/กระเป๋า)
// จึงต้อง re-classify ทุกครั้งที่อ่าน — สินค้าไม่ผ่านถูกซ่อน (ไม่ลบข้อมูล)
function passesWomenApparelFilter(row: ShopeeProductRow): boolean {
  const cat1 = row.category_level_1 ?? "";
  const cat2 = row.category_level_2 ?? "";
  const cat3 = row.category_level_3 ?? "";
  const title = row.title || row.product_name || "";
  if (!classifyWomenFashion(cat1, cat2, cat3).pass) return false;
  if (checkMaterialViolation(cat1, cat2, cat3, title).violated) return false;
  return true;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────
function mapRow(row: ShopeeProductRow): Product {
  const itemSold = Math.max(0, Number(row.item_sold) || 0);
  const price = Math.max(0, Number(row.price) || 0);
  const name = (row.title || row.product_name || "").trim() || "—";
  const category = (row.category || "อื่นๆ") as ProductCategory;

  return {
    id:            String(row.id),
    productName:   name,
    productImage:  row.product_image || getCategoryPlaceholderImage(category),
    shopName:      row.shop_name ?? "ไม่ระบุร้านค้าใน Feed",
    productUrl:    row.product_url ?? "#",
    category,
    price,
    commissionRate:   0,
    commissionStatus: row.commission_status ?? "รอข้อมูลค่าคอมจาก Shopee Affiliate",
    // ค่าเริ่มต้น 0 = ยังไม่มีข้อมูลช่วงเวลา — ห้ามใช้ยอดสะสมแทน
    sales7d:       0,
    sales30d:      0,
    estimatedRevenue: Math.round(itemSold * price),
    growthRate:    0,
    interestScore: Math.max(0, Number(row.interest_score) || 0),
    salesRank:     0,
    commissionRank: 0,
    growthRank:    0,
    lastUpdatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    source:        "shopee",
    itemSold,
    firstSeenAt:   row.created_at ?? undefined,
    workflowStatus: (row.workflow_status as Product["workflowStatus"]) ?? undefined,
  };
}

// ─── โหลดสินค้าทั้งหมด + วิเคราะห์ ────────────────────────────────────────────
async function loadAllProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();

  const [{ data, error }, commissionMap, baselines] = await Promise.all([
    supabase
      .from("products")
      .select(SHOPEE_SELECT)
      .eq("source_platform", "shopee")
      .order("item_sold", { ascending: false })
      .limit(2000),
    fetchCommissionMap(supabase),
    fetchBaselines(supabase),
  ]);

  if (error) {
    // ห้าม fallback ไป Mock Data — จะแสดงสินค้าผิดตัวโดยไม่รู้ตัว
    console.error("[shopee-repo] SELECT failed:", error.message, "code:", error.code);
    throw new Error(`ดึงข้อมูลสินค้าจาก Supabase ไม่สำเร็จ: ${error.message}`);
  }

  const rows = ((data ?? []) as unknown as ShopeeProductRow[]).filter(passesWomenApparelFilter);

  // เวลา import ครั้งแรกสุดของระบบ — ใช้แยก "สินค้าใหม่" ออกจากชุดข้อมูลตั้งต้น
  let systemBaselineAt: string | null = null;
  for (const r of rows) {
    if (r.created_at && (systemBaselineAt === null || r.created_at < systemBaselineAt)) {
      systemBaselineAt = r.created_at;
    }
  }

  const analytics = computeAnalytics(
    rows.map((r) => ({
      productId: r.id,
      price: Math.max(0, Number(r.price) || 0),
      commissionRate: commissionMap.get(r.id)?.rate ?? null,
      firstSeenAt: r.created_at ?? new Date(0).toISOString(),
    })),
    baselines,
    systemBaselineAt,
  );

  return rows.map((row) => {
    const product = mapRow(row);
    const a = analytics.byProductId.get(row.id);
    const commission = commissionMap.get(row.id);

    if (commission) {
      product.commissionRate = commission.rate;
      product.commissionStatus = undefined;
    }
    if (a) {
      product.analytics = a;
      product.sales7d = a.d7?.units ?? 0;
      product.sales30d = a.d30?.units ?? 0;
      if (a.d30) {
        product.estimatedRevenue = a.d30.revenue;
        product.growthRate = a.d30.growthPct ?? 0;
      }
      product.salesRank = a.d30?.salesRank ?? 0;
      product.growthRank = a.d30?.trendRank ?? 0;
    }
    product.commissionRank = analytics.commissionRankById.get(row.id) ?? 0;
    return product;
  });
}

async function getAllProducts(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.products;
  const products = await loadAllProducts();
  cache = { at: Date.now(), products };
  return products;
}

async function getProductById(id: string): Promise<Product | null> {
  const all = await getAllProducts();
  return all.find((p) => p.id === id) ?? null;
}

async function queryProducts(options: ProductQueryOptions): Promise<Product[]> {
  const all = await getAllProducts();
  const filtered = applyProductFilters(all, options.timeRange, options.filters);
  return sortProducts(filtered, options.timeRange, options.sortBy ?? "salesRank");
}

async function getDataSyncStatus(): Promise<DataSyncStatus> {
  try {
    const supabase = getSupabaseServerClient();
    const [{ count }, { data: lastLog }] = await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("source_platform", "shopee"),
      supabase
        .from("import_logs")
        .select("completed_at, failed_count, message")
        .eq("source", "shopee_product_feed")
        .eq("mode", "import")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const totalProducts = count ?? 0;
    const log = lastLog as { completed_at?: string; failed_count?: number } | null;
    const lastSyncedAt = log?.completed_at ?? new Date(0).toISOString();

    return {
      source:       "shopee",
      lastSyncedAt,
      totalProducts,
      syncStatus:   totalProducts > 0 ? "success" : "pending",
      message:
        totalProducts > 0
          ? `Shopee Product Feed — ${totalProducts.toLocaleString("th-TH")} สินค้าในระบบ`
          : "ยังไม่มีสินค้าใน Supabase — กรุณา Import ก่อน",
    };
  } catch (e) {
    console.error("[shopee-repo] getDataSyncStatus failed:", e);
    return {
      source:       "shopee",
      lastSyncedAt: new Date(0).toISOString(),
      totalProducts: 0,
      syncStatus:   "error",
      message:      "ไม่สามารถเชื่อมต่อ Supabase ได้ — ตรวจสอบ SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY",
    };
  }
}

export const shopeeProductRepository: ProductRepository = {
  getAllProducts,
  getProductById,
  queryProducts,
  getDataSyncStatus,
};
