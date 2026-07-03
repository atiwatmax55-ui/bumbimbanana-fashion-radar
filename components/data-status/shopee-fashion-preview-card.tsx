"use client";

import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
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
  FashionPreviewResponse,
  FashionProduct,
  PriceSample,
  PriceValidationSample,
} from "@/app/api/shopee/fashion-preview/route";
import type { ImportPlanResponse } from "@/app/api/shopee/import-plan/route";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: FashionPreviewResponse }
  | { status: "error"; message: string };

type ImportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ImportPlanResponse }
  | { status: "error"; message: string };

/** การ์ดวิเคราะห์ตลาดแฟชั่นจาก Shopee Feed */
export function ShopeeFashionPreviewCard() {
  const [state, setState] = useState<FetchState>({ status: "idle" });

  async function analyze() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/shopee/fashion-preview");
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : `HTTP ${res.status}`;
        setState({ status: "error", message: msg });
        return;
      }
      setState({ status: "success", data: json as FashionPreviewResponse });
    } catch {
      setState({ status: "error", message: "ไม่สามารถเชื่อมต่อกับ Server ได้" });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-brand-gold/50 bg-brand-cream/30 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-brand-gold-hover" />
        <h2 className="text-sm font-bold text-foreground">วิเคราะห์ตลาดแฟชั่นจาก Shopee Feed</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        สแกนสูงสุด 100,000 แถวแรก — คัดกรองด้วย Whitelist หมวดแฟชั่น 31 หมวด
        วิเคราะห์หมวดสินค้า ราคา และตัวอย่างสินค้าสำหรับยืนยันก่อน Import จริง
        ยังไม่มีการบันทึกข้อมูลลง Supabase ทั้งสิ้น
      </p>

      <Button
        variant="outline"
        className="self-start gap-2 rounded-full"
        onClick={analyze}
        disabled={state.status === "loading"}
      >
        {state.status === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            กำลังวิเคราะห์... (อาจใช้เวลาหลายสิบวินาที)
          </>
        ) : (
          <>
            <BarChart3 className="size-4" />
            วิเคราะห์หมวดแฟชั่นและสินค้าตัวอย่าง
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

// ─── Result sections ──────────────────────────────────────────────────────────

function ResultView({ data }: { data: FashionPreviewResponse }) {
  const [showPrices, setShowPrices] = useState(true);
  const [showValidation, setShowValidation] = useState(true);
  const [showCat2, setShowCat2] = useState(false);
  const [showCat3, setShowCat3] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

  async function runImportPlan() {
    setImportState({ status: "loading" });
    try {
      const res = await fetch("/api/shopee/import-plan", { method: "POST" });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as Record<string, unknown>).error)
            : `HTTP ${res.status}`;
        setImportState({ status: "error", message: msg });
        return;
      }
      setImportState({ status: "success", data: json as ImportPlanResponse });
    } catch {
      setImportState({ status: "error", message: "ไม่สามารถเชื่อมต่อกับ Server ได้" });
    }
  }

  const fashionByKeyword =
    data.categoryAnalysis.fashionByKeyword ??
    data.categoryAnalysis.fashionProductCount ??
    0;
  const fashionByWhitelist =
    data.categoryAnalysis.fashionByWhitelist ??
    data.categoryAnalysis.fashionProductCount ??
    0;
  const fashionExcludedCount = data.categoryAnalysis.fashionExcludedCount ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-x-5 gap-y-3 rounded-xl bg-muted/50 px-4 py-3">
        <Stat
          label="แถวที่สแกน"
          value={data.scannedRows.toLocaleString("th-TH")}
        />
        <Stat
          label="สแกนแบบ"
          value={
            data.isPartialScan
              ? `บางส่วน (หยุดที่ ${data.effectiveLimit.toLocaleString("th-TH")})`
              : "ครบทั้งหมด"
          }
        />
        <div className="my-1 w-px bg-border" />
        <Stat
          label="ก่อนกรอง (keyword เดิม)"
          value={fashionByKeyword.toLocaleString("th-TH")}
        />
        <Stat
          label="หลังกรอง (Whitelist)"
          value={fashionByWhitelist.toLocaleString("th-TH")}
          highlight
        />
        <Stat
          label="ตัดออก (false positive)"
          value={fashionExcludedCount.toLocaleString("th-TH")}
          dim
        />
      </div>

      {/* Filter improvement notice */}
      {fashionByKeyword > fashionByWhitelist ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-4 py-2.5">
          <Filter className="size-4 shrink-0 text-brand-gold-hover" />
          <span className="text-sm text-foreground">
            Whitelist กรองออก{" "}
            <strong>{(fashionByKeyword - fashionByWhitelist).toLocaleString("th-TH")}</strong>{" "}
            รายการ — ลดจาก{" "}
            <strong>{fashionByKeyword.toLocaleString("th-TH")}</strong> เหลือ{" "}
            <strong>{fashionByWhitelist.toLocaleString("th-TH")}</strong> รายการ
          </span>
        </div>
      ) : null}

      {/* Notice: commission + supabase */}
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

      {/* Price samples */}
      <section>
        <button
          className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          onClick={() => setShowPrices((p) => !p)}
        >
          <span>ตัวอย่างค่า sale_price จาก Feed — รอยืนยันหน่วยราคาก่อน Import จริง</span>
          {showPrices ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {showPrices && data.priceAnalysis.samples.length > 0 ? (
          <PriceTable samples={data.priceAnalysis.samples} />
        ) : showPrices ? (
          <p className="text-sm text-muted-foreground">ไม่พบข้อมูลราคาในแถวที่สแกน</p>
        ) : null}
      </section>

      {/* Price Validation Samples */}
      {data.priceValidationSamples.length > 0 ? (
        <section>
          <button
            className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            onClick={() => setShowValidation((p) => !p)}
          >
            <span>
              ยืนยันราคา — {data.priceValidationSamples.length} รายการแรกจาก Whitelist
            </span>
            {showValidation ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          {showValidation ? (
            <>
              <div className="mb-2 rounded-lg bg-brand-gold/10 px-3 py-2 text-xs text-foreground">
                ⚠️ ราคา Raw รอยืนยันจากหน้าสินค้า Shopee ก่อน Import จริง — กดลิงก์เพื่อเปรียบเทียบ
              </div>
              <PriceValidationTable samples={data.priceValidationSamples} />
            </>
          ) : null}
        </section>
      ) : null}

      {/* Fashion candidate categories */}
      {data.categoryAnalysis.fashionCandidateCategories.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            หมวดแฟชั่นที่ผ่าน Whitelist ({data.categoryAnalysis.fashionCandidateCategories.length} หมวด)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.categoryAnalysis.fashionCandidateCategories.map((cat) => (
              <Badge
                key={cat}
                className="bg-brand-gold/20 text-xs font-medium text-foreground hover:bg-brand-gold/30"
              >
                {cat}
              </Badge>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          ยังไม่พบหมวดที่อยู่ใน Whitelist — ดูรายการหมวดทั้งหมดด้านล่างเพื่อระบุด้วยมือ
        </div>
      )}

      {/* Cat1 horizontal bars */}
      {data.categoryAnalysis.cat1Summary.length > 0 ? (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            หมวดหลัก (global_category1) — Top {Math.min(20, data.categoryAnalysis.cat1Summary.length)}
          </h3>
          <CategoryBars
            items={data.categoryAnalysis.cat1Summary.slice(0, 20)}
            fashionSet={new Set(data.categoryAnalysis.fashionCandidateCategories)}
          />

          {/* Cat2 collapsible */}
          {data.categoryAnalysis.cat2Summary.length > 0 ? (
            <div className="mt-2">
              <Button
                variant="ghost"
                className="gap-1.5 rounded-full text-xs text-muted-foreground"
                onClick={() => setShowCat2((p) => !p)}
              >
                {showCat2 ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {showCat2 ? "ซ่อน" : "แสดง"} หมวดย่อย (global_category2) — Top{" "}
                {data.categoryAnalysis.cat2Summary.length}
              </Button>
              {showCat2 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.categoryAnalysis.cat2Summary.map(({ name, count }) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className={`border-border text-xs ${
                        data.categoryAnalysis.fashionCandidateCategories.includes(name)
                          ? "border-brand-gold/50 bg-brand-gold/10"
                          : ""
                      }`}
                    >
                      {name}{" "}
                      <span className="ml-1 text-muted-foreground">
                        ({count.toLocaleString("th-TH")})
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Cat3 collapsible */}
          {data.categoryAnalysis.cat3Summary.length > 0 ? (
            <div className="mt-2">
              <Button
                variant="ghost"
                className="gap-1.5 rounded-full text-xs text-muted-foreground"
                onClick={() => setShowCat3((p) => !p)}
              >
                {showCat3 ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {showCat3 ? "ซ่อน" : "แสดง"} หมวดย่อยระดับ 3 (global_category3) — Top{" "}
                {data.categoryAnalysis.cat3Summary.length}
              </Button>
              {showCat3 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.categoryAnalysis.cat3Summary.map(({ name, count }) => (
                    <Badge key={name} variant="outline" className="border-border text-xs">
                      {name}{" "}
                      <span className="ml-1 text-muted-foreground">
                        ({count.toLocaleString("th-TH")})
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Fashion products table */}
      {data.fashionProducts.length > 0 ? (
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
            {showProducts ? "ซ่อน" : "แสดง"} สินค้าเด่นจากจำนวนขายสะสมใน Feed —{" "}
            {data.fashionProducts.length} รายการ
          </Button>
          {showProducts ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <FashionProductTable products={data.fashionProducts} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Import Plan */}
      <section className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Import Plan — Top 1,000 สินค้าแฟชั่น
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              สแกนสูงสุด 200,000 แถว คัดเฉพาะหมวด Whitelist เรียงตามจำนวนขายสะสม
              (ยังไม่บันทึกลง Supabase)
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 gap-2 rounded-full text-sm"
            onClick={runImportPlan}
            disabled={importState.status === "loading"}
          >
            {importState.status === "loading" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                กำลังสแกน...
              </>
            ) : (
              <>
                <BarChart3 className="size-4" />
                ดู Import Plan
              </>
            )}
          </Button>
        </div>

        {importState.status === "error" ? (
          <div className="flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 p-3 text-sm">
            <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
            <p className="text-negative">{importState.message}</p>
          </div>
        ) : null}

        {importState.status === "success" ? (
          <ImportPlanResult data={importState.data} />
        ) : null}
      </section>
    </div>
  );
}

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

function PriceTable({ samples }: { samples: PriceSample[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Raw (ค่าดิบ)</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">÷ 100 (สตางค์?)</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">÷ 100,000 (บาท?)</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 text-right font-mono text-foreground">{s.raw}</td>
              <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.divBy100}</td>
              <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.divBy100000}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        ⚠️ รอยืนยันหน่วยราคาก่อน Import จริง — เปรียบเทียบกับราคาจริงบนหน้าสินค้า Shopee
      </div>
    </div>
  );
}

function PriceValidationTable({ samples }: { samples: PriceValidationSample[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[700px] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="w-10 px-2 py-2 text-left font-semibold text-muted-foreground">#</th>
            <th className="w-12 px-2 py-2 text-left font-semibold text-muted-foreground">รูป</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ชื่อสินค้า</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">หมวด</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ราคา Raw</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
              จำนวนขายสะสมจาก Feed
            </th>
            <th className="px-3 py-2 text-center font-semibold text-muted-foreground">ลิงก์</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-2 py-2">
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.imageUrl}
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
              <td className="max-w-[200px] px-3 py-2">
                <span className="line-clamp-2 text-foreground" title={s.title}>
                  {s.title || "—"}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{s.category1 || "—"}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                {s.salePriceRaw || "—"}
              </td>
              <td className="px-3 py-2 text-right text-foreground">{s.itemSold || "—"}</td>
              <td className="px-3 py-2 text-center">
                {s.productUrl ? (
                  <a
                    href={s.productUrl}
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
    </div>
  );
}

function CategoryBars({
  items,
  fashionSet,
}: {
  items: { name: string; count: number }[];
  fashionSet: Set<string>;
}) {
  const maxCount = items[0]?.count ?? 1;
  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ name, count }) => {
        const pct = Math.max(4, Math.round((count / maxCount) * 100));
        const isFashion = fashionSet.has(name);
        return (
          <div key={name} className="flex items-center gap-3">
            <div className="w-36 shrink-0 truncate text-right text-xs text-muted-foreground" title={name}>
              {isFashion ? (
                <span className="font-semibold text-brand-gold-hover">{name}</span>
              ) : (
                name
              )}
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div
                className={`h-5 rounded-sm ${isFashion ? "bg-brand-gold/60" : "bg-muted-foreground/25"}`}
                style={{ width: `${pct}%` }}
              />
              <span className="shrink-0 text-xs font-semibold text-foreground">
                {count.toLocaleString("th-TH")}
              </span>
              {isFashion ? <Sparkles className="size-3 shrink-0 text-brand-gold-hover" /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FashionProductTable({ products }: { products: FashionProduct[] }) {
  return (
    <table className="w-full min-w-[1000px] text-xs">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          <th className="w-10 px-2 py-2 text-left font-semibold text-muted-foreground">#</th>
          <th className="w-14 px-2 py-2 text-left font-semibold text-muted-foreground">รูป</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ชื่อสินค้า</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">หมวดหลัก</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">หมวดย่อย</th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ราคา (ดิบ)</th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
            จำนวนขายสะสมจาก Feed
          </th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">คะแนน</th>
          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ถูกใจ</th>
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ร้านค้า</th>
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
                  width={48}
                  height={48}
                  loading="lazy"
                  className="size-12 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="size-12 rounded-lg border border-border bg-muted" />
              )}
            </td>
            <td className="max-w-[220px] px-3 py-2">
              {p.productUrl ? (
                <a
                  href={p.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-foreground underline-offset-2 hover:underline"
                  title={p.title}
                >
                  {p.title || "—"}
                </a>
              ) : (
                <span className="line-clamp-2 text-foreground" title={p.title}>
                  {p.title || "—"}
                </span>
              )}
            </td>
            <td className="px-3 py-2 text-muted-foreground">{p.category1 || "—"}</td>
            <td className="px-3 py-2 text-muted-foreground">{p.category2 || "—"}</td>
            <td className="px-3 py-2 text-right font-mono text-foreground">
              {p.salePrice || p.originalPrice || "—"}
            </td>
            <td className="px-3 py-2 text-right font-semibold text-foreground">
              {p.itemSold || "—"}
            </td>
            <td className="px-3 py-2 text-right text-foreground">{p.itemRating || "—"}</td>
            <td className="px-3 py-2 text-right text-foreground">{p.likeCount || "—"}</td>
            <td className="max-w-[120px] px-3 py-2">
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ImportPlanResult({ data }: { data: ImportPlanResponse }) {
  const [showList, setShowList] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-muted/50 px-4 py-3">
        <Stat label="แถวที่สแกน" value={data.scannedRows.toLocaleString("th-TH")} />
        <Stat
          label="สินค้าแฟชั่นที่พบ"
          value={data.planSummary.totalFashionFound.toLocaleString("th-TH")}
          highlight
        />
        <Stat
          label="จำนวนหมวดที่พบ"
          value={data.planSummary.fashionCategoryCount.toLocaleString("th-TH")}
        />
        <Stat
          label="จะ Import"
          value={`${data.planSummary.willImportCount.toLocaleString("th-TH")} รายการ`}
          highlight
        />
        {data.isPartialScan ? (
          <Badge variant="outline" className="self-center border-brand-gold/40 text-xs text-muted-foreground">
            สแกนบางส่วน
          </Badge>
        ) : null}
      </div>

      {/* Category list */}
      {data.planSummary.fashionCategoriesFound.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {data.planSummary.fashionCategoriesFound.map((cat) => (
            <Badge
              key={cat}
              className="bg-brand-gold/20 text-xs font-medium text-foreground hover:bg-brand-gold/30"
            >
              {cat}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Notice */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg border border-negative/20 bg-negative/5 px-3 py-2">
          <XCircle className="size-4 shrink-0 text-negative" />
          <span className="text-xs text-negative">{data.commissionStatus}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Database className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">ยังไม่มีการบันทึกสินค้าเข้าสู่ Supabase</span>
        </div>
      </div>

      {/* Product list (collapsible) */}
      {data.importPlan.length > 0 ? (
        <div>
          <Button
            variant="ghost"
            className="gap-1.5 rounded-full text-xs text-muted-foreground"
            onClick={() => setShowList((p) => !p)}
          >
            {showList ? <ChevronUp className="size-3.5" /> : <ShoppingBag className="size-3.5" />}
            {showList ? "ซ่อน" : "แสดง"} รายการ {data.importPlan.length.toLocaleString("th-TH")} อันดับแรก
          </Button>
          {showList ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[900px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-10 px-2 py-2 text-left font-semibold text-muted-foreground">#</th>
                    <th className="w-12 px-2 py-2 text-left font-semibold text-muted-foreground">รูป</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ชื่อสินค้า</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">หมวดหลัก</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">ราคา (ดิบ)</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
                      จำนวนขายสะสมจาก Feed
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">คะแนน</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ร้านค้า</th>
                  </tr>
                </thead>
                <tbody>
                  {data.importPlan.map((p, i) => (
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
                      <td className="max-w-[220px] px-3 py-2">
                        {p.productUrl ? (
                          <a
                            href={p.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="line-clamp-2 text-foreground underline-offset-2 hover:underline"
                            title={p.title}
                          >
                            {p.title || "—"}
                          </a>
                        ) : (
                          <span className="line-clamp-2 text-foreground" title={p.title}>
                            {p.title || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.category1 || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">
                        {p.salePrice || p.originalPrice || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        {p.itemSold || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{p.itemRating || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.shopName || "—"}</td>
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
