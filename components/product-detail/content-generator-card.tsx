"use client";

import { useMemo, useState } from "react";
import { Check, Copy, RefreshCw, Video } from "lucide-react";
import type { Product, ProductCategory } from "@/types/product";
import { Button } from "@/components/ui/button";
import { formatBaht, formatPercent } from "@/lib/utils/format";

/**
 * สร้างแคปชั่น + แฮชแท็ก TikTok จากข้อมูลสินค้าจริง (ชื่อ/ราคา/หมวด/สัญญาณเทรนด์)
 * ทำงานในเบราว์เซอร์ล้วน ไม่เรียก API ภายนอก — กด "สลับสไตล์" เพื่อเปลี่ยนแนวแคปชั่น
 */

const BASE_HASHTAGS = ["#TikTokป้ายยา", "#ของมันต้องมี", "#เสื้อผ้าผู้หญิง", "#แฟชั่นผู้หญิง", "#หาเสื้อผ้า"];

const CATEGORY_HASHTAGS: Partial<Record<ProductCategory, string[]>> = {
  กางเกงยีนส์: ["#กางเกงยีนส์", "#ยีนส์เอวสูง", "#แมทช์ยีนส์"],
  กางเกงขากระบอก: ["#กางเกงขากระบอก", "#กางเกงทรงสวย", "#สายเกาหลี"],
  เสื้อครอป: ["#เสื้อครอป", "#ครอปสายฝอ", "#แต่งตัวสายฝอ"],
  เสื้อเชิ้ต: ["#เสื้อเชิ้ต", "#เชิ้ตโอเวอร์ไซส์", "#ลุคมินิมอล"],
  เดรส: ["#เดรส", "#เดรสสวย", "#เดรสออกงาน"],
  กระโปรง: ["#กระโปรง", "#กระโปรงทรงสวย", "#ลุคหวาน"],
  ชุดเซ็ต: ["#ชุดเซ็ต", "#ชุดเซ็ตสวย", "#แต่งตัวง่าย"],
  เสื้อออกกำลังกาย: ["#ชุดออกกำลังกาย", "#สายเฮลตี้", "#ออกกำลังกาย"],
  รองเท้า: ["#รองเท้า", "#รองเท้าผู้หญิง"],
  กระเป๋า: ["#กระเป๋า", "#กระเป๋าน่ารัก"],
};

interface CaptionStyle {
  name: string;
  build: (p: Product, shortName: string) => string;
}

const CAPTION_STYLES: CaptionStyle[] = [
  {
    name: "สายรีวิวจริงใจ",
    build: (p, shortName) =>
      `รีวิวตามคำขอ! ${shortName} ตัวนี้คือดีจริง ใส่แล้วทรงสวยมาก` +
      (p.price > 0 ? ` ราคาแค่ ${formatBaht(p.price)} เอง` : "") +
      ` บอกเลยว่าคุ้ม ใครลังเลอยู่รีบกดตะกร้าก่อนของหมดนะ 🛒✨`,
  },
  {
    name: "สายกระแส/เร่งด่วน",
    build: (p, shortName) =>
      `ด่วน!! ${shortName} กำลังแรงมากตอนนี้ ใครยังไม่มีถือว่าพลาด` +
      (p.price > 0 ? ` ${formatBaht(p.price)} เท่านั้น` : "") +
      ` ของเข้าใหม่หมดไวทุกรอบ รีบจิ้มตะกร้าเลยสาว ๆ 🔥🔥`,
  },
  {
    name: "สายคุ้มค่า/เปรียบเทียบ",
    build: (p, shortName) =>
      `งบน้อยก็สวยได้! ${shortName}` +
      (p.price > 0 ? ` ในราคา ${formatBaht(p.price)}` : "") +
      ` คุณภาพเกินราคาไปมาก ใส่ไปไหนก็มีคนถามว่าซื้อที่ไหน จัดเลยค่า 💸💕`,
  },
];

/** ตัดชื่อสินค้าจาก Feed (มักยาวและมีคีย์เวิร์ด SEO) ให้เหลือท่อนแรกที่อ่านลื่น */
function shortenName(name: string): string {
  const cut = name.split(/[|,/()\[\]]|  +/)[0].trim();
  return (cut.length > 45 ? `${cut.slice(0, 45)}…` : cut) || name.slice(0, 45);
}

export function ContentGeneratorCard({ product }: { product: Product }) {
  const [styleIndex, setStyleIndex] = useState(0);
  const [copied, setCopied] = useState<"caption" | "all" | null>(null);

  const shortName = useMemo(() => shortenName(product.productName), [product.productName]);
  const caption = CAPTION_STYLES[styleIndex].build(product, shortName);
  const hashtags = useMemo(() => {
    const extra = CATEGORY_HASHTAGS[product.category] ?? [];
    return [...BASE_HASHTAGS, ...extra].join(" ");
  }, [product.category]);

  const hasCommission = product.commissionRate > 0 && !product.commissionStatus;

  function copy(text: string, which: "caption" | "all") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Video className="size-4 text-foreground" />
          <h2 className="font-display text-xl text-foreground">สร้างคอนเทนต์จากสินค้านี้</h2>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => setStyleIndex((styleIndex + 1) % CAPTION_STYLES.length)}>
          <RefreshCw className="size-3.5" />
          สลับสไตล์ ({CAPTION_STYLES[styleIndex].name})
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        แคปชั่น + แฮชแท็กพร้อมใช้สำหรับ TikTok สร้างจากชื่อ ราคา และหมวดสินค้าจริง — แก้ให้เป็นน้ำเสียงของคุณก่อนโพสต์ได้เลย
        {hasCommission ? ` (สินค้านี้ค่าคอม ${formatPercent(product.commissionRate)} — คุ้มที่จะรีบทำ)` : ""}
      </p>

      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/60 p-3.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">แคปชั่น</span>
        <p className="text-sm leading-relaxed text-foreground">{caption}</p>
      </div>
      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/60 p-3.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">แฮชแท็ก</span>
        <p className="text-sm leading-relaxed text-foreground">{hashtags}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="w-full gap-1.5 rounded-full sm:w-auto" onClick={() => copy(caption, "caption")}>
          {copied === "caption" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied === "caption" ? "คัดลอกแล้ว!" : "คัดลอกแคปชั่น"}
        </Button>
        <Button
          className="w-full gap-1.5 rounded-full bg-foreground text-background hover:opacity-85 sm:w-auto"
          onClick={() => copy(`${caption}\n\n${hashtags}`, "all")}
        >
          {copied === "all" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied === "all" ? "คัดลอกแล้ว!" : "คัดลอกทั้งหมด (แคปชั่น + แฮชแท็ก)"}
        </Button>
      </div>
    </section>
  );
}
