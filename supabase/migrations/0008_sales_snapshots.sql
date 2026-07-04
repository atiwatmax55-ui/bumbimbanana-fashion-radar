-- Migration 0008: product_sales_snapshots + radar_baselines RPC + GRANT commission_snapshots
-- เก็บ Snapshot ยอดขายสะสมรายวัน เพื่อคำนวณยอดขาย/อัตราโต 7 วัน / 30 วันจากข้อมูลจริง
-- รันซ้ำได้ (idempotent ทุกจุด) และย้อนกลับได้ (ดู "Rollback" ท้ายไฟล์)

-- ─── 1. ตาราง Snapshot รายวัน ────────────────────────────────────────────────
-- 1 แถวต่อสินค้า/วัน — sync ระหว่างวันจะอัปเดตค่า item_sold ของวันเดิม (กัน duplicate)
CREATE TABLE IF NOT EXISTS public.product_sales_snapshots (
  product_id    BIGINT      NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  snapshot_date DATE        NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  item_sold     BIGINT      NOT NULL CHECK (item_sold >= 0),
  price         NUMERIC(12, 2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, snapshot_date)
);

COMMENT ON TABLE  public.product_sales_snapshots IS
  'Snapshot ยอดขายสะสม (item_sold) รายวันจาก Shopee Feed — ใช้คำนวณยอดขายจริงราย 7/30 วัน';
COMMENT ON COLUMN public.product_sales_snapshots.item_sold IS
  'ยอดขายสะสมตลอดอายุสินค้า ณ วันนั้น — delta ระหว่างวัน = ยอดขายในช่วง';

CREATE INDEX IF NOT EXISTS idx_pss_snapshot_date
  ON public.product_sales_snapshots (snapshot_date DESC);

DROP TRIGGER IF EXISTS trg_pss_updated_at ON public.product_sales_snapshots;
CREATE TRIGGER trg_pss_updated_at
  BEFORE UPDATE ON public.product_sales_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. สิทธิ์ service_role (แก้ปัญหา 42501 permission denied) ────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sales_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_snapshots    TO service_role;

-- ─── 3. RPC: ดึงค่า baseline ยอดสะสม ณ 7/14/30/60 วันก่อน ครบทุกสินค้าในครั้งเดียว ──
-- tolerance: ยอมรับ snapshot เก่ากว่า cutoff ได้ไม่เกิน 3 วัน (7/14) และ 7 วัน (30/60)
-- ถ้าไม่มี snapshot ในกรอบ = NULL (ข้อมูลไม่พอ — ฝั่งแอปต้องแสดง "กำลังเก็บข้อมูล")
CREATE OR REPLACE FUNCTION public.radar_baselines()
RETURNS TABLE (
  product_id     BIGINT,
  latest_sold    BIGINT,
  latest_date    DATE,
  sold_7d_ago    BIGINT,
  sold_14d_ago   BIGINT,
  sold_30d_ago   BIGINT,
  sold_60d_ago   BIGINT,
  earliest_date  DATE,
  snapshot_days  INTEGER
)
LANGUAGE sql STABLE AS $$
  WITH latest AS (
    SELECT DISTINCT ON (s.product_id)
      s.product_id, s.item_sold, s.snapshot_date
    FROM public.product_sales_snapshots s
    ORDER BY s.product_id, s.snapshot_date DESC
  ),
  agg AS (
    SELECT s.product_id,
           MIN(s.snapshot_date)              AS earliest_date,
           COUNT(DISTINCT s.snapshot_date)::int AS snapshot_days
    FROM public.product_sales_snapshots s
    GROUP BY s.product_id
  )
  SELECT
    l.product_id,
    l.item_sold      AS latest_sold,
    l.snapshot_date  AS latest_date,
    b7.item_sold     AS sold_7d_ago,
    b14.item_sold    AS sold_14d_ago,
    b30.item_sold    AS sold_30d_ago,
    b60.item_sold    AS sold_60d_ago,
    a.earliest_date,
    a.snapshot_days
  FROM latest l
  JOIN agg a USING (product_id)
  LEFT JOIN LATERAL (
    SELECT s.item_sold FROM public.product_sales_snapshots s
    WHERE s.product_id = l.product_id
      AND s.snapshot_date <= current_date - 7
      AND s.snapshot_date >= current_date - 10
    ORDER BY s.snapshot_date DESC LIMIT 1
  ) b7 ON true
  LEFT JOIN LATERAL (
    SELECT s.item_sold FROM public.product_sales_snapshots s
    WHERE s.product_id = l.product_id
      AND s.snapshot_date <= current_date - 14
      AND s.snapshot_date >= current_date - 17
    ORDER BY s.snapshot_date DESC LIMIT 1
  ) b14 ON true
  LEFT JOIN LATERAL (
    SELECT s.item_sold FROM public.product_sales_snapshots s
    WHERE s.product_id = l.product_id
      AND s.snapshot_date <= current_date - 30
      AND s.snapshot_date >= current_date - 37
    ORDER BY s.snapshot_date DESC LIMIT 1
  ) b30 ON true
  LEFT JOIN LATERAL (
    SELECT s.item_sold FROM public.product_sales_snapshots s
    WHERE s.product_id = l.product_id
      AND s.snapshot_date <= current_date - 60
      AND s.snapshot_date >= current_date - 70
    ORDER BY s.snapshot_date DESC LIMIT 1
  ) b60 ON true
$$;

GRANT EXECUTE ON FUNCTION public.radar_baselines() TO service_role;

-- ─── 4. Retention helper: ลบ snapshot เก่ากว่า 100 วัน (เรียกจาก sync) ─────────
-- เก็บย้อนหลัง 100 วัน (> 90 วันตามสเปก) — วิเคราะห์ 7/30 วันไม่กระทบ
CREATE OR REPLACE FUNCTION public.radar_prune_snapshots()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE deleted INTEGER;
BEGIN
  DELETE FROM public.product_sales_snapshots
  WHERE snapshot_date < current_date - 100;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.radar_prune_snapshots() TO service_role;

-- ─── Rollback (รันมือเมื่อจำเป็นเท่านั้น) ─────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.radar_prune_snapshots();
-- DROP FUNCTION IF EXISTS public.radar_baselines();
-- DROP TABLE IF EXISTS public.product_sales_snapshots;
