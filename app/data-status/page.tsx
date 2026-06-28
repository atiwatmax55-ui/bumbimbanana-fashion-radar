import { productRepository } from "@/lib/data-source/product-repository";
import { PageHeader } from "@/components/shared/page-header";
import { SyncStatusCard } from "@/components/data-status/sync-status-card";
import { WindsorIntegrationCard } from "@/components/data-status/windsor-integration-card";

export default async function DataStatusPage() {
  const syncStatus = await productRepository.getDataSyncStatus();

  const summaryText =
    syncStatus.source === "mock"
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

      <div className="rounded-2xl border border-border bg-brand-cream/40 p-5 text-sm text-muted-foreground">
        {summaryText}
      </div>
    </div>
  );
}
