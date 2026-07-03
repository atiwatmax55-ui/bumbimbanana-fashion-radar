"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";

/** แถบเมนูด้านล่างสำหรับมือถือ (Mobile First) ซ่อนบนหน้าจอคอมพิวเตอร์เพราะมี SiteHeader แสดงเมนูแล้ว */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-brand-gold-hover" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("size-5", isActive && "text-brand-gold-hover")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
