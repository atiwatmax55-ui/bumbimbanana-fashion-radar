import { CheckCircle2, Database, ExternalLink, FlaskConical, PlugZap, XCircle } from "lucide-react";
import type { DataSyncStatus } from "@/lib/data-source/types";
import { Button } from "@/components/ui/button";

interface WindsorIntegrationCardProps {
  syncStatus: DataSyncStatus;
}

/** สถานะการเชื่อมต่อ Windsor.ai กับ TikTok Shop และพื้นที่จัดการการเชื่อมต่อ */
export function WindsorIntegrationCard({ syncStatus }: WindsorIntegrationCardProps) {
  const isWindsorConnected = syncStatus.source === "windsor" && syncStatus.syncStatus === "success";
  const isWindsorError = syncStatus.source === "windsor" && syncStatus.syncStatus === "error";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-brand-gold bg-brand-cream/50 p-5">
      <div className="flex items-center gap-2">
        <PlugZap className="size-4 text-brand-gold-hover" />
        <h2 className="text-sm font-bold text-foreground">การเชื่อมต่อ Windsor.ai กับ TikTok Shop</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        ระบบสลับแหล่งข้อมูลจาก Mock Data (ข้อมูลตัวอย่าง) ไปเป็นข้อมูลจริงจาก TikTok Shop ผ่าน Windsor.ai
        ได้ด้วยตัวแปรสภาพแวดล้อม <code className="rounded bg-background px-1.5 py-0.5 text-xs">DATA_SOURCE_MODE</code>{" "}
        โดยไม่ต้องแก้ไขโค้ดหน้าเว็บไซต์ ทุกหน้าจะดึงข้อมูลผ่านสัญญา (interface) เดียวกันเสมอ
      </p>

      <div className="flex flex-col gap-2 rounded-xl bg-background p-4 text-xs text-muted-foreground">
        <Step
          icon={FlaskConical}
          label="Mock Data"
          detail="mockProductRepository — อ่านจาก Mock Data ในโค้ด"
          active={syncStatus.source === "mock"}
        />
        <Step
          icon={Database}
          label="Windsor.ai"
          detail={
            isWindsorConnected
              ? "windsorProductRepository — เชื่อมต่อสำเร็จ ดึงข้อมูลจาก TikTok Shop จริง"
              : isWindsorError
                ? `windsorProductRepository — เชื่อมต่อผิดพลาด: ${syncStatus.message}`
                : "windsorProductRepository — ดึงข้อมูลจาก Windsor.ai ผ่าน environment variable ฝั่งเซิร์ฟเวอร์เท่านั้น"
          }
          active={syncStatus.source === "windsor"}
          status={isWindsorConnected ? "success" : isWindsorError ? "error" : undefined}
        />
      </div>

      <Button
        variant="outline"
        className="self-start gap-2 rounded-full"
        render={<a href="https://onboard.windsor.ai/app/tiktok_shop" target="_blank" rel="noopener noreferrer" />}
        nativeButton={false}
      >
        <PlugZap className="size-4" />
        {isWindsorConnected ? "จัดการการเชื่อมต่อที่ Windsor.ai" : "เชื่อมต่อ TikTok Shop ที่ Windsor.ai"}
        <ExternalLink className="size-3.5" />
      </Button>

      <p className="text-xs text-muted-foreground">
        การเชื่อมต่อเป็นการล็อกอิน TikTok Shop Seller Center โดยตรงบนเว็บไซต์ Windsor.ai (OAuth) — Windsor.ai
        และเว็บไซต์นี้ไม่เห็นรหัสผ่านของคุณ และยกเลิกสิทธิ์ได้ทุกเมื่อจาก TikTok Seller Center เพื่อความปลอดภัย
        เว็บไซต์นี้จะไม่เก็บหรือแสดง API Key (กุญแจเชื่อมระบบ) บนหน้าเว็บไซต์เด็ดขาด ไม่ว่าจะอยู่ในโหมดข้อมูลใดก็ตาม
      </p>
    </div>
  );
}

function Step({
  icon: Icon,
  label,
  detail,
  active,
  status,
}: {
  icon: typeof FlaskConical;
  label: string;
  detail: string;
  active?: boolean;
  status?: "success" | "error";
}) {
  const StatusIcon = status === "success" ? CheckCircle2 : status === "error" ? XCircle : Icon;
  const statusClassName =
    status === "success" ? "text-positive" : status === "error" ? "text-negative" : active ? "text-brand-gold-hover" : "";

  return (
    <div className="flex items-start gap-2">
      <StatusIcon className={`mt-0.5 size-4 shrink-0 ${statusClassName}`} />
      <p>
        <span className="font-bold text-foreground">{label}: </span>
        {detail}
      </p>
    </div>
  );
}
