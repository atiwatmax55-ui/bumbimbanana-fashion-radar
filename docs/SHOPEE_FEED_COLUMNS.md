# Shopee Product Feed — คอลัมน์ทั้งหมด (47 คอลัมน์)

ตรวจสอบเมื่อ: 2026-07-01  
แหล่งข้อมูล: `SHOPEE_PRODUCT_FEED_URL` (Shopee Affiliate Data Feed)

---

## รายชื่อคอลัมน์จริงทั้ง 47 คอลัมน์

| ลำดับ | ชื่อคอลัมน์ | สถานะ Mapping | Field ในระบบ | หมายเหตุ |
|-------|-------------|----------------|--------------|----------|
| 1  | `title`                  | ✅ ใช้งาน | `product_name`           | ชื่อสินค้า |
| 2  | `itemid`                 | ✅ ใช้งาน | `source_item_id`         | **Product ID หลัก** |
| 3  | `shopid`                 | ✅ ใช้งาน | `source_shop_id`         | รหัสร้านค้า (ตัวเลข) |
| 4  | `shop_name`              | ✅ ใช้งาน | `shop_name`              | ชื่อร้านค้า |
| 5  | `image_link`             | ✅ ใช้งาน | `product_image`          | รูปสินค้าหลัก |
| 6  | `image_link_4`           | ✅ ใช้งาน | `product_image_alt`      | รูปสำรอง (ตามที่ระบุใน spec) |
| 7  | `global_category1`       | ✅ ใช้งาน | `category_level_1`       | หมวดสินค้าหลัก |
| 8  | `global_category2`       | ✅ ใช้งาน | `category_level_2`       | หมวดสินค้าย่อย |
| 9  | `global_category3`       | ➕ สำรอง  | `category_level_3`       | หมวดสินค้าย่อยระดับ 3 |
| 10 | `global_catid1`          | ➕ สำรอง  | `category_id_1`          | ID หมวดระดับ 1 |
| 11 | `global_catid2`          | ➕ สำรอง  | `category_id_2`          | ID หมวดระดับ 2 |
| 12 | `global_catid3`          | ➕ สำรอง  | `category_id_3`          | ID หมวดระดับ 3 |
| 13 | `sale_price`             | ✅ ใช้งาน | `sale_price`             | ราคาขาย (หลังลด) — ยืนยันหน่วยก่อน import |
| 14 | `price`                  | ✅ ใช้งาน | `original_price`         | ราคาเต็ม (ก่อนลด) — ยืนยันหน่วยก่อน import |
| 15 | `model_prices`           | ✅ ใช้งาน | `model_price_data`       | ราคาตาม variant (JSON-like) |
| 16 | `discount_percentage`    | ✅ ใช้งาน | `discount_percentage`    | เปอร์เซ็นต์ส่วนลด |
| 17 | `item_sold`              | ✅ ใช้งาน | `sold_count`             | จำนวนขาย |
| 18 | `stock`                  | ✅ ใช้งาน | `stock_count`            | สต็อกคงเหลือ |
| 19 | `like`                   | ✅ ใช้งาน | `like_count`             | จำนวนถูกใจ |
| 20 | `item_rating`            | ✅ ใช้งาน | `item_rating`            | คะแนนสินค้า (0–5) |
| 21 | `shop_rating`            | ✅ ใช้งาน | `shop_rating`            | คะแนนร้านค้า (0–5) |
| 22 | `is_preferred_shop`      | ✅ ใช้งาน | `preferred_shop`         | ร้าน Preferred ("1"/"0") |
| 23 | `is_official_shop`       | ✅ ใช้งาน | `is_official_shop`       | ร้าน Official ("1"/"0") |
| 24 | `cb_option`              | ✅ ใช้งาน | `campaign_option`        | ข้อมูลแคมเปญ/ตัวเลือก |
| 25 | `product_link`           | ✅ ใช้งาน | `product_url`            | ลิงก์สินค้า |
| 26 | `model_names`            | ➕ สำรอง  | `model_names`            | ชื่อ variant |
| 27 | `model_ids`              | — ยังไม่ใช้ | —                       | ID ของ variant |
| 28 | `global_brand`           | ➕ สำรอง  | `brand`                  | แบรนด์สินค้า |
| 29 | `description`            | ➕ สำรอง  | `description`            | คำอธิบายสินค้า (ข้อความยาว) |
| 30 | `seller_name`            | ➕ สำรอง  | `seller_name`            | ชื่อผู้ขาย (มี shop_name แล้ว) |
| 31 | `shopee_verified_flag`   | ➕ สำรอง  | `verified`               | ร้านค้าที่ Shopee ยืนยัน |
| 32 | `condition`              | — ยังไม่ใช้ | —                       | สภาพสินค้า (ใหม่/มือสอง) |
| 33 | `global_item_attributes` | — ยังไม่ใช้ | —                       | Attributes ซับซ้อน |
| 34 | `seller_penalty_score`   | — ยังไม่ใช้ | —                       | คะแนนโทษผู้ขาย |
| 35 | `is_item_welcome_package`| — ยังไม่ใช้ | —                       | สินค้า Welcome Package |
| 36 | `holiday_mode_on`        | — ยังไม่ใช้ | —                       | โหมดหยุดร้านชั่วคราว |
| 37 | `has_lowest_price_guarantee` | — ยังไม่ใช้ | —                   | การรับประกันราคาต่ำสุด |
| 38 | `shop_sku_count`         | — ยังไม่ใช้ | —                       | จำนวน SKU ทั้งหมดในร้าน |
| 39 | `image_link_3`           | — ยังไม่ใช้ | —                       | รูปสินค้า (ลำดับ 3) |
| 40 | `image_link_5`           | — ยังไม่ใช้ | —                       | รูปสินค้า (ลำดับ 5) |
| 41 | `image_link_6`           | — ยังไม่ใช้ | —                       | รูปสินค้า (ลำดับ 6) |
| 42 | `image_link_7`           | — ยังไม่ใช้ | —                       | รูปสินค้า (ลำดับ 7) |
| 43 | `image_link_8`           | — ยังไม่ใช้ | —                       | รูปสินค้า (ลำดับ 8) |
| 44 | `image_link_9`           | — ยังไม่ใช้ | —                       | รูปสินค้า (ลำดับ 9) |
| 45 | `image_link_10`          | — ยังไม่ใช้ | —                       | รูปสินค้า (ลำดับ 10) |
| 46 | `additional_image_link`  | — ยังไม่ใช้ | —                       | รูปสินค้าเพิ่มเติม (array) |
| 47 | `product_short link`     | ➕ สำรอง  | `product_short_url`      | ลิงก์สั้น (**ชื่อมีช่องว่าง** — ผิดปกติ ต้องระวังตอน parse) |

---

## สรุปสำคัญ

### ❌ ไม่มีข้อมูลค่าคอมมิชชัน (Commission Rate)

**Feed นี้ไม่มีคอลัมน์ commission rate ใด ๆ เลย** ค่าคอมมิชชันของสินค้า Shopee ต้องดูจาก:
- Shopee Affiliate Center → My Products → ดู commission % ของสินค้าแต่ละตัว
- Shopee Affiliate API (ต้องสมัคร API access แยก)

ระบบจะแสดง **"ยังไม่มีข้อมูลค่าคอมมิชชันจาก Feed"** สำหรับสินค้าทุกรายการจาก Shopee Feed จนกว่าจะมีแหล่งข้อมูล commission แยก

### ✅ มี Product ID

คอลัมน์ `itemid` คือ Product ID หลัก — ใช้ระบุสินค้าได้อย่างไม่ซ้ำกัน  
สร้าง `source_item_id` ใน system โดย prefix: `shopee-{itemid}`

### ⚠️ หน่วยราคา — ต้องยืนยันก่อน Import

คอลัมน์ `sale_price` และ `price` อาจเก็บในหน่วย **สตางค์ × 100** (เช่น ฿199 = `19900000`)  
หรืออาจเป็นตัวเลขบาทปกติ — **ต้องตรวจสอบจากตัวอย่างข้อมูลจริงก่อน import**

### ⚠️ ชื่อคอลัมน์ผิดปกติ

`product_short link` (คอลัมน์ที่ 47) มีช่องว่างในชื่อ แทนที่จะเป็น underscore  
CSV parser ต้องเก็บชื่อนี้ตามตัวอักษรจริง (ห้าม normalize เป็น underscore)

---

## คอลัมน์ที่ใช้ใน Initial Mapping

```typescript
// Shopee Feed Column → Product type field
const SHOPEE_COLUMN_MAP = {
  itemid:               "source_item_id",   // Product ID
  title:                "product_name",
  image_link:           "product_image",
  image_link_4:         "product_image_alt",
  shopid:               "source_shop_id",
  shop_name:            "shop_name",
  global_category1:     "category_level_1",
  global_category2:     "category_level_2",
  global_category3:     "category_level_3",
  sale_price:           "sale_price",        // ⚠️ ยืนยันหน่วยก่อน
  price:                "original_price",    // ⚠️ ยืนยันหน่วยก่อน
  discount_percentage:  "discount_percentage",
  model_prices:         "model_price_data",
  item_sold:            "sold_count",
  stock:                "stock_count",
  like:                 "like_count",
  item_rating:          "item_rating",
  shop_rating:          "shop_rating",
  is_preferred_shop:    "preferred_shop",
  is_official_shop:     "is_official_shop",
  cb_option:            "campaign_option",
  product_link:         "product_url",
  // commission_rate: ❌ ไม่มีใน Feed
} as const;
```

---

## ขั้นตอนถัดไปก่อน Import จริง

1. **ยืนยันหน่วยราคา** — เปรียบเทียบ `sale_price` กับราคาจริงบนหน้าสินค้า Shopee
2. **ยืนยัน Fashion Categories** — กด "วิเคราะห์หมวดสินค้า" ในหน้า Data Status แล้วดูว่าหมวดแฟชั่นในภาษาไทยชื่อว่าอะไร
3. **กำหนด Commission** — หาแหล่งข้อมูล commission แยก (Shopee Affiliate Center หรือ API)
4. **ยืนยัน Mapping** — ทดสอบ import 100 รายการแรกก่อน batch ใหญ่
5. **สร้าง `shopee-product-repository.ts`** — ดึงและ map ข้อมูลเข้า Product type ของระบบ
