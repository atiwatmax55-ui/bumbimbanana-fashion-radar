"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error Boundary สำหรับทุกหน้า — แสดง error จริงแทนข้อความเหมารวม
 * ดู error จริงได้ที่ console ของ terminal (server) และ browser console (client)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // log error จริงทุกครั้ง เพื่อ debug ได้ง่าย
    console.error("[BUMBIMBANANA Error Boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-negative/10 text-negative">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-lg font-bold text-foreground">เกิดข้อผิดพลาดในการโหลดหน้านี้</h1>
      <p className="text-sm text-muted-foreground">
        กรุณาเปิด Console ใน DevTools (F12) หรือ terminal ของ dev server เพื่อดูสาเหตุที่แน่ชัด
        แล้วลองรีเฟรชหน้า หรือกดปุ่มด้านล่างเพื่อลองใหม่
      </p>
      {error.message ? (
        <p className="max-w-xs break-all rounded-xl bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {error.message}
        </p>
      ) : null}
      <Button
        onClick={reset}
        className="rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover"
      >
        ลองใหม่อีกครั้ง
      </Button>
    </div>
  );
}
