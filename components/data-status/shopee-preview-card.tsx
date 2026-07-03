"use client";

import { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  ShoppingBag,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FeedPreviewResponse, SampleProduct } from "@/app/api/shopee/feed-preview/route";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: FeedPreviewResponse }
  | { status: "error"; message: string };

/** การ์ดวิเคราะห์หมวดสินค้าและตัวอย่างข้อมูลจาก Shopee Product Feed */
export function ShopeePreviewCard() {
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  async function analyze() {
    setFetchState({ status: "loading" });
    try {
      const res = await fetch("/api/shopee/feed-preview");
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : `HTTP ${res.status}`;
        setFetchState({ status: "error", message: msg });
        return;
      }
      setFetchState({ status: "success", data: json as FeedPreviewResponse });
    } catch {
      setFetchState({ status: "error", message: "ไม่สามารถเชื่อมต่อกับ Server ได้" });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-brand-gold-hover" />
        <h2 className="text-sm font-bold text-foreground">ตัวอย่างข้อมูล Shopee Product Feed</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        วิเคราะห์โครงสร้างและหมวดสินค้าจาก Feed โดยอ่านสูงสุด 50,000 แถวแรก —
        ยังไม่มีการบันทึกข้อมูลลง Supabase ทั้งสิ้น
      </p>

      <Button
        variant="outline"
        className="self-start gap-2 rounded-full"
        onClick={analyze}
        disabled={fetchState.status === "loading"}
      >
        {fetchState.status === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            กำลังวิเคราะห์... (อาจใช้เวลาหลายสิบวินาที)
          </>
        ) : (
          <>
            <BarChart3 className="size-4" />
            วิเคราะห์หมวดสินค้าและตัวอย่างข้อมูล
          </>
        )}
      </Button>

      {fetchState.status === "error" ? (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm">
          <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
          <p className="text-negative">{fetchState.message}</p>
        </div>
      ) : null}

      {fetchState.status === "success" ? <ResultView data={fetchState.data} /> : null}
    </div>
  );
}

function ResultView({ data }: { data: FeedPreviewResponse }) {
  const [showCat2, setShowCat2] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  const topCat1 = data.categorySummary.slice(0, 20);
  const maxCount = topCat1[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-5">
      {/* สรุปการสแกน */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">
          สแกนแล้ว {data.rowsScanned.toLocaleString("th-TH")} แถว
        </span>
        {data.limitReached ? (
          <Badge variant="outline" className="border-border text-xs text-muted-foreground">
            หยุดที่ขีดจำกัด 50,000 แถว
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border text-xs text-positive">
            อ่านครบทุกแถวใน Feed
          </Badge>
        )}
        <Badge variant="outline" className="border-border text-xs text-muted-foreground">
          <Database className="mr-1 size-3" />
          ยังไม่ได้บันทึกลง Supabase
        </Badge>
      </div>

      {/* ความพร้อมของข้อมูล */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ตรวจสอบข้อมูลใน Feed
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <DataAvailBadge
            label="จำนวนขาย"
            field="item_sold"
            available={data.dataAvailability.hasSalesData}
          />
          <DataAvailBadge
            label="ราคา"
            field="sale_price / price"
            available={data.dataAvailability.hasPriceData}
          />
          <DataAvailBadge
            label="ค่าคอมมิชชัน"
            field="ไม่มีใน Feed"
            available={data.dataAvailability.hasCommission}
            note="ยังไม่มีข้อมูลค่าคอมมิชชันจาก Feed"
          />
          <DataAvailBadge
            label="Product ID"
            field="itemid"
            available={data.dataAvailability.hasProductId}
          />
        </div>
      </div>

      {/* หมวดแฟชั่นที่พบ */}
      {data.fashionCategories.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5 text-brand-gold-hover" />
            หมวดที่น่าจะเป็นแฟชั่น ({data.fashionCategories.length} หมวด)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.fashionCategories.map((cat) => (
              <Badge
                key={cat}
                className="bg-brand-gold/20 text-xs text-foreground hover:bg-brand-gold/30"
              >
                {cat}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            ยังไม่ได้ Import — ต้องยืนยัน Mapping และหมวดแฟชั่นก่อน
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          ยังไม่พบหมวดที่ตรงกับคำสำคัญแฟชั่น — ชื่อหมวดใน Feed อาจเป็นภาษาอื่น ดูรายการหมวดทั้งหมดด้านล่าง
        </div>
      )}

      {/* หมวดสินค้าหลัก (global_category1) */}
      {topCat1.length > 0 ? (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            หมวดสินค้าหลัก (global_category1) — Top {topCat1.length}
          </h3>
          <div className="flex flex-col gap-1.5">
            {topCat1.map(({ name, count }) => (
              <CategoryBar key={name} name={name} count={count} maxCount={maxCount} />
            ))}
          </div>

          {data.category2Summary.length > 0 ? (
            <div className="mt-3">
              <Button
                variant="ghost"
                className="gap-1.5 rounded-full text-xs text-muted-foreground"
                onClick={() => setShowCat2((p) => !p)}
              >
                {showCat2 ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    ซ่อนหมวดย่อย (global_category2)
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" />
                    แสดงหมวดย่อย (global_category2) — Top {data.category2Summary.length}
                  </>
                )}
              </Button>
              {showCat2 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.category2Summary.map(({ name, count }) => (
                    <Badge key={name} variant="outline" className="border-border text-xs text-foreground">
                      {name}{" "}
                      <span className="ml-1 text-muted-foreground">({count.toLocaleString("th-TH")})</span>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ตัวอย่างสินค้า 50 รายการ */}
      {data.sampleProducts.length > 0 ? (
        <div>
          <Button
            variant="ghost"
            className="gap-1.5 rounded-full text-xs text-muted-foreground"
            onClick={() => setShowSamples((p) => !p)}
          >
            {showSamples ? (
              <>
                <ChevronUp className="size-3.5" />
                ซ่อนตัวอย่างสินค้า
              </>
            ) : (
              <>
                <ShoppingBag className="size-3.5" />
                แสดงตัวอย่างสินค้า {data.sampleProducts.length} รายการแรก
              </>
            )}
          </Button>
          {showSamples ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <SampleTable products={data.sampleProducts} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DataAvailBadge({
  label,
  field,
  available,
  note,
}: {
  label: string;
  field: string;
  available: boolean;
  note?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border p-3 ${
        available
          ? "border-positive/30 bg-positive/5"
          : "border-negative/20 bg-negative/5"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {available ? (
          <CheckCircle2 className="size-3.5 shrink-0 text-positive" />
        ) : (
          <XCircle className="size-3.5 shrink-0 text-negative" />
        )}
        <span className={`text-xs font-semibold ${available ? "text-positive" : "text-negative"}`}>
          {label}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground">{note ?? field}</span>
    </div>
  );
}

function CategoryBar({
  name,
  count,
  maxCount,
}: {
  name: string;
  count: number;
  maxCount: number;
}) {
  const pct = Math.max(4, Math.round((count / maxCount) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0 truncate text-right text-xs text-muted-foreground" title={name}>
        {name}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <div className="h-5 rounded-sm bg-brand-gold/40" style={{ width: `${pct}%` }} />
        <span className="shrink-0 text-xs font-semibold text-foreground">
          {count.toLocaleString("th-TH")}
        </span>
      </div>
    </div>
  );
}

function SampleTable({ products }: { products: SampleProduct[] }) {
  return (
    <table className="w-full min-w-[900px] text-xs">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ชื่อสินค้า</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ร้านค้า</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">หมวดหลัก</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">หมวดย่อย</th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
            ราคาขาย (ดิบ)
          </th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ยอดขาย</th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ถูกใจ</th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">คะแนน</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item ID</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p, i) => (
          <tr
            key={p.itemId || i}
            className="border-b border-border/50 hover:bg-muted/30"
          >
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="max-w-[200px] px-3 py-2">
              <span className="line-clamp-2 text-foreground" title={p.title}>
                {p.title || "—"}
              </span>
            </td>
            <td className="max-w-[120px] px-3 py-2 text-muted-foreground">
              <span className="truncate block" title={p.shopName}>{p.shopName || "—"}</span>
            </td>
            <td className="px-3 py-2 text-muted-foreground">{p.category1 || "—"}</td>
            <td className="px-3 py-2 text-muted-foreground">{p.category2 || "—"}</td>
            <td className="px-3 py-2 text-right font-mono text-foreground">
              {p.salePrice || p.originalPrice || "—"}
            </td>
            <td className="px-3 py-2 text-right text-foreground">{p.soldCount || "—"}</td>
            <td className="px-3 py-2 text-right text-foreground">{p.likeCount || "—"}</td>
            <td className="px-3 py-2 text-right text-foreground">{p.rating || "—"}</td>
            <td className="px-3 py-2 font-mono text-muted-foreground">{p.itemId || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
