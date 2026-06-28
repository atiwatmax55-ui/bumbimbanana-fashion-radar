# BUMBIMBANANA Fashion Product Radar

เว็บไซต์สำหรับดู ค้นหา เปรียบเทียบ และคัดเลือกสินค้าแฟชั่นผู้หญิงจาก TikTok Shop (แพลตฟอร์มขายสินค้าออนไลน์บน TikTok) ที่มีแนวโน้มขายดี เพื่อนำไปวางแผนทำคอนเทนต์ (Content — เนื้อหา)

รองรับทั้ง **Mock Data (ข้อมูลตัวอย่าง)** และข้อมูลจริงจาก TikTok Shop ผ่าน Windsor.ai (สลับได้ด้วยตัวแปรสภาพแวดล้อม `DATA_SOURCE_MODE` — ดูหัวข้อ "ตั้งค่า Windsor.ai" ด้านล่าง)

อ่านรายละเอียดเพิ่มเติมได้ที่:

- [PRD.md](./PRD.md) — สเปกของผลิตภัณฑ์แบบเต็ม
- [brand.md](./brand.md) — แนวทางแบรนด์ สี ฟอนต์ และน้ำเสียง
- [CLAUDE.md](./CLAUDE.md) — บริบทสำหรับการพัฒนาต่อด้วย AI Assistant

## เทคโนโลยีที่ใช้

- [Next.js](https://nextjs.org) (App Router) + [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org) สำหรับกราฟ
- [TanStack Table](https://tanstack.com/table) สำหรับตารางบนหน้าจอคอมพิวเตอร์
- [Supabase](https://supabase.com) / PostgreSQL — เตรียมโครงสร้างไว้สำหรับอนาคต (ยังไม่เชื่อมต่อจริงในเวอร์ชันนี้)

## เริ่มต้นใช้งาน

ติดตั้ง dependency (ไลบรารีที่โปรเจกต์ต้องใช้):

```bash
npm install
```

รันเซิร์ฟเวอร์สำหรับพัฒนา:

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000) (ค่าเริ่มต้นใช้ Mock Data ไม่ต้องตั้งค่าใด ๆ เพิ่ม)

### ตั้งค่า Windsor.ai (สำหรับใช้ข้อมูลจริงจาก TikTok Shop)

1. คัดลอก `.env.example` เป็น `.env.local`
2. เชื่อมต่อบัญชี TikTok Shop กับ Windsor.ai ที่ [onboard.windsor.ai/app/tiktok_shop](https://onboard.windsor.ai/app/tiktok_shop) — ล็อกอินผ่าน TikTok Shop Seller Center โดยตรง (OAuth) ไม่ผ่านมือเรา ยกเลิกสิทธิ์ได้ทุกเมื่อ
3. ขอ API Key จาก Windsor.ai dashboard แล้วนำมาตั้งเป็น `WINDSOR_API_KEY` ใน `.env.local`
4. ตั้ง `DATA_SOURCE_MODE=windsor` ใน `.env.local`
5. Windsor.ai สำหรับ connector TikTok Shop เป็นแผนแบบเสียเงิน (เริ่มต้นประมาณ $19/เดือน)

คำสั่งอื่น ๆ ที่ใช้บ่อย:

```bash
npm run build   # build สำหรับ production
npm run start   # รันเซิร์ฟเวอร์ production หลัง build
npm run lint    # ตรวจสอบ ESLint
```

## หน้าเว็บไซต์ทั้งหมด

| หน้า | เส้นทาง | คำอธิบาย |
|---|---|---|
| ภาพรวม (Dashboard) | `/` | สรุปยอดขาย ค่าคอมมิชชัน สินค้าขายดี และกราฟภาพรวม |
| ค้นหาและคัดสินค้า (Product Radar) | `/products` | ค้นหา กรอง เรียงข้อมูล และบันทึกสินค้า |
| รายละเอียดสินค้า (Product Detail) | `/products/[id]` | รายละเอียดสินค้ารายตัว พร้อมกราฟและโน้ตส่วนตัว |
| สินค้าที่บันทึกไว้ (Saved Products) | `/saved` | รายการสินค้าที่บันทึกไว้ทำคอนเทนต์ |
| สถานะข้อมูล (Data Status) | `/data-status` | สถานะโหมดข้อมูลและความพร้อมเชื่อมต่อ Windsor.ai |

## โครงสร้างโปรเจกต์

```
app/                      หน้าเว็บไซต์ (Next.js App Router)
components/
  layout/                 ส่วนหัวเว็บไซต์ + เมนูนำทาง
  dashboard/               component เฉพาะหน้า Dashboard
  products/                component เฉพาะหน้า Product Radar
  product-detail/          component เฉพาะหน้า Product Detail
  saved/                   component เฉพาะหน้า Saved Products
  data-status/             component เฉพาะหน้า Data Status
  shared/                  component ใช้ร่วมกันหลายหน้า
  ui/                      shadcn/ui primitives
lib/
  data-source/             Repository Pattern (ดูหัวข้อด้านล่าง)
  mock-data/                ข้อมูลสินค้าตัวอย่าง (Mock Data)
  insights/                ตรรกะสร้างข้อมูลสรุปเชิงคุณภาพของสินค้า
  dashboard/                ฟังก์ชันสรุปข้อมูลสำหรับหน้า Dashboard
  saved-products/           จัดการสินค้าที่บันทึกไว้ (local storage)
  utils/                    ฟังก์ชันฟอร์แมตตัวเลข/วันที่ที่ใช้ร่วมกัน
types/                     TypeScript types ของข้อมูลสินค้า
supabase/migrations/        ไฟล์ SQL Migration (โครงสร้างฐานข้อมูล)
public/products/            รูปสินค้าตัวอย่าง (Placeholder Image)
```

## โครงสร้าง Data Source

หน้าเว็บไซต์ทุกหน้าดึงข้อมูลผ่าน `lib/data-source/product-repository.ts` เพียงจุดเดียว:

```
lib/data-source/
  product-repository.ts          ← จุดเดียวที่ UI เรียกใช้ เลือกตาม DATA_SOURCE_MODE
  mock-product-repository.ts     ← ใช้งานเมื่อ DATA_SOURCE_MODE=mock (ค่าเริ่มต้น)
  windsor-product-repository.ts  ← ใช้งานเมื่อ DATA_SOURCE_MODE=windsor (ข้อมูลจริงจาก TikTok Shop)
  windsor-client.ts              ← เรียก Windsor.ai REST API ฝั่งเซิร์ฟเวอร์เท่านั้น
  windsor-field-map.ts           ← แปลงข้อมูลดิบจาก Windsor.ai เป็นโครงสร้างสินค้าของเรา
```

สลับแหล่งข้อมูลได้ด้วยตัวแปรสภาพแวดล้อม `DATA_SOURCE_MODE` โดยไม่ต้องแก้โค้ดหน้าเว็บไซต์เลย ฟิลด์บางส่วนจาก Windsor.ai (ค่าคอมมิชชัน, หมวดสินค้า, รูปสินค้า, ลิงก์สินค้า) ยังอยู่ระหว่างปรับให้แม่นยำขึ้น — ดูคอมเมนต์ `TODO` ในโค้ดและรายละเอียดใน [CLAUDE.md](./CLAUDE.md)

## ฐานข้อมูล (สำหรับอนาคต)

ไฟล์ SQL Migration อยู่ที่ [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) ประกอบด้วยตาราง `products`, `saved_products`, และ `data_sync_logs` เวอร์ชันนี้ยังไม่ได้รันหรือเชื่อมต่อฐานข้อมูลจริง — ใช้ Mock Data ในโค้ดเท่านั้น

## กฎสำคัญของโปรเจกต์

- ทุกข้อความบนหน้าเว็บไซต์เป็นภาษาไทย คำอังกฤษที่ไม่ใช่ชื่อแบรนด์/เทคโนโลยีต้องมีคำอธิบายไทยในวงเล็บ
- ห้าม Scrape ข้อมูลจาก TikTok, Kalodata หรือเว็บไซต์อื่นโดยไม่ได้รับอนุญาต และห้าม Bypass ระบบล็อกอิน/CAPTCHA — ข้อมูลจริงต้องมาจากการเชื่อมต่อที่ได้รับอนุญาตผ่าน OAuth เท่านั้น (เช่น Windsor.ai)
- ห้ามเก็บหรือแสดง API Key บนหน้าเว็บไซต์ ต้องอยู่ใน environment variable ฝั่งเซิร์ฟเวอร์เท่านั้น
- ออกแบบ Mobile First แสดงตารางบนคอมพิวเตอร์ และการ์ดสินค้าบนมือถือ

อ่านรายละเอียดทั้งหมดได้ที่ [CLAUDE.md](./CLAUDE.md)
