"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, LockOpen, Save, Search, Shuffle, Trash2 } from "lucide-react";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { formatBaht, formatThaiDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useLookBuilder } from "@/hooks/use-look-builder";
import type { SavedLookSet } from "@/lib/look-builder/storage";
import {
  CATEGORY_TO_ROLE,
  LOOK_SLOT_LABELS,
  suggestLook,
  type LookSlotRole,
  type LookSlots,
} from "@/lib/look-builder/matching";
import { ContentSetBrief } from "@/components/look-builder/content-set-brief";

const EMPTY_SLOTS: LookSlots = {
  dress: null, top: null, bottom: null, shoes: null, bag: null, accessory: null,
};

const SLOT_ROLES: LookSlotRole[] = ["dress", "top", "bottom", "shoes", "bag", "accessory"];

/** ตัวเลือกสีให้ผู้ใช้กด (ไม่ต้องพึ่งข้อมูล colors จาก AI vision — เลือกก่อนแล้วระบบไปหาสินค้าที่เข้ากันเอง) */
const COLOR_CHOICES = [
  "ดำ", "ขาว", "แดง", "ฟ้า", "น้ำเงิน", "เขียว", "เหลือง", "ส้ม",
  "ชมพู", "ม่วง", "น้ำตาล", "เทา", "ครีม", "เบจ", "กรม",
];

interface LookBuilderViewProps {
  products: Product[];
}

export function LookBuilderView({ products }: LookBuilderViewProps) {
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { lookSets, saveLook, deleteLook } = useLookBuilder();

  const [query, setQuery] = useState("");
  const [baseProductId, setBaseProductId] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [slots, setSlots] = useState<LookSlots>(EMPTY_SLOTS);
  const [lockedRoles, setLockedRoles] = useState<Set<LookSlotRole>>(new Set());

  const baseProduct = baseProductId ? (productsById.get(baseProductId) ?? null) : null;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.isOutfitItem !== false && p.productName.toLowerCase().includes(q))
      .slice(0, 12);
  }, [products, query]);

  function toggleColor(color: string) {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : prev.length >= 3 ? prev : [...prev, color],
    );
  }

  function pickBaseProduct(product: Product) {
    setBaseProductId(product.id);
    setQuery("");
    setLockedRoles(new Set());
    setSlots(suggestLook(product, selectedColors, products));
  }

  function reshuffle() {
    if (!baseProduct) return;
    const locked: Partial<LookSlots> = {};
    for (const role of lockedRoles) locked[role] = slots[role];
    setSlots(suggestLook(baseProduct, selectedColors, products, locked));
  }

  function toggleLock(role: LookSlotRole) {
    setLockedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  function handleSave() {
    if (!baseProductId) return;
    saveLook(baseProductId, selectedColors, slots);
  }

  const hasAnySlot = Object.values(slots).some((id) => id !== null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Look Builder — จับคู่ลุค"
        description="เลือกสินค้าตั้งต้น + สี 2-3 สี ระบบจะแนะนำเสื้อ/กางเกง/รองเท้า/กระเป๋าที่เข้ากันจากสินค้าจริงในระบบ"
      />

      {/* ขั้น 1: เลือกสินค้าตั้งต้น */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          1. เลือกสินค้าตั้งต้น
        </label>
        {baseProduct ? (
          <div className="flex items-center gap-3 border border-border p-3">
            <Image
              src={baseProduct.productImage}
              alt={baseProduct.productName}
              width={56}
              height={70}
              className="aspect-[4/5] w-14 shrink-0 object-cover"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-sm font-bold text-foreground">{baseProduct.productName}</p>
              <p className="text-xs text-muted-foreground">
                {baseProduct.category} • {formatBaht(baseProduct.price)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto rounded-full"
              onClick={() => {
                setBaseProductId(null);
                setSlots(EMPTY_SLOTS);
                setLockedRoles(new Set());
              }}
            >
              เปลี่ยน
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อสินค้าเพื่อเริ่มจับคู่ลุค…"
                className="rounded-none pl-10"
                aria-label="ค้นหาสินค้าตั้งต้น"
              />
            </div>
            {searchResults.length > 0 ? (
              <div className="flex flex-col divide-y divide-border border border-border">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickBaseProduct(p)}
                    className="flex items-center gap-3 p-2.5 text-left hover:bg-secondary"
                  >
                    <Image
                      src={p.productImage}
                      alt={p.productName}
                      width={40}
                      height={50}
                      className="aspect-[4/5] w-10 shrink-0 object-cover"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-foreground">{p.productName}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.category} • {formatBaht(p.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ขั้น 2: เลือกสี */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          2. เลือกโทนสี (สูงสุด 3 สี)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_CHOICES.map((color) => {
            const isActive = selectedColors.includes(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                aria-pressed={isActive}
                className={cn(
                  "border px-3 py-1 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>

      {/* ขั้น 3: ชุดที่แนะนำ */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            3. ชุดที่แนะนำ
          </label>
          {baseProduct ? (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={reshuffle}>
              <Shuffle className="size-3.5" />
              สุ่มลุคใหม่
            </Button>
          ) : null}
        </div>

        {baseProduct ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SLOT_ROLES.map((role) => {
              const productId = slots[role];
              const product = productId ? productsById.get(productId) : undefined;
              const isBaseSlot = CATEGORY_TO_ROLE[baseProduct.category] === role;
              return (
                <div key={role} className="flex flex-col gap-1.5 border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {LOOK_SLOT_LABELS[role]}
                    </span>
                    {!isBaseSlot ? (
                      <button
                        type="button"
                        onClick={() => toggleLock(role)}
                        aria-label={lockedRoles.has(role) ? "ปลดล็อกตัวนี้" : "ล็อกตัวนี้ไม่ให้สุ่มใหม่"}
                        title={lockedRoles.has(role) ? "ปลดล็อก" : "ล็อกไม่ให้สุ่มใหม่"}
                      >
                        {lockedRoles.has(role) ? (
                          <Lock className="size-3.5 text-brand-gold-hover" />
                        ) : (
                          <LockOpen className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                    ) : null}
                  </div>
                  {product ? (
                    <Link href={`/products/${product.id}`} className="flex flex-col gap-1">
                      <Image
                        src={product.productImage}
                        alt={product.productName}
                        width={120}
                        height={150}
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <span className="line-clamp-2 text-[11px] font-semibold text-foreground">
                        {product.productName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatBaht(product.price)}</span>
                    </Link>
                  ) : (
                    <p className="flex aspect-[4/5] w-full items-center justify-center border border-dashed border-border p-2 text-center text-[10px] text-muted-foreground">
                      ไม่พบตัวเลือกที่เข้ากัน
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="border border-dashed border-border bg-secondary p-6 text-center text-sm text-muted-foreground">
            เลือกสินค้าตั้งต้นก่อนเพื่อเริ่มจับคู่ลุค
          </p>
        )}
      </div>

      {baseProduct && hasAnySlot ? (
        <div className="flex flex-col gap-4">
          <Button
            className="w-fit gap-1.5 rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover"
            onClick={handleSave}
          >
            <Save className="size-3.5" />
            บันทึกลุคนี้
          </Button>
          <ContentSetBrief slots={slots} productsById={productsById} idPrefix="current" />
        </div>
      ) : null}

      {lookSets.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            ลุคที่บันทึกไว้ ({lookSets.length})
          </h2>
          <div className="flex flex-col gap-4">
            {lookSets.map((look) => (
              <SavedLookRow
                key={look.id}
                look={look}
                productsById={productsById}
                onDelete={() => deleteLook(look.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SavedLookRow({
  look,
  productsById,
  onDelete,
}: {
  look: SavedLookSet;
  productsById: Map<string, Product>;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const baseProduct = productsById.get(look.baseProductId);
  const itemCount = Object.values(look.slots).filter((id) => id !== null).length;

  return (
    <div className="flex flex-col gap-3 border border-border p-3">
      <div className="flex items-center gap-3">
        {baseProduct ? (
          <Image
            src={baseProduct.productImage}
            alt={baseProduct.productName}
            width={48}
            height={60}
            className="aspect-[4/5] w-12 shrink-0 object-cover"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm font-bold text-foreground">
            {baseProduct?.productName ?? "ไม่พบสินค้าตั้งต้น (อาจถูกลบจากระบบแล้ว)"}
          </p>
          <p className="text-xs text-muted-foreground">
            {itemCount} ชิ้น{look.colors.length > 0 ? ` • โทนสี ${look.colors.join("/")}` : ""} • บันทึกเมื่อ{" "}
            {formatThaiDate(look.savedAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => setExpanded((p) => !p)}>
          {expanded ? "ซ่อน Brief" : "ดู Brief"}
        </Button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="ลบลุคนี้"
          className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-negative"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {expanded ? (
        <ContentSetBrief slots={look.slots} productsById={productsById} idPrefix={look.id} />
      ) : null}
    </div>
  );
}
