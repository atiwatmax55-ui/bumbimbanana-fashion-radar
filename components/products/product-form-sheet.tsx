"use client";

import { useState } from "react";
import type { ProductCategory } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import type { ProductDraft } from "@/lib/data-source/build-product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const EMPTY_DRAFT: ProductDraft = {
  productName: "",
  shopName: "",
  category: PRODUCT_CATEGORIES[0],
  price: 0,
  commissionRate: 0,
  sales7d: 0,
  sales30d: 0,
  growthRate: 0,
  interestScore: 50,
  productUrl: "",
};

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: ProductDraft;
  onSubmit: (draft: ProductDraft) => void;
}

function toSafeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * ฟอร์มเพิ่ม/แก้ไขสินค้าด้วยมือ (Manual Curation) — เจ้าของเว็บกรอกข้อมูลที่เจอจริงจาก
 * TikTok Shop Affiliate Center (Find Products) เอง ไม่มีการดึงข้อมูลอัตโนมัติจาก TikTok
 */
export function ProductFormSheet({ open, onOpenChange, initialValues, onSubmit }: ProductFormSheetProps) {
  const [draft, setDraft] = useState<ProductDraft>(initialValues ?? EMPTY_DRAFT);
  const [prevOpen, setPrevOpen] = useState(open);

  // รีเซ็ตฟอร์มตอนเปิดชีตใหม่ทุกครั้ง (ปรับ state ระหว่าง render ตาม react.dev แทนการใช้ useEffect)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(initialValues ?? EMPTY_DRAFT);
  }

  const isEditing = Boolean(initialValues);
  const isValid = draft.productName.trim().length > 0 && draft.shopName.trim().length > 0;

  function updateField<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!isValid) return;
    onSubmit(draft);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-sm">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{isEditing ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่ด้วยมือ"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <p className="text-xs text-muted-foreground">
            กรอกข้อมูลสินค้าที่คุณเจอจริงจาก TikTok Shop Affiliate Center (Find Products) เอง — ไม่ใช่ Mock Data
            (ข้อมูลตัวอย่าง)
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="productName">ชื่อสินค้า</Label>
            <Input
              id="productName"
              value={draft.productName}
              onChange={(e) => updateField("productName", e.target.value)}
              placeholder="เช่น กางเกงยีนส์ขาบานทรงสูง"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shopName">ชื่อร้านค้า</Label>
            <Input
              id="shopName"
              value={draft.shopName}
              onChange={(e) => updateField("shopName", e.target.value)}
              placeholder="เช่น BAMBI.CO"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>หมวดสินค้า</Label>
            <Select value={draft.category} onValueChange={(v) => updateField("category", v as ProductCategory)}>
              <SelectTrigger className="w-full rounded-lg">
                <SelectValue placeholder="เลือกหมวดสินค้า" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">ราคา (บาท)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={draft.price}
                onChange={(e) => updateField("price", toSafeNumber(Number(e.target.value)))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commissionRate">ค่าคอมมิชชัน (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                min={0}
                value={draft.commissionRate}
                onChange={(e) => updateField("commissionRate", toSafeNumber(Number(e.target.value)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sales7d">ยอดขาย 7 วัน (ชิ้น)</Label>
              <Input
                id="sales7d"
                type="number"
                min={0}
                value={draft.sales7d}
                onChange={(e) => updateField("sales7d", toSafeNumber(Number(e.target.value)))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sales30d">ยอดขาย 30 วัน (ชิ้น)</Label>
              <Input
                id="sales30d"
                type="number"
                min={0}
                value={draft.sales30d}
                onChange={(e) => updateField("sales30d", toSafeNumber(Number(e.target.value)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="growthRate">อัตราการเติบโต (%)</Label>
              <Input
                id="growthRate"
                type="number"
                value={draft.growthRate}
                onChange={(e) => updateField("growthRate", toSafeNumber(Number(e.target.value)))}
              />
              <p className="text-[11px] text-muted-foreground">ใส่ค่าลบได้ถ้ายอดขายลดลง</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interestScore">คะแนนความน่าสนใจ (0-100)</Label>
              <Input
                id="interestScore"
                type="number"
                min={0}
                max={100}
                value={draft.interestScore}
                onChange={(e) =>
                  updateField("interestScore", Math.min(100, Math.max(0, toSafeNumber(Number(e.target.value)))))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="productUrl">ลิงก์สินค้า (ไม่บังคับ)</Label>
            <Input
              id="productUrl"
              value={draft.productUrl ?? ""}
              onChange={(e) => updateField("productUrl", e.target.value)}
              placeholder="https://shop.tiktok.com/..."
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border">
          <SheetClose render={<Button variant="outline" className="flex-1 rounded-full" />}>ยกเลิก</SheetClose>
          <Button
            className="flex-1 rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover"
            disabled={!isValid}
            onClick={handleSubmit}
          >
            {isEditing ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
