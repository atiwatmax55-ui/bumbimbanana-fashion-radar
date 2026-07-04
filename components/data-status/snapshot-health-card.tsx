import { Database, TriangleAlert } from "lucide-react";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { productRepository } from "@/lib/data-source/product-repository";
import { formatThaiDate } from "@/lib/utils/format";

/**
 * การ์ดสถานะ Snapshot ยอดขายรายวัน (สำหรับวิเคราะห์ 7/30 วัน)
 * - แสดงจำนวน snapshot, จำนวนวันที่เก็บ, วันแรกที่เริ่มเก็บ
 * - เตือนถ้ายังไม่ได้รัน migration 0008
 * - แสดงจำนวนสินค้าที่ผ่านตัวกรองเสื้อผ้าผู้หญิง (ที่แสดงบนเว็บจริง)
 */
export async function SnapshotHealthCard() {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseServerClient();

  const [{ count: snapshotCount, error: snapErr }, earliestRes, visibleProducts, { count: totalShopee }] =
    await Promise.all([
      supabase.from("product_sales_snapshots").select("*", { count: "exact", head: true }),
      supabase
        .from("product_sales_snapshots")
        .select("snapshot_date")
        .order("snapshot_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      productRepository.getAllProducts().catch(() => []),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("source_platform", "shopee"),
    ]);

  const migrationMissing = snapErr?.code === "PGRST205";
  const earliest = (earliestRes.data as { snapshot_date?: string } | null)?.snapshot_date ?? null;
  const withMetrics = visibleProducts.filter((p) => p.analytics?.d7 || p.analytics?.d30).length;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-brand-gold-hover" />
        <h2 className="text-base font-bold text-foreground">Snapshot สำหรับวิเคราะห์ 7 / 30 วัน</h2>
      </div>

      {migrationMissing ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            ยังไม่ได้รัน migration 0008 — เปิด Supabase SQL Editor แล้วรันไฟล์{" "}
            <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/60">
              supabase/migrations/0008_sales_snapshots.sql
            </code>{" "}
            เพื่อเริ่มเก็บ Snapshot รายวัน (ระบบยังทำงานได้ แต่การวิเคราะห์ 7/30 วันจะขึ้น
            &ldquo;กำลังเก็บข้อมูล&rdquo; ตลอด)
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Snapshot ทั้งหมด" value={(snapshotCount ?? 0).toLocaleString("th-TH")} />
          <Stat label="เริ่มเก็บเมื่อ" value={earliest ? formatThaiDate(earliest) : "ยังไม่มีข้อมูล"} />
          <Stat
            label="สินค้าที่วิเคราะห์ช่วงเวลาได้แล้ว"
            value={withMetrics.toLocaleString("th-TH")}
          />
          <Stat
            label="ผ่านตัวกรองเสื้อผ้าผู้หญิง / ทั้งหมด"
            value={`${visibleProducts.length.toLocaleString("th-TH")} / ${(totalShopee ?? 0).toLocaleString("th-TH")}`}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        ระบบเก็บ Snapshot ยอดขายสะสม 1 ครั้ง/สินค้า/วัน จากรอบซิงก์อัตโนมัติ
        เก็บย้อนหลัง 100 วัน — การวิเคราะห์ 7 วันเริ่มได้หลังเก็บครบ ~7 วัน และ 30 วันหลังเก็บครบ ~30 วัน
        สินค้าที่ไม่ผ่านตัวกรองจะถูกซ่อนจากหน้าเว็บ (ไม่ลบข้อมูล — เหตุผลการกรองเก็บไว้ใน
        คอลัมน์ filter_reason เพื่อตรวจสอบย้อนหลัง)
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-lg font-extrabold text-foreground">{value}</span>
    </div>
  );
}
