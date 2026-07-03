import { productRepository } from "@/lib/data-source/product-repository";
import { PageHeader } from "@/components/shared/page-header";
import { SyncStatusCard } from "@/components/data-status/sync-status-card";
import { WindsorIntegrationCard } from "@/components/data-status/windsor-integration-card";
import { ShopeeFeedCard } from "@/components/data-status/shopee-feed-card";
import { ShopeePreviewCard } from "@/components/data-status/shopee-preview-card";
import { ShopeeFashionPreviewCard } from "@/components/data-status/shopee-fashion-preview-card";
import { ShopeeWomenFashionCard } from "@/components/data-status/shopee-women-fashion-card";
import { ShopeeImportCard } from "@/components/data-status/shopee-import-card";
import { ShopeeSupabaseHealthCard } from "@/components/data-status/shopee-supabase-health-card";
import { CommissionStatusCard } from "@/components/data-status/commission-status-card";
import { ShopeeAutoSyncCard } from "@/components/data-status/shopee-auto-sync-card";

export default async function DataStatusPage() {
  const syncStatus = await productRepository.getDataSyncStatus();
  const hasShopeeFeed = Boolean(process.env.SHOPEE_PRODUCT_FEED_URL);
  const hasSupabase = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const isDev = process.env.NODE_ENV === "development";

  const summaryText =
    syncStatus.source === "shopee"
      ? syncStatus.syncStatus === "success"
        ? "BUMBIMBANANA Fashion Product Radar กำลังแสดงข้อมูลสินค้าแฟชั่นผู้หญิงจริงจาก Shopee Product Feed ที่นำเข้าเข้า Supabase แล้ว ราคาและจำนวนขายอ้างอิงจาก Feed โดยตรง — ค่าคอมมิชชันยังไม่มีข้อมูลจาก Feed"
        : syncStatus.syncStatus === "pending"
          ? "ตั้งค่า Supabase เรียบร้อยแล้ว แต่ยังไม่มีสินค้าในระบบ กรุณากด 'ตรวจสอบก่อนนำเข้า' แล้วยืนยัน 'นำเข้า' ด้านล่าง เพื่อเริ่มนำเข้า Top 1,000 สินค้าแฟชั่นผู้หญิงจาก Shopee Product Feed"
          : "ตั้งค่า Supabase แล้ว แต่เชื่อมต่อตาราง shopee_products ไม่สำเร็จ — กรุณารันไฟล์ SQL ใน Supabase SQL Editor ก่อน (ดูขั้นตอนในส่วน 'นำเข้าข้อมูลสินค้าเข้า Supabase' ด้านบน)"
      : syncStatus.source === "mock"
        ? "เวอร์ชันนี้ของ BUMBIMBANANA Fashion Product Radar ใช้ Mock Data (ข้อมูลตัวอย่าง) ทั้งหมด ตัวเลขยอดขาย ค่าคอมมิชชัน และอัตราการเติบโตที่แสดงเป็นข้อมูลจำลองขึ้นเพื่อสาธิตการทำงานของระบบเท่านั้น ยังไม่มีการเชื่อมต่อ TikTok Shop หรือ Windsor.ai จริงแต่อย่างใด"
        : syncStatus.syncStatus === "success"
          ? "เวอร์ชันนี้ของ BUMBIMBANANA Fashion Product Radar เชื่อมต่อกับ TikTok Shop จริงผ่าน Windsor.ai แล้ว ฟิลด์บางส่วน (เช่น ค่าคอมมิชชันและหมวดสินค้า) ยังอยู่ระหว่างปรับให้แม่นยำขึ้น เนื่องจากต้องตรวจสอบชื่อฟิลด์จริงจาก Windsor.ai เพิ่มเติม"
          : "ระบบตั้งค่าให้ใช้ข้อมูลจริงจาก Windsor.ai แล้ว แต่การเชื่อมต่อล่าสุดผิดพลาด โปรดตรวจสอบสถานะการเชื่อมต่อบัญชี TikTok Shop ด้านบน";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="สถานะข้อมูล (Data Status)"
        description="ตรวจสอบโหมดข้อมูล ความสดใหม่ของข้อมูล และความพร้อมในการเชื่อมต่อแหล่งข้อมูลจริง"
      />

      <SyncStatusCard status={syncStatus} />
      <WindsorIntegrationCard syncStatus={syncStatus} />
      {hasShopeeFeed ? <ShopeeFeedCard /> : null}
      {hasShopeeFeed ? <ShopeePreviewCard /> : null}
      {hasShopeeFeed ? <ShopeeFashionPreviewCard /> : null}
      {hasShopeeFeed ? <ShopeeWomenFashionCard /> : null}
      {hasSupabase ? <ShopeeSupabaseHealthCard /> : null}
      {hasSupabase ? <CommissionStatusCard /> : null}
      {hasShopeeFeed && hasSupabase ? <ShopeeAutoSyncCard isDev={isDev} /> : null}
      {hasShopeeFeed && hasSupabase ? <ShopeeImportCard /> : null}
      {hasShopeeFeed && !hasSupabase ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-semibold">Supabase ยังไม่ได้ตั้งค่า — นำเข้าสินค้าไม่ได้</p>
          <p className="mt-1 opacity-80">
            เพิ่ม <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/60">SUPABASE_URL</code> และ{" "}
            <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/60">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            ใน <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/60">.env.local</code> แล้วรีสตาร์ทเซิร์ฟเวอร์เพื่อเปิดใช้งานปุ่ม Import
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-brand-cream/40 p-5 text-sm text-muted-foreground">
        {summaryText}
      </div>
    </div>
  );
}
