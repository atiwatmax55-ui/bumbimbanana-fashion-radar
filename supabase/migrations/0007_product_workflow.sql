-- Migration 0007: product workflow status
-- เพิ่มสถานะ workflow เพื่อติดตามสินค้าตั้งแต่ค้นพบจนถึงอนุมัติทำคอนเทนต์
-- รันซ้ำได้ (ADD COLUMN IF NOT EXISTS)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS workflow_status TEXT
    CHECK (workflow_status IN ('radar_found', 'strategy_review', 'approved_for_content', 'rejected'));

COMMENT ON COLUMN public.products.workflow_status IS
  'สถานะ workflow: radar_found=ค้นพบแล้ว | strategy_review=รอฝ่ายกลยุทธ์ตรวจ | approved_for_content=อนุมัติทำคอนเทนต์ | rejected=ปฏิเสธ';

CREATE INDEX IF NOT EXISTS idx_products_workflow_status
  ON public.products (workflow_status)
  WHERE workflow_status IS NOT NULL;
