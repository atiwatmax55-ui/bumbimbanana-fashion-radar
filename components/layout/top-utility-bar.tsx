import Link from "next/link";

/** Utility Bar ชั้นบนสุด — ลิงก์ไปหน้าที่มีอยู่จริงในระบบเท่านั้น */
export function TopUtilityBar() {
  return (
    <div className="hidden h-9 border-b border-border bg-background md:block">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-8">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          BUMBIMBANANA / FASHION INTELLIGENCE
        </span>
        <nav className="flex items-center gap-5">
          <UtilityLink href="/data-status" label="How It Works (วิธีทำงานของระบบ)" />
          <UtilityLink href="/saved" label="Saved Products (บันทึกไว้)" />
          <UtilityLink href="/agency-data" label="Strategy Board (ฝ่ายกลยุทธ์)" />
        </nav>
      </div>
    </div>
  );
}

function UtilityLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );
}
