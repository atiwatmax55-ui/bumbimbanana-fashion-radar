"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import type { Product } from "@/types/product";
import type { CommissionSnapshot } from "@/lib/commission/types";
import { Button } from "@/components/ui/button";
import { displayCommission, formatBaht, formatNumber, formatPercent } from "@/lib/utils/format";

interface ProductBriefCardProps {
  product: Product;
  commission: CommissionSnapshot | null;
}

function buildBrief(product: Product, commission: CommissionSnapshot | null): string {
  const lines: string[] = [
    "# Product Brief — BUMBIMBANANA Fashion Radar",
    `วันที่: ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}`,
    "",
    "## ข้อมูลสินค้า",
    `- ชื่อสินค้า: ${product.productName}`,
    `- ร้านค้า: ${product.shopName}`,
    `- หมวดสินค้า: ${product.category}`,
    `- ราคา: ${formatBaht(product.price)}`,
  ];

  if (commission) {
    lines.push(`- ค่าคอมมิชชัน (จริงจาก Shopee Affiliate): ${formatPercent(commission.commission_rate)}`);
    if (commission.campaign_name) lines.push(`- แคมเปญ: ${commission.campaign_name}`);
    if (commission.channel) lines.push(`- ช่องทาง: ${commission.channel}`);
  } else {
    lines.push(`- ค่าคอมมิชชัน (Affiliate): ${displayCommission(product)}`);
  }

  lines.push(
    `- ยอดขายสะสม (Shopee Feed): ${formatNumber(product.sales30d)} ชิ้น`,
    `- ลิงก์สินค้า: ${product.productUrl}`,
    `- รูปสินค้า: ${product.productImage}`,
    "",
    "## คำแนะนำสำหรับการสร้างคอนเทนต์",
    "- ห้ามเดาสี ลวดลาย วัสดุ หรือขนาดที่ไม่เห็นในรูปสินค้าจริง",
    "- อ้างอิงจากรูปสินค้าที่ให้มาเท่านั้น",
    "- ใช้ตัวเลขจริงจาก Brief นี้ อย่าประมาณเอง",
    "",
    "## ข้อมูล Metadata",
    `- Product ID: ${product.id}`,
    `- แหล่งข้อมูล: ${product.source === "shopee" ? "Shopee Product Feed" : "Mock Data (ข้อมูลตัวอย่าง)"}`,
    `- อัปเดตล่าสุด: ${new Date(product.lastUpdatedAt).toLocaleDateString("th-TH")}`,
  );

  return lines.join("\n");
}

export function ProductBriefCard({ product, commission }: ProductBriefCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const brief = buildBrief(product, commission);

  function handleCopy() {
    navigator.clipboard.writeText(brief).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-base font-bold text-foreground">Product Brief สำหรับ Claude Code</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? "ซ่อน" : "ดูตัวอย่าง"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "คัดลอกแล้ว!" : "คัดลอก Brief"}
          </Button>
        </div>
      </div>

      {expanded ? (
        <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-brand-cream/40 p-4 font-mono text-[12px] leading-relaxed text-foreground">
          {brief}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">
          คัดลอก Brief นี้แล้ววางใน prompt ของ Claude Code เพื่อสร้างคอนเทนต์อ้างอิงข้อมูลสินค้าจริง
        </p>
      )}
    </div>
  );
}
