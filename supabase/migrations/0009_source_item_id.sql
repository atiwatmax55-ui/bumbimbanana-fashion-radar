-- 0009_source_item_id.sql
-- แก้ช่องโหว่เดิม: app/api/shopee/import/route.ts upsert ด้วย
--   onConflict: "source_platform,source_item_id"
-- แต่คอลัมน์ source_item_id และ unique index บนคอลัมน์นี้ไม่เคยถูก track ไว้ใน
-- migration ใดเลย (มีแต่ idx_products_source_ext บน external_product_id จาก 0004)
-- ไฟล์นี้เพิ่มให้ครบ แบบ idempotent (รันซ้ำได้) — จำเป็นสำหรับ TikTok Manual Import
-- (app/api/tiktok/import/route.ts) ที่ upsert ด้วย key เดียวกัน
-- รันใน Supabase SQL Editor (ต้องรัน 0001 + 0004 ก่อน)

-- ─── 1. เพิ่มคอลัมน์ source_item_id ─────────────────────────────────────────
alter table public.products
  add column if not exists source_item_id text;

comment on column public.products.source_item_id is
  'คีย์กันข้อมูลซ้ำต่อแพลตฟอร์ม (ใช้คู่กับ source_platform ใน upsert onConflict) — เท่ากับ external_product_id เสมอ';

-- ─── 2. Backfill แถวเดิมที่มี external_product_id แต่ยังไม่มี source_item_id ──
update public.products
set source_item_id = external_product_id
where source_item_id is null
  and external_product_id is not null;

-- ─── 3. Unique index สำหรับ Supabase upsert onConflict ──────────────────────
-- PostgreSQL ถือว่า NULL != NULL ใน unique index จึงมีหลายแถว source_item_id = NULL ได้
-- (สินค้า mock data ไม่มี source_item_id — ไม่กระทบ)
create unique index if not exists idx_products_source_item
  on public.products (source_platform, source_item_id);

-- ─── Rollback (รันมือเมื่อจำเป็นเท่านั้น) ─────────────────────────────────────
-- DROP INDEX IF EXISTS idx_products_source_item;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS source_item_id;
