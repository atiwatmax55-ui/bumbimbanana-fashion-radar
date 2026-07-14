"use client";

import { useState } from "react";
import { Check, Copy, FileStack } from "lucide-react";
import type { Product } from "@/types/product";
import { buildBrief } from "@/components/product-detail/product-brief-card";
import { Button } from "@/components/ui/button";
import { LOOK_SLOT_LABELS, type LookSlotRole, type LookSlots } from "@/lib/look-builder/matching";

interface ContentSetBriefProps {
  slots: LookSlots;
  productsById: Map<string, Product>;
  /** ใช้แยก id ของ <pre> เมื่อมีหลายชุดในหน้าเดียว (ลุคที่บันทึกไว้หลายชุด) */
  idPrefix?: string;
}

/** ต่อยอด buildBrief (product-brief-card.tsx) ให้ครอบคลุมทุกสินค้าในลุคเดียวกัน เป็น Markdown เดียวคัดลอกได้ */
export function ContentSetBrief({ slots, productsById, idPrefix = "look" }: ContentSetBriefProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const entries = (Object.entries(slots) as [LookSlotRole, string | null][])
    .filter((entry): entry is [LookSlotRole, string] => entry[1] !== null)
    .map(([role, id]) => ({ role, product: productsById.get(id) }))
    .filter((e): e is { role: LookSlotRole; product: Product } => e.product !== undefined);

  if (entries.length === 0) return null;

  const brief = [
    "# Content Set Brief — Look Builder (BUMBIMBANANA Fashion Radar)",
    `วันที่: ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}`,
    `จำนวนสินค้าในชุด: ${entries.length}`,
    "",
    ...entries.flatMap(({ role, product }) => [
      "───────────────────────────────",
      `## ${LOOK_SLOT_LABELS[role]}`,
      buildBrief(product, null),
      "",
    ]),
  ].join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(brief).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileStack className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="text-base font-bold text-foreground">Content Set Brief ({entries.length} ชิ้น)</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 rounded-full sm:flex-none"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? "ซ่อน" : "ดูตัวอย่าง"}
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover sm:flex-none"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "คัดลอกแล้ว!" : "คัดลอก Brief ชุดนี้"}
          </Button>
        </div>
      </div>

      {expanded ? (
        <pre
          id={`${idPrefix}-brief`}
          className="max-h-96 overflow-auto rounded-xl border border-border bg-brand-cream/40 p-4 font-mono text-[12px] leading-relaxed text-foreground"
        >
          {brief}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">
          คัดลอก Brief รวมทั้งชุดแล้ววางใน prompt ของ Claude Code เพื่อสร้างคอนเทนต์ &ldquo;จับคู่ลุค&rdquo;
          อ้างอิงข้อมูลสินค้าจริงทุกชิ้น
        </p>
      )}
    </div>
  );
}
