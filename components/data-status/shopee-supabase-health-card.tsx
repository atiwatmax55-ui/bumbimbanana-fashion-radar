"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupabaseHealthResponse } from "@/app/api/supabase/health/route";

// SQL ฉบับสมบูรณ์ (idempotent) — รันซ้ำได้ทุกกรณี
// รวม: function ตรวจคอลัมน์, DROP NOT NULL อย่างปลอดภัย, ADD COLUMN IF NOT EXISTS, indexes, import_logs
const MIGRATION_SQL = `-- ══════════════════════════════════════════════════════════════
-- Migration 0004 (ฉบับสมบูรณ์ — รันซ้ำได้ทุกกรณี)
-- วาง SQL นี้ทั้งหมดใน Supabase Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- ─── 1. ฟังก์ชันตรวจสอบคอลัมน์ Shopee ที่ขาด ──────────────────
-- (ระบบ Data Status ใช้ function นี้ — ต้องสร้างก่อนเสมอ)
CREATE OR REPLACE FUNCTION public.shopee_missing_columns()
RETURNS TABLE(column_name TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT col
  FROM unnest(ARRAY[
    -- base columns (จาก setup.sql — อาจหายถ้าผู้ใช้ไม่ได้รัน setup.sql)
    'title', 'product_name', 'category', 'price',
    'sales_7d', 'sales_30d', 'interest_score', 'updated_at',
    -- Shopee-specific columns
    'source_item_id', 'source_platform', 'external_product_id',
    'item_sold', 'item_rating', 'like_count', 'raw_sale_price',
    'commission_status', 'data_source', 'is_preferred_shop', 'is_official_shop',
    'category_level_1', 'category_level_2', 'category_level_3', 'shop_rating',
    'passed_by_rule', 'filter_reason', 'imported_at',
    -- Migration 0010: wearable filter + style metadata
    'is_outfit_item', 'colors', 'style_tags', 'silhouette', 'fabric',
    'detail_points', 'content_worthy_score', 'style_tagged_at'
  ]) AS col
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = col
  );
$$;
GRANT EXECUTE ON FUNCTION public.shopee_missing_columns() TO service_role;

-- ─── 1b. เพิ่มคอลัมน์ NOT NULL ที่ต้องมีก่อน upsert ──────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS title          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_item_id TEXT NOT NULL DEFAULT '';

-- Unique index สำหรับ upsert deduplication (source_platform + source_item_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_item
  ON public.products (source_platform, source_item_id);

-- ─── 2. Drop NOT NULL อย่างปลอดภัย ────────────────────────────
DO $$
DECLARE col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['commission_rate','product_image','product_url','shop_name']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products'
        AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE FORMAT('ALTER TABLE public.products ALTER COLUMN %I DROP NOT NULL', col);
    END IF;
  END LOOP;
END $$;

-- ─── 3. เพิ่มคอลัมน์หลักที่อาจหายไป (base schema + Shopee) ───
-- (ถ้าไม่ได้รัน setup.sql มาก่อน คอลัมน์เหล่านี้อาจยังไม่มีอยู่)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_name      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category          TEXT NOT NULL DEFAULT 'อื่นๆ',
  ADD COLUMN IF NOT EXISTS price             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_7d          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_30d         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS growth_rate       NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_score    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate   NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS product_image     TEXT,
  ADD COLUMN IF NOT EXISTS product_url       TEXT,
  ADD COLUMN IF NOT EXISTS shop_name         TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- อัปเดต product_name จาก title สำหรับแถวที่ import มาก่อนหน้า
UPDATE public.products
SET product_name = title
WHERE product_name = '' AND title <> '' AND source_platform = 'shopee';

-- ─── 4. เพิ่มคอลัมน์ Shopee ────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_product_id TEXT,
  ADD COLUMN IF NOT EXISTS source_platform     TEXT NOT NULL DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS item_sold           BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_rating         NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS like_count          BIGINT,
  ADD COLUMN IF NOT EXISTS raw_sale_price      TEXT,
  ADD COLUMN IF NOT EXISTS commission_status   TEXT,
  ADD COLUMN IF NOT EXISTS data_source         TEXT,
  ADD COLUMN IF NOT EXISTS is_preferred_shop   BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_official_shop    BOOLEAN,
  ADD COLUMN IF NOT EXISTS category_level_1    TEXT,
  ADD COLUMN IF NOT EXISTS category_level_2    TEXT,
  ADD COLUMN IF NOT EXISTS category_level_3    TEXT,
  ADD COLUMN IF NOT EXISTS shop_rating         NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS passed_by_rule      TEXT,
  ADD COLUMN IF NOT EXISTS filter_reason       TEXT,
  ADD COLUMN IF NOT EXISTS imported_at         TIMESTAMPTZ;

-- ─── 5. Indexes สำหรับ upsert + query ──────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_ext
  ON public.products (source_platform, external_product_id);

CREATE INDEX IF NOT EXISTS idx_products_source_platform
  ON public.products (source_platform);

CREATE INDEX IF NOT EXISTS idx_products_item_sold
  ON public.products (item_sold DESC);

-- ─── 6. ตาราง import_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_logs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT    NOT NULL,
  mode            TEXT    NOT NULL CHECK (mode IN ('dry_run', 'import')),
  requested_limit INTEGER NOT NULL,
  scanned_rows    INTEGER NOT NULL DEFAULT 0,
  eligible_rows   INTEGER NOT NULL DEFAULT 0,
  inserted_count  INTEGER NOT NULL DEFAULT 0,
  updated_count   INTEGER NOT NULL DEFAULT 0,
  skipped_count   INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  message         TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_logs_started_at
  ON public.import_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_source
  ON public.import_logs (source);

-- ─── 7. ตาราง commission_snapshots (ค่าคอมจริงจาก Shopee Affiliate) ────────
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
  ON public.commission_snapshots (product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commission_snapshots_imported_at
  ON public.commission_snapshots (imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_commission_snapshots_ext_id
  ON public.commission_snapshots (external_product_id)
  WHERE external_product_id IS NOT NULL;

-- ─── 8. workflow_status บน products ────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS workflow_status TEXT
    CHECK (workflow_status IN ('radar_found', 'strategy_review', 'approved_for_content', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_products_workflow_status
  ON public.products (workflow_status)
  WHERE workflow_status IS NOT NULL;

-- ─── 9. product_images ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_images (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID      NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url   TEXT      NOT NULL,
  sort_order  SMALLINT  NOT NULL DEFAULT 0,
  source      TEXT      NOT NULL DEFAULT 'shopee_feed',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON public.product_images (product_id, sort_order);

-- ─── 10. Migration 0010: wearable filter + style metadata ──────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_outfit_item       BOOLEAN,
  ADD COLUMN IF NOT EXISTS colors               TEXT[],
  ADD COLUMN IF NOT EXISTS style_tags           TEXT[],
  ADD COLUMN IF NOT EXISTS silhouette           TEXT,
  ADD COLUMN IF NOT EXISTS fabric               TEXT,
  ADD COLUMN IF NOT EXISTS detail_points        TEXT[],
  ADD COLUMN IF NOT EXISTS content_worthy_score SMALLINT,
  ADD COLUMN IF NOT EXISTS style_tagged_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_style_tagged_at
  ON public.products (style_tagged_at)
  WHERE style_tagged_at IS NULL;`;


export function ShopeeSupabaseHealthCard() {
  const [health, setHealth] = useState<SupabaseHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    fetch("/api/supabase/health")
      .then((r) => r.json())
      .then((data: SupabaseHealthResponse) => {
        setHealth(data);
        if (!data.tablesReady) setShowSql(true);
      })
      .catch(() =>
        setHealth({
          configured:          false,
          tablesReady:         false,
          shopeeProductsCount: 0,
          missingColumns:      [],
          missingTables:       [],
          error:               "ไม่สามารถตรวจสอบสถานะ Supabase ได้",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border p-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        กำลังตรวจสอบการเชื่อมต่อ Supabase...
      </div>
    );
  }

  const isReady = health?.tablesReady;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        isReady
          ? "border-positive/40 bg-positive/5"
          : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className={`size-4 ${isReady ? "text-positive" : "text-amber-600 dark:text-amber-400"}`} />
          <h3 className="text-sm font-bold text-foreground">สถานะตาราง Supabase</h3>
        </div>
        {isReady ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-positive">
            <CheckCircle2 className="size-4" />
            พร้อมใช้งาน ({health.shopeeProductsCount.toLocaleString("th-TH")} สินค้า Shopee)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <XCircle className="size-4" />
            ยังไม่พร้อม
          </span>
        )}
      </div>

      {!isReady ? (
        <>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ต้องรัน SQL ด้านล่างใน Supabase SQL Editor เพื่อเพิ่ม function ตรวจสอบ schema,
            คอลัมน์ Shopee ใน <strong>public.products</strong> และสร้าง <strong>import_logs</strong>
          </p>

          {/* แสดงคอลัมน์ที่ขาดจริง */}
          {health?.missingColumns && health.missingColumns.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-100/60 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/40">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                คอลัมน์ที่ขาดใน public.products ({health.missingColumns.length} รายการ):
              </p>
              <p className="mt-1 font-mono text-xs text-amber-700 dark:text-amber-400">
                {health.missingColumns.join(", ")}
              </p>
            </div>
          ) : null}

          {/* แสดง error อื่น */}
          {health?.missingTables && health.missingTables.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-100/60 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/40">
              {health.missingTables.map((t, i) => (
                <p key={i} className="font-mono text-xs text-amber-800 dark:text-amber-300">{t}</p>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-fit gap-1.5 rounded-full text-xs"
              onClick={() => setShowSql((p) => !p)}
            >
              {showSql ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {showSql ? "ซ่อน" : "แสดง"} SQL Migration (รันซ้ำได้)
            </Button>

            {showSql ? (
              <div>
                <pre className="max-h-80 overflow-auto rounded-xl border border-amber-200 bg-amber-100/60 p-4 font-mono text-[11px] leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                  {MIGRATION_SQL}
                </pre>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  <strong>ขั้นตอน:</strong> เปิด{" "}
                  <strong>Supabase Dashboard → SQL Editor → New Query</strong> → วางโค้ดด้านบนทั้งหมด → กด{" "}
                  <strong>Run</strong> → รีเฟรชหน้านี้ (Ctrl+R)
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                  SQL นี้ใช้ <code className="rounded bg-amber-200/60 px-1 font-mono dark:bg-amber-900/60">IF NOT EXISTS</code>{" "}
                  ทุกจุด — รันซ้ำกี่ครั้งก็ไม่เกิด error
                </p>
              </div>
            ) : null}
          </div>

          <p className="text-xs text-amber-600 dark:text-amber-500">
            หมายเหตุ: ถ้าเพิ่ง setup Supabase ใหม่ทั้งหมด ใช้ไฟล์{" "}
            <code className="font-mono">supabase/setup.sql</code> แทน (ครอบคลุมทุก migration)
          </p>
        </>
      ) : null}

      {isReady && health.shopeeProductsCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          ตารางพร้อมแล้ว — กด <strong>ตรวจสอบก่อนนำเข้า</strong> ด้านล่างเพื่อเริ่ม Import สินค้าจาก Shopee Feed
        </p>
      ) : null}

      {isReady && health.shopeeProductsCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          มีสินค้า Shopee ใน Supabase แล้ว {health.shopeeProductsCount.toLocaleString("th-TH")} รายการ — กด Import อีกครั้งเพื่ออัปเดตข้อมูล
        </p>
      ) : null}
    </div>
  );
}
