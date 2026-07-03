import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryPlaceholderImage } from "@/lib/data-source/category-image";
import { PageHeader } from "@/components/shared/page-header";
import { AgencyDataView } from "@/components/agency-data/agency-data-view";
import type { Product, ProductCategory } from "@/types/product";

async function getAgencyProducts(): Promise<Product[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, title, product_name, product_image, product_url, shop_name, category, " +
      "price, item_sold, commission_rate, commission_status, sales_7d, sales_30d, " +
      "updated_at, workflow_status",
    )
    .in("workflow_status", ["strategy_review", "approved_for_content"])
    .order("workflow_status", { ascending: true })
    .order("item_sold", { ascending: false });

  if (error || !data) return [];

  type AgencyRow = {
    id: string;
    title: string | null;
    product_name: string | null;
    product_image: string | null;
    product_url: string | null;
    shop_name: string | null;
    category: string | null;
    price: number | null;
    item_sold: number | null;
    commission_rate: number | null;
    commission_status: string | null;
    sales_7d: number | null;
    sales_30d: number | null;
    updated_at: string | null;
    workflow_status: string | null;
  };

  return (data as unknown as AgencyRow[]).map((row) => {
    const category = ((row.category ?? "อื่นๆ") as ProductCategory);
    const itemSold = Math.max(0, Number(row.item_sold) || 0);
    const price = Math.max(0, Number(row.price) || 0);
    const name = (row.title || row.product_name || "").trim() || "—";
    return {
      id: row.id,
      productName: name,
      productImage: row.product_image || getCategoryPlaceholderImage(category),
      shopName: row.shop_name ?? "—",
      productUrl: row.product_url ?? "#",
      category,
      price,
      commissionRate: Math.max(0, Number(row.commission_rate) || 0),
      commissionStatus: row.commission_status ?? undefined,
      sales7d: Math.max(0, Number(row.sales_7d) || itemSold),
      sales30d: Math.max(0, Number(row.sales_30d) || itemSold),
      estimatedRevenue: Math.round(itemSold * price),
      growthRate: 0,
      interestScore: 0,
      salesRank: 0,
      commissionRank: 0,
      growthRank: 0,
      lastUpdatedAt: row.updated_at ?? new Date().toISOString(),
      source: "shopee",
      workflowStatus: row.workflow_status as Product["workflowStatus"],
    };
  });
}

export default async function AgencyDataPage() {
  const products = await getAgencyProducts();
  const hasSupabase = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="สินค้าส่งฝ่ายกลยุทธ์ (Agency Data)"
        description="รายการสินค้าที่ส่งให้ฝ่ายกลยุทธ์ตรวจสอบและอนุมัติทำคอนเทนต์"
      />
      {!hasSupabase ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-semibold">Supabase ยังไม่ได้ตั้งค่า</p>
          <p className="mt-1 opacity-80">
            ตั้งค่า{" "}
            <code className="font-mono">SUPABASE_URL</code> และ{" "}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            ใน <code className="font-mono">.env.local</code> เพื่อใช้ฟีเจอร์นี้
          </p>
        </div>
      ) : (
        <AgencyDataView products={products} />
      )}
    </div>
  );
}
