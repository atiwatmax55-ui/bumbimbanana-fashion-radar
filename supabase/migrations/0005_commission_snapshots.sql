-- Migration 0005: commission_snapshots
-- เก็บข้อมูลค่าคอมจริงจาก Shopee Affiliate (import จาก CSV/XLSX)
-- รันซ้ำได้ (IF NOT EXISTS ทุกจุด)
--
-- NOTE (แก้ไข 2025-07): product_id ใช้ BIGINT เพราะ public.products.id เป็น BIGINT
-- ห้ามใช้ UUID สำหรับ FK ที่ชี้ไป products.id — จะเกิด error ชนิดไม่ตรงกัน:
--   "foreign key constraint cannot be implemented: uuid and bigint are incompatible"

CREATE TABLE IF NOT EXISTS public.commission_snapshots (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK ไปยัง products.id (BIGINT) — nullable: จับคู่ไม่ได้ = NULL
  product_id          BIGINT         REFERENCES public.products(id) ON DELETE SET NULL,
  external_product_id TEXT,
  product_url         TEXT,
  product_name        TEXT           NOT NULL DEFAULT '',
  shop_name           TEXT,
  commission_rate     NUMERIC(5, 2)  NOT NULL,
  commission_amount   NUMERIC(10, 2),
  campaign_name       TEXT,
  channel             TEXT,
  source_file         TEXT,
  imported_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  effective_at        TIMESTAMPTZ
);

COMMENT ON TABLE  public.commission_snapshots                      IS 'ค่าคอมมิชชันจริงจาก Shopee Affiliate (import จาก CSV/XLSX)';
COMMENT ON COLUMN public.commission_snapshots.product_id           IS 'FK → products.id (BIGINT) — null ถ้าจับคู่สินค้าไม่สำเร็จ';
COMMENT ON COLUMN public.commission_snapshots.commission_rate      IS 'อัตราค่าคอม (%) — ห้ามเดา ต้องมาจากไฟล์ Shopee Affiliate เท่านั้น';

CREATE INDEX IF NOT EXISTS idx_commission_snapshots_product_id
  ON public.commission_snapshots (product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commission_snapshots_imported_at
  ON public.commission_snapshots (imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_commission_snapshots_ext_id
  ON public.commission_snapshots (external_product_id)
  WHERE external_product_id IS NOT NULL;
