"use client";

import { cn } from "@/lib/utils";

export type PlatformKey = "all" | "shopee" | "tiktok";

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  all: "ทั้งหมด",
  shopee: "SHOPEE",
  tiktok: "TIKTOK SHOP",
};

interface PlatformSwitchProps {
  value: PlatformKey;
  onChange: (value: PlatformKey) => void;
  className?: string;
}

/**
 * Segmented Control เลือกแพลตฟอร์ม — กรองด้วยฟิลด์ source จริงของสินค้า
 * TikTok Shop ยังไม่มีข้อมูล (โครงสร้างเตรียมไว้) — เลือกได้แต่จะเห็น empty state ตามจริง
 */
export function PlatformSwitch({ value, onChange, className }: PlatformSwitchProps) {
  return (
    <div
      role="group"
      aria-label="เลือกแพลตฟอร์ม"
      className={cn("inline-flex items-stretch border border-border bg-background", className)}
    >
      {(Object.keys(PLATFORM_LABELS) as PlatformKey[]).map((key) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={isActive}
            className={cn(
              "px-3.5 py-2 text-[11px] font-bold tracking-[0.08em] transition-colors duration-200 sm:px-4 sm:text-xs",
              isActive
                ? "bg-foreground text-background"
                : "bg-background text-foreground hover:bg-secondary",
            )}
          >
            {PLATFORM_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}

/** กรองสินค้าตามแพลตฟอร์มจากฟิลด์ source จริง (mock/tiktok เดิม = ไม่มี source) */
export function filterByPlatform<T extends { source?: "shopee" }>(
  products: T[],
  platform: PlatformKey,
): T[] {
  if (platform === "all") return products;
  if (platform === "shopee") return products.filter((p) => p.source === "shopee");
  return products.filter((p) => (p.source as string | undefined) === "tiktok");
}
