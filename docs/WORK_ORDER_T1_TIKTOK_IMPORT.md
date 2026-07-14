# ใบสั่งงาน T1 — หน้า "นำเข้าสินค้า TikTok" ด้วยมือ (`/tiktok-import`)

> เอกสารนี้เป็นใบสั่งงานสำหรับ AI ผู้ลงมือทำ (Codex / Opus 4.8)
> อ่านให้จบก่อนเริ่ม แล้วทำตามลำดับงานด้านล่างทีละข้อ
> อ้างอิงจาก ROADMAP.md หัวข้อ "แผนเชื่อม TikTok Shop → T1"

## เป้าหมาย

ทำให้แท็บ **TIKTOK SHOP** ในหน้าแรกแสดงสินค้าจริงได้ โดยเจ้าของเว็บเป็นคน
กรอกข้อมูลเองจากศูนย์ครีเอเตอร์ TikTok Shop (Affiliate Creator Center) ของตัวเอง
— **ไม่ใช่การ scrape** เป็นการจดข้อมูลที่เห็นด้วยตาจากบัญชีตัวเองมากรอกเข้าเว็บ

## กฎเหล็ก (ห้ามฝ่าฝืน — มาจาก CLAUDE.md)

1. **ห้ามเขียนโค้ดดึงข้อมูลจาก TikTok/Kalodata/เว็บอื่นโดยอัตโนมัติเด็ดขาด**
   งานนี้คือฟอร์มกรอกด้วยมือ + วาง CSV เท่านั้น ห้ามมี fetch ไปหา tiktok.com
2. ทุกข้อความบน UI เป็นภาษาไทย คำอังกฤษต้องมีคำอธิบายไทยในวงเล็บ เช่น "CSV (ไฟล์ตารางข้อมูล)"
3. เงินแสดงเป็นบาท (฿) ใช้ฟังก์ชันจาก `lib/utils/format.ts` เท่านั้น ห้ามฟอร์แมตเอง
4. UI import จาก `lib/data-source/product-repository.ts` เท่านั้น (Repository Pattern เดิม)
5. ห้ามสร้างตารางใหม่ใน Supabase — ใช้ตาราง `public.products` เดิม
   โดยตั้ง `source_platform='tiktok'`
6. Mobile First — ทดสอบจอมือถือ (~375px) ก่อนจอคอมพิวเตอร์เสมอ
7. อ่าน PRD.md + brand.md ก่อนแตะ UI (โทนขาว/ดำ/เทา + Lime, ฟอนต์ Anton/Archivo)

## แบบแผนที่มีอยู่แล้ว — ให้เลียนแบบ ไม่ต้องคิดใหม่

| สิ่งที่จะทำ | ต้นแบบที่ให้ดู |
|---|---|
| หน้า import + ฟอร์ม + โหมดวาง CSV | `app/commission-import/page.tsx` |
| API route เขียนลง Supabase | `app/api/shopee/import/route.ts` |
| อ่านสินค้าจากตาราง products ตาม `source_platform` | `lib/data-source/shopee-product-repository.ts` |
| แปลง draft → Product เต็มรูปแบบ | `lib/data-source/build-product.ts` |
| การกรองแท็บแพลตฟอร์ม | `components/shared/platform-switch.tsx` (`filterByPlatform`) |
| โครงตาราง products | `supabase/migrations/0004_shopee_in_products.sql` |

## ลำดับงาน

### งานที่ 1 — ขยาย type ให้รองรับ tiktok
- `types/product.ts` บรรทัด ~62: เปลี่ยน `source?: "shopee"` เป็น `source?: "shopee" | "tiktok"`
- `components/shared/platform-switch.tsx`: แก้ generic ของ `filterByPlatform`
  จาก `{ source?: "shopee" }` ให้รองรับ `"tiktok"` ด้วย และลบ cast `as string | undefined` ที่ไม่จำเป็นออก
- ตามแก้ type error ที่ตามมาทุกจุดจนกว่า `npm run build` ผ่าน

### งานที่ 2 — API route นำเข้าสินค้า TikTok
สร้าง `app/api/tiktok/import/route.ts` (POST) โดยเลียนแบบ `app/api/shopee/import/route.ts`:
- รับ JSON เป็นรายการสินค้า (1 ตัวหรือหลายตัว) ฟิลด์: ชื่อสินค้า, ราคา (บาท),
  % ค่าคอมมิชชัน, ลิงก์สินค้า, ลิงก์รูป (ไม่บังคับ), ยอดขายโดยประมาณ, หมวดหมู่
- ตรวจความถูกต้องฝั่งเซิร์ฟเวอร์: ชื่อไม่ว่าง, ราคา > 0, ค่าคอม 0–100,
  ลิงก์ต้องขึ้นต้น `https://` (ถ้ามี)
- upsert ลงตาราง `public.products` ด้วย `source_platform='tiktok'`
  ใช้ลิงก์สินค้า (หรือ id ที่สกัดจากลิงก์) เป็น key กันข้อมูลซ้ำ —
  ถ้านำเข้าซ้ำให้อัปเดตยอดขาย/ราคา/ค่าคอมแทนการสร้างแถวใหม่
- การอัปเดตยอดขายซ้ำต้องเข้าระบบ snapshot เดิม (`0008_sales_snapshots.sql`)
  แบบเดียวกับที่ shopee ทำ เพื่อให้กราฟเทรนด์คำนวณได้ในอนาคต
- ถ้ารูปไม่มี ให้ fallback ด้วย `getCategoryPlaceholderImage` เหมือน shopee

### งานที่ 3 — หน้า `/tiktok-import`
สร้าง `app/tiktok-import/page.tsx` (+ แยก component ลง `components/tiktok-import/` ตามหลัก 1 ไฟล์ = 1 หน้าที่):
- **โหมดที่ 1 กรอกทีละตัว**: ฟอร์มฟิลด์ตามงานที่ 2 พร้อมคำอธิบายไทยใต้ช่อง
  ว่าไปคัดลอกค่าจากตรงไหนในศูนย์ครีเอเตอร์ TikTok
- **โหมดที่ 2 วาง CSV**: textarea วางหลายแถว (คั่นด้วย comma หรือ tab —
  รองรับการคัดลอกจาก Excel/Google Sheets) แสดงตารางตัวอย่าง (preview)
  ให้ตรวจก่อนกดยืนยันนำเข้า แถวที่ผิดให้ไฮไลต์พร้อมบอกเหตุผลเป็นภาษาไทย
- หลังนำเข้าสำเร็จ แสดงสรุปจำนวน เพิ่มใหม่/อัปเดต/ข้าม พร้อมลิงก์ไปหน้าแรกแท็บ TIKTOK
- เพิ่มลิงก์เข้าหน้านี้ในเมนู navigation เดียวกับที่ `commission-import` อยู่

### งานที่ 4 — อ่านข้อมูล tiktok ออกมาแสดง
ตาม ROADMAP ให้เลือกทางใดทางหนึ่ง (แนะนำทางแรก — โค้ดซ้ำน้อยกว่า):
- ปรับ `lib/data-source/shopee-product-repository.ts` ให้ query ทั้ง
  `source_platform IN ('shopee','tiktok')` และ map ฟิลด์ `source` ตามจริงของแต่ละแถว
- แท็บ TIKTOK ในหน้าแรกจะทำงานเองทันทีเพราะ `PlatformSwitch` กรองจาก `source` อยู่แล้ว
- อันดับ (salesRank ฯลฯ) ต้องคำนวณรวมทุกแพลตฟอร์มผ่าน `compute-ranks.ts` เหมือนเดิม

### งานที่ 5 — ตรวจสอบก่อนส่งงาน
1. `npm run lint` และ `npm run build` ต้องผ่านทั้งคู่
2. รัน dev server ทดสอบจริง: นำเข้าสินค้าตัวอย่าง 2 ตัว (โหมดฟอร์ม 1, โหมด CSV 1)
   แล้วไปหน้าแรก กดแท็บ TIKTOK SHOP ต้องเห็นสินค้าทั้ง 2 ตัว
3. นำเข้าตัวเดิมซ้ำด้วยยอดขายใหม่ → ต้องอัปเดตแถวเดิม ไม่เกิดแถวซ้ำ
4. ทดสอบจอมือถือ 375px — ฟอร์มและตาราง preview ต้องไม่ล้นจอ
5. ไล่ดูทุกข้อความใหม่บนหน้า — ต้องไม่มีคำอังกฤษที่ไม่มีวงเล็บอธิบายไทย

### เมื่อเสร็จแล้ว
- อัปเดต ROADMAP.md: ติ๊ก checkbox ของ T1 ที่ทำเสร็จ
- commit แยกเป็นงานละ commit ข้อความ commit เป็นภาษาไทยตามแบบแผนเดิมใน git log

## สิ่งที่อยู่นอกขอบเขต (อย่าทำในงานนี้)

- T2 (TikTok Shop Affiliate API) — รอผู้ใช้สมัครและได้ App Key ก่อน
- T3 (ซื้อข้อมูล EchoTik/FastMoss) — ยังไม่ตัดสินใจ
- ระบบสมาชิก/หลายผู้ใช้ — เวอร์ชันแรกมีเจ้าของเว็บคนเดียว
- การดึงรูป/ข้อมูลใด ๆ จาก tiktok.com อัตโนมัติ — ต้องห้ามตามกฎเหล็กข้อ 1
