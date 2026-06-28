"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** หน้าจอแสดงข้อผิดพลาดเมื่อดึงข้อมูลสินค้าไม่สำเร็จ (เช่น เชื่อมต่อ Windsor.ai ไม่ได้) ใช้ครอบทุกหน้าในเว็บไซต์ */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-negative/10 text-negative">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-lg font-bold text-foreground">ไม่สามารถดึงข้อมูลสินค้าได้ในขณะนี้</h1>
      <p className="text-sm text-muted-foreground">
        อาจเกิดจากการเชื่อมต่อ Windsor.ai ขัดข้อง หรือบัญชี TikTok Shop ที่เชื่อมต่อไว้หมดสิทธิ์การเข้าถึง
        กรุณาตรวจสอบสถานะที่หน้าสถานะข้อมูล (Data Status) แล้วลองใหม่อีกครั้ง
      </p>
      <Button onClick={reset} className="rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover">
        ลองใหม่อีกครั้ง
      </Button>
    </div>
  );
}
