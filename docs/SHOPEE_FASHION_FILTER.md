# Shopee Fashion Category Filter — เอกสารการคัดกรองหมวดแฟชั่น

วันที่อัปเดต: 2026-07-01

---

## ปัญหาของ Keyword Matching (วิธีเดิม)

วิธีเดิมใช้ substring matching กับคำเช่น "accessories", "bag", "wear" ทำให้เกิด **false positive** กว่า 37,000 รายการจากหมวดที่ไม่ใช่แฟชั่น เช่น:

- **Automobile Accessories** — อุปกรณ์รถยนต์
- **Computer Accessories** — อุปกรณ์คอมพิวเตอร์
- **Pet Accessories / Pet Clothing & Accessories** — อุปกรณ์และเสื้อสัตว์เลี้ยง
- **Baby & Kids Accessories** — อุปกรณ์เด็ก (ไม่ใช่เสื้อผ้าเด็ก)
- **Laptop Bags** — กระเป๋าโน้ตบุ๊ก

---

## วิธีใหม่: Whitelist แบบเข้มงวด

ใช้ชื่อหมวดจริงจาก Feed (exact match, case-insensitive) แทน substring keyword

### Fashion Whitelist (31 หมวด)

หมวดเหล่านี้ถือว่าเป็นสินค้าแฟชั่นแน่นอน:

| หมวด | ประเภท |
|------|--------|
| Women Clothes | เสื้อผ้าผู้หญิง |
| Women Bags | กระเป๋าผู้หญิง |
| Women Shoes | รองเท้าผู้หญิง |
| Women Watches | นาฬิกาผู้หญิง |
| Fashion Accessories | เครื่องประดับแฟชั่น |
| Dresses | ชุดเดรส |
| Skirts | กระโปรง |
| Hoodies & Sweatshirts | เสื้อฮู้ด |
| Lingerie & Underwear | ชุดชั้นใน |
| Innerwear & Underwear | ชุดชั้นใน |
| Hair Accessories | เครื่องประดับผม |
| Fine Jewelry | เครื่องประดับ |
| Eyewear | แว่นตา |
| Loafers & Boat Shoes | รองเท้าโลฟเฟอร์ |
| Sleepwear | ชุดนอน |
| Sleepwear & Pajamas | ชุดนอน |
| Traditional Wear | ชุดพื้นเมือง |
| Wedding Dresses | ชุดแต่งงาน |
| Women Muslim Wear | ชุดมุสลิมผู้หญิง |
| Men Clothes | เสื้อผ้าผู้ชาย |
| Men Bags | กระเป๋าผู้ชาย |
| Men Shoes | รองเท้าผู้ชาย |
| Men Muslim Wear | ชุดมุสลิมผู้ชาย |
| Baby & Kids Fashion | แฟชั่นเด็ก |
| Baby Clothes | เสื้อผ้าทารก |
| Girl Clothes | เสื้อผ้าเด็กหญิง |
| Girl Shoes | รองเท้าเด็กหญิง |
| Boy Clothes | เสื้อผ้าเด็กชาย |
| Boy Shoes | รองเท้าเด็กชาย |
| Sports Footwear | รองเท้ากีฬา |
| Sports & Outdoor Apparel | เสื้อผ้ากีฬา |

### Exclusion List (20 หมวด)

หมวดที่ไม่ใช่แฟชั่น — เก็บไว้เป็นเอกสารว่าระบบคัดออก:

- Automobile Accessories / Automobile Exterior Accessories / Automobile Interior Accessories
- Computer Accessories / Camera Accessories / Console Accessories / Drone Accessories / Lens Accessories
- Laptop Bags
- Motorcycle Accessories / Motorcycle Helmets & Accessories
- Pet Accessories / Pet Clothing & Accessories
- TVs & Accessories
- Mobile & Gadgets
- Home & Living / Home Appliances
- Sports & Outdoors *(ต่างจาก Sports & Outdoor Apparel ใน Whitelist)*
- Baby & Kids Accessories *(ต่างจาก Baby & Kids Fashion ใน Whitelist)*
- Medical / Health accessories

---

## Logic การตรวจสอบ

```
isFashionByWhitelist(cat1, cat2, cat3):
  ถ้า cat1 หรือ cat2 หรือ cat3 อยู่ใน FASHION_WHITELIST → ถือว่าเป็นแฟชั่น
  (Whitelist ชนะทุกกรณี ไม่มีการตรวจ Exclusion ซ้อน)
```

ไฟล์: `lib/shopee/fashion-filter.ts`

---

## ความหมายของ `item_sold` (สำคัญมาก)

`item_sold` ใน Feed = **ยอดขายสะสมตลอดอายุสินค้า** ไม่ใช่ยอดขายรายวัน/สัปดาห์

- ❌ ห้ามเรียกว่า "ยอดขาย 7 วัน" หรือ "ยอดขายรายเดือน"
- ✅ ใช้คำว่า **"จำนวนขายสะสมจาก Feed"** เสมอ

---

## ข้อจำกัดเรื่องค่าคอมมิชชัน

Feed นี้ **ไม่มีคอลัมน์ commission** เลย

- ❌ ห้ามสร้างค่าคอมมิชชันปลอม
- ❌ ห้ามเดาหรือประมาณค่าคอมมิชชัน
- ✅ แสดง "ไม่มีข้อมูลค่าคอมมิชชันใน Feed นี้" เสมอ
- ✅ หาแหล่งข้อมูลจริงจาก Shopee Affiliate Center (ทำมือ) หรือ Shopee Affiliate API (ระยะยาว)

---

## แผนขั้นถัดไป: Import สินค้าเข้า Supabase

**ก่อน Import จริงต้องทำสิ่งเหล่านี้ก่อน:**

1. **ยืนยันหน่วยราคา** — เปิดหน้าสินค้า Shopee เปรียบราคา `sale_price` ดิบกับราคาที่เห็น
   - ถ้า Feed ส่ง `41` และ Shopee แสดง ฿41 → ราคาเป็นบาทโดยตรง (÷ 1)
   - ถ้า Feed ส่ง `4100` และ Shopee แสดง ฿41 → ราคาเป็นสตางค์ (÷ 100)
2. **ตรวจสอบ import-plan** — กด "ดู Import Plan" เพื่อดู Top 1,000 สินค้าแฟชั่นก่อน
3. **เมื่อยืนยันครบ** → สร้าง `lib/data-source/shopee-product-repository.ts` + schema Supabase

---

## สถานะ

| ด้าน | สถานะ |
|------|-------|
| Fashion Filter (Whitelist) | ✅ พร้อมใช้ |
| Price Validation Samples | ✅ แสดงใน UI แล้ว |
| Import Plan (Top 1,000) | ✅ API พร้อม ยังไม่ Import จริง |
| Commission | ❌ ไม่มีใน Feed |
| Supabase Import | 🔜 รอยืนยันหน่วยราคาก่อน |
