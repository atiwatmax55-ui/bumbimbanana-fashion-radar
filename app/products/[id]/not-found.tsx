import Link from "next/link";
import { PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** แสดงเมื่อค้นหาสินค้าด้วย id นี้ไม่พบในระบบ */
export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PackageX className="size-7" />
      </div>
      <h1 className="text-lg font-bold text-foreground">ไม่พบสินค้านี้ในระบบ</h1>
      <p className="text-sm text-muted-foreground">
        สินค้าที่คุณกำลังมองหาอาจถูกลบออกไปแล้ว หรือลิงก์ไม่ถูกต้อง
      </p>
      <Button
        className="rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover"
        render={<Link href="/products" />}
        nativeButton={false}
      >
        กลับไปหน้าค้นหาสินค้า
      </Button>
    </div>
  );
}
