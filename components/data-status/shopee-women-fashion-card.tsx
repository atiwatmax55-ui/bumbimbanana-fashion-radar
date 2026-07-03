"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  Database,
  ExternalLink,
  Filter,
  Loader2,
  ShoppingBag,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  WomenFashionPreviewResponse,
  WomenFashionProduct,
} from "@/app/api/shopee/women-fashion-preview/route";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: WomenFashionPreviewResponse }
  | { status: "error"; message: string };

const RULE_LABEL: Record<string, string> = {
  cat1_women: "หมวดหลักผู้หญิง",
  standalone_women: "หมวดแฟชั่นผู้หญิง",
  fashion_accessories_sub: "Fashion Acc. + หมวดย่อย",
};

export function ShopeeWomenFashionCard() {
  const [state, setState] = useState<FetchState>({ status: "idle" });

  async function load() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/shopee/women-fashion-preview");
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : `HTTP ${res.status}`;
        setState({ status: "error", message: msg });
        return;
      }
      setState({ status: "success", data: json as WomenFashionPreviewResponse });
    } catch {
      setState({ status: "error", message: "ไม่สามารถเชื่อมต่อกับ Server ได้" });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-brand-gold/60 bg-brand-cream/30 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-brand-gold-hover" />
        <h2 className="text-sm font-bold text-foreground">
          Top 500 แฟชั่นผู้หญิง — Deny-First Filter
        </h2>
      </div>

      <p className="text-sm text-muted-foreground">
        สแกนสูงสุด 200,000 แถว ด้วย Deny-First + Hierarchical Allow-List + Material/Tools Exclusion
        ตรวจซ้ำอัตโนมัติหลังกรอง — ต้องได้ 0 รายการชาย/เด็ก/วัสดุก่อน Import ได้
      </p>

      <Button
        variant="outline"
        className="self-start gap-2 rounded-full"
        onClick={load}
        disabled={state.status === "loading"}
      >
        {state.status === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            กำลังสแกน + ตรวจสอบ...
          </>
        ) : (
          <>
            <ShoppingBag className="size-4" />
            ดู Top 500 แฟชั่นผู้หญิง
          </>
        )}
      </Button>

      {state.status === "error" ? (
        <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm">
          <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
          <p className="text-negative">{state.message}</p>
        </div>
      ) : null}

      {state.status === "success" ? <ResultView data={state.data} /> : null}
    </div>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────────

function ResultView({ data }: { data: WomenFashionPreviewResponse }) {
  const [showProducts, setShowProducts] = useState(true);
  const { filterStats, validationSummary } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* ─ Quality Check Banner (สำคัญที่สุด) ─── */}
      <QualityCheckBanner summary={validationSummary} />

      {/* ─ Filter Stats ─── */}
      <div className="flex flex-wrap gap-x-5 gap-y-3 rounded-xl bg-muted/50 px-4 py-3">
        <Stat label="แถวที่สแกน" value={data.scannedRows.toLocaleString("th-TH")} />
        <Stat
          label="สแกนแบบ"
          value={
            data.isPartialScan
              ? `บางส่วน (${data.effectiveLimit.toLocaleString("th-TH")} แถว)`
              : "ครบทั้งหมด"
          }
        />
        <div className="my-1 w-px bg-border" />
        <Stat
          label="ก่อนกรอง (แฟชั่นทั่วไป)"
          value={filterStats.generalFashionCount.toLocaleString("th-TH")}
        />
        <Stat
          label="ผ่านกรองผู้หญิง (ก่อนตัดวัสดุ)"
          value={filterStats.womenFashionBeforeMaterial.toLocaleString("th-TH")}
        />
        <Stat
          label="ตัดวัสดุ/อุปกรณ์ออก"
          value={filterStats.materialExcludedCount.toLocaleString("th-TH")}
          dim
        />
        <Stat
          label="หลังกรองสุดท้าย (แฟชั่นผู้หญิง)"
          value={filterStats.womenFashionFinalCount.toLocaleString("th-TH")}
          highlight
        />
        <div className="my-1 w-px bg-border" />
        <Stat
          label="หมวดหลักผู้หญิง"
          value={filterStats.byRule.cat1Women.toLocaleString("th-TH")}
        />
        <Stat
          label="หมวดแฟชั่นโดยตรง"
          value={filterStats.byRule.standaloneWomen.toLocaleString("th-TH")}
        />
        <Stat
          label="Fashion Acc. ผ่าน subcat"
          value={filterStats.byRule.fashionAccessoriesSub.toLocaleString("th-TH")}
        />
      </div>

      {/* ─ Filter improvement notice ─── */}
      {filterStats.excludedFromGeneral > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-4 py-2.5">
          <Filter className="size-4 shrink-0 text-brand-gold-hover" />
          <span className="text-sm text-foreground">
            กรองสินค้าออกรวม{" "}
            <strong>{filterStats.excludedFromGeneral.toLocaleString("th-TH")}</strong> รายการ
            (ชาย/เด็ก/กีฬา + วัสดุ/อุปกรณ์) —
            เหลือเฉพาะแฟชั่นผู้หญิง{" "}
            <strong>{filterStats.womenFashionFinalCount.toLocaleString("th-TH")}</strong> รายการ
          </span>
        </div>
      ) : null}

      {/* ─ Notices ─── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-negative/20 bg-negative/5 px-4 py-2.5">
          <XCircle className="size-4 shrink-0 text-negative" />
          <span className="text-sm text-negative">{data.commissionStatus}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5">
          <Database className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">ยังไม่มีการบันทึกสินค้าเข้าสู่ Supabase</span>
        </div>
      </div>

      {/* ─ Product table ─── */}
      {data.products.length > 0 ? (
        <section>
          <Button
            variant="ghost"
            className="gap-1.5 rounded-full text-xs text-muted-foreground"
            onClick={() => setShowProducts((p) => !p)}
          >
            {showProducts ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ShoppingBag className="size-3.5" />
            )}
            {showProducts ? "ซ่อน" : "แสดง"} Top {data.products.length.toLocaleString("th-TH")}{" "}
            สินค้า
          </Button>

          {showProducts ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <WomenProductTable products={data.products} priceNote={data.priceNote} />
            </div>
          ) : null}
        </section>
      ) : (
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          ยังไม่พบสินค้าแฟชั่นผู้หญิงในแถวที่สแกน
        </div>
      )}
    </div>
  );
}

// ─── Quality Check Banner ─────────────────────────────────────────────────────

function QualityCheckBanner({
  summary,
}: {
  summary: WomenFashionPreviewResponse["validationSummary"];
}) {
  const [showViolations, setShowViolations] = useState(false);

  if (summary.isReadyToImport) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-positive/30 bg-positive/5 px-4 py-3">
        <CheckCircle2 className="size-5 shrink-0 text-positive" />
        <div>
          <p className="text-sm font-semibold text-positive">ผ่าน Quality Check</p>
          <p className="text-xs text-muted-foreground">
            ไม่พบสินค้าชาย/เด็ก/วัสดุใน Top 500 — พร้อมตรวจสอบก่อน Import
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-negative/40 bg-negative/5 p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="size-5 shrink-0 text-negative" />
        <div className="flex-1">
          <p className="text-sm font-bold text-negative">
            ยังไม่พร้อม Import — พบ {summary.totalViolations} รายการที่ไม่ใช่แฟชั่นผู้หญิง
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-negative/80">
            {summary.menViolations > 0 ? (
              <span>
                ชาย (Men): <strong>{summary.menViolations}</strong>
              </span>
            ) : (
              <span className="text-positive">ชาย (Men): 0 ✓</span>
            )}
            {summary.boyGirlViolations > 0 ? (
              <span>
                เด็ก (Boy/Girl): <strong>{summary.boyGirlViolations}</strong>
              </span>
            ) : (
              <span className="text-positive">เด็ก (Boy/Girl): 0 ✓</span>
            )}
            {summary.babyViolations > 0 ? (
              <span>
                ทารก (Baby): <strong>{summary.babyViolations}</strong>
              </span>
            ) : (
              <span className="text-positive">ทารก (Baby): 0 ✓</span>
            )}
            {summary.materialViolations > 0 ? (
              <span>
                วัสดุ/อุปกรณ์ (Materials): <strong>{summary.materialViolations}</strong>
              </span>
            ) : (
              <span className="text-positive">วัสดุ/อุปกรณ์ (Materials): 0 ✓</span>
            )}
          </div>
        </div>
      </div>

      {summary.violationDetails.length > 0 ? (
        <div>
          <button
            className="mt-1 text-xs text-negative/70 underline underline-offset-2 hover:text-negative"
            onClick={() => setShowViolations((p) => !p)}
          >
            {showViolations ? "ซ่อน" : "แสดง"} รายละเอียด {summary.violationDetails.length} รายการแรก
          </button>
          {showViolations ? (
            <div className="mt-2 overflow-x-auto rounded-lg border border-negative/20">
              <table className="w-full min-w-[700px] text-xs">
                <thead>
                  <tr className="border-b border-negative/10 bg-negative/5">
                    <th className="px-3 py-2 text-left font-semibold text-negative/70">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-negative/70">ชื่อสินค้า</th>
                    <th className="px-3 py-2 text-left font-semibold text-negative/70">cat1</th>
                    <th className="px-3 py-2 text-left font-semibold text-negative/70">cat2</th>
                    <th className="px-3 py-2 text-left font-semibold text-negative/70">ประเภทการละเมิด</th>
                    <th className="px-3 py-2 text-left font-semibold text-negative/70">ค่าที่ตรวจพบ</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.violationDetails.map((v, i) => (
                    <tr key={i} className="border-b border-negative/10">
                      <td className="px-3 py-1.5 text-negative/60">{v.rank}</td>
                      <td className="max-w-[160px] px-3 py-1.5">
                        <span className="line-clamp-1 text-negative/80" title={v.title}>
                          {v.title || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-negative/70">{v.category1}</td>
                      <td className="px-3 py-1.5 text-negative/70">{v.category2}</td>
                      <td className="px-3 py-1.5 text-negative/70">
                        {VIOLATION_TYPE_LABEL[v.violationType] ?? v.violationType}
                      </td>
                      <td className="px-3 py-1.5 font-semibold text-negative">{v.violatingValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const VIOLATION_TYPE_LABEL: Record<string, string> = {
  men: "สินค้าผู้ชาย",
  boy_girl: "สินค้าเด็ก",
  baby: "สินค้าทารก",
  material_category: "วัสดุ/อุปกรณ์ (หมวด)",
  material_title: "วัสดุ/อุปกรณ์ (ชื่อสินค้า)",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  highlight,
  dim,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-bold ${
          highlight
            ? "text-brand-gold-hover"
            : dim
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function WomenProductTable({
  products,
  priceNote,
}: {
  products: WomenFashionProduct[];
  priceNote: string;
}) {
  return (
    <>
      <table className="w-full min-w-[1100px] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="w-10 px-2 py-2 text-left font-semibold text-muted-foreground">#</th>
            <th className="w-12 px-2 py-2 text-left font-semibold text-muted-foreground">รูป</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ชื่อสินค้า</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">cat1</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">cat2</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">cat3</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
              เหตุผลที่ผ่านการคัดกรอง
            </th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ราคา (฿)</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
              จำนวนขายสะสมจาก Feed
            </th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">คะแนน</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ถูกใจ</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ร้านค้า</th>
            <th className="px-3 py-2 text-center font-semibold text-muted-foreground">ลิงก์</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p.itemId || i} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-2 py-2">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    width={44}
                    height={44}
                    loading="lazy"
                    className="size-11 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="size-11 rounded-lg border border-border bg-muted" />
                )}
              </td>
              <td className="max-w-[180px] px-3 py-2">
                <span className="line-clamp-2 text-foreground" title={p.title}>
                  {p.title || "—"}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{p.category1 || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.category2 || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.category3 || "—"}</td>
              <td className="max-w-[160px] px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <Badge
                    className={`w-fit text-[9px] px-1.5 ${
                      p.passedByRule === "cat1_women"
                        ? "bg-brand-gold/20 text-foreground"
                        : p.passedByRule === "standalone_women"
                          ? "bg-positive/15 text-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {RULE_LABEL[p.passedByRule] ?? p.passedByRule}
                  </Badge>
                  <span className="text-[10px] leading-snug text-muted-foreground/80" title={p.filterReason}>
                    {p.filterReason}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                {p.salePriceThb ? (
                  <span className="font-semibold text-foreground">
                    ฿{parseFloat(p.salePriceThb).toLocaleString("th-TH", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-foreground">
                {p.itemSold ? parseInt(p.itemSold, 10).toLocaleString("th-TH") : "—"}
              </td>
              <td className="px-3 py-2 text-right text-foreground">{p.itemRating || "—"}</td>
              <td className="px-3 py-2 text-right text-foreground">
                {p.likeCount ? parseInt(p.likeCount, 10).toLocaleString("th-TH") : "—"}
              </td>
              <td className="max-w-[100px] px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-muted-foreground" title={p.shopName}>
                    {p.shopName || "—"}
                  </span>
                  <div className="flex gap-1">
                    {p.isPreferredShop === "1" ? (
                      <Badge className="h-4 bg-brand-gold/20 px-1 text-[9px] text-foreground">
                        Preferred
                      </Badge>
                    ) : null}
                    {p.isOfficialShop === "1" ? (
                      <Badge className="h-4 bg-positive/20 px-1 text-[9px] text-positive">
                        Official
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                {p.productUrl ? (
                  <a
                    href={p.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-gold-hover hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>ดู</span>
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 border-t border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <XCircle className="size-3.5 shrink-0 text-negative" />
          <span className="text-[11px] text-negative">ไม่มีข้อมูลค่าคอมมิชชันจาก Feed</span>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">⚠️ {priceNote}</span>
      </div>
    </>
  );
}
