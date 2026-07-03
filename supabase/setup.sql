-- ══════════════════════════════════════════════════════════════════════════════
-- BUMBIMBANANA Fashion Product Radar — Supabase Setup Script
-- รันไฟล์นี้ทั้งหมดใน Supabase Dashboard → SQL Editor → New Query → Run
-- (ครอบคลุม migration 0001 + 0004 — สร้างและปรับตารางที่จำเป็นทั้งหมด)
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Extension + ฟังก์ชัน updated_at ─────────────────────────────────────────
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── ตาราง products ───────────────────────────────────────────────────────────
-- เก็บสินค้าแฟชั่นผู้หญิงจากทุกแหล่ง (Shopee Feed, Mock Data ฯลฯ)
-- commission_rate nullable เพราะ Shopee Feed ไม่มีข้อมูลนี้

create table if not exists public.products (
  id                   uuid        primary key default gen_random_uuid(),
  -- ─ คอลัมน์หลัก ─
  title                text        not null default '',          -- ชื่อสินค้า (alias product_name)
  product_name         text        not null,
  product_image        text,                          -- nullable: Shopee อาจไม่มีรูป
  shop_name            text,                          -- nullable
  product_url          text,                          -- nullable
  category             text        not null,          -- ชื่อหมวดสินค้าภาษาไทย
  price                numeric(12, 2) not null default 0 check (price >= 0),
  commission_rate      numeric(5, 2)  check (commission_rate >= 0), -- nullable: Shopee ไม่มี
  sales_7d             integer     not null default 0 check (sales_7d >= 0),
  sales_30d            integer     not null default 0 check (sales_30d >= 0),
  estimated_revenue    numeric(14, 2) not null default 0,
  growth_rate          numeric(6, 2)  not null default 0,
  interest_score       numeric(5, 2)  not null default 0,
  sales_rank           integer,
  commission_rank      integer,
  growth_rank          integer,
  last_updated_at      timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- ─ คอลัมน์ deduplication / แหล่งข้อมูล ─
  external_product_id  text,                          -- itemid จาก Shopee
  source_platform      text        not null default 'mock',   -- 'shopee' | 'mock'
  -- ─ คอลัมน์ Shopee Feed เพิ่มเติม ─
  item_sold            bigint      not null default 0,
  item_rating          numeric(3, 2),
  like_count           bigint,
  raw_sale_price       text,
  commission_status    text,                          -- 'not_available_from_feed'
  data_source          text,                          -- 'shopee_product_feed'
  is_preferred_shop    boolean,
  is_official_shop     boolean,
  category_level_1     text,
  category_level_2     text,
  category_level_3     text,
  shop_rating          numeric(3, 2),
  passed_by_rule       text,
  filter_reason        text,
  imported_at          timestamptz,
  -- ─ Workflow / Agency ─
  workflow_status      text
    check (workflow_status in ('radar_found', 'strategy_review', 'approved_for_content', 'rejected'))
);

comment on table  public.products                       is 'สินค้าแฟชั่นผู้หญิงจากทุกแหล่งข้อมูล (Shopee Feed, Mock Data)';
comment on column public.products.commission_rate       is 'null = ไม่มีข้อมูลค่าคอมมิชชัน (Shopee Feed ไม่ให้ข้อมูลนี้ — ห้ามสร้างค่าปลอม)';
comment on column public.products.external_product_id   is 'itemid จาก Shopee Feed — ใช้ร่วมกับ source_platform สำหรับ upsert deduplication';
comment on column public.products.item_sold             is 'จำนวนขายสะสมตลอดอายุสินค้าจาก Shopee Feed (ไม่ใช่ยอดขายรายวัน)';

create index if not exists idx_products_category        on public.products (category);
create index if not exists idx_products_sales_30d       on public.products (sales_30d desc);
create index if not exists idx_products_commission_rate on public.products (commission_rate desc);
create index if not exists idx_products_growth_rate     on public.products (growth_rate desc);
create index if not exists idx_products_source_platform on public.products (source_platform);
create index if not exists idx_products_item_sold       on public.products (item_sold desc);

-- Unique index สำหรับ Supabase upsert (NULL != NULL ใน Postgres — ไม่กระทบแถว mock)
create unique index if not exists idx_products_source_ext
  on public.products (source_platform, external_product_id);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ─── ตาราง import_logs ────────────────────────────────────────────────────────
create table if not exists public.import_logs (
  id              uuid    primary key default gen_random_uuid(),
  source          text    not null,
  mode            text    not null check (mode in ('dry_run', 'import')),
  requested_limit integer not null,
  scanned_rows    integer not null default 0,
  eligible_rows   integer not null default 0,
  inserted_count  integer not null default 0,
  updated_count   integer not null default 0,
  skipped_count   integer not null default 0,
  failed_count    integer not null default 0,
  message         text,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

comment on table  public.import_logs      is 'ประวัติการ dry_run และ import สินค้าจาก Shopee Product Feed';
comment on column public.import_logs.mode is 'dry_run = ตรวจสอบเท่านั้น ไม่เขียน DB | import = นำเข้าจริง';

create index if not exists idx_import_logs_started_at on public.import_logs (started_at desc);
create index if not exists idx_import_logs_source     on public.import_logs (source);

-- ─── ตาราง commission_snapshots ──────────────────────────────────────────────
-- เก็บข้อมูลค่าคอมจริงจาก Shopee Affiliate (import จาก CSV/XLSX)
-- product_id FK → products.id (nullable ถ้าจับคู่ไม่ได้)

create table if not exists public.commission_snapshots (
  id                  uuid        primary key default gen_random_uuid(),
  product_id          uuid        references public.products(id) on delete set null,
  external_product_id text,
  product_url         text,
  product_name        text        not null default '',
  shop_name           text,
  commission_rate     numeric(5, 2)  not null,
  commission_amount   numeric(10, 2),
  campaign_name       text,
  channel             text,
  source_file         text,
  imported_at         timestamptz not null default now(),
  effective_at        timestamptz
);

comment on table  public.commission_snapshots                      is 'ค่าคอมมิชชันจริงจาก Shopee Affiliate (import จาก CSV/XLSX)';
comment on column public.commission_snapshots.commission_rate      is 'อัตราค่าคอม (%) — ห้ามเดา ต้องมาจากไฟล์ Shopee Affiliate เท่านั้น';

create index if not exists idx_commission_snapshots_product_id
  on public.commission_snapshots (product_id)
  where product_id is not null;

create index if not exists idx_commission_snapshots_imported_at
  on public.commission_snapshots (imported_at desc);

create index if not exists idx_commission_snapshots_ext_id
  on public.commission_snapshots (external_product_id)
  where external_product_id is not null;

-- ─── index สำหรับ workflow_status ────────────────────────────────────────────
create index if not exists idx_products_workflow_status
  on public.products (workflow_status)
  where workflow_status is not null;

-- ─── ตาราง product_images ─────────────────────────────────────────────────────
-- เก็บรูปสินค้าหลายรูปต่อสินค้า 1 รายการ (gallery)

create table if not exists public.product_images (
  id          uuid      primary key default gen_random_uuid(),
  product_id  uuid      not null references public.products(id) on delete cascade,
  image_url   text      not null,
  sort_order  smallint  not null default 0,
  source      text      not null default 'shopee_feed',
  created_at  timestamptz not null default now()
);

comment on table  public.product_images           is 'รูปสินค้าหลายรูปต่อ 1 สินค้า (gallery)';

create index if not exists idx_product_images_product_id
  on public.product_images (product_id, sort_order);

-- ══════════════════════════════════════════════════════════════════════════════
-- Setup เสร็จสมบูรณ์ — รีเฟรชหน้า Data Status เพื่อยืนยัน
-- ══════════════════════════════════════════════════════════════════════════════
