# Women's Fashion Filter — แฟชั่นผู้หญิงเท่านั้น

วันที่อัปเดต: 2026-07-01

เป้าหมาย: คัดสินค้าเหมาะสำหรับทำ Affiliate Content แฟชั่นผู้หญิง อายุ 18–35 ปี
ไฟล์: `lib/shopee/women-fashion-filter.ts`

---

## หมวดสินค้าที่นำเข้า (Women Fashion Whitelist — 18 หมวด)

| หมวด | ประเภท |
|------|--------|
| Women Clothes | เสื้อผ้าผู้หญิง |
| Women Bags | กระเป๋าผู้หญิง |
| Women Shoes | รองเท้าผู้หญิง |
| Women Watches | นาฬิกาผู้หญิง |
| Women Muslim Wear | ชุดมุสลิมผู้หญิง |
| Dresses | ชุดเดรส |
| Skirts | กระโปรง |
| Lingerie & Underwear | ชุดชั้นใน |
| Innerwear & Underwear | ชุดชั้นใน |
| Sleepwear | ชุดนอน |
| Sleepwear & Pajamas | ชุดนอนและชุดนอนกางเกงยาว |
| Wedding Dresses | ชุดแต่งงาน |
| Traditional Wear | ชุดพื้นเมือง |
| Fine Jewelry | เครื่องประดับ |
| Hair Accessories | เครื่องประดับผม |
| Eyewear | แว่นตา |
| Loafers & Boat Shoes | รองเท้าโลฟเฟอร์ |
| Hoodies & Sweatshirts | เสื้อฮู้ด |

ทั้ง 18 หมวด = exact match (case-insensitive) กับค่า global_category1/2/3 ใน Feed

---

## หมวดสินค้าที่ตัดออกทั้งหมด (Exclusion List)

| หมวด | เหตุผล |
|------|--------|
| Men Clothes | ชาย |
| Men Bags | ชาย |
| Men Shoes | ชาย |
| Men Muslim Wear | ชาย |
| Boy Clothes | เด็กชาย |
| Boy Shoes | เด็กชาย |
| Girl Clothes | เด็กหญิง (ไม่ใช่กลุ่มเป้าหมาย 18–35) |
| Girl Shoes | เด็กหญิง |
| Baby Clothes | ทารก |
| Baby & Kids Fashion | เด็ก |
| Baby & Kids Accessories | เด็ก |
| Sports Footwear | กีฬา |

---

## Fashion Accessories — คัดจาก Title Keyword

หมวด **Fashion Accessories** ไม่เอาทั้งหมวดทันที เพราะมี false positive จากอุปกรณ์รถยนต์/คอมพิวเตอร์ปนอยู่

### คัดเข้า — ถ้า title มีคำเหล่านี้

**ภาษาไทย:** กระเป๋า, ต่างหู, สร้อย, แหวน, กิ๊บ, โบว์, เข็มขัด, แว่น, หมวก, ถุงเท้า, เครื่องประดับ

**ภาษาอังกฤษ:** jewelry, earrings, necklace, bracelet, ring, hair clip, bag, belt, glasses, socks

### ตัดออก — ถ้า title มีคำเหล่านี้ (override คัดเข้า)

อุปกรณ์รถ, ฟิล์มรถ, มือถือ, สายชาร์จ, อุปกรณ์คอม, อุปกรณ์สัตว์, ยางรถ, เครื่องมือ, อะไหล่

### Logic การตรวจสอบ

```
ถ้า title มีคำ exclude → ตัดออก (ไม่ต้องดูคำ include)
ถ้า title มีคำ include → รับเข้า
ถ้าไม่มีทั้งคู่ → ตัดออก (safe default)
```

---

## ราคา

ใช้ `sale_price` จาก Feed ตรง ๆ เป็นหน่วยบาท (ยืนยันจากการเปรียบเทียบกับหน้าสินค้า Shopee แล้วว่าค่าตรงกัน)

แสดงข้อความ: **"อ้างอิงราคาจาก Shopee Feed"** ไว้ด้านล่างตารางเสมอ

---

## ข้อจำกัดเรื่องค่าคอมมิชชัน

Feed นี้ไม่มีคอลัมน์ commission rate เลย

- ❌ ห้ามสร้างหรือเดาค่าคอมมิชชัน
- ✅ แสดง "ไม่มีข้อมูลค่าคอมมิชชันจาก Feed" เสมอ
- ✅ ข้อมูลคอมมิชชันต้องมาจาก Shopee Affiliate Center (ทำมือ) หรือ Shopee Affiliate API

---

## เหตุผลที่ยังไม่ Import ลง Supabase

1. **ยังไม่ยืนยัน title filter ครบถ้วน** — Fashion Accessories อาจยังมี false positive
2. **ยังไม่มีแผน Supabase schema** สำหรับ Shopee products (แตกต่างจาก TikTok products)
3. **ไม่มีข้อมูลค่าคอมมิชชัน** — Import ไปโดยไม่มีคอมมิชชันทำให้ตาราง Product Radar ไม่สมบูรณ์
4. **`item_sold` = ยอดสะสม** ไม่ใช่ trend — จำเป็นต้องออกแบบ Daily Snapshot ก่อน Import จริง

---

## ความหมายของ `item_sold`

`item_sold` ใน Shopee Product Feed = **ยอดขายสะสมตลอดอายุสินค้า** ไม่ใช่รายวัน/สัปดาห์

- ❌ ห้ามเรียกว่า "ยอดขาย 7 วัน" หรือ "ยอดขายล่าสุด"
- ✅ เรียกว่า **"จำนวนขายสะสมจาก Feed"** เสมอ

---

## สถานะ

| ด้าน | สถานะ |
|------|-------|
| Women Fashion Whitelist (18 หมวด) | ✅ พร้อมใช้ |
| Fashion Accessories Title Filter | ✅ พร้อมใช้ |
| ราคา (บาทตรง ๆ) | ✅ ยืนยันแล้ว |
| Commission | ❌ ไม่มีใน Feed |
| Supabase Import | 🔜 รอออกแบบ schema + ยืนยัน title filter |
