"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/components/layout/nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const ALL_NAV_ITEMS = [...NAV_ITEMS, ...SECONDARY_NAV_ITEMS];

/** ส่วนหัวเว็บไซต์: แสดงชื่อแบรนด์เสมอ + desktop nav (md+) + hamburger drawer (mobile) */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        {/* Brand */}
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
            BUMBIMBANANA
          </span>
          <span className="text-[10px] font-medium text-brand-gold-hover sm:text-[11px]">
            Fashion Product Radar
          </span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <nav className="hidden items-center gap-1 md:flex">
          {ALL_NAV_ITEMS.map((item) => {
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
                    : "text-muted-foreground hover:bg-brand-cream hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger — เข้าถึงเมนูทั้งหมดรวมถึง "ฝ่ายกลยุทธ์" — ซ่อนบน md+ */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                aria-label="เปิดเมนูนำทาง"
                className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-brand-cream hover:text-foreground md:hidden"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="text-left text-sm font-bold text-foreground">
                เมนูนำทาง
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {ALL_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-gold text-foreground"
                        : "text-muted-foreground hover:bg-brand-cream hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
