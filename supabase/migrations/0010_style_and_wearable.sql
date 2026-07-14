-- 0010_style_and_wearable.sql
-- รองรับ 2 ฟีเจอร์ใหม่:
--   1) is_outfit_item — ตัวกรอง "ใส่ได้จริง" (ตัดเครื่องประดับ/ของแต่งบ้านที่หลุดผ่าน category filter)
--   2) style metadata (colors/style_tags/silhouette/fabric/detail_points) +
--      content_worthy_score — เติมโดย rule-based extractor และ AI vision batch job
--      (ดู lib/style/, ทำงานระหว่าง sync ทุก 6 ชม. ใน app/api/shopee/import/route.ts)
-- ไฟล์นี้ idempotent (รันซ้ำได้) รันใน Supabase SQL Editor (ต้องรัน 0001+0004+0009 ก่อน)

alter table public.products
  -- null = ยังไม่ได้จัดประเภท (fail-open — ต้องแสดงสินค้าจนกว่าจะจัดประเภทเสร็จ)
  add column if not exists is_outfit_item boolean,
  add column if not exists colors text[],
  add column if not exists style_tags text[],
  add column if not exists silhouette text,
  add column if not exists fabric text,
  add column if not exists detail_points text[],
  add column if not exists content_worthy_score smallint,
  -- null = ยังไม่เคยแท็ก — คือ cursor ให้ batch job หยิบเฉพาะแถวที่ยังไม่ทำ
  add column if not exists style_tagged_at timestamptz;

comment on column public.products.is_outfit_item is
  'true = ใส่ได้จริง (เสื้อผ้า/รองเท้า/กระเป๋า), false = เครื่องประดับ/ของแต่งบ้าน/อุปกรณ์ที่หลุดผ่าน category filter, null = ยังไม่ได้จัดประเภท';
comment on column public.products.style_tagged_at is
  'เวลาที่ style metadata (colors/style_tags/silhouette/fabric/detail_points/content_worthy_score) ถูกเติมล่าสุด — null = ยังไม่เคยทำ ใช้เป็น cursor ให้ batch job';

-- Index สแกนหาแถวที่ยังไม่ได้แท็กสไตล์ (ใช้โดย batch job ใน import/route.ts)
create index if not exists idx_products_style_tagged_at
  on public.products (style_tagged_at)
  where style_tagged_at is null;

-- ─── Rollback (รันมือเมื่อจำเป็นเท่านั้น) ─────────────────────────────────────
-- DROP INDEX IF EXISTS idx_products_style_tagged_at;
-- ALTER TABLE public.products
--   DROP COLUMN IF EXISTS is_outfit_item,
--   DROP COLUMN IF EXISTS colors,
--   DROP COLUMN IF EXISTS style_tags,
--   DROP COLUMN IF EXISTS silhouette,
--   DROP COLUMN IF EXISTS fabric,
--   DROP COLUMN IF EXISTS detail_points,
--   DROP COLUMN IF EXISTS content_worthy_score,
--   DROP COLUMN IF EXISTS style_tagged_at;
