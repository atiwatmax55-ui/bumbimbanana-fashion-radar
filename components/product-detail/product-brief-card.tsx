"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import type { Product } from "@/types/product";
import type { CommissionSnapshot } from "@/lib/commission/types";
import { Button } from "@/components/ui/button";
import {
  displayCommission,
  formatBaht,
  formatNumber,
  formatPercent,
  formatRank,
  formatThaiDateTime,
} from "@/lib/utils/format";

/** URL หน้าสินค้าบน Product Radar (ใช้ใน Product Brief ให้ฝ่ายเอเจนซี่อ้างอิง Product ID เดียวกัน) */
const PRODUCT_RADAR_BASE_URL = "https://bumbimbanana-fashion-radar.vercel.app";

interface ProductBriefCardProps {
  product: Product;
  commission: CommissionSnapshot | null;
}

export function buildBrief(product: Product, commission: CommissionSnapshot | null): string {
  // ยอดขายรายช่วงที่แม่นยำมาจาก analytics เท่านั้น — ถ้าไม่มีให้ระบุว่าข้อมูลย้อนหลังไม่พอ ห้ามแต่งตัวเลข
  const d7 = product.analytics?.d7;
  const d30 = product.analytics?.d30;
  const sales7dText = d7 ? `${formatNumber(d7.units)} ชิ้น` : "ยังไม่มีข้อมูล (ข้อมูลย้อนหลังไม่พอ)";
  const sales30dText = d30 ? `${formatNumber(d30.units)} ชิ้น` : "ยังไม่มีข้อมูล (ข้อมูลย้อนหลังไม่พอ)";
  const growthText =
    d30 && d30.growthPct !== null ? formatPercent(d30.growthPct, true) : "ยังไม่มีข้อมูลอัตราการเติบโต";

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
    `- ยอดขายสะสม (Shopee Feed): ${formatNumber(product.itemSold ?? 0)} ชิ้น`,
    `- ยอดขาย 7 วัน: ${sales7dText}`,
    `- ยอดขาย 30 วัน: ${sales30dText}`,
    `- รายได้ประมาณการ (30 วัน x ราคา): ${formatBaht(product.estimatedRevenue)}`,
    `- อันดับยอดขายในระบบ: ${product.salesRank > 0 ? formatRank(product.salesRank) : "ยังไม่จัดอันดับ"}`,
    `- อัตราการเติบโต: ${growthText}`,
    `- คะแนนความน่าสนใจ: ${product.interestScore}/100`,
    `- สินค้าใหม่: ${product.analytics ? (product.analytics.isNew ? "ใช่" : "ไม่ใช่") : "ยังไม่มีข้อมูล"}`,
    `- ลิงก์สินค้า (Shopee): ${product.productUrl}`,
    `- รูปสินค้า: ${product.productImage}`,
    "",
    "## คำแนะนำสำหรับการสร้างคอนเทนต์",
    "- ห้ามเดาสี ลวดลาย วัสดุ หรือขนาดที่ไม่เห็นในรูปสินค้าจริง",
    "- อ้างอิงจากรูปสินค้าที่ให้มาเท่านั้น (Brief นี้มีรูปสินค้าหลัก 1 รูป)",
    "- ใช้ตัวเลขจริงจาก Brief นี้ อย่าประมาณเอง",
    "",
    "## ข้อมูล Metadata",
    `- Product ID: ${product.id}`,
    "- External Product ID: ไม่ได้จัดเก็บแยก — ใช้ Product ID และลิงก์ Shopee ระบุสินค้า",
    `- Product Radar URL: ${PRODUCT_RADAR_BASE_URL}/products/${product.id}`,
    `- แหล่งข้อมูล: ${product.source === "shopee" ? "Shopee Product Feed" : "Mock Data (ข้อมูลตัวอย่าง)"}`,
    `- เวลา Sync ล่าสุด: ${formatThaiDateTime(product.lastUpdatedAt)}`,
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
      {/* หัวข้อ + ปุ่ม — stack บนมือถือ, แถวเดียวบน sm+ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="text-base font-bold text-foreground">Product Brief สำหรับ Claude Code</h2>
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
