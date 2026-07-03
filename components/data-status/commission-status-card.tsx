"use client";

import { useEffect, useState } from "react";
import { BadgePercent, CheckCircle2, ChevronDown, ChevronUp, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CommissionStats {
  totalSnapshots: number;
  productsWithCommission: number;
  productsWithoutCommission: number;
  lastImportedAt: string | null;
  error?: string;
  tableNotFound?: boolean;
}

const COMMISSION_MIGRATION_SQL = `-- สร้างตาราง commission_snapshots (รันซ้ำได้)
CREATE TABLE IF NOT EXISTS public.commission_snapshots (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  external_product_id TEXT,
  product_url         TEXT,
  product_name        TEXT        NOT NULL DEFAULT '',
  shop_name           TEXT,
  commission_rate     NUMERIC(5, 2)  NOT NULL,
  commission_amount   NUMERIC(10, 2),
  campaign_name       TEXT,
  channel             TEXT,
  source_file         TEXT,
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_commission_snapshots_product_id
  ON public.commission_snapshots (product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commission_snapshots_imported_at
  ON public.commission_snapshots (imported_at DESC);`;

export function CommissionStatusCard() {
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/commission/status")
      .then((r) => r.json())
      .then((data: CommissionStats) => {
        setStats(data);
        if (data.tableNotFound) setShowSql(true);
      })
      .catch(() =>
        setStats({
          totalSnapshots: 0,
          productsWithCommission: 0,
          productsWithoutCommission: 0,
          lastImportedAt: null,
          error: "ไม่สามารถตรวจสอบสถานะค่าคอมได้",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  function handleCopySql() {
    navigator.clipboard.writeText(COMMISSION_MIGRATION_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border p-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        กำลังตรวจสอบสถานะค่าคอมมิชชัน...
      </div>
    );
  }

  const hasData = (stats?.totalSnapshots ?? 0) > 0;
  const tableReady = !stats?.tableNotFound && !stats?.error;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        stats?.tableNotFound
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
          : hasData
            ? "border-positive/40 bg-positive/5"
            : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgePercent
            className={`size-4 ${
              stats?.tableNotFound ? "text-amber-600" : hasData ? "text-positive" : "text-muted-foreground"
            }`}
          />
          <h3 className="text-sm font-bold text-foreground">สถานะค่าคอม Shopee Affiliate</h3>
        </div>
        {tableReady ? (
          hasData ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-positive">
              <CheckCircle2 className="size-4" />
              มีข้อมูลค่าคอม {stats!.totalSnapshots.toLocaleString("th-TH")} รายการ
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <XCircle className="size-4" />
              ยังไม่มีข้อมูลค่าคอม
            </span>
          )
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <XCircle className="size-4" />
            ยังไม่ได้ตั้งค่าตาราง
          </span>
        )}
      </div>

      {stats?.tableNotFound ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ตาราง <strong>commission_snapshots</strong> ยังไม่มีใน Supabase — รัน SQL ด้านล่างก่อนใช้งาน
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-fit gap-1.5 rounded-full text-xs"
              onClick={() => setShowSql((p) => !p)}
            >
              {showSql ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {showSql ? "ซ่อน" : "แสดง"} SQL Migration
            </Button>
          </div>
          {showSql ? (
            <div className="flex flex-col gap-2">
              <pre className="max-h-52 overflow-auto rounded-xl border border-amber-200 bg-amber-100/60 p-4 font-mono text-[11px] leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                {COMMISSION_MIGRATION_SQL}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="w-fit rounded-full text-xs"
                onClick={handleCopySql}
              >
                {copied ? "คัดลอกแล้ว ✓" : "คัดลอก SQL"}
              </Button>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                วางใน Supabase Dashboard → SQL Editor → New Query → Run → รีเฟรชหน้านี้
              </p>
            </div>
          ) : null}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBlock
            label="Snapshots ทั้งหมด"
            value={stats!.totalSnapshots.toLocaleString("th-TH")}
            sub="รายการ"
          />
          <StatBlock
            label="สินค้ามีค่าคอมจริง"
            value={stats!.productsWithCommission.toLocaleString("th-TH")}
            sub="รายการ"
            valueClass="text-positive"
          />
          <StatBlock
            label="สินค้ายังไม่มีค่าคอม"
            value={stats!.productsWithoutCommission.toLocaleString("th-TH")}
            sub="รายการ"
          />
          {stats!.lastImportedAt ? (
            <div className="col-span-2 sm:col-span-3 text-xs text-muted-foreground">
              Import ล่าสุด:{" "}
              {new Date(stats!.lastImportedAt).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          ตารางพร้อมแล้ว แต่ยังไม่มีข้อมูลค่าคอมจาก Shopee Affiliate —{" "}
          <Link href="/commission-import" className="font-semibold underline underline-offset-2 hover:text-foreground">
            นำเข้าไฟล์ค่าคอม
          </Link>
        </p>
      )}

      {tableReady && !stats?.error ? (
        <div className="flex gap-2 pt-1">
          <Link
            href="/commission-import"
            className="self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-brand-cream"
          >
            นำเข้าไฟล์ค่าคอม →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-brand-cream/60 p-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-lg font-extrabold ${valueClass ?? "text-foreground"}`}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </div>
  );
}
