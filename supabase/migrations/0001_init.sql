-- 0001_init.sql
-- โครงสร้างฐานข้อมูลเบื้องต้นของ BUMBIMBANANA Fashion Product Radar
-- เวอร์ชันนี้ยังไม่ได้เชื่อมต่อ/รันจริงบน Supabase — เตรียมไว้สำหรับอนาคต
-- เวอร์ชันแรกของเว็บไซต์ใช้ Mock Data (ข้อมูลตัวอย่าง) ในโค้ด ไม่ได้อ่าน/เขียนตารางเหล่านี้

-- NOTE (แก้ไข 2025-07): products.id ใช้ BIGINT GENERATED ALWAYS AS IDENTITY
-- เพราะ Supabase สร้างตาราง products จาก Dashboard ด้วย int8/bigint PK อัตโนมัติ
-- ห้ามเปลี่ยนกลับเป็น uuid — จะทำให้ FK ใน 0005/0006 ไม่ตรงชนิด

create extension if not exists "pgcrypto";

-- ตาราง products: เก็บข้อมูลสินค้าแฟชั่นที่ดึงมาจากแหล่งข้อมูล (Mock Data หรือ Shopee Feed)
create table if not exists public.products (
  id              bigint      generated always as identity primary key,
  product_name    text        not null,
  product_image   text        not null,
  shop_name       text        not null,
  product_url     text        not null,
  category        text        not null,
  price           numeric(12, 2) not null check (price >= 0),
  commission_rate numeric(5, 2)  not null check (commission_rate >= 0),
  sales_7d        integer     not null default 0 check (sales_7d >= 0),
  sales_30d       integer     not null default 0 check (sales_30d >= 0),
  estimated_revenue numeric(14, 2) not null default 0,
  growth_rate     numeric(6, 2)  not null default 0,
  interest_score  numeric(5, 2)  not null default 0,
  sales_rank      integer,
  commission_rank integer,
  growth_rank     integer,
  last_updated_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.products is 'สินค้าแฟชั่นจาก Shopee Feed (source_platform = shopee) หรือ Mock Data';
comment on column public.products.id is 'BIGINT identity PK — ตรงกับที่ Supabase Dashboard สร้างให้อัตโนมัติ';

create index if not exists idx_products_category        on public.products (category);
create index if not exists idx_products_sales_30d       on public.products (sales_30d desc);
create index if not exists idx_products_commission_rate on public.products (commission_rate desc);
create index if not exists idx_products_growth_rate     on public.products (growth_rate desc);

-- ตาราง saved_products: สินค้าที่เจ้าของเว็บไซต์บันทึกไว้พร้อมโน้ตส่วนตัว
-- NOTE: product_id ต้องเป็น BIGINT เพื่อให้ตรงกับ products.id
create table if not exists public.saved_products (
  id          uuid        primary key default gen_random_uuid(),
  product_id  bigint      not null references public.products (id) on delete cascade,
  personal_note text      default '',
  saved_at    timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id)
);

comment on table public.saved_products is 'สินค้าที่บันทึกไว้สนใจทำคอนเทนต์ (เวอร์ชันแอปปัจจุบันเก็บข้อมูลนี้ใน local storage ฝั่งเบราว์เซอร์)';

create index if not exists idx_saved_products_product_id on public.saved_products (product_id);

-- ตาราง data_sync_logs: บันทึกประวัติการซิงก์ข้อมูลจากแหล่งข้อมูลภายนอก
create table if not exists public.data_sync_logs (
  id          uuid        primary key default gen_random_uuid(),
  source      text        not null,
  sync_status text        not null check (sync_status in ('success', 'pending', 'error')),
  records_count integer   not null default 0,
  synced_at   timestamptz not null default now(),
  message     text
);

comment on table public.data_sync_logs is 'ประวัติการซิงก์ข้อมูลสินค้าจากแหล่งข้อมูลภายนอก';

create index if not exists idx_data_sync_logs_synced_at on public.data_sync_logs (synced_at desc);

-- ฟังก์ชันและ trigger อัปเดต updated_at ให้อัตโนมัติเมื่อมีการแก้ไขแถวข้อมูล
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_saved_products_updated_at on public.saved_products;
create trigger trg_saved_products_updated_at
  before update on public.saved_products
  for each row execute function public.set_updated_at();
