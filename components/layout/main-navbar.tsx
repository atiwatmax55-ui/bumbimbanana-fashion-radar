"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bookmark, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * เมนูหลัก — ทุกลิงก์ชี้ route/section ที่มีข้อมูลจริงเท่านั้น
 * TIKTOK SHOP ยังไม่เชื่อมต่อ → พาไปหน้าสถานะระบบ (ไม่หลอกว่ามีข้อมูล)
 */
const MENU = [
  { href: "/", label: "RADAR", thai: "หน้าแรก" },
  { href: "/trending", label: "TREND DROP", thai: "มาแรงวันนี้" },
  { href: "/compare", label: "COMPARE", thai: "เปรียบเทียบ" },
  { href: "/products", label: "SHOPEE", thai: "สินค้า Shopee" },
  { href: "/data-status", label: "TIKTOK SHOP", thai: "ยังไม่เชื่อมต่อ" },
  { href: "/#content-ideas", label: "CONTENT IDEAS", thai: "ไอเดียคอนเทนต์" },
  { href: "/data-status", label: "PERFORMANCE", thai: "สถานะระบบ" },
] as const;

export function MainNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur transition-shadow supports-backdrop-filter:bg-background/85",
        scrolled && "shadow-[0_1px_8px_rgba(0,0,0,0.06)]",
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        {/* Brand — โลโก้จริงของแบรนด์ (monogram) + wordmark */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand-mark.png"
            alt="BUMBIMBANANA Fashion Radar"
            width={40}
            height={40}
            priority
            className="size-9 shrink-0 object-contain"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-wide text-foreground">BUMBIMBANANA</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Fashion Radar
            </span>
          </span>
        </Link>

        {/* เมนูกลาง — desktop */}
        <nav className="hidden items-center gap-6 lg:flex">
          {MENU.map((item) => {
            const isActive = pathname === item.href.split("?")[0].split("#")[0] && item.label !== "TIKTOK SHOP" && item.label !== "PERFORMANCE";
            return (
              <Link
                key={item.label}
                href={item.href}
                data-active={isActive}
                title={item.thai}
                className="nav-underline text-[13px] font-bold tracking-[0.12em] text-foreground"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ขวา: ค้นหา + บันทึกไว้ */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/products"
            className="hidden items-center gap-2 border border-border px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background sm:flex"
          >
            <Search className="size-3.5" />
            ค้นหาสินค้า
          </Link>
          <Link
            href="/saved"
            aria-label="สินค้าที่บันทึกไว้"
            className="flex size-10 items-center justify-center text-foreground transition-colors hover:bg-secondary"
          >
            <Bookmark className="size-4" />
          </Link>

          {/* Hamburger — mobile/tablet */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="เปิดเมนูนำทาง"
                  className="flex size-10 items-center justify-center text-foreground hover:bg-secondary lg:hidden"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-5 py-4">
                <SheetTitle className="flex items-center gap-2.5 text-left">
                  <Image
                    src="/brand-mark.png"
                    alt="BUMBIMBANANA Fashion Radar"
                    width={32}
                    height={32}
                    className="size-8 shrink-0 object-contain"
                  />
                  <span className="font-display text-base text-foreground">BUMBIMBANANA</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-3">
                {MENU.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline justify-between px-4 py-3.5 text-sm font-bold tracking-wide text-foreground hover:bg-secondary"
                  >
                    {item.label}
                    <span className="text-[11px] font-medium text-muted-foreground">{item.thai}</span>
                  </Link>
                ))}
                <div className="mt-2 border-t border-border pt-2">
                  <Link href="/saved" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                    Saved Products (บันทึกไว้)
                  </Link>
                  <Link href="/agency-data" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                    Strategy Board (ฝ่ายกลยุทธ์)
                  </Link>
                  <Link href="/commission-import" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                    นำเข้าค่าคอมมิชชัน
                  </Link>
                  <Link href="/data-status" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                    สถานะระบบ
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
