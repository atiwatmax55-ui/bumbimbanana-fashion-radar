"use client";

import { useState } from "react";
import { AlertCircle, Loader2, PackagePlus } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { normalizeTiktokItem, type TiktokRawItem } from "@/lib/tiktok/normalize-tiktok-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SingleItemFormProps {
  onSubmit: (items: TiktokRawItem[]) => void;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  productName: "",
  price: "",
  commissionRate: "",
  productUrl: "",
  productImage: "",
  estimatedSold: "",
  category: "",
  shopName: "",
};

/** ฟอร์มกรอกสินค้า TikTok ทีละตัว — สำหรับสินค้าจำนวนน้อยที่คัดมาแล้ว */
export function SingleItemForm({ onSubmit, isSubmitting }: SingleItemFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    const raw: TiktokRawItem = { ...form };
    const result = normalizeTiktokItem(raw, { importedAt: new Date().toISOString() });
    if (!result.ok) {
      setLocalError(result.reason);
      return;
    }

    onSubmit([raw]);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="productName">
          ชื่อสินค้า <span className="text-negative">*</span>
        </Label>
        <Input id="productName" required placeholder="เช่น เดรสลายดอก คอวี แขนสั้น" {...field("productName")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">
            ราคา (บาท) <span className="text-negative">*</span>
          </Label>
          <Input id="price" type="number" min={0} step="0.01" required placeholder="259" {...field("price")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commissionRate">
            ค่าคอมมิชชัน (%) <span className="text-negative">*</span>
          </Label>
          <Input
            id="commissionRate"
            type="number"
            min={0}
            max={100}
            step="0.1"
            required
            placeholder="15"
            {...field("commissionRate")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="productUrl">
          ลิงก์สินค้า <span className="text-negative">*</span>
        </Label>
        <Input
          id="productUrl"
          type="url"
          required
          placeholder="https://shop.tiktok.com/view/product/..."
          {...field("productUrl")}
        />
        <p className="text-xs text-muted-foreground">
          คัดลอกจากปุ่ม &ldquo;คัดลอกลิงก์&rdquo; บนหน้าสินค้าในศูนย์ครีเอเตอร์ (Creator Center) — ต้องขึ้นต้นด้วย https://
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="productImage">ลิงก์รูปสินค้า (ไม่บังคับ)</Label>
        <Input id="productImage" type="url" placeholder="https://..." {...field("productImage")} />
        <p className="text-xs text-muted-foreground">
          ถ้าคัดลอกไม่ได้ ปล่อยว่างไว้ — ระบบจะใช้รูปตัวอย่างตามหมวดสินค้าแทน
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedSold">ยอดขายโดยประมาณ (ไม่บังคับ)</Label>
          <Input id="estimatedSold" type="number" min={0} step="1" placeholder="1200" {...field("estimatedSold")} />
          <p className="text-xs text-muted-foreground">ยอดขายสะสมที่เห็นบนหน้าสินค้า เช่น &ldquo;ขายแล้ว 1.2 พัน&rdquo; ให้กรอก 1200</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">หมวดหมู่ (ไม่บังคับ)</Label>
          <select
            id="category"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...field("category")}
          >
            <option value="">อื่นๆ (ค่าเริ่มต้น)</option>
            {PRODUCT_CATEGORIES.filter((c) => c !== "อื่นๆ").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shopName">ชื่อร้าน (ไม่บังคับ)</Label>
        <Input id="shopName" placeholder="ชื่อร้านที่ขายสินค้านี้" {...field("shopName")} />
      </div>

      {localError && (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {localError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover hover:text-background disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> กำลังนำเข้า...
          </>
        ) : (
          <>
            <PackagePlus className="size-4" /> นำเข้าสินค้านี้
          </>
        )}
      </Button>
    </form>
  );
}
