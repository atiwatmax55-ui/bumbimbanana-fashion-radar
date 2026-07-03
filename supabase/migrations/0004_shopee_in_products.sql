-- 0004_shopee_in_products.sql
-- ปรับ public.products ให้รองรับสินค้าจาก Shopee Product Feed
-- รันไฟล์นี้ใน Supabase SQL Editor (ต้องรัน 0001_init.sql ก่อน)

-- ─── 1. ยกเลิก NOT NULL บน commission_rate ────────────────────────────────────
-- PostgreSQL ตรวจ CHECK constraint เฉพาะค่าที่ไม่ใช่ NULL (NULL ผ่านอัตโนมัติ)
-- จึงไม่ต้องแก้ check constraint เดิม แค่ drop NOT NULL ก็พอ
alter table public.products
  alter column commission_rate drop not null;

-- ─── 2. ยกเลิก NOT NULL บนคอลัมน์ที่ Shopee Feed อาจไม่มีครบ ────────────────
alter table public.products
  alter column product_image drop not null,
  alter column product_url   drop not null,
  alter column shop_name     drop not null;

-- ─── 3. เพิ่มคอลัมน์ Shopee / deduplication ──────────────────────────────────
alter table public.products
  add column if not exists external_product_id text,
  add column if not exists source_platform     text not null default 'mock',
  add column if not exists item_sold           bigint not null default 0,
  add column if not exists item_rating         numeric(3, 2),
  add column if not exists like_count          bigint,
  add column if not exists raw_sale_price      text,
  add column if not exists commission_status   text,
  add column if not exists data_source         text,
  add column if not exists is_preferred_shop   boolean,
  add column if not exists is_official_shop    boolean,
  add column if not exists category_level_1    text,
  add column if not exists category_level_2    text,
  add column if not exists category_level_3    text,
  add column if not exists shop_rating         numeric(3, 2),
  add column if not exists passed_by_rule      text,
  add column if not exists filter_reason       text,
  add column if not exists imported_at         timestamptz;

comment on column public.products.external_product_id is 'itemid จาก Shopee — ใช้ร่วมกับ source_platform สำหรับ upsert deduplication';
comment on column public.products.source_platform     is '"mock" | "shopee" — แหล่งที่มาของสินค้า';
comment on column public.products.item_sold           is 'จำนวนขายสะสมตลอดอายุสินค้าจาก Shopee Feed (ไม่ใช่ยอดขายรายวัน/สัปดาห์)';
comment on column public.products.commission_status   is '"not_available_from_feed" = ไม่มีข้อมูลค่าคอมมิชชันจาก Feed — ห้ามสร้างค่าปลอม';

-- ─── 4. Unique index สำหรับ Supabase upsert ──────────────────────────────────
-- PostgreSQL ถือว่า NULL != NULL ใน unique index จึงมีหลายแถวที่ external_product_id = NULL ได้
-- (สินค้า mock data ยังไม่มี external_product_id — ไม่กระทบ)
create unique index if not exists idx_products_source_ext
  on public.products (source_platform, external_product_id);

create index if not exists idx_products_source_platform
  on public.products (source_platform);

create index if not exists idx_products_item_sold
  on public.products (item_sold desc);

-- ─── 5. ตาราง import_logs ─────────────────────────────────────────────────────
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
