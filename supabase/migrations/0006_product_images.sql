-- Migration 0006: product_images
-- เก็บรูปสินค้าหลายรูปต่อสินค้า 1 รายการ (gallery)
-- รันซ้ำได้ (IF NOT EXISTS ทุกจุด)
--
-- NOTE (แก้ไข 2025-07): product_id ใช้ BIGINT เพราะ public.products.id เป็น BIGINT
-- ห้ามใช้ UUID สำหรับ FK ที่ชี้ไป products.id

CREATE TABLE IF NOT EXISTS public.product_images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK ไปยัง products.id (BIGINT) — NOT NULL เพราะรูปต้องสังกัดสินค้าเสมอ
  product_id  BIGINT      NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  source      TEXT        NOT NULL DEFAULT 'shopee_feed',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.product_images           IS 'รูปสินค้าหลายรูปต่อ 1 สินค้า (gallery)';
COMMENT ON COLUMN public.product_images.product_id IS 'FK → products.id (BIGINT) — cascade delete เมื่อลบสินค้า';
COMMENT ON COLUMN public.product_images.source    IS 'shopee_feed | manual_upload';
COMMENT ON COLUMN public.product_images.sort_order IS '0 = รูปหลัก, 1+ = รูปเพิ่มเติม';

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON public.product_images (product_id, sort_order);
