"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/components/layout/nav-items";

/** ส่วนหัวเว็บไซต์: แสดงชื่อแบรนด์เสมอ และเมนูนำทางแบบเต็มบนหน้าจอคอมพิวเตอร์ (มือถือใช้ BottomNav แทน) */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            BUMBIMBANANA
          </span>
          <span className="text-[11px] font-medium text-brand-gold-hover">
            Fashion Product Radar
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[...NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-gold text-foreground"
                    : "text-muted-foreground hover:bg-brand-cream hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
