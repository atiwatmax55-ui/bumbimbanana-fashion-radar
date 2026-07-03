-- 0002_shopee_products.sql
-- ตาราง shopee_products + import_logs สำหรับ BUMBIMBANANA Fashion Product Radar
-- รัน migration นี้ใน Supabase SQL Editor หรือผ่าน supabase db push
-- (migration 0001_init.sql ต้องรันก่อน)

-- ─── ตาราง shopee_products ────────────────────────────────────────────────────
-- เก็บสินค้าแฟชั่นผู้หญิงที่ผ่านการกรองจาก Shopee Product Feed
-- unique constraint ที่ (source_platform, external_product_id) ทำให้ upsert ได้ปลอดภัย

create table if not exists public.shopee_products (
  id                   uuid        primary key default gen_random_uuid(),
  source_platform      text        not null default 'shopee',
  external_product_id  text        not null,
  product_name         text        not null,
  product_image        text,
  product_url          text,
  shop_name            text,
  is_preferred_shop    boolean,
  is_official_shop     boolean,
  category_level_1     text,
  category_level_2     text,
  category_level_3     text,
  price                numeric(12, 2),
  raw_sale_price       text,
  item_sold            bigint      not null default 0,
  item_rating          numeric(3, 2),
  like_count           bigint,
  commission_rate      numeric(5, 2),               -- null = ไม่มีข้อมูลจาก Feed
  commission_status    text        not null default 'not_available_from_feed',
  data_source          text        not null default 'shopee_product_feed',
  passed_by_rule       text,                        -- กฎ Women Fashion Filter ที่ผ่าน
  filter_reason        text,                        -- เหตุผลที่ผ่านการคัดกรอง
  last_feed_updated_at timestamptz,
  imported_at          timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  unique (source_platform, external_product_id)
);

comment on table public.shopee_products is 'สินค้าแฟชั่นผู้หญิงจาก Shopee Product Feed ผ่าน Women Fashion Filter + Material Exclusion';
comment on column public.shopee_products.commission_rate is 'null = ไม่มีข้อมูลค่าคอมมิชชันจาก Feed (ห้ามสร้างค่าปลอม)';
comment on column public.shopee_products.item_sold is 'จำนวนขายสะสมตลอดอายุสินค้าจาก Shopee Product Feed — ไม่ใช่ยอดขายรายวัน/สัปดาห์';

create index if not exists idx_shopee_products_item_sold    on public.shopee_products (item_sold desc);
create index if not exists idx_shopee_products_category1    on public.shopee_products (category_level_1);
create index if not exists idx_shopee_products_platform_ext on public.shopee_products (source_platform, external_product_id);
create index if not exists idx_shopee_products_imported_at  on public.shopee_products (imported_at desc);

-- trigger อัปเดต updated_at อัตโนมัติ (ใช้ฟังก์ชัน set_updated_at() จาก 0001_init.sql)
drop trigger if exists trg_shopee_products_updated_at on public.shopee_products;
create trigger trg_shopee_products_updated_at
  before update on public.shopee_products
  for each row execute function public.set_updated_at();

-- ─── ตาราง import_logs ────────────────────────────────────────────────────────
-- บันทึกทุกครั้งที่มีการ dry_run หรือ import จริง

create table if not exists public.import_logs (
  id               uuid        primary key default gen_random_uuid(),
  source           text        not null,                          -- 'shopee_product_feed'
  mode             text        not null check (mode in ('dry_run', 'import')),
  requested_limit  integer     not null,
  scanned_rows     integer     not null default 0,
  eligible_rows    integer     not null default 0,
  inserted_count   integer     not null default 0,
  updated_count    integer     not null default 0,
  skipped_count    integer     not null default 0,
  failed_count     integer     not null default 0,
  message          text,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz
);

comment on table public.import_logs is 'ประวัติการ dry_run และ import สินค้าจาก Shopee Product Feed';
comment on column public.import_logs.mode is 'dry_run = ตรวจสอบเท่านั้น ไม่เขียน Supabase | import = นำเข้าจริง';

create index if not exists idx_import_logs_started_at on public.import_logs (started_at desc);
create index if not exists idx_import_logs_source     on public.import_logs (source);
