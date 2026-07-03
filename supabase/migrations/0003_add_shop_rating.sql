-- เพิ่มคอลัมน์ shop_rating ให้ตาราง shopee_products
-- (คะแนนร้านค้าจาก Shopee Product Feed — nullable เพราะไม่แน่ใจว่าทุก feed มีฟิลด์นี้)
alter table public.shopee_products
  add column if not exists shop_rating numeric(3, 2);
