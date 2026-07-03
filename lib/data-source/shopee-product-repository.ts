import type { Product, ProductCategory } from "@/types/product";
import type {
  DataSyncStatus,
  ProductQueryOptions,
  ProductRepository,
} from "@/lib/data-source/types";
import { computeProductRanks } from "@/lib/data-source/compute-ranks";
import { applyProductFilters, sortProducts } from "@/lib/data-source/query-products";
import { getCategoryPlaceholderImage } from "@/lib/data-source/category-image";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// ─── Row type จาก public.products (source_platform = 'shopee') ────────────────
type ShopeeProductRow = {
  id:                 string;
  title:              string | null;
  product_name:       string | null;
  product_image:      string | null;
  product_url:        string | null;
  shop_name:          string | null;
  shop_rating:        number | null;
  category:           string | null;
  category_level_1:   string | null;
  price:              number | null;
  item_sold:          number;
  commission_rate:    number | null;
  commission_status:  string | null;
  interest_score:     number | null;
  sales_7d:           number | null;
  sales_30d:          number | null;
  updated_at:         string | null;
  // optional — ต้องรัน migration 0007 ก่อนจึงจะมีคอลัมน์นี้
  workflow_status?:   string | null;
};

// Full SELECT รวม workflow_status (ต้องรัน migration 0007)
const SHOPEE_SELECT_FULL =
  "id, title, product_name, product_image, product_url, shop_name, shop_rating, " +
  "category, category_level_1, price, item_sold, commission_rate, commission_status, " +
  "interest_score, sales_7d, sales_30d, updated_at, workflow_status";

// Reduced SELECT เมื่อ workflow_status ยังไม่มีใน schema
const SHOPEE_SELECT_BASE =
  "id, title, product_name, product_image, product_url, shop_name, shop_rating, " +
  "category, category_level_1, price, item_sold, commission_rate, commission_status, " +
  "interest_score, sales_7d, sales_30d, updated_at";

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(row: ShopeeProductRow): Omit<Product, "salesRank" | "commissionRank" | "growthRank"> {
  const itemSold  = Math.max(0, Number(row.item_sold)  || 0);
  const price     = Math.max(0, Number(row.price)      || 0);
  const name = (row.title || row.product_name || "").trim() || "—";
  const category = ((row.category || "อื่นๆ") as ProductCategory);

  return {
    id:            row.id,
    productName:   name,
    productImage:  row.product_image || getCategoryPlaceholderImage(category),
    shopName:      row.shop_name ?? "ไม่ระบุร้านค้าใน Feed",
    productUrl:    row.product_url ?? "#",
    category,
    price,
    commissionRate:   0,
    commissionStatus: row.commission_status ?? "รอข้อมูลค่าคอมจาก Shopee Affiliate",
    sales7d:       Math.max(0, Number(row.sales_7d)  || itemSold),
    sales30d:      Math.max(0, Number(row.sales_30d) || itemSold),
    estimatedRevenue: Math.round(itemSold * price),
    growthRate:    0,
    interestScore: Math.max(0, Number(row.interest_score) || 0),
    lastUpdatedAt: row.updated_at ?? new Date().toISOString(),
    source:        "shopee",
    workflowStatus: (row.workflow_status as Product["workflowStatus"]) ?? undefined,
  };
}

// ─── เลือก SELECT string ตาม PostgreSQL error ────────────────────────────────

function isMissingColumn(errCode?: string): boolean {
  return errCode === "42703"; // undefined_column
}

// ─── Repository ───────────────────────────────────────────────────────────────

async function fetchAllShopeeRows(supabase: ReturnType<typeof getSupabaseServerClient>) {
  // ลอง SELECT เต็มก่อน (รวม workflow_status)
  const { data, error } = await supabase
    .from("products")
    .select(SHOPEE_SELECT_FULL)
    .eq("source_platform", "shopee")
    .order("item_sold", { ascending: false })
    .limit(2000);

  if (!error) return { data, warning: null };

  // ถ้า error เกิดจาก "column does not exist" → ลอง SELECT แบบ base (ไม่มี workflow_status)
  if (isMissingColumn(error.code)) {
    console.warn(
      "[shopee-repo] workflow_status column missing — using base SELECT (run migration 0007 to fix):",
      error.message,
    );
    const { data: baseData, error: baseErr } = await supabase
      .from("products")
      .select(SHOPEE_SELECT_BASE)
      .eq("source_platform", "shopee")
      .order("item_sold", { ascending: false })
      .limit(2000);

    if (!baseErr) return { data: baseData, warning: "workflow_status column not yet migrated" };
    // base SELECT ก็ยังล้มเหลว
    throw new Error(`ดึงข้อมูลสินค้าจาก Supabase ไม่สำเร็จ (base): ${baseErr.message}`);
  }

  // error ชนิดอื่น — throw เพื่อให้ error boundary จัดการ
  // ห้าม fallback ไป Mock Data เพราะจะทำให้แสดงสินค้าผิดตัวโดยไม่รู้ตัว
  console.error("[shopee-repo] getAllProducts SELECT failed:", error.message, "code:", error.code);
  throw new Error(`ดึงข้อมูลสินค้าจาก Supabase ไม่สำเร็จ: ${error.message}`);
}

async function getAllProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  const isDev = process.env.NODE_ENV === "development";

  const { data, warning } = await fetchAllShopeeRows(supabase);

  if (warning && isDev) console.warn(`[shopee-repo] ${warning}`);

  if (!data || data.length === 0) {
    // Supabase เชื่อมต่อได้แต่ยังไม่มีสินค้า Shopee — คืนค่าว่าง ห้ามใช้ Mock Data
    if (isDev) console.warn("[shopee-repo] getAllProducts: 0 Shopee products — import via /data-status first");
    return [];
  }

  if (isDev) console.log(`[shopee-repo] getAllProducts: loaded ${data.length} Shopee products`);
  const mapped = (data as unknown as ShopeeProductRow[]).map(mapRow);
  return computeProductRanks(mapped as Product[]);
}

async function fetchOneShopeeRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  id: string,
) {
  const { data: row, error } = await supabase
    .from("products")
    .select(SHOPEE_SELECT_FULL)
    .eq("id", id)
    .maybeSingle();

  if (!error) return row;

  if (isMissingColumn(error.code)) {
    const { data: baseRow } = await supabase
      .from("products")
      .select(SHOPEE_SELECT_BASE)
      .eq("id", id)
      .maybeSingle();
    return baseRow ?? null;
  }

  console.error("[shopee-repo] getProductById lookup failed:", error.message);
  return null;
}

async function getProductById(id: string): Promise<Product | null> {
  const supabase = getSupabaseServerClient();
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) console.log(`[shopee-repo] getProductById("${id}")`);

  const row = await fetchOneShopeeRow(supabase, id);

  if (row) {
    const r = row as unknown as ShopeeProductRow;
    if (isDev) {
      console.log(
        `[shopee-repo] FOUND: id="${r.id}" ` +
        `title="${r.title || r.product_name}" source_platform=shopee`
      );
    }
    const mapped = mapRow(r);
    try {
      const all = await getAllProducts();
      const withRank = (all as Product[]).find((p) => p.id === id);
      return withRank ?? { ...mapped, salesRank: 0, commissionRank: 0, growthRank: 0 };
    } catch {
      return { ...mapped, salesRank: 0, commissionRank: 0, growthRank: 0 };
    }
  }

  // ไม่พบใน Supabase
  // ห้าม fallback ไป Mock Data: จะทำให้แสดงสินค้าคนละตัวโดยไม่รู้ตัว
  if (isDev) console.warn(`[shopee-repo] getProductById("${id}"): NOT FOUND — no mock fallback`);
  return null;
}

async function queryProducts(options: ProductQueryOptions): Promise<Product[]> {
  const all = await getAllProducts();
  const filtered = applyProductFilters(all, options.timeRange, options.filters);
  return sortProducts(filtered, options.timeRange, options.sortBy ?? "salesRank");
}

async function getDataSyncStatus(): Promise<DataSyncStatus> {
  try {
    const supabase = getSupabaseServerClient();
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("source_platform", "shopee");

    const { data: lastLog } = await supabase
      .from("import_logs")
      .select("completed_at")
      .eq("source", "shopee_product_feed")
      .eq("mode", "import")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    const totalProducts = count ?? 0;
    const lastSyncedAt  =
      (lastLog as { completed_at?: string } | null)?.completed_at ?? new Date().toISOString();

    return {
      source:       "shopee",
      lastSyncedAt,
      totalProducts,
      syncStatus:   totalProducts > 0 ? "success" : "pending",
      message:
        totalProducts > 0
          ? `Shopee Product Feed — ${totalProducts.toLocaleString("th-TH")} สินค้าแฟชั่นผู้หญิง`
          : "ยังไม่มีสินค้าใน Supabase — กรุณา Import ก่อน",
    };
  } catch (e) {
    console.error("[shopee-repo] getDataSyncStatus failed:", e);
    return {
      source:       "shopee",
      lastSyncedAt: new Date().toISOString(),
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
