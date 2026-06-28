# CLAUDE.md

เอกสารนี้ให้บริบทแก่ Claude Code (หรือ AI Assistant อื่น) เมื่อทำงานกับโค้ดในโปรเจกต์นี้

## ภาพรวมโปรเจกต์

**BUMBIMBANANA Fashion Product Radar** เป็นเว็บไซต์สำหรับดู ค้นหา เปรียบเทียบ และคัดเลือกสินค้าแฟชั่นผู้หญิงจาก TikTok Shop ที่มีแนวโน้มขายดี รองรับทั้ง **Mock Data (ข้อมูลตัวอย่าง)** และข้อมูลจริงจาก TikTok Shop ผ่าน Windsor.ai (สลับได้ด้วยตัวแปรสภาพแวดล้อม `DATA_SOURCE_MODE` — ดูหัวข้อ Data Source ด้านล่าง) ผู้ใช้เวอร์ชันแรกคือเจ้าของเว็บไซต์เพียงคนเดียว (ไม่มีระบบสมัครสมาชิก/หลายผู้ใช้)

อ่านรายละเอียดสเปกแบบเต็มที่ [PRD.md](./PRD.md) และแนวทางแบรนด์ที่ [brand.md](./brand.md) ก่อนเริ่มแก้ไข UI ใด ๆ

## เทคโนโลยีหลัก

* Next.js (App Router) + TypeScript
* Tailwind CSS + shadcn/ui
* Supabase / PostgreSQL (เตรียมโครงสร้างไว้ แต่เวอร์ชันแรกยังไม่เชื่อมต่อจริง)
* Recharts (กราฟ)
* TanStack Table (ตารางบนหน้าคอมพิวเตอร์)

## กฎที่ห้ามฝ่าฝืนเด็ดขาด

1. **ภาษา**: ทุกข้อความบนหน้าเว็บไซต์ต้องเป็นภาษาไทย คำศัพท์ภาษาอังกฤษ (ที่ไม่ใช่ชื่อแบรนด์/ชื่อเทคโนโลยี) ต้องมีคำอธิบายภาษาไทยในวงเล็บทันทีที่ปรากฏ เช่น "Mock Data (ข้อมูลตัวอย่าง)"
2. **ห้าม Scrape ข้อมูลจริง**: ห้ามเขียนโค้ดที่ดึงข้อมูลจาก TikTok, Kalodata หรือเว็บไซต์อื่นโดยไม่ได้รับอนุญาต
3. **ห้าม Bypass ระบบป้องกัน**: ห้ามเขียนโค้ดข้ามระบบล็อกอิน, CAPTCHA หรือข้อจำกัดของแพลตฟอร์มใด ๆ
4. **ห้ามเก็บ/แสดง API Key บนหน้าเว็บ**: ค่าลับทุกชนิดต้องอยู่ใน environment variable ฝั่งเซิร์ฟเวอร์เท่านั้น ห้าม hardcode หรือส่งออกไปยัง client
5. **เงิน**: แสดงผลเป็นสกุลเงินบาท (฿) เสมอ
6. **กลุ่มสินค้าหลัก**: ใช้ตัวเลขสินค้าแฟชั่นผู้หญิงเป็นหลักในข้อมูลตัวอย่างทั้งหมด

## หลักการเขียนโค้ด

* แยก Component ให้ชัดเจนตามหน้าที่ (presentational vs. logic), 1 ไฟล์ = 1 หน้าที่หลัก
* ใช้ TypeScript type/interface กำกับโครงสร้างข้อมูลสินค้าทุกจุด ห้ามใช้ `any` โดยไม่จำเป็น
* Mock data และ types ของสินค้าอยู่ใน `lib/mock-data/` และ `types/` แยกจาก UI components
* ฟอร์แมตตัวเลข/วันที่ (บาท, เปอร์เซ็นต์, วันที่ไทย) ให้รวมไว้ใน `lib/utils/format.ts` ใช้ซ้ำได้ทุกหน้า ห้ามเขียนซ้ำในแต่ละ component
* ทุกหน้าที่แสดงข้อมูลสินค้า ต้องแสดงสถานะ "ข้อมูลล่าสุด" และโหมดข้อมูล (Mock Data) ให้เห็นชัดเจนตามกฎข้อ 10 ของสเปก

## โครงสร้าง Data Source (สำคัญมาก — เชื่อมต่อ Windsor.ai ได้จริงแล้ว)

โปรเจกต์ใช้ Repository Pattern (รูปแบบตัวจัดการข้อมูลกลาง) เพื่อให้สลับแหล่งข้อมูลได้โดยไม่ต้องแก้หน้าเว็บ:

```
lib/data-source/
  product-repository.ts          ← interface กลาง + เลือก repository ตาม DATA_SOURCE_MODE (export จุดเดียวให้ UI เรียก)
  mock-product-repository.ts     ← อ่านจาก Mock Data ในโค้ด ใช้เมื่อ DATA_SOURCE_MODE=mock (ค่าเริ่มต้น)
  windsor-product-repository.ts  ← ดึงข้อมูลจริงจาก TikTok Shop ผ่าน Windsor.ai ใช้เมื่อ DATA_SOURCE_MODE=windsor
  windsor-client.ts              ← fetch wrapper เรียก Windsor.ai REST API (อ่าน WINDSOR_API_KEY จาก process.env เท่านั้น)
  windsor-field-map.ts           ← แปลงข้อมูลดิบระดับ order/SKU จาก Windsor.ai เป็น Product type ของเรา
  compute-ranks.ts               ← คำนวณ salesRank/commissionRank/growthRank ใช้ร่วมกันทั้ง mock และ windsor
```

**กฎสำคัญ:** หน้าเว็บและ component ทุกตัวต้อง import จาก `product-repository.ts` เท่านั้น ห้าม import `mock-product-repository.ts`/`windsor-product-repository.ts` ตรง ๆ ในหน้า UI

### ตัวแปรสภาพแวดล้อม (Environment Variables)

ดู [.env.example](./.env.example) — คัดลอกเป็น `.env.local` แล้วตั้งค่า:
- `DATA_SOURCE_MODE` — `"mock"` (ค่าเริ่มต้น) หรือ `"windsor"`
- `WINDSOR_API_KEY` — ต้องตั้งเมื่อใช้โหมด `windsor` **ห้าม prefix ด้วย `NEXT_PUBLIC_` เด็ดขาด** (จะทำให้ Next.js ฝังค่าลงไปใน JavaScript ฝั่ง client) อ่านเฉพาะใน `windsor-client.ts` เท่านั้น

### ข้อควรรู้เรื่องฟิลด์จาก Windsor.ai

ข้อมูลจาก connector `tiktok_shop` เป็นระดับ order/SKU ไม่ใช่ข้อมูลสรุปสำเร็จรูป โค้ดใน `windsor-field-map.ts` จะรวม/คำนวณเป็นยอดขายต่อสินค้าเอง ฟิลด์บางส่วน (ค่าคอมมิชชัน, หมวดสินค้า, รูปสินค้า, ลิงก์สินค้า) ยังเป็นค่าประมาณ/ค่าเริ่มต้นไปก่อน — มีคอมเมนต์ `TODO(Phase A)`/`TODO(Phase B)` กำกับไว้ในโค้ด ต้องเรียก `get_fields` กับ Windsor.ai เพื่อยืนยันชื่อฟิลด์จริงก่อนแก้ไขส่วนนี้

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # รันเซิร์ฟเวอร์พัฒนา
npm run build    # build สำหรับ production
npm run lint     # ตรวจสอบ ESLint
```

## ลำดับความสำคัญเวลาทำงานต่อ

1. อ่าน PRD.md เพื่อยืนยันสเปกของหน้าที่กำลังแก้ก่อนเริ่ม
2. ตรวจสอบ brand.md เพื่อคงความสอดคล้องของสี/ฟอนต์/ระยะห่าง
3. ตรวจสอบว่าไม่มีข้อความภาษาอังกฤษหลุดออกมาโดยไม่มีคำอธิบายไทยในวงเล็บ
4. ทดสอบการแสดงผลบนมือถือก่อนคอมพิวเตอร์เสมอ (Mobile First)
