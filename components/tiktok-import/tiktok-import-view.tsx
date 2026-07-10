"use client";

import { useState } from "react";
import { AlertCircle, ClipboardPaste, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TiktokRawItem } from "@/lib/tiktok/normalize-tiktok-item";
import type { TiktokImportRequest, TiktokImportResponse } from "@/lib/tiktok/types";
import { SingleItemForm } from "@/components/tiktok-import/single-item-form";
import { CsvPastePanel } from "@/components/tiktok-import/csv-paste-panel";
import { ImportResultSummary } from "@/components/tiktok-import/import-result-summary";

type InputMode = "single" | "paste";

/** หน้านำเข้าสินค้า TikTok ด้วยมือ — กรอกทีละตัว หรือวาง CSV/JSON หลายตัวพร้อมกัน */
export function TiktokImportView() {
  const [mode, setMode] = useState<InputMode>("single");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<TiktokImportResponse | null>(null);

  async function handleSubmit(items: TiktokRawItem[]) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const res = await fetch("/api/tiktok/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items } satisfies TiktokImportRequest),
      });
      const data = (await res.json()) as TiktokImportResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "นำเข้าไม่สำเร็จ");
      setResult(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setApiError(null);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">นำเข้าสินค้า TikTok Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          จดข้อมูลสินค้าที่คัดมาจากศูนย์ครีเอเตอร์ (Creator Center) ของบัญชีตัวเอง แล้วกรอกที่นี่ —
          ไม่ใช่การดึงข้อมูลอัตโนมัติ
        </p>
      </div>

      {!result && (
        <div role="group" aria-label="เลือกวิธีนำเข้า" className="inline-flex w-fit items-stretch border border-border bg-background">
          <ModeButton active={mode === "single"} onClick={() => setMode("single")} icon={PenLine}>
            กรอกทีละตัว
          </ModeButton>
          <ModeButton active={mode === "paste"} onClick={() => setMode("paste")} icon={ClipboardPaste}>
            วาง CSV / JSON
          </ModeButton>
        </div>
      )}

      {apiError && (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {apiError}
        </div>
      )}

      {result ? (
        <ImportResultSummary result={result} onReset={reset} />
      ) : mode === "single" ? (
        <SingleItemForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      ) : (
        <CsvPastePanel onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold tracking-[0.08em] transition-colors duration-200 sm:px-4 sm:text-xs",
        active ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-secondary",
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}
